import { describe, it, expect, vi, beforeEach } from "vitest";

import { agents } from "@shared/schema";

vi.mock("../db", () => {
  // Minimal mock to simulate drizzle calls used by processBolnaWebhook
  const mockAgent = { id: 1, bolna_agent_id: "agent-123" };
  let executions = [] as any[];

  const dbMock = {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => {
          // If the query is against the agents table, return the mock agent
          if (table === agents) return Promise.resolve([mockAgent]);
          // If checking executions by bolna_execution_id, return empty to force insert
          const condStr = String(condition || '');
          if (condStr.includes('bolna_execution_id')) return Promise.resolve([]);
          return Promise.resolve([]);
        }
      })
    }),
    insert: () => ({
      values: (vals: any) => ({ returning: () => Promise.resolve([{ id: 1, ...vals }]) })
    }),
    update: () => ({
      set: () => ({ where: () => Promise.resolve() })
    })
  };

  return { db: dbMock };
});

import { processBolnaWebhook } from "../lib/webhooks";

describe("processBolnaWebhook", () => {
  it("errors when missing ids", async () => {
    await expect(processBolnaWebhook({ foo: 'bar' })).rejects.toMatchObject({ message: "Missing execution or agent id" });
  });

  it("inserts a new execution when none exists", async () => {
    const payload = { execution_id: "exec-1", agent_id: "agent-123", transcript: "Hello world", recording_url: "https://r.mp3", duration: 12 };
    const res = await processBolnaWebhook(payload);
    expect(res.inserted).toBeDefined();
    expect(res.inserted.bolna_execution_id).toBe(String(payload.execution_id));
  });
});
