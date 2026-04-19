export default async function handler(req, res) {
  // Manejo de pre-flight / CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se admite POST' });
  }

  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
     return res.status(500).json({ error: 'La API Key VITE_OPENAI_API_KEY no existe en el Servidor de Vercel (Panel Settings).' });
  }

  try {
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await aiResponse.json();
    
    if (!aiResponse.ok) {
        return res.status(aiResponse.status).json({ error: data.error?.message || 'Error de OpenAI' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
