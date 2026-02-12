import { pgTable, text, integer, serial, timestamp, json } from "drizzle-orm/pg-core";
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

// === MULTI-TENANT TABLES ===

// Super Admin table
export const superAdmins = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Tenants (Companies)
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // company.bolna-saas.com
  bolna_sub_account_id: text("bolna_sub_account_id").notNull().unique(),
  plan: text("plan").notNull().default("starter"), // starter, pro, enterprise
  status: text("status").notNull().default("active"), // active, suspended, cancelled
  settings: json("settings").default({}),
  created_at: timestamp("created_at").defaultNow(),
});

// Users within tenants
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  tenant_id: integer("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  // Some databases include bolna_sub_account_id on users (legacy). Include it here to match DB and avoid insert failures.
  bolna_sub_account_id: text("bolna_sub_account_id").notNull(),
  role: text("role").notNull().default("agent"), // admin, manager, agent
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertSuperAdminSchema = createInsertSchema(superAdmins);
export const insertTenantSchema = createInsertSchema(tenants);
export const insertUserSchema = createInsertSchema(users);

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  tenant_id: integer("tenant_id").notNull().references(() => tenants.id),
  user_id: integer("user_id").notNull().references(() => users.id),
  bolna_agent_id: text("bolna_agent_id").notNull().unique(),
  agent_name: text("agent_name").notNull(),
  status: text("status").notNull().default("created"),
  agent_config: json("agent_config").notNull(),
  agent_prompts: json("agent_prompts").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Admin audit logs for actions like impersonation
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  admin_id: integer("admin_id"),
  impersonator_id: integer("impersonator_id"),
  tenant_id: integer("tenant_id"),
  details: json("details").default({}),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertAdminAuditSchema = createInsertSchema(adminAuditLogs);

export const insertAgentSchema = createInsertSchema(agents);

export const executions = pgTable("executions", {
  id: serial("id").primaryKey(),
  tenant_id: integer("tenant_id").notNull().references(() => tenants.id),
  agent_id: integer("agent_id").notNull().references(() => agents.id),
  bolna_execution_id: text("bolna_execution_id").notNull().unique(),
  transcript: text("transcript").default(""),
  recording_url: text("recording_url"),
  duration: text("duration"),
  created_at: timestamp("created_at").defaultNow(),
});

// Phone Numbers per tenant
export const phoneNumbers = pgTable("phone_numbers", {
  id: serial("id").primaryKey(),
  tenant_id: integer("tenant_id").notNull().references(() => tenants.id),
  bolna_phone_id: text("bolna_phone_id").notNull().unique(),
  phone_number: text("phone_number").notNull(),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow(),
});

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  tenant_id: integer("tenant_id").notNull().references(() => tenants.id),
  agent_id: integer("agent_id").notNull().references(() => agents.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft, running, paused, completed
  contacts: json("contacts").notNull(), // Array of phone numbers and metadata
  schedule: json("schedule").default({}),
  created_at: timestamp("created_at").defaultNow(),
});

// === AUTH SCHEMAS ===
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  admin_name: z.string().min(1),
  admin_email: z.string().email(),
  admin_password: z.string().min(6),
  plan: z.enum(["starter", "pro", "enterprise"]).default("starter"),
  // Optional: allow super-admin to supply an existing ThinkVoicesub-account ID when automatic creation is disabled
  sub_account_id: z.string().min(1).optional().or(z.literal('')),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "manager", "agent"]).default("agent"),
});

