import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), 
  value: text("value").notNull(),      
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApiConfigSchema = createInsertSchema(apiConfigurations);

// === BOLNA API TYPES ===

export const transcriberSchema = z.object({
  model: z.string().default("deepgram"),
  language: z.string().default("en"),
  sampling_rate: z.number().default(16000),
  stream: z.boolean().default(true),
});

export const llmSchema = z.object({
  model: z.string().default("gpt-4o"),
  max_tokens: z.number().default(100),
  temperature: z.number().default(0.7),
  family: z.string().default("openai"),
});

export const synthesizerSchema = z.object({
  model: z.string().default("elevenlabs"),
  voice: z.string().default("rachel"),
  voice_id: z.string().optional(),
  sampling_rate: z.number().default(16000),
  stream: z.boolean().default(true),
});

export const taskSchema = z.object({
  task_type: z.string().default("conversation"),
  toolchain: z.object({
    execution: z.string().default("parallel"),
    pipelines: z.array(z.array(z.string())).default([["transcriber", "llm", "synthesizer"]]),
  }),
  task_config: z.object({
    transcriber: transcriberSchema,
    llm: llmSchema,
    synthesizer: synthesizerSchema,
  }),
});

export const agentConfigSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required"),
  agent_welcome_message: z.string().min(1, "Welcome message is required"),
  webhook_url: z.string().url("Invalid Webhook URL").optional().or(z.literal("")),
  tasks: z.array(taskSchema).min(1, "At least one task is required"),
});

export const agentPromptsSchema = z.record(z.object({
  system_prompt: z.string().min(1, "System prompt is required"),
}));

export const createAgentRequestSchema = z.object({
  agent_config: agentConfigSchema,
  agent_prompts: agentPromptsSchema,
});

export const updateAgentRequestSchema = createAgentRequestSchema.partial();

export const makeCallRequestSchema = z.object({
  agent_id: z.string(),
  recipient_phone_number: z.string().min(1, "Recipient phone number is required"),
  from_phone_number: z.string().min(1, "From phone number is required"),
  scheduled_at: z.string().datetime().optional(),
  user_data: z.record(z.any()).optional(),
});

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
