// import { FastifyReply, FastifyRequest } from 'fastify'

import type { FastifyReply, FastifyRequest } from 'fastify'

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    return reply.status(401).send({ message: 'Unauthorized.' })
  }
}

// export const auth = fastifyPlugin(async (app: FastifyInstance) => {
//   app.addHook('preHandler', async request => {
//     request.getCurrentUserId = async () => {
//       try {
//         const { sub } = await request.jwtVerify<{ sub: string }>()

//         return sub
//       } catch {
//         throw new Error('Unauthorized')
//       }
//     }
//   })
// })