export const updateUserSchema = createUserSchema.partial();

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  agent_id: z.number(),
  contacts: z.array(z.object({
    phone: z.string(),
    name: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  schedule: z.object({
    start_time: z.string().datetime().optional(),
    timezone: z.string().default("UTC"),
    batch_size: z.number().default(10),
    delay_between_calls: z.number().default(30), // seconds
  }).optional(),
});

export const insertExecutionSchema = createInsertSchema(executions);

// === ThinkVoiceAPI TYPES ===

// New ThinkVoiceAPI v2 structure
export const llmAgentConfigSchema = z.object({
  agent_type: z.string().default("simple_llm_agent"),
  agent_flow_type: z.string().default("streaming"),
  routes: z.object({
    embedding_model: z.string().optional(),
    routes: z.array(z.object({
      route_name: z.string(),
      utterances: z.array(z.string()),
      response: z.string(),
      score_threshold: z.number()
    })).optional()
  }).optional(),
  llm_config: z.object({
    agent_flow_type: z.string().default("streaming"),
    provider: z.string().default("openai"),
    family: z.string().default("openai"),
    model: z.string().default("gpt-4o-mini"),
    summarization_details: z.any().nullable().optional(),
    extraction_details: z.any().nullable().optional(),
    max_tokens: z.number().default(150),
    presence_penalty: z.number().default(0),
    frequency_penalty: z.number().default(0),
    base_url: z.string().optional(),
    top_p: z.number().default(0.9),
    min_p: z.number().default(0.1),
    top_k: z.number().default(0),
    temperature: z.number().default(0.1),
    request_json: z.boolean().default(false)
  })
});

export const synthesizerConfigSchema = z.object({
  provider: z.string().default("elevenlabs"),
  provider_config: z.object({
    voice: z.string().optional(),
    voice_id: z.string().optional(),
    model: z.string().optional()
  }).optional(),
  stream: z.boolean().default(true),
  buffer_size: z.number().default(250),
  audio_format: z.string().default("wav")
});

export const transcriberConfigSchema = z.object({
  provider: z.string().default("deepgram"),
  model: z.string().default("nova-3"),
  language: z.string().default("en"),
  stream: z.boolean().default(true),
  sampling_rate: z.number().default(16000),
  encoding: z.string().default("linear16"),
  endpointing: z.number().default(250)
});

export const toolsConfigSchema = z.object({
  llm_agent: llmAgentConfigSchema,
  synthesizer: synthesizerConfigSchema,
  transcriber: transcriberConfigSchema,
  input: z.object({
    provider: z.string().default("plivo"),
    format: z.string().default("wav")
  }),
  output: z.object({
    provider: z.string().default("plivo"),
    format: z.string().default("wav")
  }),
  api_tools: z.any().nullable().optional()
});

export const taskConfigSchema = z.object({
  hangup_after_silence: z.number().default(10),
  incremental_delay: z.number().default(400),
  number_of_words_for_interruption: z.number().default(2),
  hangup_after_LLMCall: z.boolean().default(false),
  call_cancellation_prompt: z.string().nullable().optional(),
  backchanneling: z.boolean().default(false),
  backchanneling_message_gap: z.number().default(5),
  backchanneling_start_delay: z.number().default(5),
  ambient_noise: z.boolean().default(false),
  ambient_noise_track: z.string().default("office-ambience"),
  call_terminate: z.number().default(90),
  voicemail: z.boolean().default(false),
  inbound_limit: z.number().default(-1),
  whitelist_phone_numbers: z.array(z.string()).nullable().optional(),
  disallow_unknown_numbers: z.boolean().default(false)
});

export const newTaskSchema = z.object({
  task_type: z.string().default("conversation"),
  tools_config: toolsConfigSchema,
  toolchain: z.object({
    execution: z.string().default("parallel"),
    pipelines: z.array(z.array(z.string())).default([["transcriber", "llm", "synthesizer"]])
  }),
  task_config: taskConfigSchema
});

export const ingestSourceConfigSchema = z.object({
  source_type: z.string().default("api"),
  source_url: z.string().optional(),
  source_auth_token: z.string().optional(),
  source_name: z.string().optional()
});

export const callingGuardrailsSchema = z.object({
  call_start_hour: z.number().default(9),
  call_end_hour: z.number().default(17)
});

export const newAgentConfigSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required"),
  tasks: z.array(newTaskSchema).min(1, "At least one task is required"),
  agent_welcome_message: z.string().optional(),
  webhook_url: z.string().url("Invalid Webhook URL").optional().or(z.literal("")).nullable(),
  agent_type: z.string().default("other"),
  ingest_source_config: ingestSourceConfigSchema.optional(),
  calling_guardrails: callingGuardrailsSchema.optional()
});

// Legacy schema for backward compatibility
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
    incremental_transcription: z.boolean().optional(),
    number_of_words_to_wait_for_before_interrupting: z.number().optional(),
  }),
});

export const analyticsConfigSchema = z.object({
  summarization: z.boolean().optional(),
  extraction_details: z.string().optional(),
});

