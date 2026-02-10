import { db } from "../db";
import { agents, executions } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function processBolnaWebhook(payload: any) {
  const bolnaExecId = payload?.execution_id || payload?.id || payload?.execution?.id;
  const bolnaAgentId = payload?.agent_id || payload?.execution?.agent_id || payload?.agent;
  if (!bolnaExecId || !bolnaAgentId) {
    const err: any = new Error("Missing execution or agent id");
    err.status = 400;
    throw err;
  }

  // find agent
  const [agent] = await db.select().from(agents).where(eq(agents.bolna_agent_id, String(bolnaAgentId)));
  if (!agent) {
    const err: any = new Error("Agent not found");
    err.status = 404;
    throw err;
  }

  const transcript = payload?.transcript || payload?.result?.transcript || "";
  const recording_url = payload?.recording_url || payload?.result?.recording_url || payload?.recording?.url || null;
  const duration = payload?.duration || payload?.result?.duration || null;

  // upsert execution
  const [existing] = await db.select().from(executions).where(eq(executions.bolna_execution_id, String(bolnaExecId)));
  if (existing) {
    await db.update(executions).set({ transcript, recording_url, duration: duration ? String(duration) : null }).where(eq(executions.bolna_execution_id, String(bolnaExecId)));
    return { updated: true };
  } else {
    const [inserted] = await db.insert(executions).values({ agent_id: agent.id, tenant_id: agent.tenant_id, bolna_execution_id: String(bolnaExecId), transcript, recording_url: recording_url || undefined, duration: duration ? String(duration) : undefined }).returning();
    return { inserted };
  }
}
