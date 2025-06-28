import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { verifyJwt } from '../middleware/verify-jwt'
import { prisma } from '../prisma/prisma-client'
import { createUserSchema, loginSchema } from '../schemas/user'

export async function userRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/users',
    {
      schema: {
        body: createUserSchema,
        summary: 'Create a new user',
        tags: ['Users'],
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      })

      const token = app.jwt.sign({ id: user.id })

      return { user, token }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/users/login',
    {
      schema: {
        body: loginSchema,
        summary: 'Authenticate user',
        tags: ['Users'],
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const user = await prisma.user.findUnique({
        where: { email },
      })

      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const validPassword = await bcrypt.compare(password, user.password)

      if (!validPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      const token = await reply.jwtSign(
        {},
        {
          sign: {
            sub: user.id,
          },
        }
      )

      return { user, token }
    }
  )

  app.withTypeProvider<ZodTypeProvider>().get(
    '/users/profile',
    {
      schema: {
        summary: 'Get user profile',
        tags: ['Users'],
      },
      onRequest: verifyJwt,
    },
    async (request, reply) => {
      try {
        const userId = request.user.sub

        const user = await prisma.user.findUnique({
          where: { id: userId },
        })

        if (!user) {
          return reply.status(404).send({ error: 'User not found' })
        }

        return user
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  )
}
