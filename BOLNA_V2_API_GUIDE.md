# ThinkVoicev2 API Implementation Guide

## Overview

This application implements the Bolna.ai v2 API for creating and managing voice AI agents. The implementation follows the official ThinkVoiceAPI specification documented at https://www.bolna.ai/docs.

## API Endpoint

**POST /v2/agent**

Creates a new voice AI agent with customized tasks, prompts, and configurations.

## Request Structure

### Required Fields

```typescript
{
  agent_config: {
    agent_name: string;           // Required: Name of the agent
    tasks: Task[];                // Required: Array of tasks (minimum 1)
  },
  agent_prompts: {
    task_1: {
      system_prompt: string;      // Required: System prompt for the agent
    }
  }
}
```

### Optional Fields

```typescript
{
  agent_config: {
    agent_welcome_message?: string;     // Initial greeting message
    webhook_url?: string;               // Webhook for conversation data
    agent_type?: string;                // Default: "other"
    ingest_source_config?: {            // For inbound agents
      source_type: "api" | "csv" | "google_sheet";
      source_url?: string;
      source_auth_token?: string;
      source_name?: string;
    };
    calling_guardrails?: {              // Time-based call restrictions
      call_start_hour: number;          // 0-23 (recipient's timezone)
      call_end_hour: number;            // 0-23 (recipient's timezone)
    };
  }
}
```

## Task Configuration

Each task in the `tasks` array must include:

### 1. Task Type
```typescript
task_type: "conversation" | "extraction" | "summarization"
```

### 2. Tools Configuration

#### LLM Agent
```typescript
tools_config: {
  llm_agent: {
    agent_type: "simple_llm_agent" | "knowledgebase_agent";
    agent_flow_type: "streaming";
    llm_config: {
      provider: string;              // e.g., "openai", "azure"
      family: string;                // e.g., "openai"
      model: string;                 // e.g., "gpt-4o-mini"
      max_tokens: number;            // Default: 150
      temperature: number;           // Default: 0.1
      presence_penalty: number;      // Default: 0
      frequency_penalty: number;     // Default: 0
      top_p: number;                 // Default: 0.9
      min_p: number;                 // Default: 0.1
      top_k: number;                 // Default: 0
      request_json: boolean;         // Default: false
      base_url?: string;             // API base URL
    }
  }
}
```

#### Synthesizer (Text-to-Speech)
```typescript
synthesizer: {
  provider: "polly" | "elevenlabs" | "deepgram" | "styletts";
  provider_config: {
    // For ElevenLabs:
    voice: string;                   // e.g., "Nila"
    voice_id: string;                // e.g., "V9LCAAi4tTlqe9JadbCo"
    model: string;                   // e.g., "eleven_turbo_v2_5"
    
    // For Polly:
    voice: string;                   // e.g., "Matthew"
    engine: "generative";
    language: string;                // e.g., "en-US"
    sampling_rate: string;           // e.g., "8000"
    
    // For Deepgram:
    voice: string;                   // e.g., "Asteria"
    model: string;                   // e.g., "aura-asteria-en"
    sampling_rate: string;           // e.g., "24000"
  };
  stream: boolean;                   // Default: true
  buffer_size: number;               // Default: 250
  audio_format: "wav";
}
```

#### Transcriber (Speech-to-Text)
```typescript
transcriber: {
  provider: "deepgram" | "bodhi";
  model: string;                     // e.g., "nova-3", "hi-general-v2-8khz"
  language: string;                  // e.g., "en", "hi"
  stream: boolean;                   // Default: true
  sampling_rate: number;             // Default: 16000
  encoding: "linear16";
  endpointing: number;               // Default: 250 (deepgram), 100 (bodhi)
}
```

#### Input/Output Configuration
```typescript
input: {
  provider: "twilio" | "plivo" | "exotel";
  format: "wav";
};
output: {
  provider: "twilio" | "plivo" | "exotel";
  format: "wav";
};
```

