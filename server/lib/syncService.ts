import { db } from "../db";
import { agents, phoneNumbers, users, executions } from "@shared/schema";
import { eq, ne } from "drizzle-orm";
import { bolnaService } from "./bolna";

export async function syncAgentsWithBolna(tenantId: number, subAccountId: string) {
  try {
    // Fetch agents from ThinkVoiceAPI
    const bolnaAgents = await bolnaService.listAgents(subAccountId);
    const bolnaAgentIds = new Set(bolnaAgents.map((a: any) => a.agent_id || a.id));

    // Get local database agents
    const localAgents = await db.select().from(agents).where(eq(agents.tenant_id, tenantId));

    let deletedAgents = 0;
    // Delete orphaned agents (exist in DB but not in Bolna)
    for (const localAgent of localAgents) {
      if (!bolnaAgentIds.has(localAgent.bolna_agent_id)) {
        await db.delete(agents).where(eq(agents.id, localAgent.id));
        console.log(`[SYNC] Deleted orphaned agent: ${localAgent.agent_name} (${localAgent.bolna_agent_id})`);
        deletedAgents++;
      }
    }

    // Fetch phone numbers from ThinkVoiceAPI
    const bolnaPhones = await bolnaService.listPhoneNumbers(subAccountId);
    const bolnaPhoneIds = new Set(bolnaPhones.map((p: any) => p.phone_number_id || p.id));

    // Get local database phone numbers
    const localPhones = await db.select().from(phoneNumbers).where(eq(phoneNumbers.tenant_id, tenantId));

    let deletedPhones = 0;
    // Delete orphaned phone numbers (exist in DB but not in Bolna)
    for (const localPhone of localPhones) {
      if (!bolnaPhoneIds.has(localPhone.bolna_phone_id)) {
        await db.delete(phoneNumbers).where(eq(phoneNumbers.id, localPhone.id));
        console.log(`[SYNC] Deleted orphaned phone: ${localPhone.phone_number} (${localPhone.bolna_phone_id})`);
        deletedPhones++;
      }
    }

    // Clean up inactive/test users (keep only active users with valid roles)
    const localUsers = await db.select().from(users).where(eq(users.tenant_id, tenantId));
    let deletedUsers = 0;
    for (const user of localUsers) {
      // Keep admin users and active users, remove inactive or test users
      if (user.status === 'inactive' || user.email.includes('test')) {
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`[SYNC] Deleted inactive/test user: ${user.email}`);
        deletedUsers++;
      }
    }

    // Sync executions automatically
    const executionsResult = await syncExecutionsWithBolna(tenantId, subAccountId);

    console.log(`[SYNC] Sync completed for tenant ${tenantId}: ${deletedAgents} agents, ${deletedPhones} phones, ${deletedUsers} users deleted, ${executionsResult.syncedCount} executions synced`);
    return { success: true, deletedAgents, deletedPhones, deletedUsers, syncedExecutions: executionsResult.syncedCount };
  } catch (error: any) {
    console.error('[SYNC] Error syncing:', error.message);
    throw error;
  }
}

export async function syncExecutionsWithBolna(tenantId: number, subAccountId: string) {
  try {
    console.log(`[SYNC EXECUTIONS] Starting sync for tenant ${tenantId}`);
    
    // Get all agents for this tenant
    const localAgents = await db.select().from(agents).where(eq(agents.tenant_id, tenantId));
    
    let syncedCount = 0;
    
    // For each agent, fetch executions from ThinkVoiceand sync to DB
    for (const agent of localAgents) {
      try {
        const executionsData = await bolnaService.fetchExecutions(
          agent.bolna_agent_id,
          subAccountId,
          { page_size: 100, page_number: 1 }
        );
        
        if (executionsData?.data) {
          for (const exec of executionsData.data) {
            const executionId = exec.id || exec.execution_id;
            
            // Check if execution already exists
            const [existing] = await db.select()
              .from(executions)
              .where(eq(executions.bolna_execution_id, executionId));
            
            if (!existing) {
              // Insert new execution
              await db.insert(executions).values({
                tenant_id: tenantId,
                agent_id: agent.id,
                bolna_execution_id: executionId,
                transcript: exec.transcript || '',
                recording_url: exec.recording_url || null,
                duration: exec.conversation_time || exec.duration || null,
              });
              syncedCount++;
            }
          }
        }
      } catch (err: any) {
        console.error(`[SYNC EXECUTIONS] Error syncing agent ${agent.bolna_agent_id}:`, err.message);
      }
    }
    
    console.log(`[SYNC EXECUTIONS] Synced ${syncedCount} executions for tenant ${tenantId}`);
    return { success: true, syncedCount };
  } catch (error: any) {
    console.error('[SYNC EXECUTIONS] Error:', error.message);
    throw error;
  }
}
