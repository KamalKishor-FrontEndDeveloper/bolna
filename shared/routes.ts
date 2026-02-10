import { z } from 'zod';
import { createAgentRequestSchema, makeCallRequestSchema, updateAgentRequestSchema, insertApiConfigSchema, apiConfigurations, loginSchema, registerTenantSchema, createUserSchema, createCampaignSchema } from './schema';

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
  // === SUPER ADMIN ROUTES ===
  superAdmin: {
    login: {
      method: 'POST' as const,
      path: '/api/super-admin/login',
      input: loginSchema,
      responses: {
        200: z.object({ token: z.string(), admin: z.any() }),
        401: errorSchemas.unauthorized,
      }
    },
    tenants: {
      list: {
        method: 'GET' as const,
        path: '/api/super-admin/tenants',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      create: {
        method: 'POST' as const,
        path: '/api/super-admin/tenants',
        input: registerTenantSchema,
        responses: {
          201: z.any(),
          400: errorSchemas.validation,
        }
      }
    }
  },
  
  // === TENANT AUTH ===
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: loginSchema,
      responses: {
        200: z.object({ token: z.string(), user: z.any(), tenant: z.any() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  
  // === TENANT MANAGEMENT ===
  tenant: {
    limits: {
      method: 'GET' as const,
      path: '/api/tenant/limits',
      responses: {
        200: z.object({
          plan: z.string(),
          limits: z.any(),
          usage: z.any()
        }),
        401: errorSchemas.unauthorized,
      }
    },
    users: {
      list: {
        method: 'GET' as const,
        path: '/api/tenant/users',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      create: {
        method: 'POST' as const,
        path: '/api/tenant/users',
        input: createUserSchema,
        responses: {
          201: z.any(),
          400: errorSchemas.validation,
        }
      }
    },
    campaigns: {
      list: {
        method: 'GET' as const,
        path: '/api/tenant/campaigns',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      create: {
        method: 'POST' as const,
        path: '/api/tenant/campaigns',
        input: createCampaignSchema,
        responses: {
          201: z.any(),
          400: errorSchemas.validation,
        }
      }
    }
  },
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
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/bolna/agents/:id',
        responses: {
          200: z.any(),
          404: errorSchemas.notFound,
        }
      },
      executions: {
        method: 'GET' as const,
        path: '/api/bolna/agents/:id/executions',
        responses: {
          200: z.any(),
          404: errorSchemas.notFound,
        }
      },
      batches: {
        method: 'GET' as const,
        path: '/api/bolna/batches',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      agentBatches: {
        method: 'GET' as const,
        path: '/api/bolna/agents/:id/batches',
        responses: {
          200: z.array(z.any()),
          404: errorSchemas.notFound,
        }
      },
      createBatch: {
        method: 'POST' as const,
        path: '/api/bolna/batches',
        responses: {
          201: z.any(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        }
      },
      scheduleBatch: {
        method: 'POST' as const,
        path: '/api/bolna/batches/:id/schedule',
        responses: {
          200: z.any(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
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
      },
      list: {
        method: 'GET' as const,
        path: '/api/bolna/executions',
        responses: {
          200: z.any(), // List of executions
          401: errorSchemas.unauthorized,
        }
      }
    },
    knowledgebase: {
      list: {
        method: 'GET' as const,
        path: '/api/bolna/knowledgebase',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      // Available LLMs and ASRs (proxied from Bolna)
      models: {
        list: {
          method: 'GET' as const,
          path: '/user/model/all',
          responses: {
            200: z.any(),
            401: errorSchemas.unauthorized,
          }
        },
        addCustom: {
          method: 'POST' as const,
          path: '/api/bolna/models/custom',
          input: z.object({
            custom_model_name: z.string(),
            custom_model_url: z.string().url()
          }),
          responses: {
            200: z.object({
              message: z.string(),
              status: z.enum(['added'])
            }),
            400: errorSchemas.validation,
          }
        }
      },
      create: {
        method: 'POST' as const,
        path: '/api/bolna/knowledgebase',
        responses: {
          201: z.any(),
          400: errorSchemas.validation,
        }
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/bolna/knowledgebase/:id',
        responses: {
          200: z.any(),
          404: errorSchemas.notFound,
        }
      }
    },
    phoneNumbers: {
      list: {
        method: 'GET' as const,
        path: '/api/bolna/phone-numbers',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      voices: {
        method: 'GET' as const,
        path: '/api/bolna/voices',
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      search: {
        method: 'GET' as const,
        path: '/api/bolna/phone-numbers/search',
        // query params: country, state, city, area_code, contains, limit
        responses: {
          200: z.array(z.any()),
          401: errorSchemas.unauthorized,
        }
      },
      buy: {
        method: 'POST' as const,
        path: '/api/bolna/phone-numbers/buy',
        // input: buyPhoneNumberRequestSchema, // omitting for now as frontend form is simple
        responses: {
          201: z.any(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        }
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/bolna/phone-numbers/:id',
        responses: {
          200: z.any(),
          404: errorSchemas.notFound,
        }
      }
    },
    inbound: {
      setup: {
        method: 'POST' as const,
        path: '/api/bolna/inbound/setup',
        input: z.object({
          agent_id: z.string(),
          phone_number_id: z.string(),
          ivr_config: z.object({
            enabled: z.boolean().optional(),
            voice: z.string().optional(),
            welcome_message: z.string().optional(),
            timeout: z.number().optional(),
            max_retries: z.number().optional(),
            steps: z.array(z.any()).optional(),
            default_agent_id: z.string().optional()
          }).optional()
        }),
        responses: {
           200: z.object({
             url: z.string(),
             phone_number: z.string(),
             id: z.string()
           }),
           400: errorSchemas.validation,
        }
      },
      set: {
        method: 'POST' as const,
        path: '/api/bolna/inbound/agent',
        responses: {
           200: z.any(),
           400: errorSchemas.validation,
        }
      },
      unlink: {
        method: 'POST' as const,
        path: '/api/bolna/inbound/unlink',
        input: z.object({
          phone_number_id: z.string()
        }),
        responses: {
           200: z.object({
             url: z.string().nullable(),
             phone_number: z.string(),
             id: z.string()
           }),
           400: errorSchemas.validation,
        }
      }
    }
  },
  users: {
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: z.object({ name: z.string(), email: z.string().email() }),
      responses: {
        201: z.any(),
        400: z.object({ message: z.string() }),
        401: z.object({ message: z.string() }),
      }
    }
  },
  webhooks: {
    bolna: {
      method: 'POST' as const,
      path: '/api/webhooks/bolna',
      responses: {
        200: z.object({ message: z.string() }),
        400: z.object({ message: z.string() }),
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
