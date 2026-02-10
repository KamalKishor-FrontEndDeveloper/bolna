import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { BolnaService } from "../lib/bolna";
import { storage } from "../storage";

vi.mock("axios");
vi.mock("../storage", () => ({
  storage: { getApiKey: vi.fn() }
}));

describe("BolnaService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("initializes client and uses Bearer token", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const postMock = vi.fn().mockResolvedValue({ data: { id: "sub-1" } });
    (axios.create as any).mockReturnValue({ post: postMock });

    const svc = new BolnaService();
    const res = await svc.createSubAccount("Name", "email@example.com");

    expect(postMock).toHaveBeenCalledWith(
      "/sub-accounts/create",
      {
        name: "Name",
        allow_concurrent_calls: 10,
        multi_tenant: false,
        db_host: null,
        db_name: null,
        db_port: null,
        db_user: null,
        db_password: null,
        email: "email@example.com"
      }
    );
    expect(res).toEqual({ id: "sub-1" });
  });

  it("sends X-Sub-Account-Id header for createAgent", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const postMock = vi.fn().mockResolvedValue({ data: { agent_id: "agent-1" } });
    (axios.create as any).mockReturnValue({ post: postMock });

    const svc = new BolnaService();
    const payload = { name: "Agent", tasks: [] };
    const res = await svc.createAgent("sub-1", payload);

    expect(postMock).toHaveBeenCalledWith("/v2/agent", payload, { headers: { "X-Sub-Account-Id": "sub-1" } });
    expect(res).toEqual({ agent_id: "agent-1" });
  });

  it("makeCall posts to /v2/call with recipient payload", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const postMock = vi.fn().mockResolvedValue({ data: { message: "ok", execution_id: "exec-1" } });
    (axios.create as any).mockReturnValue({ post: postMock });

    const svc = new BolnaService();
    const res = await svc.makeCall("sub-1", "agent-1", { to: "+1555000" });

    expect(postMock).toHaveBeenCalledWith("/v2/call", { agent_id: "agent-1", recipient: { to: "+1555000" }, provider: "default" }, { headers: { "X-Sub-Account-Id": "sub-1" } });
    expect(res).toEqual({ message: "ok", execution_id: "exec-1" });
  });

  it("listAgents performs GET /v2/agent/all with sub-account header", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const getMock = vi.fn().mockResolvedValue({ data: [{ agent_id: "agent-1" }, { agent_id: "agent-2" }] });
    (axios.create as any).mockReturnValue({ get: getMock });

    const svc = new BolnaService();
    const res = await svc.listAgents("sub-1");

    expect(getMock).toHaveBeenCalledWith('/v2/agent/all', { headers: { "X-Sub-Account-Id": "sub-1" } });
    expect(res).toEqual([{ agent_id: "agent-1" }, { agent_id: "agent-2" }]);
  });

  it("getModels performs GET /user/model/all and returns model lists", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const payload = { llmModels: [{ model: "gpt-4.1-mini", display_name: "gpt-4.1-mini" }], asrs: [{ id: "n", model: "nova-3" }] };
    const getMock = vi.fn().mockResolvedValue({ data: payload });
    (axios.create as any).mockReturnValue({ get: getMock });

    const svc = new BolnaService();
    const res = await svc.getModels("sub-1");

    expect(getMock).toHaveBeenCalledWith('/user/model/all', { headers: { "X-Sub-Account-Id": "sub-1" } });
    expect(res).toEqual(payload);
  });

  it("getModels falls back to static list when all endpoints return 404", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const firstErr = { response: { status: 404, data: { detail: 'Resource not found' } } };
    // All attempts (both with and without header) will fail with 404
    const getMock = vi.fn()
      .mockRejectedValue(firstErr);

    (axios.create as any).mockReturnValue({ get: getMock });

    const svc = new BolnaService();
    const res = await svc.getModels("sub-1");

    expect(res).toHaveProperty('llmModels');
    expect(Array.isArray(res.llmModels)).toBe(true);
    expect(res.llmModels.length).toBeGreaterThan(0);
    expect(res).toHaveProperty('asrs');
    expect(Array.isArray(res.asrs)).toBe(true);
  });

  it("getVoices returns static voices when /me/voices is 404", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const firstErr = { response: { status: 404, data: { detail: 'Resource not found' } } };
    const getMock = vi.fn().mockRejectedValue(firstErr);
    (axios.create as any).mockReturnValue({ get: getMock });

    const svc = new BolnaService();
    const res = await svc.getVoices("sub-1");

    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]).toHaveProperty('voice_id');
  });

  it("getKnowledgebases performs GET /knowledgebase/all with sub-account header", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const payload = [{ rag_id: 'kb1', file_name: 'doc.pdf', status: 'processed' }];
    const getMock = vi.fn().mockResolvedValue({ data: payload });
    (axios.create as any).mockReturnValue({ get: getMock });

    const svc = new BolnaService();
    const res = await svc.getKnowledgebases("sub-1");

    expect(getMock).toHaveBeenCalledWith('/knowledgebase/all', { headers: { "X-Sub-Account-Id": "sub-1" } });
    expect(res).toEqual(payload);
  });

  it("getKnowledgebases falls back to empty array when /knowledgebase/all returns 404", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const firstErr = { response: { status: 404, data: { detail: 'Resource not found' } } };
    const getMock = vi.fn().mockRejectedValue(firstErr);
    (axios.create as any).mockReturnValue({ get: getMock });

    const svc = new BolnaService();
    const res = await svc.getKnowledgebases("sub-1");

    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  it("createKnowledgebase posts url to /knowledgebase and returns response", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const payload = { rag_id: 'kb1', file_name: 'doc.pdf', status: 'processing' };
    const postMock = vi.fn().mockResolvedValue({ data: payload });
    (axios.create as any).mockReturnValue({ post: postMock });

    const svc = new BolnaService();
    const res = await svc.createKnowledgebase('sub-1', { url: 'https://example.com/docs' });

    expect(postMock).toHaveBeenCalledWith('/knowledgebase', { url: 'https://example.com/docs' }, { headers: { "X-Sub-Account-Id": 'sub-1' } });
    expect(res).toEqual(payload);
  });

  it("createKnowledgebase uploads file when provided", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const payload = { rag_id: 'kb2', file_name: 'doc.pdf', status: 'processing' };
    const postMock = vi.fn().mockResolvedValue({ data: payload });
    (axios.create as any).mockReturnValue({ post: postMock });

    const svc = new BolnaService();
    const fakeBuffer = Buffer.from('PDFDATA');
    const res = await svc.createKnowledgebase('sub-1', { file: { buffer: fakeBuffer, filename: 'doc.pdf' } });

    // We can't assert exact form data object, but ensure axios.post was called
    expect(postMock).toHaveBeenCalled();
    expect(res).toEqual(payload);
  });

  it("deleteKnowledgebase performs DELETE /knowledgebase/:id with sub-account header", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const payload = { message: 'success', state: 'deleted' };
    const deleteMock = vi.fn().mockResolvedValue({ data: payload });
    (axios.create as any).mockReturnValue({ delete: deleteMock });

    const svc = new BolnaService();
    const res = await svc.deleteKnowledgebase('sub-1', 'rag-123');

    expect(deleteMock).toHaveBeenCalledWith('/knowledgebase/rag-123', { headers: { "X-Sub-Account-Id": 'sub-1' } });
    expect(res).toEqual(payload);
  });

  it("createKnowledgebase throws when neither file nor url provided", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const svc = new BolnaService();

    await expect(svc.createKnowledgebase('sub-1', {} as any)).rejects.toThrow("Must provide either 'file' or 'url' parameter");
  });

  it("scheduleBatch posts scheduled data to /batches/:id/schedule", async () => {
    (storage.getApiKey as any).mockResolvedValue("master-key-123");

    const postMock = vi.fn().mockResolvedValue({ data: { message: 'scheduled', state: 'scheduled' } });
    (axios.create as any).mockReturnValue({ post: postMock });

    const svc = new BolnaService();
    const res = await svc.scheduleBatch('sub-1', 'batch-123', { scheduled_at: '2026-02-07T10:51:00.000Z', bypass_call_guardrails: true });

    expect(postMock).toHaveBeenCalled();
    expect(res).toEqual({ message: 'scheduled', state: 'scheduled' });
  });
});
