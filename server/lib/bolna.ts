import axios, { AxiosInstance } from "axios";
import { storage } from "../storage";

const BOLNA_API_URL = "https://api.bolna.ai";

class BolnaError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "BolnaError";
    this.status = status;
  }
}

function mapAxiosError(err: any) {
  if (err.response) {
    const status = err.response.status || 500;
    // Normalize message to a string (server may return structured JSON)
    let message: any = err.response.data?.message ?? err.response.data ?? err.message ?? `Bolna API Error ${status}`;
    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message);
      } catch (e) {
        message = String(message);
      }
    }
    console.error('[BOLNA] API error', { status, message, responseData: err.response.data });
    throw new BolnaError(message, status);
  }
  throw err;
}

export class BolnaService {
  private client: AxiosInstance | null = null;
  private cachedApiKey: string | null = null;

  private async initClient() {
    const apiKey = await storage.getApiKey("BOLNA_API_KEY");
    console.log('[BOLNA] Retrieved API key from database:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
    if (!apiKey) throw new BolnaError("Bolna API Key not configured", 401);

    // Recreate client if API key changed
    if (this.client && this.cachedApiKey === apiKey) {
      console.log('[BOLNA] Using cached client');
      return this.client;
    }

    console.log('[BOLNA] Creating new client with API key');
    this.cachedApiKey = apiKey;
    this.client = axios.create({
      baseURL: BOLNA_API_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
    return this.client;
  }

  // Create a sub-account for a new user (called during registration)
  async createSubAccount(name: string, email: string, opts?: { allow_concurrent_calls?: number; multi_tenant?: boolean; db_host?: string; db_name?: string; db_port?: string; db_user?: string; db_password?: string }) {
    try {
      const client = await this.initClient();

      const payload = Object.assign({
        name,
        allow_concurrent_calls: opts?.allow_concurrent_calls ?? 10,
        multi_tenant: opts?.multi_tenant ?? false,
        db_host: opts?.db_host ?? null,
        db_name: opts?.db_name ?? null,
        db_port: opts?.db_port ?? null,
        db_user: opts?.db_user ?? null,
        db_password: opts?.db_password ?? null,
        email: email,
      }, opts || {});

      // Official documented endpoint
      const res = await client.post('/sub-accounts/create', payload);
      console.log('[BOLNA] createSubAccount response:', res.data);
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Create an agent for a specific sub-account. Accepts a mapped Bolna payload object
  async createAgent(subAccountId: string, payload: any) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      
      // Validate required fields per Bolna v2 API spec
      if (!payload.agent_config || !payload.agent_prompts) {
        throw new BolnaError("Missing required fields: agent_config and agent_prompts", 400);
      }
      
      if (!payload.agent_config.agent_name) {
        throw new BolnaError("Missing required field: agent_config.agent_name", 400);
      }
      
      if (!payload.agent_config.tasks || !Array.isArray(payload.agent_config.tasks) || payload.agent_config.tasks.length === 0) {
        throw new BolnaError("Missing required field: agent_config.tasks (must be non-empty array)", 400);
      }
      
      // Validate voice provider matches voice_id
      const voices = await this.getVoices(subAccountId);
      const voiceList = Array.isArray(voices) ? voices : (voices?.voices || voices?.data || []);
      
      for (const task of payload.agent_config.tasks) {
        const synth = task?.tools_config?.synthesizer;
        if (synth?.provider_config?.voice_id) {
          const voiceId = synth.provider_config.voice_id;
          const voice = voiceList.find((v: any) => (v.voice_id || v.id) === voiceId);
          if (voice && voice.provider && synth.provider !== voice.provider) {
            console.log(`[BOLNA] Auto-correcting provider from '${synth.provider}' to '${voice.provider}' for voice_id '${voiceId}'`);
            synth.provider = voice.provider;
          }
        }
      }
      
      console.log('[BOLNA] Creating agent with payload:', JSON.stringify(payload, null, 2));
      const res = await client.post("/v2/agent", payload, { headers });
      console.log('[BOLNA] Agent created successfully:', res.data);
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  async updateAgent(subAccountId: string, bolnaAgentId: string, payload: any) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      
      // Validate voice provider matches voice_id
      const voices = await this.getVoices(subAccountId);
      const voiceList = Array.isArray(voices) ? voices : (voices?.voices || voices?.data || []);
      
      for (const task of (payload.agent_config?.tasks || [])) {
        const synth = task?.tools_config?.synthesizer;
        if (synth?.provider_config?.voice_id) {
          const voiceId = synth.provider_config.voice_id;
          const voice = voiceList.find((v: any) => (v.voice_id || v.id) === voiceId);
          if (voice && voice.provider && synth.provider !== voice.provider) {
            console.log(`[BOLNA] Auto-correcting provider from '${synth.provider}' to '${voice.provider}' for voice_id '${voiceId}'`);
            synth.provider = voice.provider;
          }
        }
      }
      
      const res = await client.put(`/v2/agent/${bolnaAgentId}`, payload, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  async patchAgent(subAccountId: string, bolnaAgentId: string, payload: any) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      
      // Validate voice provider if synthesizer is being updated
      if (payload.agent_config?.synthesizer) {
        const voices = await this.getVoices(subAccountId);
        const voiceList = Array.isArray(voices) ? voices : (voices?.voices || voices?.data || []);
        const synth = payload.agent_config.synthesizer;
        
        if (synth?.provider_config?.voice_id) {
          const voiceId = synth.provider_config.voice_id;
          const voice = voiceList.find((v: any) => (v.voice_id || v.id) === voiceId);
          if (voice && voice.provider && synth.provider !== voice.provider) {
            console.log(`[BOLNA] Auto-correcting provider from '${synth.provider}' to '${voice.provider}' for voice_id '${voiceId}'`);
            synth.provider = voice.provider;
          }
        }
      }
      
      console.log('[BOLNA] Patching agent with payload:', JSON.stringify(payload, null, 2));
      const res = await client.patch(`/v2/agent/${bolnaAgentId}`, payload, { headers });
      console.log('[BOLNA] Agent patched successfully:', res.data);
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Fetch a single agent's full details from Bolna (useful because list endpoints may omit some fields)
  async getAgent(subAccountId: string, bolnaAgentId: string) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      const res = await client.get(`/v2/agent/${bolnaAgentId}`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // List all agents for a sub-account (Bolna v2 endpoint: GET /v2/agent/all)
  async listAgents(subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.get('/v2/agent/all', { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Fetch available models and ASR configurations from Bolna (try several possible endpoints)
  async getModels(subAccountId?: string) {
    const client = await this.initClient();
    const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;

    const endpoints = [
      '/user/model/all',
      '/v2/model/all',
      '/v1/model/all',
      '/model/all',
      '/v2/models',
      '/models',
      '/user/models'
    ];

    // First try with tenant/sub-account header (if provided)
    for (const ep of endpoints) {
      try {
        const res = await client.get(ep, { headers });
        console.log(`[BOLNA] getModels succeeded with endpoint: ${ep} (with sub-account header)`);
        return res.data;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) {
          console.warn(`[BOLNA] ${ep} returned 404 with sub-account header, trying next endpoint`);
          continue;
        }
        mapAxiosError(err);
      }
    }

    // If we had a subAccountId and nothing worked, try again without the header (master account)
    if (subAccountId) {
      console.log('[BOLNA] getModels: trying endpoints without sub-account header');
      for (const ep of endpoints) {
        try {
          const res = await client.get(ep);
          console.log(`[BOLNA] getModels succeeded with endpoint: ${ep} (without header)`);
          return res.data;
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 404) {
            console.warn(`[BOLNA] ${ep} returned 404 without header, trying next endpoint`);
            continue;
          }
          mapAxiosError(err);
        }
      }
    }

    // If none of the endpoints returned a valid payload, fall back to a static list
    console.warn('[BOLNA] Models not available from Bolna; returning static fallback list');

    const fallback = {
      llmModels: [
        { library: 'openai', provider: 'openai', deprecated: false, base_url: null, model: 'gpt-4.1-mini', display_name: 'gpt-4.1-mini', family: 'openai' },
        { library: '', provider: 'azure', deprecated: false, base_url: 'https://bolna-ai-models.cognitiveservices.azure.com', model: 'azure/gpt-4.1-mini', display_name: 'gpt-4.1-mini cluster', family: 'azure-openai' },
        { library: '', provider: 'azure', deprecated: false, base_url: 'https://bolna-ai-models.cognitiveservices.azure.com', model: 'azure/gpt-4.1', display_name: 'gpt-4.1 cluster', family: 'azure-openai' },
        { library: 'openai', provider: 'openai', deprecated: false, base_url: null, model: 'gpt-4.1', display_name: 'gpt-4.1', family: 'openai' },
        { library: 'openai', provider: 'openai', deprecated: true, base_url: null, model: 'gpt-4.1-nano', display_name: 'gpt-4.1-nano', family: 'openai' },
        { library: '', provider: 'azure', deprecated: true, base_url: 'https://bolna-ai-models.cognitiveservices.azure.com', model: 'azure/gpt-4.1-nano', display_name: 'gpt-4.1-nano cluster', family: 'azure-openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-oss-20b', display_name: 'gpt-oss-20b', family: 'openrouter-openai' },
        { library: '', provider: 'azure', deprecated: false, base_url: 'https://bolna-ai-models.cognitiveservices.azure.com', model: 'azure/gpt-4o-mini', display_name: 'gpt-4o-mini cluster', family: 'azure-openai' },
        { library: 'openai', provider: 'openai', deprecated: false, base_url: null, model: 'gpt-4o-mini', display_name: 'gpt-4o mini', family: 'openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-oss-120b', display_name: 'gpt-oss-120b', family: 'openrouter-openai' },
        { library: '', provider: 'azure', deprecated: false, base_url: 'https://bolna-ai-models.cognitiveservices.azure.com', model: 'azure/gpt-4o', display_name: 'gpt-4o cluster', family: 'azure-openai' },
        { library: 'openai', provider: 'openai', deprecated: false, base_url: null, model: 'gpt-4o', display_name: 'gpt-4o', family: 'openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4', display_name: 'gpt-4', family: 'openrouter-openai' },
        { library: '', provider: 'azure', deprecated: false, base_url: 'https://bolna-ai-models.cognitiveservices.azure.com', model: 'azure/gpt-4', display_name: 'gpt-4 cluster', family: 'azure-openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini', display_name: 'gpt-4o-mini', family: 'openrouter-openai' },
        { library: 'openai', provider: 'openai', deprecated: false, base_url: null, model: 'gpt-3.5-turbo', display_name: 'gpt-3.5-turbo', family: 'openai' },
        { library: null, provider: 'azure', deprecated: true, base_url: 'https://bolna-openai-call.openai.azure.com', model: 'azure/bolna-deployment', display_name: 'gpt-3.5 cluster', family: 'azure-openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o', display_name: 'gpt-4o', family: 'openrouter-openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4.1', display_name: 'gpt-4.1', family: 'openrouter-openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4.1-nano', display_name: 'gpt-4.1-nano', family: 'openrouter-openai' },
        { library: 'litellm', provider: 'deepseek', deprecated: false, base_url: 'https://api.deepseek.com/v1', model: 'deepseek/deepseek-chat', display_name: 'deepseek-chat', family: 'deepseek' },
        { library: null, provider: 'anthropic', deprecated: false, base_url: null, model: 'claude-sonnet-4-20250514', display_name: 'sonnet-4', family: 'anthropic' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4.1-mini', display_name: 'gpt-4.1-mini', family: 'openrouter-openai' },
        { library: null, provider: 'openrouter', deprecated: false, base_url: 'https://openrouter.ai/api/v1/chat/completions', model: 'anthropic/claude-sonnet-4', display_name: 'Claude sonnet-4', family: 'openrouter-claude' }
    ],

    asrs: [
        { id: '564f91ea-f4dc-45b3-9223-0ee131d9ee5a', model: 'nova-3', name: 'nova-3', provider: 'deepgram', languages: ['multi-hi','en','hi'] },
        { id: '6fcf78da-b360-4b41-b882-fe84b90256ed', model: 'nova-2', name: 'nova-2', provider: 'deepgram', languages: ['en','hi','fr'] }
      ]
    };

    return fallback;
  }

  // List all voices available to the account (GET /me/voices). If Bolna doesn't expose it, return a static list.
  async getVoices(subAccountId?: string) {
    const client = await this.initClient();
    const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;

    try {
      const res = await client.get('/me/voices', { headers });
      return res.data;
    } catch (err: any) {
      // If not found, fallback to static voices
      const status = err?.response?.status;
      if (status === 404) {
        console.warn('[BOLNA] /me/voices returned 404, using static fallback voices');
        const fallbackVoices = [
          { id: 'v1', voice_id: 'rachel', provider: 'elevenlabs', name: 'Rachel', model: 'eleven_turbo_v2_5', accent: 'en-US (female)' },
          { id: 'v2', voice_id: 'matthew', provider: 'polly', name: 'Matthew', model: 'polly-matthew', accent: 'en-US (male)' },
          { id: 'v3', voice_id: 'asteria', provider: 'deepgram', name: 'Asteria', model: 'aura-asteria-en', accent: 'en-US (female)' }
        ];
        return fallbackVoices;
      }
      mapAxiosError(err);
    }
  }

  // Add a custom LLM model (POST /user/model/custom)
  async addCustomModel(subAccountId: string | undefined, payload: { custom_model_name: string; custom_model_url: string }) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.post('/user/model/custom', payload, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Setup inbound agent for a phone number (POST /inbound/setup)
  async setupInboundAgent(subAccountId: string | undefined, payload: { agent_id: string; phone_number_id: string; ivr_config?: any }) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.post('/inbound/setup', payload, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Unlink inbound agent from a phone number (POST /inbound/unlink)
  async unlinkInboundAgent(subAccountId: string | undefined, payload: { phone_number_id: string }) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.post('/inbound/unlink', payload, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // List all knowledgebases available to the account (GET /knowledgebase/all). Fall back to empty array on 404.
  async getKnowledgebases(subAccountId?: string) {
    const client = await this.initClient();
    const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;

    try {
      const res = await client.get('/knowledgebase/all', { headers });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        console.warn('[BOLNA] /knowledgebase/all returned 404, returning empty list');
        return [];
      }
      mapAxiosError(err);
    }
  }

  // Create a knowledgebase using either a URL or uploaded file (POST /knowledgebase).
  // If `payload.url` is present, send a JSON body. If `payload.file` (Buffer) is present, send multipart/form-data.
  async createKnowledgebase(subAccountId: string | undefined, payload: { url?: string; chunk_size?: number; similarity_top_k?: number; overlapping?: number; file?: { buffer: Buffer; filename?: string } }) {
    // Validate inputs early to avoid forwarding invalid requests to upstream Bolna API
    const hasUrl = !!(payload?.url && String(payload.url).trim().length > 0);
    const hasFile = !!(payload?.file && payload.file.buffer);
    if (!hasUrl && !hasFile) {
      throw new BolnaError("Must provide either 'file' or 'url' parameter", 400);
    }

    try {
      const client = await this.initClient();
      const headers: any = subAccountId ? { "X-Sub-Account-Id": subAccountId } : {};

      if (hasUrl) {
        // URL-based ingestion (JSON body)
        const body: any = {
          url: String(payload.url).trim()
        };
        if (payload.chunk_size) body.chunk_size = payload.chunk_size;
        if (payload.similarity_top_k) body.similarity_top_k = payload.similarity_top_k;
        if (payload.overlapping) body.overlapping = payload.overlapping;

        const res = await client.post('/knowledgebase', body, { headers });
        return res.data;
      }

      if (hasFile && payload.file) {
        // File upload - use form-data
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('file', payload.file.buffer, { filename: payload.file.filename || 'upload.pdf' });
        if (payload.chunk_size) form.append('chunk_size', String(payload.chunk_size));
        if (payload.similarity_top_k) form.append('similarity_top_k', String(payload.similarity_top_k));
        if (payload.overlapping) form.append('overlapping', String(payload.overlapping));

        const mergedHeaders = { ...(headers || {}), ...form.getHeaders() };
        const res = await client.post('/knowledgebase', form as any, { headers: mergedHeaders as any, maxContentLength: Infinity, maxBodyLength: Infinity });
        return res.data;
      }

      // Should never reach here due to earlier validation
      throw new BolnaError("Must provide either 'file' or 'url' parameter", 400);
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Delete a knowledgebase by RAG ID (DELETE /knowledgebase/{rag_id})
  async deleteKnowledgebase(subAccountId: string | undefined, ragId: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.delete(`/knowledgebase/${encodeURIComponent(ragId)}`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Initiate a call using POST /call endpoint
  async makeCall(subAccountId: string, payload: any) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      
      // Validate required fields
      if (!payload.agent_id || !payload.recipient_phone_number) {
        throw new BolnaError("Missing required fields: agent_id and recipient_phone_number", 400);
      }
      
      console.log('[BOLNA] Making call with payload:', JSON.stringify(payload, null, 2));
      const res = await client.post("/call", payload, { headers });
      console.log('[BOLNA] Call initiated successfully:', res.data);
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Stop a queued or scheduled call by execution_id (POST /call/{execution_id}/stop)
  async stopCall(subAccountId: string, executionId: string) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      
      console.log('[BOLNA] Stopping call:', executionId);
      const res = await client.post(`/call/${executionId}/stop`, {}, { headers });
      console.log('[BOLNA] Call stopped successfully:', res.data);
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Stop queued calls for an agent (POST /v2/agent/{agentId}/stop)
  async stopAgent(agentId: string, subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.post(`/v2/agent/${agentId}/stop`, {}, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Fetch executions for agent (v2)
  // Optionally include subAccountId to ensure tenant-scoped calls
  async fetchExecutions(agentId: string, subAccountId?: string, params?: {
    page_number?: number;
    page_size?: number;
    status?: string;
    call_type?: string;
    provider?: string;
    answered_by_voice_mail?: boolean;
    batch_id?: string;
    from?: string;
    to?: string;
  }) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      
      // Build query parameters
      const searchParams = new URLSearchParams();
      if (params?.page_number) searchParams.set('page_number', params.page_number.toString());
      if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
      if (params?.status) searchParams.set('status', params.status);
      if (params?.call_type) searchParams.set('call_type', params.call_type);
      if (params?.provider) searchParams.set('provider', params.provider);
      if (params?.answered_by_voice_mail !== undefined) searchParams.set('answered_by_voice_mail', params.answered_by_voice_mail.toString());
      if (params?.batch_id) searchParams.set('batch_id', params.batch_id);
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      
      const queryString = searchParams.toString();
      const url = `/v2/agent/${agentId}/executions${queryString ? `?${queryString}` : ''}`;
      
      const res = await client.get(url, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Fetch executions for a specific batch
  async fetchBatchExecutions(batchId: string, subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.get(`/batches/${batchId}/executions`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // List all batches for a specific agent
  async listAgentBatches(agentId: string, subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.get(`/batches/${agentId}/all`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Create a batch for an agent
  async createBatch(subAccountId: string, payload: { agent_id: string; file: { buffer: Buffer; filename: string }; from_phone_number?: string; retry_config?: string; webhook_url?: string }) {
    try {
      const client = await this.initClient();
      
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('agent_id', payload.agent_id);
      form.append('file', payload.file.buffer, { filename: payload.file.filename });
      if (payload.from_phone_number) form.append('from_phone_number', payload.from_phone_number);
      if (payload.retry_config) form.append('retry_config', payload.retry_config);
      if (payload.webhook_url) form.append('webhook_url', payload.webhook_url);
      
      const headers = { 
        "X-Sub-Account-Id": subAccountId,
        ...form.getHeaders()
      };
      
      const res = await client.post('/batches', form, { headers, maxContentLength: Infinity, maxBodyLength: Infinity });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Schedule an existing batch
  async scheduleBatch(subAccountId: string, batchId: string, payload: { scheduled_at: string; bypass_call_guardrails?: boolean }) {
    try {
      const client = await this.initClient();
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('scheduled_at', payload.scheduled_at);
      if (payload.bypass_call_guardrails) form.append('bypass_call_guardrails', 'true');

      const headers = { "X-Sub-Account-Id": subAccountId, ...form.getHeaders() };
      const res = await client.post(`/batches/${batchId}/schedule`, form, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Stop a running batch
  async stopBatch(subAccountId: string, batchId: string) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      const res = await client.post(`/batches/${batchId}/stop`, {}, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Download batch file
  async downloadBatch(subAccountId: string, batchId: string) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      const res = await client.get(`/batches/${batchId}/download`, { headers, responseType: 'arraybuffer' });
      return { buffer: res.data };
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Delete a batch
  async deleteBatch(subAccountId: string, batchId: string) {
    try {
      const client = await this.initClient();
      const headers = { "X-Sub-Account-Id": subAccountId };
      const res = await client.delete(`/batches/${batchId}`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Get execution logs
  async getExecutionLogs(executionId: string, subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.get(`/executions/${executionId}/log`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  async getExecution(agentId: string, executionId: string, subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.get(`/agent/${agentId}/execution/${executionId}`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // List all executions for a sub-account - NOT SUPPORTED by Bolna API
  // Bolna only provides /v2/agent/{agent_id}/executions
  async listExecutions(subAccountId?: string) {
    // This endpoint doesn't exist in Bolna API
    // Return empty data to indicate no global executions endpoint
    return { data: [], message: 'Bolna API only supports agent-specific executions' };
  }

  // List phone numbers
  async listPhoneNumbers(subAccountId?: string) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.get('/phone-numbers/all', { headers });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 404) {
        console.warn('[BOLNA] /phone-numbers/all returned', status, '- returning empty list');
        return [];
      }
      mapAxiosError(err);
    }
  }

  // Buy phone number
  async buyPhoneNumber(subAccountId: string | undefined, payload: { country: string; phone_number: string }) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const res = await client.post('/phone-numbers/buy', payload, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }

  // Search phone numbers
  async searchPhoneNumbers(subAccountId: string | undefined, params: { country: string; pattern?: string }) {
    try {
      const client = await this.initClient();
      const headers = subAccountId ? { "X-Sub-Account-Id": subAccountId } : undefined;
      const searchParams = new URLSearchParams();
      searchParams.set('country', params.country);
      if (params.pattern) searchParams.set('pattern', params.pattern);
      const res = await client.get(`/phone-numbers/search?${searchParams.toString()}`, { headers });
      return res.data;
    } catch (err: any) {
      mapAxiosError(err);
    }
  }
}

export const bolnaService = new BolnaService();
