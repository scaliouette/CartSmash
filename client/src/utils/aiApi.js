export const askClaude = async (prompt) => {
  const res = await fetch('/api/ai/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
};

export const askChatGPT = async (prompt) => {
  const res = await fetch('/api/ai/chatgpt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return await res.json();
};
