import "dotenv/config";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { users, agents } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    const bolnaKey = process.env.BOLNA_API_KEY || "test_bolna_key";
    console.log("Seeding API key...");
    await storage.saveApiKey("BOLNA_API_KEY", bolnaKey);

    console.log("Seeding test user and agent...");
    // Upsert or use existing user by email to avoid duplicate errors during repeated seeds
    let [user] = await db.select().from(users).where(eq(users.email, "dev@example.com"));
    if (!user) {
      [user] = await db.insert(users).values({ name: "Dev User", email: "dev@example.com", bolna_sub_account_id: "dev-sub-1" }).returning();
      console.log("Created user", user.id);
    } else {
      console.log("User already exists", user.id);
    }

    const sampleAgentConfig = {
      agent_name: "Dev Agent",
      agent_welcome_message: "Hello from Dev Agent",
      tasks: [
        {
          task_type: "conversation",
          toolchain: { execution: "parallel", pipelines: [["transcriber","llm","synthesizer"]] },
          task_config: {
            transcriber: { model: "deepgram", language: "en", sampling_rate: 16000, stream: true },
            llm: { model: "gpt-4o", max_tokens: 100, temperature: 0.7, family: "openai" },
            synthesizer: { model: "elevenlabs", voice: "rachel", sampling_rate: 16000, stream: true }
          }
        }
      ]
    };

    const [agent] = await db.insert(agents).values({
      user_id: user.id,
      bolna_agent_id: `dev-agent-${Date.now()}`,
      agent_name: sampleAgentConfig.agent_name,
      status: "created",
      agent_config: JSON.stringify(sampleAgentConfig),
      agent_prompts: JSON.stringify({ task_1: { system_prompt: "You are a helpful assistant." } })
    }).returning();

    console.log("Seed complete:", { userId: user.id, agentId: agent.id });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
