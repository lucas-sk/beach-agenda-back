import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import Fastify from 'fastify'

import fastifyCookie from '@fastify/cookie'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { agendaRoutes } from './routes/agenda'
import { arenaRoutes } from './routes/arena'
import { bookingRoutes } from './routes/booking'
import { userRoutes } from './routes/user'

const app = Fastify().withTypeProvider()

app.register(fastifyCookie)
app.register(jwt, {
  secret:
    process.env.JWT_SECRET ??
    'your-super-secret-jwt-key-change-this-in-production',
})

app.register(cors, {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

app.register(fastifySwagger, {
  swagger: {
    consumes: ['application/json'],
    produces: ['application/json'],
    info: {
      title: 'Beach Agenda API',
      description: 'API para gerenciamento de agendamentos de arenas',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(userRoutes)
app.register(agendaRoutes)
app.register(arenaRoutes)
app.register(bookingRoutes)

app.get('/health', async () => {
  return { status: 'ok' }
})

app.listen(
  {
    port: 3100,
    host: '0.0.0.0',
  },
  () => console.log('Server is running on port 3100')
)
