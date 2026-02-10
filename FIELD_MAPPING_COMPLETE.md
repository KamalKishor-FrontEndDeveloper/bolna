# Bolna API to Agents.tsx - Complete Field Mapping

## ✅ 100% MAPPED - All Fields Implemented

### Agent Tab
- ✅ `agent_name` → Agent Name input
- ✅ `agent_welcome_message` → Agent Welcome Message input
- ✅ `webhook_url` → Webhook URL input
- ✅ `agent_type` → Agent Type select
- ✅ `calling_guardrails.call_start_hour` → Call Start Hour
- ✅ `calling_guardrails.call_end_hour` → Call End Hour
- ✅ `agent_prompts.task_1.system_prompt` → Agent Prompt textarea
- ✅ `id` → Read-only metadata display
- ✅ `agent_status` → Read-only metadata display
- ✅ `created_at` → Read-only metadata display
- ✅ `updated_at` → Read-only metadata display
- ✅ `restricted` → Read-only metadata display
- ✅ `inbound_phone_number` → Read-only metadata display

### LLM Tab
- ✅ `tasks[0].tools_config.llm_agent.llm_config.provider` → Provider select
- ✅ `tasks[0].tools_config.llm_agent.llm_config.model` → Model select
- ✅ `tasks[0].tools_config.llm_agent.llm_config.max_tokens` → Max Tokens
- ✅ `tasks[0].tools_config.llm_agent.llm_config.temperature` → Temperature
- ✅ `tasks[0].tools_config.llm_agent.llm_config.presence_penalty` → Presence Penalty
- ✅ `tasks[0].tools_config.llm_agent.llm_config.frequency_penalty` → Frequency Penalty
- ✅ `tasks[0].tools_config.llm_agent.llm_config.top_p` → Top P
- ✅ `tasks[0].tools_config.llm_agent.llm_config.min_p` → Min P
- ✅ `tasks[0].tools_config.llm_agent.llm_config.top_k` → Top K
- ✅ `tasks[0].tools_config.llm_agent.llm_config.request_json` → Request JSON
- ✅ `tasks[0].tools_config.llm_agent.llm_config.family` → Family
- ✅ `tasks[0].tools_config.llm_agent.llm_config.base_url` → Base URL
- ✅ `tasks[0].tools_config.llm_agent.llm_config.summarization_details` → Summarization
- ✅ `tasks[0].tools_config.llm_agent.llm_config.extraction_details` → Extraction
- ✅ `tasks[0].tools_config.llm_agent.routes` → Semantic routing
- ✅ `tasks[0].tools_config.llm_agent.agent_type` → Hardcoded "simple_llm_agent"
- ✅ `tasks[0].tools_config.llm_agent.agent_flow_type` → Hardcoded "streaming"
- ✅ `tasks[0].tools_config.llm_agent.llm_config.agent_flow_type` → Hardcoded "streaming"

### Audio Tab
- ✅ `tasks[0].tools_config.transcriber.provider` → STT Provider
- ✅ `tasks[0].tools_config.transcriber.model` → STT Model
- ✅ `tasks[0].tools_config.transcriber.language` → Language
- ✅ `tasks[0].tools_config.transcriber.sampling_rate` → Sampling Rate
- ✅ `tasks[0].tools_config.transcriber.endpointing` → Endpointing
- ✅ `tasks[0].tools_config.transcriber.encoding` → Encoding
- ✅ `tasks[0].tools_config.transcriber.stream` → Stream
- ✅ `tasks[0].tools_config.transcriber.task` → Task (transcribe/translate)
- ✅ `tasks[0].tools_config.transcriber.keywords` → Keywords
- ✅ `tasks[0].tools_config.synthesizer.provider` → TTS Provider
- ✅ `tasks[0].tools_config.synthesizer.model` → TTS Model
- ✅ `tasks[0].tools_config.synthesizer.provider_config.voice` → Voice
- ✅ `tasks[0].tools_config.synthesizer.provider_config.voice_id` → Voice ID
- ✅ `tasks[0].tools_config.synthesizer.provider_config.speed` → Speed
- ✅ `tasks[0].tools_config.synthesizer.provider_config.style` → Style
- ✅ `tasks[0].tools_config.synthesizer.provider_config.temperature` → Temperature
- ✅ `tasks[0].tools_config.synthesizer.provider_config.similarity_boost` → Similarity Boost
- ✅ `tasks[0].tools_config.synthesizer.caching` → Voice Caching
- ✅ `tasks[0].tools_config.synthesizer.audio_format` → Audio Format
- ✅ `tasks[0].tools_config.synthesizer.stream` → Stream
- ✅ `tasks[0].tools_config.synthesizer.buffer_size` → Buffer Size
- ✅ `tasks[0].task_config.whitelist_phone_numbers` → Whitelist

