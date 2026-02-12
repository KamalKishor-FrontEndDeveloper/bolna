# Agent Update API Implementation Summary

## Changes Made

### 1. Frontend Hook Update (`client/src/hooks/use-bolna.ts`)
- Updated `useUpdateAgent` hook to call the correct ThinkVoiceAPI endpoint
- Changed from `/api/tenant/agents/${id}` to use `api.bolna.agents.update.path` (which is `/api/bolna/agents/:id`)
- Now uses the proper HTTP method from the API contract: `api.bolna.agents.update.method` (PUT)

### 2. Backend Route Addition (`server/multiTenantRoutes.ts`)
- Added new PUT route handler for `/api/bolna/agents/:id`
- Route is protected with `requireTenantUser` and `requireRole(['admin', 'manager'])`
- Proxies the update request to ThinkVoiceAPI using `bolnaService.updateAgent()`
- Passes the tenant's `bolna_sub_account_id` for proper multi-tenant isolation

### 3. Existing Infrastructure Used
- **ThinkVoiceService** (`server/lib/bolna.ts`): Already has `updateAgent()` method that calls Bolna's `PUT /v2/agent/{agent_id}` endpoint
- **API Contract** (`shared/routes.ts`): Already defines the update endpoint structure
- **Form Transformation** (`client/src/pages/Agents.tsx`): Already transforms form data to match Bolna's v2 API structure

## API Flow

1. **User clicks "Save Changes"** in the Agents page
2. **Form submission** triggers `onSubmit()` which transforms the form data to Bolna's v2 structure
3. **Frontend hook** calls `updateAgent({ id: selectedAgentId, data: transformedData })`
4. **HTTP Request** sent to `PUT /api/bolna/agents/{agent_id}` with JWT token
5. **Backend route** validates user permissions and tenant access
6. **ThinkVoiceService** makes authenticated request to `PUT https://api.bolna.ai/v2/agent/{agent_id}` with:
   - Authorization header with ThinkVoiceAPI key
   - X-Sub-Account-Id header for tenant isolation
   - Payload containing `agent_config` and `agent_prompts`
7. **Response** flows back through the chain
8. **Success toast** shown to user and agent list refreshed

## Payload Structure (ThinkVoicev2 API)

```json
{
  "agent_config": {
    "agent_name": "Alfred",
    "agent_welcome_message": "How are you doing Bruce?",
    "webhook_url": null,
    "agent_type": "other",
    "tasks": [{
      "task_type": "conversation",
      "tools_config": {
        "llm_agent": {
          "agent_type": "simple_llm_agent",
          "agent_flow_type": "streaming",
          "llm_config": { /* LLM settings */ }
        },
        "synthesizer": { /* TTS settings */ },
        "transcriber": { /* STT settings */ },
        "input": { "provider": "plivo", "format": "wav" },
        "output": { "provider": "plivo", "format": "wav" }
      },
      "toolchain": {
        "execution": "parallel",
        "pipelines": [["transcriber", "llm", "synthesizer"]]
      },
      "task_config": { /* Call behavior settings */ }
    }]
  },
  "agent_prompts": {
    "task_1": {
      "system_prompt": "Your agent instructions..."
    }
  }
}
```

## Security & Multi-Tenancy

- ✅ JWT authentication required
- ✅ Role-based access control (admin/manager only)
- ✅ Tenant isolation via `bolna_sub_account_id`
- ✅ Agent ownership validation (implicit via sub-account)

## Testing Checklist

- [ ] Update existing agent and verify changes persist
- [ ] Verify unauthorized users cannot update agents
- [ ] Test with different tenant accounts to ensure isolation
- [ ] Verify error handling for invalid payloads
- [ ] Check that agent list refreshes after update
- [ ] Confirm toast notifications appear correctly
