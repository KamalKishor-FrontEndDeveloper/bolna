import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { bolnaService } from "./lib/bolna";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // API Key Management
  app.post(api.keys.save.path, async (req, res) => {
    try {
      const { key, value } = req.body;
      const config = await storage.saveApiKey(key, value);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to save API key" });
    }
  });

  app.get(api.keys.get.path, async (req, res) => {
    const key = req.params.key;
    const value = await storage.getApiKey(key);
    res.json({ value: value ? "********" : undefined }); // Masked for security
  });

  // Bolna Proxy Routes
  
  // Agents
  app.get(api.bolna.agents.list.path, async (req, res) => {
    try {
      const agents = await bolnaService.listAgents();
      res.json(agents);
    } catch (error: any) {
      if (error.message.includes("not configured")) {
        return res.status(401).json({ message: "API Key not configured" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post(api.bolna.agents.create.path, async (req, res) => {
    try {
      // Validate with our schema first, but pass raw body to Bolna as it might be complex
      // const input = api.bolna.agents.create.input.parse(req.body);
      const result = await bolnaService.createAgent(req.body);
      res.status(201).json(result);
    } catch (error: any) {
       if (error.message.includes("not configured")) {
        return res.status(401).json({ message: "API Key not configured" });
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.get(api.bolna.agents.get.path, async (req, res) => {
    try {
      const agent = await bolnaService.getAgent(req.params.id);
      res.json(agent);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  app.put(api.bolna.agents.update.path, async (req, res) => {
    try {
      const result = await bolnaService.updateAgent(req.params.id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(api.bolna.agents.delete.path, async (req, res) => {
    try {
      const result = await bolnaService.deleteAgent(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get(api.bolna.agents.executions.path, async (req, res) => {
    try {
      const result = await bolnaService.listExecutions(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Calls
  app.post(api.bolna.calls.make.path, async (req, res) => {
    try {
      // const input = api.bolna.calls.make.input.parse(req.body);
      const result = await bolnaService.makeCall(req.body);
      res.json(result);
    } catch (error: any) {
       if (error.message.includes("not configured")) {
        return res.status(401).json({ message: "API Key not configured" });
      }
      res.status(400).json({ message: error.message });
    }
  });

  // Executions
  app.get(api.bolna.executions.get.path, async (req, res) => {
    try {
      const execution = await bolnaService.getExecution(req.params.id);
      res.json(execution);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  // Knowledgebase
  app.get(api.bolna.knowledgebase.list.path, async (req, res) => {
    try {
      const result = await bolnaService.listKnowledgebases();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(api.bolna.knowledgebase.create.path, async (req, res) => {
    try {
      const result = await bolnaService.createKnowledgebase(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(api.bolna.knowledgebase.delete.path, async (req, res) => {
    try {
      const result = await bolnaService.deleteKnowledgebase(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  });

  return httpServer;
}
