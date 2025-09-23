export const askClaude = async (prompt) => {
  const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
  const res = await fetch(`${API_URL}/api/ai/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
};

export const askChatGPT = async (prompt) => {
  const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';
  const res = await fetch(`${API_URL}/api/ai/chatgpt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
};