### Engine Tab
- ✅ `tasks[0].task_config.use_fillers` → Use Fillers
- ✅ `tasks[0].task_config.dtmf_enabled` → DTMF Enabled
- ✅ `tasks[0].task_config.optimize_latency` → Optimize Latency
- ✅ `tasks[0].task_config.auto_reschedule` → Auto Reschedule
- ✅ `tasks[0].task_config.check_if_user_online` → Check User Online
- ✅ `tasks[0].task_config.trigger_user_online_message_after` → Trigger After
- ✅ `tasks[0].task_config.check_user_online_message` → User Online Message
- ✅ `tasks[0].task_config.language_detection_turns` → Language Detection
- ✅ `tasks[0].task_config.hangup_after_silence` → Hangup After Silence
- ✅ `tasks[0].task_config.call_terminate` → Call Terminate
- ✅ `tasks[0].task_config.incremental_delay` → Incremental Delay
- ✅ `tasks[0].task_config.number_of_words_for_interruption` → Words for Interruption
- ✅ `tasks[0].task_config.hangup_after_LLMCall` → Hangup After LLM Call
- ✅ `tasks[0].task_config.call_cancellation_prompt` → Call Cancellation Prompt
- ✅ `tasks[0].task_config.backchanneling` → Backchanneling
- ✅ `tasks[0].task_config.backchanneling_message_gap` → Message Gap
- ✅ `tasks[0].task_config.backchanneling_start_delay` → Start Delay
- ✅ `tasks[0].task_config.ambient_noise` → Ambient Noise
- ✅ `tasks[0].task_config.ambient_noise_track` → Ambient Noise Track
- ✅ `tasks[0].task_config.voicemail_check_interval` → Voicemail Check Interval
- ✅ `tasks[0].task_config.voicemail_detection_time` → Voicemail Detection Time
- ✅ `tasks[0].task_config.voicemail_detection_duration` → Voicemail Detection Duration
- ✅ `tasks[0].task_config.voicemail_min_transcript_length` → Min Transcript Length
- ✅ `tasks[0].task_config.noise_cancellation_level` → Noise Cancellation
- ✅ `tasks[0].task_config.generate_precise_transcript` → Precise Transcript
- ✅ `tasks[0].task_config.interruption_backoff_period` → Interruption Backoff

### Call Tab
- ✅ `tasks[0].tools_config.input.provider` → Input Provider
- ✅ `tasks[0].tools_config.input.format` → Input Format
- ✅ `tasks[0].tools_config.output.provider` → Output Provider
- ✅ `tasks[0].tools_config.output.format` → Output Format

### Tools Tab
- ✅ `tasks[0].tools_config.api_tools.tools` → Function Tools
- ✅ `tasks[0].tools_config.api_tools.tools_params` → Tool Parameters

### Inbound Tab
- ✅ `tasks[0].task_config.voicemail` → Voicemail Detection
- ✅ `tasks[0].task_config.inbound_limit` → Inbound Call Limit
- ✅ `tasks[0].task_config.disallow_unknown_numbers` → Block Unknown Numbers
- ✅ `ingest_source_config.source_type` → Source Type
- ✅ `ingest_source_config.source_url` → API URL / Google Sheet URL
- ✅ `ingest_source_config.source_auth_token` → Bearer Token
- ✅ `ingest_source_config.source_name` → CSV File Name / Sheet Name

### Assistants Tab
- ✅ `gpt_assistants` → Array of OpenAI assistants
- ✅ `gpt_assistants[].assistant_id` → Assistant ID
- ✅ `gpt_assistants[].custom_questions` → Custom Questions
- ✅ Support for string and object formats

### Toolchain (Hardcoded in onSubmit)
- ✅ `tasks[0].toolchain.execution` → "parallel"
- ✅ `tasks[0].toolchain.pipelines` → [["transcriber", "llm", "synthesizer"]]

---

## 📊 Final Summary

- **Total API Fields**: 80+
- **Mapped in UI**: 80+ (100%)
- **Missing from UI**: 0 (0%)
- **Status**: ✅ COMPLETE

### Implementation Details:

**8 Tabs Total:**
1. ✅ Agent - Basic config + metadata display
2. ✅ LLM - Model configuration + semantic routing
3. ✅ Audio - STT/TTS with all provider configs
4. ✅ Engine - Conversation settings + advanced options
5. ✅ Call - Telephony providers + formats
6. ✅ Tools - API tools configuration
7. ✅ Inbound - Inbound settings + CRM ingestion
8. ✅ Assistants - GPT Assistants management

**All Fields Accounted For:**
- Editable fields → Form inputs
- Read-only fields → Metadata display
- Hardcoded fields → Set in onSubmit transform
- Complex objects → JSON editors or structured forms

**Special Handling:**
- `check_user_online_message` → JSON textarea for multi-language
- `gpt_assistants` → Supports both string and object array formats
- `routes` → Full semantic routing editor
- Provider-specific configs → Conditional rendering based on provider selection

## ✅ Status: 100% COMPLETE

Every field from the Bolna API response is now either:
- Editable in the UI
- Displayed as read-only metadata
- Hardcoded with appropriate defaults
- Properly saved and loaded from the API
