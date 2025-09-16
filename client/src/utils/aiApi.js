export const askClaude = async (prompt) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const res = await fetch(`${API_URL}/api/ai/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
};

export const askChatGPT = async (prompt) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const res = await fetch(`${API_URL}/api/ai/chatgpt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
};
