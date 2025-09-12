// server/services/aiService.js
// AI service wrapper for meal plan generation

/**
 * Generate content with AI directly using the AI providers
 */
async function generateWithAI(prompt, options = {}) {
  try {
    const { OpenAI } = require('openai');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const Anthropic = require('@anthropic-ai/sdk');
    
    // Try Claude first (if available)
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('🤖 Using Claude AI for meal plan generation');
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      return response.content[0]?.text || '';
    }
    
    // Fallback to OpenAI
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Using OpenAI for meal plan generation');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 3000,
        temperature: 0.7
      });
      
      return response.choices[0]?.message?.content || '';
    }
    
    // Fallback to Google Gemini
    if (process.env.GOOGLE_AI_API_KEY) {
      console.log('🤖 Using Google Gemini for meal plan generation');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    }
    
    throw new Error('No AI service available - please configure ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_AI_API_KEY');
    
  } catch (error) {
    console.error('Error generating with AI:', error);
    throw error;
  }
}

/**
 * Extract AI response text (same logic as GroceryListForm)
 */
function extractAIResponseText(aiData) {
  // Check if the response is a string
  if (typeof aiData === 'string') {
    return aiData;
  }
  
  // Check various possible response structures
  const possiblePaths = [
    aiData?.response,
    aiData?.message,
    aiData?.text,
    aiData?.content,
    aiData?.data?.response,
    aiData?.data?.text,
    aiData?.data?.content,
    aiData?.result?.response,
    aiData?.result?.text,
    aiData?.completion,
    aiData?.choices?.[0]?.message?.content,
    aiData?.choices?.[0]?.text,
    aiData?.output,
    aiData?.generated_text
  ];
  
  // Find the first non-empty response
  for (const path of possiblePaths) {
    if (path && typeof path === 'string' && path.trim()) {
      return path;
    }
  }
  
  // If we still haven't found it, check if success is true and there's any string property
  if (aiData?.success) {
    for (const key in aiData) {
      if (typeof aiData[key] === 'string' && aiData[key].length > 50) {
        return aiData[key];
      }
    }
  }
  
  return null;
}

module.exports = {
  generateWithAI
};