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
    // v2 endpoint from overview: GET /v2/agent/all
    // v1 example was: GET /agent/all (from intro)
    // Let's try v2 first as per docs override.
    const headers = await this.getHeaders();
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/all`, { headers });
    
    if (!response.ok) {
       // Fallback to v1 if v2 fails 404? 
       // Docs said v2 is the way. Let's stick to v2.
       // If 404, maybe try /agent
       if (response.status === 404) {
          const v1Response = await fetch(`${BOLNA_API_URL}/agent/all`, { headers });
          if (!v1Response.ok) throw new Error(`Failed to fetch agents: ${v1Response.statusText}`);
          return v1Response.json();
       }
       const text = await response.text();
       throw new Error(`Failed to fetch agents: ${response.status} ${text}`);
    }
    return response.json();
  }

  async createAgent(data: any) {
    const headers = await this.getHeaders();
    // Docs say POST /v2/agent
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
    // Guessing GET /v2/agent/:id based on standard REST
    const response = await fetch(`${BOLNA_API_URL}/v2/agent/${id}`, { headers });
    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to get agent: ${response.status} ${text}`);
    }
    return response.json();
  }

  async updateAgent(id: string, data: any) {
    const headers = await this.getHeaders();
    // Docs: PUT /v2/agent/:agent_id
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
    // Docs v1: POST /call
    // Is there v2? Overview didn't list call endpoints. Sticking to v1 for calls.
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
    // Docs v1: GET /executions/:id
    const response = await fetch(`${BOLNA_API_URL}/executions/${id}`, { headers });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Failed to get execution: ${response.status} ${text}`);
    }
    return response.json();
  }
}

export const bolnaService = new BolnaService();
