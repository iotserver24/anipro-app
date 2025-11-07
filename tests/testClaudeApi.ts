/**
 * Claude API Test
 * 
 * Run this test to verify the Claude API wrapper is working correctly.
 * 
 * Usage: 
 * In a React Native component or screen:
 * import { testClaudeAPI } from './tests/testClaudeApi';
 * await testClaudeAPI();
 */

import { claudeAPI, sendClaudeMessage, ClaudeMessage } from '../services/claudeApi';

/**
 * Test 1: Basic message
 */
async function testBasicMessage() {
  console.log('\n=== Test 1: Basic Message ===');
  
  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Claude API wrapper!" in exactly those words.'
        }
      ],
      max_tokens: 50
    });

    console.log('✅ Response received');
    console.log('Response text:', response.content[0].text);
    console.log('Model:', response.model);
    console.log('Stop reason:', response.stop_reason);
    console.log('Usage:', response.usage);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 2: With system prompt
 */
async function testSystemPrompt() {
  console.log('\n=== Test 2: System Prompt ===');
  
  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Who are you?'
        }
      ],
      system: 'You are Gojo Satoru from Jujutsu Kaisen. Respond in his confident, playful style.',
      max_tokens: 100
    });

    console.log('✅ Response received');
    console.log('Response text:', response.content[0].text);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 3: Multi-turn conversation
 */
async function testMultiTurn() {
  console.log('\n=== Test 3: Multi-turn Conversation ===');
  
  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-haiku-20240307',
      messages: [
        {
          role: 'user',
          content: 'What is 2+2?'
        },
        {
          role: 'assistant',
          content: '2+2 equals 4.'
        },
        {
          role: 'user',
          content: 'What about 3+3?'
        }
      ],
      max_tokens: 50
    });

    console.log('✅ Response received');
    console.log('Response text:', response.content[0].text);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 4: Helper function
 */
async function testHelperFunction() {
  console.log('\n=== Test 4: Helper Function ===');
  
  try {
    const responseText = await sendClaudeMessage(
      [
        { role: 'user', content: 'Name one anime in 3 words or less.' }
      ],
      {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 20
      }
    );

    console.log('✅ Response received');
    console.log('Response text:', responseText);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Test 5: Different models
 */
async function testDifferentModels() {
  console.log('\n=== Test 5: Different Models ===');
  
  const models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307'
  ];

  let allPassed = true;

  for (const model of models) {
    try {
      console.log(`\nTesting ${model}...`);
      
      const response = await claudeAPI.sendMessage({
        model,
        messages: [
          { role: 'user', content: 'Say "test" and nothing else.' }
        ],
        max_tokens: 10
      });

      console.log(`✅ ${model} works`);
      console.log('Response:', response.content[0].text);
    } catch (error) {
      console.error(`❌ ${model} failed:`, error);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Test 6: Temperature variation
 */
async function testTemperature() {
  console.log('\n=== Test 6: Temperature Variation ===');
  
  const temperatures = [0.1, 0.5, 1.0];
  let allPassed = true;

  for (const temp of temperatures) {
    try {
      console.log(`\nTesting temperature ${temp}...`);
      
      const response = await claudeAPI.sendMessage({
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          { role: 'user', content: 'Complete this: "One Piece is..."' }
        ],
        max_tokens: 20,
        temperature: temp
      });

      console.log(`✅ Temperature ${temp} works`);
      console.log('Response:', response.content[0].text);
    } catch (error) {
      console.error(`❌ Temperature ${temp} failed:`, error);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Test 7: API info
 */
function testAPIInfo() {
  console.log('\n=== Test 7: API Information ===');
  
  try {
    const path = claudeAPI.getEndpointPath();
    const url = claudeAPI.getFullEndpointUrl();
    
    console.log('Endpoint path:', path);
    console.log('Full URL:', url);
    
    console.log('✅ API info retrieved successfully');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function testClaudeAPI() {
  console.log('\n🧪 Starting Claude API Tests...\n');
  console.log('='.repeat(50));
  
  const results = {
    basicMessage: false,
    systemPrompt: false,
    multiTurn: false,
    helperFunction: false,
    differentModels: false,
    temperature: false,
    apiInfo: false
  };

  // Run tests sequentially to avoid rate limiting
  results.basicMessage = await testBasicMessage();
  await delay(2000);
  
  results.systemPrompt = await testSystemPrompt();
  await delay(2000);
  
  results.multiTurn = await testMultiTurn();
  await delay(2000);
  
  results.helperFunction = await testHelperFunction();
  await delay(2000);
  
  results.differentModels = await testDifferentModels();
  await delay(2000);
  
  results.temperature = await testTemperature();
  await delay(2000);
  
  results.apiInfo = testAPIInfo();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results Summary:\n');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Claude API is working correctly.\n');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.\n');
  }

  return results;
}

/**
 * Delay helper to avoid rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Quick test - just one simple request
 */
export async function quickTestClaudeAPI() {
  console.log('\n🚀 Quick Claude API Test...\n');
  
  try {
    const response = await claudeAPI.sendMessage({
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Say "Claude API is working!" and nothing else.'
        }
      ],
      max_tokens: 20
    });

    console.log('✅ Response:', response.content[0].text);
    console.log('\n✨ Claude API is working correctly!\n');
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️ Claude API test failed.\n');
    return false;
  }
}
