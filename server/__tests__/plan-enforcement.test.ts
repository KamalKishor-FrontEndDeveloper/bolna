import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";

// We'll mock auth middleware to inject a tenant/user for testing
vi.mock("../auth", () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requireTenantUser: async (req: any, res: any, next: any) => {
      req.tenant = { id: 1, plan: "starter", bolna_sub_account_id: "sub-1" };
      req.user = { id: 1, role: "admin" };
      return next();
    },
    // Keep other exports if needed
    requireSuperAdmin: async (_req: any, _res: any, next: any) => next(),
    requireRole: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
  };
});

// Mock db module with flexible handlers per-test
const db = {
  select: vi.fn(),
  insert: vi.fn(() => ({ values: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) })),
  update: vi.fn(() => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) }) })),
};
vi.mock("../db", () => ({ db }));

import { registerRoutes } from "../routes";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Plan enforcement", () => {
  it("blocks agent creation when plan lacks api_access", async () => {
    // Select count for agents -> return 0
    db.select.mockImplementation(() => ({ from: () => ({ where: () => Promise.resolve([{ count: 0 }]) }) }));

    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).post('/api/tenant/agents').send({ agent_config: { agent_name: 'A', tasks: [] }, agent_prompts: {} });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/plan does not include API access/i);
  });

  it("blocks campaign creation when campaign limit reached", async () => {
    // For campaign count return current = 2 (starter limit)
    db.select.mockImplementationOnce(() => ({ from: () => ({ where: () => Promise.resolve([{ count: 2 }]) }) }));

    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const payload = { name: 'C', agent_id: 1, contacts: [{ phone: '+123' }] };
    const res = await request(app).post('/api/tenant/campaigns').send(payload);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Plan limit reached/i);
  });

  it("blocks creating users when user limit reached", async () => {
    // For user count return current = 3 (starter limit)
    db.select.mockImplementationOnce(() => ({ from: () => ({ where: () => Promise.resolve([{ count: 3 }]) }) }));

    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const payload = { name: 'New', email: 'new@t.com', password: 'password', role: 'agent' };
    const res = await request(app).post('/api/tenant/users').send(payload);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Plan limit reached/i);
  });
});