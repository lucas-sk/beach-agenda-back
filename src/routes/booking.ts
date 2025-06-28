import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { verifyJwt } from '../middleware/verify-jwt'
import { prisma } from '../prisma/prisma-client'
import { bookingParamsSchema, createBookingSchema } from '../schemas/booking'

export async function bookingRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  app.withTypeProvider<ZodTypeProvider>().post(
    '/booking',
    {
      schema: {
        body: createBookingSchema,
        summary: 'Create a new booking',
        tags: ['Booking'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub
        console.log('🚀 ~ userId:', userId)
        const { agendaId, timeSlotId } = request.body

        const agenda = await prisma.agenda.findUnique({
          where: { id: agendaId },
          include: {
            timeSlots: true,
          },
        })

        if (!agenda) {
          return reply.status(404).send({ error: 'Agenda not found' })
        }

        const timeSlot = agenda.timeSlots.find(
          (slot: { id: string }) => slot.id === timeSlotId
        )
        if (!timeSlot) {
          return reply.status(404).send({ error: 'Time slot not found' })
        }

        if (!timeSlot.isAvailable) {
          return reply.status(400).send({ error: 'Time slot is not available' })
        }

        const booking = await prisma.booking.create({
          data: {
            userId,
            agendaId,
            timeSlots: {
              connect: [{ id: timeSlotId }],
            },
          },
          include: {
            Agenda: {
              include: {
                arena: true,
              },
            },
            timeSlots: true,
          },
        })

        await prisma.timeSlot.update({
          where: { id: timeSlotId },
          data: { isAvailable: false },
        })

        return booking
      } catch (error) {
        return reply.status(401).send({ error: (error as Error).message })
      }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/booking',
    {
      schema: {
        summary: 'List all bookings for the current user',
        tags: ['Booking'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub

        const bookings = await prisma.booking.findMany({
          where: { userId },
          include: {
            Agenda: {
              include: {
                arena: true,
              },
            },
            timeSlots: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return bookings
      } catch (error) {
        return reply.status(401).send({ error: (error as Error).message })
      }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().delete(
    '/booking/:id',
    {
      schema: {
        params: bookingParamsSchema,
        summary: 'Delete a booking',
        tags: ['Booking'],
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub
        const { id } = request.params

        const booking = await prisma.booking.findUnique({
          where: { id },
          include: { timeSlots: true },
        })

        if (!booking) {
          return reply.status(404).send({ error: 'Booking not found' })
        }

        await Promise.all(
          booking.timeSlots.map((slot: { id: string }) =>
            prisma.timeSlot.update({
              where: { id: slot.id },
              data: { isAvailable: true },
            })
          )
        )

        await prisma.booking.delete({
          where: {
            id,
            userId,
          },
        })

        return { message: 'Booking deleted successfully' }
      } catch (error) {
        return reply.status(401).send({ error: (error as Error).message })
      }
    }
  )
}
