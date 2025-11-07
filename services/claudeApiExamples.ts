/**
 * Claude API Usage Examples
 * 
 * This file demonstrates how to use the Claude SDK-compatible API wrapper
 * in the anipro-app.
 */

import { claudeAPI, sendClaudeMessage, ClaudeMessage, ClaudeRequest } from '../services/claudeApi';

/**
 * Example 1: Simple text message
 */
export async function exampleSimpleMessage() {
  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: 'What is the meaning of life?'
    }
  ];

  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages,
      max_tokens: 1024
    });

    console.log('Claude Response:', response.content[0].text);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 2: Conversation with system prompt
 */
export async function exampleWithSystemPrompt() {
  const request: ClaudeRequest = {
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      {
        role: 'user',
        content: 'Tell me about yourself.'
      }
    ],
    system: 'You are a helpful anime expert who loves discussing anime characters and storylines.',
    max_tokens: 1024,
    temperature: 0.7
  };

  try {
    const response = await claudeAPI.sendMessage(request);
    console.log('Response:', response.content[0].text);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 3: Multi-turn conversation
 */
export async function exampleMultiTurnConversation() {
  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: 'Who is the strongest character in One Piece?'
    },
    {
      role: 'assistant',
      content: 'Based on current storylines, many consider characters like Kaido, Luffy with Gear 5, and the Admirals to be among the strongest in One Piece.'
    },
    {
      role: 'user',
      content: 'What about Shanks?'
    }
  ];

  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-haiku-20240307',
      messages,
      max_tokens: 512
    });

    console.log('Response:', response.content[0].text);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 4: Using the helper function
 */
export async function exampleHelperFunction() {
  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: 'Recommend me a good anime to watch.'
    }
  ];

  try {
    // Returns just the text content
    const responseText = await sendClaudeMessage(messages, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 500,
      temperature: 0.8,
      systemPrompt: 'You are an enthusiastic anime recommender.'
    });

    console.log('Response Text:', responseText);
    return responseText;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 5: Character roleplay (like in PublicChat)
 */
export async function exampleCharacterRoleplay() {
  const characterSystemPrompt = `You are Sōsuke Aizen from Bleach. 
You speak with refined arrogance and poetic precision.
Every word carries the weight of intellectual superiority.
Always remind others that everything is going according to your plan.`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: '@Aizen What do you think about the Soul Society?'
    }
  ];

  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-sonnet-20240229',
      messages,
      system: characterSystemPrompt,
      max_tokens: 512,
      temperature: 0.9
    });

    console.log('Aizen says:', response.content[0].text);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 6: Using different Claude models
 */
export async function exampleDifferentModels() {
  const question = 'Explain quantum computing in simple terms.';

  const models = [
    'claude-3-5-sonnet-20241022',  // Most capable
    'claude-3-sonnet-20240229',     // Balanced
    'claude-3-haiku-20240307'       // Fast and efficient
  ];

  try {
    for (const model of models) {
      console.log(`\n--- Using ${model} ---`);
      
      const response = await claudeAPI.sendMessage({
        model,
        messages: [{ role: 'user', content: question }],
        max_tokens: 256
      });

      console.log(response.content[0].text);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 7: With stop sequences
 */
export async function exampleWithStopSequences() {
  const request: ClaudeRequest = {
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      {
        role: 'user',
        content: 'List the top 5 anime of all time. Format as numbered list.'
      }
    ],
    max_tokens: 500,
    stop_sequences: ['6.', 'Honorable mention']  // Stop if it tries to go beyond 5
  };

  try {
    const response = await claudeAPI.sendMessage(request);
    console.log('Response:', response.content[0].text);
    console.log('Stop reason:', response.stop_reason);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example 8: Get endpoint information
 */
export function exampleGetEndpointInfo() {
  console.log('Claude API Endpoint Path:', claudeAPI.getEndpointPath());
  console.log('Claude API Full URL:', claudeAPI.getFullEndpointUrl());
  
  return {
    path: claudeAPI.getEndpointPath(),
    url: claudeAPI.getFullEndpointUrl()
  };
}