export const agentConfigSchema = z.object({
  agent_name: z.string().min(1, "Agent name is required"),
  agent_welcome_message: z.string().min(1, "Welcome message is required"),
  webhook_url: z.string().url("Invalid Webhook URL").optional().or(z.literal("")),
  tasks: z.array(taskSchema).min(1, "At least one task is required"),
  analytics_config: analyticsConfigSchema.optional(),
});

export const agentPromptsSchema = z.record(z.object({
  system_prompt: z.string().min(1, "System prompt is required"),
}));

export const createAgentRequestSchema = z.union([
  // New ThinkVoiceAPI v2 structure
  z.object({
    agent_config: newAgentConfigSchema,
    agent_prompts: agentPromptsSchema,
  }),
  // Legacy structure for backward compatibility
  z.object({
    agent_config: agentConfigSchema,
    agent_prompts: agentPromptsSchema,
  })
]);

// Update schema: accept partial updates for either the new or legacy structure.
// agentPromptsSchema is a record; create an update variant where system_prompt is optional
export const agentPromptsUpdateSchema = z.record(z.object({ system_prompt: z.string().min(1, "System prompt is required").optional() }));

export const updateAgentRequestSchema = z.union([
  z.object({ agent_config: newAgentConfigSchema.partial(), agent_prompts: agentPromptsUpdateSchema.optional() }),
  z.object({ agent_config: agentConfigSchema.partial(), agent_prompts: agentPromptsUpdateSchema.optional() })
]);

export const makeCallRequestSchema = z.object({
  agent_id: z.string().uuid("Invalid agent ID format"),
  recipient_phone_number: z.string().min(1, "Recipient phone number is required"),
  from_phone_number: z.string().optional(),
  scheduled_at: z.string().optional(),
  user_data: z.record(z.any()).optional(),
  retry_config: z.object({
    enabled: z.boolean().default(false),
    max_retries: z.number().min(1).max(3).default(3),
    retry_on_statuses: z.array(z.enum(["no-answer", "busy", "failed", "error"])).default(["no-answer", "busy", "failed"]),
    retry_on_voicemail: z.boolean().default(false),
    retry_intervals_minutes: z.array(z.number()).default([30, 60, 120])
  }).optional(),
  bypass_call_guardrails: z.boolean().default(false)
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

// === TYPES ===
export type SuperAdmin = typeof superAdmins.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type Execution = typeof executions.$inferSelect;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterTenantRequest = z.infer<typeof registerTenantSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>;

// Explicit Types
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;
export type InsertApiConfiguration = z.infer<typeof insertApiConfigSchema>;
export type CreateAgentRequest = z.infer<typeof createAgentRequestSchema>;
export type UpdateAgentRequest = z.infer<typeof updateAgentRequestSchema>;
export type MakeCallRequest = z.infer<typeof makeCallRequestSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type CallResponse = z.infer<typeof callResponseSchema>;

// === PHONE NUMBERS ===

export const searchPhoneNumberSchema = z.object({
  country: z.string().default("US"),
  state: z.string().optional(),
  city: z.string().optional(),
  area_code: z.string().optional(),
  contains: z.string().optional(),
  limit: z.number().max(50).default(10),
});

export const buyPhoneNumberRequestSchema = z.object({
  phone_number: z.string(),
  // Some APIs might require address_id etc. ThinkVoicedocs just say POST /phone-numbers/buy with body?
  // Checking docs earlier: /docs/api-reference/phone-numbers/buy (POST)
  // We'll assume just phone_number for now or check docs if failed.
});

// === INBOUND AGENTS ===

export const setInboundAgentSchema = z.object({
  agent_id: z.string(),
  phone_number_id: z.string(), // ThinkVoicerequires phone_number_id, not listing raw number
});

export const unlinkInboundAgentSchema = z.object({
  phone_number_id: z.string(),
});

export type SearchPhoneNumberRequest = z.infer<typeof searchPhoneNumberSchema>;
export type BuyPhoneNumberRequest = z.infer<typeof buyPhoneNumberRequestSchema>;
export type SetInboundAgentRequest = z.infer<typeof setInboundAgentSchema>;
export type UnlinkInboundAgentRequest = z.infer<typeof unlinkInboundAgentSchema>;
