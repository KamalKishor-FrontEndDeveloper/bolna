import { z } from 'zod';
import { createAgentRequestSchema, makeCallRequestSchema, updateAgentRequestSchema, insertApiConfigSchema, apiConfigurations } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  })
};

export const api = {
  keys: {
    save: {
      method: 'POST' as const,
      path: '/api/keys',
      input: z.object({
        key: z.string(),
        value: z.string()
      }),
      responses: {
        200: z.custom<typeof apiConfigurations.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/keys/:key',
      responses: {
        200: z.object({ value: z.string().optional() }), // Return masked or just existence? Or full value for now (dev tool).
      }
    }
  },
  bolna: {
    agents: {
      list: {
        method: 'GET' as const,
        path: '/api/bolna/agents',
        responses: {
          200: z.array(z.any()), // Returns raw list from Bolna
          401: errorSchemas.unauthorized,
        }
      },
      create: {
        method: 'POST' as const,
        path: '/api/bolna/agents',
        input: createAgentRequestSchema,
        responses: {
          201: z.object({ agent_id: z.string(), status: z.string() }),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        }
      },
      get: {
        method: 'GET' as const,
        path: '/api/bolna/agents/:id',
        responses: {
          200: z.any(), // Raw agent object
          404: errorSchemas.notFound,
        }
      },
      update: {
        method: 'PUT' as const,
        path: '/api/bolna/agents/:id',
        input: updateAgentRequestSchema,
        responses: {
          200: z.any(),
          404: errorSchemas.notFound,
        }
      }
    },
    calls: {
      make: {
        method: 'POST' as const,
        path: '/api/bolna/calls',
        input: makeCallRequestSchema,
        responses: {
          200: z.object({ message: z.string(), status: z.string(), execution_id: z.string() }),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        }
      }
    },
    executions: {
      get: {
        method: 'GET' as const,
        path: '/api/bolna/executions/:id',
        responses: {
          200: z.any(), // Raw execution object
          404: errorSchemas.notFound,
        }
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
