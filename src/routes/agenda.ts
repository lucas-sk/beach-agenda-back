import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { verifyJwt } from '../middleware/verify-jwt'
import { prisma } from '../prisma/prisma-client'
import {
  agendaParamsSchema,
  createAgendaSchema,
  updateAgendaSchema,
} from '../schemas/agenda'

export async function agendaRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.withTypeProvider<ZodTypeProvider>().post(
    '/agenda',
    {
      schema: {
        body: createAgendaSchema,
        summary: 'Create a new agenda item',
        tags: ['Agenda'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub
        const { title, description, date, timeSlots } = request.body

        const agenda = await prisma.agenda.create({
          data: {
            title,
            description,
            date: new Date(date),
            timeSlots: {
              create: timeSlots.map(slot => ({
                time: slot.time,
                isAvailable: slot.isAvailable,
              })),
            },
            userId,
          },
          include: {
            timeSlots: true,
          },
        })

        return agenda
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/agenda',
    {
      schema: {
        summary: 'List all agenda items',
        tags: ['Agenda'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub
        const agenda = await prisma.agenda.findMany({
          where: { userId },
          include: {
            timeSlots: true,
          },
          orderBy: {
            date: 'asc',
          },
        })

        return agenda
      } catch (error) {
        return reply.status(401).send({ error: (error as Error).message })
      }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().put(
    '/agenda/:id',
    {
      schema: {
        params: agendaParamsSchema,
        body: updateAgendaSchema,
        summary: 'Update an agenda item',
        tags: ['Agenda'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub
        const { id } = request.params
        const { title, description, date, timeSlots } = request.body

        // Primeiro, deleta os horários existentes
        if (timeSlots) {
          await prisma.timeSlot.deleteMany({
            where: {
              agendaId: id,
            },
          })
        }

        const agenda = await prisma.agenda.update({
          where: {
            id,
            userId,
          },
          data: {
            title,
            description,
            date: date ? new Date(date) : undefined,
            timeSlots: timeSlots
              ? {
                  create: timeSlots.map(slot => ({
                    time: slot.time,
                    isAvailable: slot.isAvailable,
                  })),
                }
              : undefined,
          },
          include: {
            timeSlots: true,
          },
        })

        return agenda
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/agenda/:id',
    {
      schema: {
        params: agendaParamsSchema,
        summary: 'Delete an agenda item',
        tags: ['Agenda'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub
        const { id } = request.params

        await prisma.agenda.delete({
          where: {
            id,
            userId,
          },
        })

        return { message: 'Agenda item deleted successfully' }
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )
}
