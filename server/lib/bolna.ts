import { storage } from "../storage";

const BOLNA_API_URL = "https://api.bolna.ai";

export class BolnaService {
  private async getHeaders() {
    const apiKey = await storage.getApiKey("BOLNA_API_KEY");
    if (!apiKey) {
      throw new Error("Bolna API Key not configured");
    }
    return {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async listAgents() {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/all`, { headers });
    
    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to fetch agents: ${response.status} ${text}`);
    }
    return response.json();
  }

  async createAgent(data: any) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to create agent: ${response.status} ${text}`);
    }
    return response.json();
  }

  async getAgent(id: string) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/${id}`, { headers });
    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to get agent: ${response.status} ${text}`);
    }
    return response.json();
  }

  async updateAgent(id: string, data: any) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to update agent: ${response.status} ${text}`);
    }
    return response.json();
  }

  async makeCall(data: any) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/call`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to make call: ${response.status} ${text}`);
    }
    return response.json();
  }

  async getExecution(id: string) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/executions/${id}`, { headers });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to get execution: ${response.status} ${text}`);
    }
    return response.json();
  }

  async listExecutions(agentId: string) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/${agentId}/executions`, { headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to list executions: ${response.status} ${text}`);
    }
    return response.json();
  }

  async deleteAgent(id: string) {
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/${id}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete agent: ${response.status} ${text}`);
    }
    return response.json();
  }
}

export const bolnaService = new BolnaService();
