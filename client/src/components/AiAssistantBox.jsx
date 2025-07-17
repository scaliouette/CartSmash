import React, { useState } from 'react';

const AiAssistantBox = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState('claude'); // or 'chatgpt'

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const res = await fetch(`/api/ai/${engine}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.content || 'No response received.';
      setResponse(content);
    } catch (err) {
      setResponse(`Error: ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-md space-y-4 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800">🧠 Ask the AI</h2>

      <textarea
        className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring focus:border-blue-400"
        rows={4}
        placeholder="Ask Claude or ChatGPT something..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex items-center justify-between">
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          className="p-2 rounded-md border border-gray-300 text-sm"
        >
          <option value="claude">Claude</option>
          <option value="chatgpt">ChatGPT</option>
        </select>

        <button
          onClick={handleSubmit}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
          disabled={loading}
        >
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>
      </div>

      {response && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md whitespace-pre-wrap text-sm">
          {response}
        </div>
      )}
    </div>
  );
};

export default AiAssistantBox;