#### API Tools (Optional)
```typescript
api_tools?: {
  tools: Array<{
    name: string;                    // Unique function name
    key: "transfer_call";            // Function type
    description: string;
    parameters: {
      type: "object";
      properties: {
        call_sid: {
          type: "string";
          description: string;
        }
      };
      required: string[];
    };
  }>;
  tools_params: {
    [toolName: string]: {
      method: "GET" | "POST";
      url: string;
      api_token?: string;
      param: string;                 // Stringified JSON
    };
  };
}
```

### 3. Toolchain
```typescript
toolchain: {
  execution: "parallel" | "sequential";
  pipelines: string[][];             // e.g., [["transcriber", "llm", "synthesizer"]]
}
```

### 4. Task Configuration (Conversation Settings)
```typescript
task_config: {
  hangup_after_silence?: number;              // Default: 10 seconds
  incremental_delay?: number;                 // Default: 400ms
  number_of_words_for_interruption?: number;  // Default: 2
  hangup_after_LLMCall?: boolean;             // Default: false
  call_cancellation_prompt?: string;
  backchanneling?: boolean;                   // Default: false
  backchanneling_message_gap?: number;        // Default: 5 seconds
  backchanneling_start_delay?: number;        // Default: 5 seconds
  ambient_noise?: boolean;                    // Default: false
  ambient_noise_track?: "office-ambience" | "coffee-shop" | "call-center";
  call_terminate?: number;                    // Default: 90 seconds
  voicemail?: boolean;                        // Default: false
  inbound_limit?: number;                     // Default: -1 (unlimited)
  whitelist_phone_numbers?: string[];         // E.164 format
  disallow_unknown_numbers?: boolean;         // Default: false
}
```

## Response Format

### Success (200)
```typescript
{
  agent_id: string;                  // UUID of created agent
  status: "created";
}
```

### Error (400)
```typescript
{
  error: number;
  message: string;
}
```

## Implementation Examples

### Basic Agent Creation

```typescript
const payload = {
  agent_config: {
    agent_name: "Customer Support Agent",
    agent_welcome_message: "Hello, how can I help you today?",
    tasks: [
      {
        task_type: "conversation",
        tools_config: {
          llm_agent: {
            agent_type: "simple_llm_agent",
            agent_flow_type: "streaming",
            llm_config: {
              provider: "openai",
              family: "openai",
              model: "gpt-4o-mini",
              max_tokens: 150,
              temperature: 0.1
            }
          },
          synthesizer: {
            provider: "elevenlabs",
            provider_config: {
              voice: "Nila",
              voice_id: "V9LCAAi4tTlqe9JadbCo",
              model: "eleven_turbo_v2_5"
            },
            stream: true,
            buffer_size: 250,
            audio_format: "wav"
          },
          transcriber: {
            provider: "deepgram",
            model: "nova-3",
            language: "en",
            stream: true,
            sampling_rate: 16000,
            encoding: "linear16",
            endpointing: 250
          },
          input: { provider: "plivo", format: "wav" },
          output: { provider: "plivo", format: "wav" }
        },
        toolchain: {
          execution: "parallel",
          pipelines: [["transcriber", "llm", "synthesizer"]]
        },
        task_config: {
          hangup_after_silence: 10,
          call_terminate: 90
        }
      }
    ]
  },
  agent_prompts: {
    task_1: {
      system_prompt: "You are a helpful customer support agent."
    }
  }
};
```

### Agent with Knowledge Base

