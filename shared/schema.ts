import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Store API configuration (e.g., Bolna API Key)
export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., "BOLNA_API_KEY"
  value: text("value").notNull(),      // The actual API key
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApiConfigSchema = createInsertSchema(apiConfigurations);

// === BOLNA API TYPES ===

// 1. Agent Configuration
// Based on v2 docs: agent_config object
export const agentConfigSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required"),
  agent_welcome_message: z.string().min(1, "Welcome message is required"),
  webhook_url: z.string().url("Invalid Webhook URL").optional(), // Docs say required but maybe optional in some contexts? Sticking to docs: required.
  tasks: z.array(z.any()), // Complex nested structure, keeping as any for flexibility for now
  agent_type: z.string().optional(), // v1 had it, v2 overview didn't explicitly detail it but good to have
});

export const agentPromptsSchema = z.record(z.any()); // "task_1": { system_prompt: ... }

export const createAgentRequestSchema = z.object({
  agent_config: agentConfigSchema,
  agent_prompts: agentPromptsSchema.optional(),
});

export const updateAgentRequestSchema = createAgentRequestSchema.partial();

// 2. Call Configuration
export const makeCallRequestSchema = z.object({
  agent_id: z.string().uuid("Invalid Agent ID"),
  recipient_phone_number: z.string().min(1, "Recipient phone number is required"),
  from_phone_number: z.string().min(1, "From phone number is required"),
  scheduled_at: z.string().datetime().optional(),
  user_data: z.record(z.any()).optional(),
});

// 3. Execution/Response Types
export const agentResponseSchema = z.object({
  agent_id: z.string(),
  status: z.string(),
});

export const callResponseSchema = z.object({
  message: z.string(),
  status: z.string(),
  execution_id: z.string(),
});

// Explicit Types
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = z.infer<typeof insertApiConfigSchema>;
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>;
export type UpdateAgentRequest = z.infer<typeof updateAgentRequestSchema>;
export type MakeCallRequest = z.infer<typeof makeCallRequestSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type CallResponse = z.infer<typeof callResponseSchema>;
