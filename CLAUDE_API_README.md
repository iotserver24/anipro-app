# Claude SDK-Compatible API Wrapper

This implementation provides a Claude SDK-compatible wrapper for the anipro-app, allowing you to use Claude-style API calls that are internally powered by Pollinations AI.

## Overview

The Claude API wrapper transforms requests and responses between the Claude SDK format and the OpenAI-compatible Pollinations API format, providing seamless integration with Claude-style code.

## Endpoint

**Virtual Endpoint Path**: `/claude/v1/messages`

**Base URL**: `https://text.pollinations.ai`

**Note**: This is a client-side wrapper that translates Claude API calls to OpenAI-compatible calls. The actual endpoint used is `https://text.pollinations.ai/openai`.

## Installation

The Claude API service is already included in the project:

```typescript
import { claudeAPI, sendClaudeMessage } from './services/claudeApi';
```

## Quick Start

### Basic Usage

```typescript
import { claudeAPI } from './services/claudeApi';

const response = await claudeAPI.sendMessage({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'What is your favorite anime?'
    }
  ],
  max_tokens: 1024
});

console.log(response.content[0].text);
```

### With System Prompt

```typescript
const response = await claudeAPI.sendMessage({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Tell me about yourself.'
    }
  ],
  system: 'You are a helpful anime expert.',
  max_tokens: 1024
});
```

### Multi-turn Conversation

```typescript
const response = await claudeAPI.sendMessage({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Who is the strongest in One Piece?'
    },
    {
      role: 'assistant',
      content: 'Many consider Kaido and Luffy to be among the strongest.'
    },
    {
      role: 'user',
      content: 'What about Shanks?'
    }
  ],
  max_tokens: 512
});
```

### Helper Function

For simpler use cases, use the helper function:

```typescript
import { sendClaudeMessage } from './services/claudeApi';

const responseText = await sendClaudeMessage(
  [
    { role: 'user', content: 'Recommend an anime.' }
  ],
  {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 500,
    temperature: 0.8
  }
);
```

## API Reference

### ClaudeMessage

```typescript
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}
```

### ClaudeRequest

```typescript
interface ClaudeRequest {
  model: string;                // Claude model name
  messages: ClaudeMessage[];    // Conversation messages
  max_tokens?: number;          // Maximum tokens to generate (default: 1024)
  temperature?: number;         // Sampling temperature 0-1 (default: 1.0)
  top_p?: number;              // Nucleus sampling
  top_k?: number;              // Top-k sampling
  system?: string;             // System prompt
  stop_sequences?: string[];   // Stop generation at these sequences
  stream?: boolean;            // Streaming (not yet implemented)
}
```

### ClaudeResponse

```typescript
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

## Supported Models

The wrapper automatically maps Claude model names to appropriate Pollinations models:

| Claude Model | Mapped To |
|--------------|-----------|
| `claude-3-5-sonnet-20241022` | `openai` |
| `claude-3-5-sonnet-20240620` | `openai` |
| `claude-3-opus-20240229` | `openai` |
| `claude-3-sonnet-20240229` | `openai` |
| `claude-3-haiku-20240307` | `mistral` |
| `claude-2.1` | `mistral` |
| `claude-2.0` | `mistral` |
| `claude-instant-1.2` | `mistral` |

## Features

### ✅ Implemented

- ✅ Claude SDK-compatible message format
- ✅ Multi-turn conversations
- ✅ System prompts
- ✅ Temperature and token controls
- ✅ Stop sequences
- ✅ Model mapping
- ✅ Usage statistics (token counting)
- ✅ Error handling
- ✅ Response format transformation

### 🚧 Not Yet Implemented

- ⏳ Streaming responses
- ⏳ Image inputs (vision capabilities)
- ⏳ Function calling
- ⏳ Caching
- ⏳ Custom API keys per request

## Usage Examples

### Character Roleplay

```typescript
const response = await claudeAPI.sendMessage({
  model: 'claude-3-sonnet-20240229',
  messages: [
    {
      role: 'user',
      content: '@Aizen What do you think about the Soul Society?'
    }
  ],
  system: `You are Sōsuke Aizen from Bleach. 
You speak with refined arrogance and poetic precision.`,
  max_tokens: 512,
  temperature: 0.9
});
```

### Anime Recommendation

```typescript
const response = await claudeAPI.sendMessage({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'Recommend a sci-fi anime similar to Steins;Gate.'
    }
  ],
  system: 'You are an anime expert specializing in recommendations.',
  max_tokens: 500,
  temperature: 0.7
});
```

### With Stop Sequences

```typescript
const response = await claudeAPI.sendMessage({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    {
      role: 'user',
      content: 'List the top 5 anime. Format as numbered list.'
    }
  ],
  max_tokens: 500,
  stop_sequences: ['6.']  // Stop before listing a 6th item
});
```

## Comparison: OpenAI vs Claude API

### OpenAI Format (Current)

```typescript
const response = await fetch('https://text.pollinations.ai/openai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'openai',
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello!' }
    ]
  })
});
```

### Claude Format (New)

```typescript
const response = await claudeAPI.sendMessage({
  model: 'claude-3-5-sonnet-20241022',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
  system: 'You are helpful.',
  max_tokens: 1024
});
```

## Integration with Existing Code

The Claude API can be used alongside the existing OpenAI implementation in `PublicChat.tsx`:

```typescript
// Option 1: Use OpenAI format (existing)
const url = `${POLLINATIONS_TEXT_API_URL}`;
const response = await fetch(url, { /* ... */ });

// Option 2: Use Claude format (new)
import { claudeAPI } from '../services/claudeApi';
const response = await claudeAPI.sendMessage({ /* ... */ });
```

Both methods use the same underlying Pollinations API, just with different request/response formats.

## Error Handling

```typescript
try {
  const response = await claudeAPI.sendMessage({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 1024
  });
  
  console.log(response.content[0].text);
} catch (error) {
  console.error('Claude API Error:', error);
  // Handle error appropriately
}
```

## Files Created

1. **`services/claudeApi.ts`** - Main Claude API service implementation
2. **`services/claudeApiExamples.ts`** - Usage examples and demos
3. **`CLAUDE_API_README.md`** - This documentation file

## Configuration

The Claude API uses the same Pollinations API token as the OpenAI implementation:

```typescript
const CLAUDE_API_TOKEN = 'uNoesre5jXDzjhiY';
const CLAUDE_API_BASE_URL = 'https://text.pollinations.ai';
```

## Testing

Run the examples to test the implementation:

```typescript
import { 
  exampleSimpleMessage,
  exampleWithSystemPrompt,
  exampleCharacterRoleplay
} from './services/claudeApiExamples';

// Test basic functionality
await exampleSimpleMessage();

// Test with system prompt
await exampleWithSystemPrompt();

// Test character roleplay
await exampleCharacterRoleplay();
```

## Notes

- The wrapper is fully client-side and requires no backend changes
- All requests are authenticated with the existing Pollinations API token
- The Claude format provides a cleaner separation of system prompts from messages
- Response format closely matches the official Claude API for easy migration

## Future Enhancements

1. Add streaming support
2. Implement vision capabilities for image inputs
3. Add function calling support
4. Support for custom API keys
5. Implement caching for repeated prompts
6. Add rate limiting and retry logic

## Support

For issues or questions about the Claude API wrapper, check:
- `services/claudeApi.ts` - Implementation details
- `services/claudeApiExamples.ts` - Usage examples
- `components/PublicChat.tsx` - Integration example

## License

Same as the parent project.
