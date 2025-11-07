/**
 * Claude API Service
 * 
 * This service provides a Claude SDK-compatible wrapper around the Pollinations AI API.
 * It transforms requests and responses to match the Anthropic Claude API format.
 * 
 * Endpoint: /claude/v1/messages
 * Compatible with: @anthropic-ai/sdk
 */

// Claude API Configuration
const CLAUDE_API_BASE_URL = 'https://text.pollinations.ai';
const CLAUDE_API_TOKEN = 'uNoesre5jXDzjhiY';

/**
 * Claude SDK Message format
 */
export interface ClaudeMessage {
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

/**
 * Claude SDK Request format
 */
export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  system?: string;
  stop_sequences?: string[];
  stream?: boolean;
}

/**
 * Claude SDK Response format
 */
export interface ClaudeResponse {
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

/**
 * OpenAI format message (used internally by Pollinations)
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Claude API Service Class
 */
class ClaudeAPIService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = CLAUDE_API_BASE_URL, token: string = CLAUDE_API_TOKEN) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Convert Claude SDK messages to OpenAI format
   */
  private convertClaudeMessagesToOpenAI(
    messages: ClaudeMessage[],
    systemPrompt?: string
  ): OpenAIMessage[] {
    const openAIMessages: OpenAIMessage[] = [];

    // Add system message if provided
    if (systemPrompt) {
      openAIMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Convert Claude messages to OpenAI format
    for (const message of messages) {
      let content = '';

      if (typeof message.content === 'string') {
        content = message.content;
      } else if (Array.isArray(message.content)) {
        // Extract text from content blocks
        content = message.content
          .filter(block => block.type === 'text')
          .map(block => block.text || '')
          .join('\n');
      }

      openAIMessages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content
      });
    }

    return openAIMessages;
  }

  /**
   * Convert OpenAI response to Claude SDK format
   */
  private convertOpenAIResponseToClaude(
    openAIResponse: any,
    model: string
  ): ClaudeResponse {
    const content = openAIResponse.choices?.[0]?.message?.content || '';
    const finishReason = openAIResponse.choices?.[0]?.finish_reason;

    // Map OpenAI finish_reason to Claude stop_reason
    let stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null = 'end_turn';
    if (finishReason === 'length') {
      stopReason = 'max_tokens';
    } else if (finishReason === 'stop') {
      stopReason = 'stop_sequence';
    }

    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: content
        }
      ],
      model,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: openAIResponse.usage?.prompt_tokens || 0,
        output_tokens: openAIResponse.usage?.completion_tokens || 0
      }
    };
  }

  /**
   * Map Claude model names to Pollinations models
   */
  private mapClaudeModelToPollinationsModel(claudeModel: string): string {
    const modelMap: Record<string, string> = {
      'claude-3-opus-20240229': 'openai',
      'claude-3-sonnet-20240229': 'openai',
      'claude-3-haiku-20240307': 'mistral',
      'claude-3-5-sonnet-20241022': 'openai',
      'claude-3-5-sonnet-20240620': 'openai',
      'claude-2.1': 'mistral',
      'claude-2.0': 'mistral',
      'claude-instant-1.2': 'mistral'
    };

    return modelMap[claudeModel] || 'openai';
  }

  /**
   * Send a message using Claude SDK format
   * 
   * @param request - Claude SDK formatted request
   * @returns Claude SDK formatted response
   */
  async sendMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    try {
      // Convert Claude request to OpenAI format
      const openAIMessages = this.convertClaudeMessagesToOpenAI(
        request.messages,
        request.system
      );

      // Map model name
      const pollinationsModel = this.mapClaudeModelToPollinationsModel(request.model);

      // Prepare OpenAI-compatible payload
      const payload = {
        model: pollinationsModel,
        messages: openAIMessages,
        max_tokens: request.max_tokens,
        temperature: request.temperature,
        top_p: request.top_p,
        stop: request.stop_sequences
      };

      // Call Pollinations OpenAI-compatible endpoint
      const url = `${this.baseUrl}/openai?token=${this.token}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API Error Response:', errorText);
        throw new Error(`API response was not ok. Status: ${response.status}, Body: ${errorText}`);
      }

      // Parse OpenAI response
      const openAIResponse = await response.json();

      // Convert to Claude format
      const claudeResponse = this.convertOpenAIResponseToClaude(
        openAIResponse,
        request.model
      );

      return claudeResponse;
    } catch (error) {
      console.error('Error in Claude API service:', error);
      throw error;
    }
  }

  /**
   * Create a message (alias for sendMessage to match Claude SDK)
   */
  async createMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    return this.sendMessage(request);
  }

  /**
   * Get the Claude-compatible API endpoint path
   */
  getEndpointPath(): string {
    return '/claude/v1/messages';
  }

  /**
   * Get the full Claude-compatible API URL
   */
  getFullEndpointUrl(): string {
    return `${this.baseUrl}${this.getEndpointPath()}`;
  }
}

// Export singleton instance
export const claudeAPI = new ClaudeAPIService();

// Export class for custom instances
export { ClaudeAPIService };

// Helper function for simple text completion (matches Claude SDK patterns)
export async function sendClaudeMessage(
  messages: ClaudeMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const request: ClaudeRequest = {
    model: options?.model || 'claude-3-5-sonnet-20241022',
    messages,
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature || 1.0,
    system: options?.systemPrompt
  };

  const response = await claudeAPI.sendMessage(request);
  return response.content[0].text;
}
