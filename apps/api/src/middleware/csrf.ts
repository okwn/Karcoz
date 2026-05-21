import { FastifyRequest, FastifyReply } from 'fastify';

export function csrfProtection(req: FastifyRequest, reply: FastifyReply) {
  // Same-site cookie check for non-API origins
  const origin = req.headers.origin;
  if (req.method !== 'GET' && origin) {
    const allowedOrigins = [
      'http://localhost:3100',
      'http://localhost:3000',
      process.env.APP_BASE_URL,
    ].filter(Boolean);

    if (!allowedOrigins.includes(origin)) {
      reply.code(403).send({ error: { code: 'CSRF', message: 'Invalid origin' } });
    }
  }
}
