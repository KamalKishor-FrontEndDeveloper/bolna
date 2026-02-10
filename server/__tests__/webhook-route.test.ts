import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import { createServer } from "http";
import request from "supertest";

// Mock db same as other tests
vi.mock("../db", () => {
  const mockAgent = { id: 1, bolna_agent_id: "agent-123" };
  const dbMock = {
    select: () => ({ from: () => ({ where: () => Promise.resolve([mockAgent]) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) })
  };
  return { db: dbMock };
});

import { registerRoutes } from "../routes";

describe("Webhook route", () => {
  it("returns 401 when signature missing and secret is set", async () => {
    process.env.BOLNA_WEBHOOK_SECRET = "my-secret";

    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).post('/api/webhooks/bolna').send({ execution_id: 'x', agent_id: 'agent-123' });
    expect(res.status).toBe(401);
    delete process.env.BOLNA_WEBHOOK_SECRET;
  });

  it("accepts webhook when signature valid", async () => {
    process.env.BOLNA_WEBHOOK_SECRET = "my-secret";

    const payload = { execution_id: 'exec-1', agent_id: 'agent-123' };
    const crypto = await import('crypto');
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', process.env.BOLNA_WEBHOOK_SECRET as string).update(raw).digest('hex');

    const app = express();
    app.use(express.json());
    const server = createServer(app);
    await registerRoutes(server, app);

    const res = await request(app).post('/api/webhooks/bolna').set('x-bolna-signature', sig).send(payload);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('ok');
    delete process.env.BOLNA_WEBHOOK_SECRET;
  });
});
