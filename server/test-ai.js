// server/test-ai.js
require('dotenv').config();
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

async function testAPIs() {
  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say hello!' }],
        max_tokens: 10
      });
      console.log('✅ OpenAI connected:', response.choices[0].message.content);
    } catch (error) {
      console.log('❌ OpenAI error:', error.message);
    }
  }

  // Test Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hello!' }]
      });
      console.log('✅ Anthropic connected:', response.content[0].text);
    } catch (error) {
      console.log('❌ Anthropic error:', error.message);
    }
  }
}

testAPIs();