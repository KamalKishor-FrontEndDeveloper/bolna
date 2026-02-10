import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { processBolnaWebhook } from "./lib/webhooks";
// mvpRoutes deprecated and its routes migrated into multiTenantRoutes. Removed import.
import { registerMultiTenantRoutes } from "./multiTenantRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register Multi-Tenant routes (full multi-tenant support)
  registerMultiTenantRoutes(app);

  return httpServer;
}