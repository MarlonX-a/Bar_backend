export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'CholosBar API',
    version: 'v1',
    description: 'API de gestión operativa para cevichería.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/login': { post: { summary: 'Iniciar sesión' } },
    '/auth/refresh': { post: { summary: 'Rotar sesión' } },
    '/categories': { get: { summary: 'Consultar categorías' }, post: { summary: 'Crear categoría', security: [{ bearerAuth: [] }] } },
    '/products': { get: { summary: 'Consultar productos' }, post: { summary: 'Crear producto', security: [{ bearerAuth: [] }] } },
    '/orders': { post: { summary: 'Crear pedido QR' } },
    '/orders/manual': { post: { summary: 'Crear pedido manual', security: [{ bearerAuth: [] }] } },
    '/payments': { post: { summary: 'Declarar pago', security: [{ bearerAuth: [] }] } },
    '/cash-sessions/current': { get: { summary: 'Consultar caja actual', security: [{ bearerAuth: [] }] } },
    '/reports/current': { get: { summary: 'Reporte de jornada actual', security: [{ bearerAuth: [] }] } },
    '/audit-events': { get: { summary: 'Consultar auditoría', security: [{ bearerAuth: [] }] } },
  },
} as const;
