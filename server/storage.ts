import { apiConfigurations, type ApiConfiguration, type InsertApiConfiguration } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // API Configuration
  getApiKey(key: string): Promise<string | undefined>;
  saveApiKey(key: string, value: string): Promise<ApiConfiguration>;
}

export class DatabaseStorage implements IStorage {
  async getApiKey(key: string): Promise<string | undefined> {
    const [config] = await db.select().from(apiConfigurations).where(eq(apiConfigurations.key, key));
    return config?.value;
  }

  async saveApiKey(key: string, value: string): Promise<ApiConfiguration> {
    const [existing] = await db.select().from(apiConfigurations).where(eq(apiConfigurations.key, key));
    
    if (existing) {
      const [updated] = await db.update(apiConfigurations)
        .set({ value, updatedAt: new Date() })
        .where(eq(apiConfigurations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(apiConfigurations)
        .values({ key, value })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
