// server/services/aiService.js
// AI service wrapper for meal plan generation

/**
 * Generate content with AI using existing CartSmash AI endpoints
 */
async function generateWithAI(prompt, options = {}) {
  try {
    // Use the existing AI endpoints from CartSmash
    const apiUrl = `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/ai/claude`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        context: options.context || 'meal_plan_generation',
        options: {
          ...options,
          includeRecipes: true,
          formatAsList: true,
          structuredFormat: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract response text using the same logic as existing CartSmash code
    const responseText = extractAIResponseText(data);
    
    if (!responseText) {
      throw new Error('No response text found in AI data');
    }
    
    return responseText;
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