```typescript
const payload = {
  agent_config: {
    agent_name: "Knowledge Base Agent",
    tasks: [
      {
        task_type: "conversation",
        tools_config: {
          llm_agent: {
            agent_type: "knowledgebase_agent",
            agent_flow_type: "streaming",
            llm_config: {
              provider: "openai",
              model: "gpt-4o-mini",
              // ... other LLM config
              vector_store: {
                provider: "lancedb",
                provider_config: {
                  vector_ids: [
                    "3c90c3cc-0d44-4b50-8822-8dd25736052a",
                    "4d91c4dd-1e55-5c61-9933-9ee36847163b"
                  ]
                }
              }
            }
          },
          // ... other tools config
        },
        // ... toolchain and task_config
      }
    ]
  },
  agent_prompts: {
    task_1: {
      system_prompt: "You are a knowledgeable assistant with access to company documentation."
    }
  }
};
```

### Agent with Call Transfer Tool

```typescript
const payload = {
  agent_config: {
    agent_name: "Support Agent with Transfer",
    tasks: [
      {
        task_type: "conversation",
        tools_config: {
          // ... llm_agent, synthesizer, transcriber config
          api_tools: {
            tools: [
              {
                name: "transfer_call_support",
                key: "transfer_call",
                description: "Use this tool to transfer the call",
                parameters: {
                  type: "object",
                  properties: {
                    call_sid: {
                      type: "string",
                      description: "unique call id"
                    }
                  },
                  required: ["call_sid"]
                }
              }
            ],
            tools_params: {
              transfer_call_support: {
                method: "POST",
                url: "https://api.example.com/transfer",
                api_token: "your_token",
                param: '{"call_transfer_number": "+19876543210", "call_sid": "%(call_sid)s"}'
              }
            }
          }
        },
        // ... toolchain and task_config
      }
    ]
  },
  agent_prompts: {
    task_1: {
      system_prompt: "You can transfer calls to human agents when needed."
    }
  }
};
```

### Inbound Agent with Guardrails

```typescript
const payload = {
  agent_config: {
    agent_name: "Inbound Sales Agent",
    calling_guardrails: {
      call_start_hour: 9,   // 9 AM
      call_end_hour: 17     // 5 PM
    },
    ingest_source_config: {
      source_type: "api",
      source_url: "https://api.example.com/contacts",
      source_auth_token: "Bearer your_token"
    },
    tasks: [
      {
        task_type: "conversation",
        // ... tools_config
        task_config: {
          voicemail: true,
          inbound_limit: 3,
          whitelist_phone_numbers: ["+11234567890"],
          disallow_unknown_numbers: true
        }
      }
    ]
  },
  agent_prompts: {
    task_1: {
      system_prompt: "You are a sales agent handling inbound inquiries."
    }
  }
};
```

## Code Structure

### Frontend (React)
- **Components**: `CreateAgentModal.tsx` - Quick agent creation
- **Pages**: `Agents.tsx` - Full agent management interface
- **Hooks**: `use-bolna.ts` - API integration hooks

### Backend (Express)
- **Service**: `server/lib/bolna.ts` - ThinkVoiceAPI wrapper
- **Routes**: `server/multiTenantRoutes.ts` - API endpoints
- **Schema**: `shared/schema.ts` - Zod validation schemas

## Multi-Tenant Support

All agent operations are scoped to tenants using the `X-Sub-Account-Id` header:

```typescript
const headers = { "X-Sub-Account-Id": tenant.bolna_sub_account_id };
await client.post("/v2/agent", payload, { headers });
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Validation Errors**: Zod schema validation before API calls
2. **API Errors**: Proper error mapping from ThinkVoiceAPI responses
3. **User Feedback**: Clear error messages in the UI

## Testing

Test agent creation with:

```bash
curl -X POST https://api.bolna.ai/v2/agent \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Sub-Account-Id: YOUR_SUB_ACCOUNT_ID" \
  -H "Content-Type: application/json" \
  -d @agent_payload.json
```

## References

- [ThinkVoiceAPI Documentation](https://www.bolna.ai/docs)
- [Create Agent API](https://www.bolna.ai/docs/api-reference/agents/create)
- [LLM Models](https://www.bolna.ai/docs/llms)
- [Voice Providers](https://www.bolna.ai/docs/voices)
