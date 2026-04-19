import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const isDev = import.meta.env.DEV;

// Modo Local (Escritorio)
const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true 
});

async function runPrompt(messages) {
    if (isDev) {
        // En tu computadora, pasamos directo
        if (!apiKey) throw new Error("Falta llave de OpenAI local");
        try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: messages,
              temperature: 0.7,
              response_format: { type: "json_object" }
            });
            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            throw new Error(`OpenAI Error Local: ${error.message}`);
        }
    } else {
        // En Vercel, pasamos por la "Aduana Inversa" para burlar los bloqueos CORS del navegador celular
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messages,
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
           throw new Error(data.error || `HTTP ${res.status}`);
        }
        
        return JSON.parse(data.choices[0].message.content);
    }
}

export async function generateSimulationScenario(idea) {
  const promptText = `
Eres un creador experto de entrenamientos (roleplay) para vendedores de tiendas de retail deportivo (ej. Marathon Sports).
El administrador quiere crear una simulación basada en la siguiente idea del cliente: "${idea}".

Necesito que devuelvas la estructura de esta simulación estrictamente en el siguiente formato JSON, y NADA MÁS que el JSON (sin \`\`\`json ni texto extra):
{
  "title": "Nombre llamativo del escenario de simulación",
  "role": "asesor | cajero | bodeguero" (deduce de la idea el más apropiado),
  "persona": "Descripción súper breve y psicológica de la personalidad del cliente autómata (Ej: 'Padre apurado, busca botines caros')",
  "xp": (Un valor numérico entre 50 y 150),
  "evaluation_criteria_arr": [
     "Criterio 1 a cumplir para tener nota máxima",
     "Criterio 2 a cumplir",
     "Criterio 3 a cumplir"
  ]
}
`;
  return await runPrompt([{ role: "user", content: promptText }]);
}

export async function respondAsCustomer(scenario, messageHistory, userMessage) {
  const criteriaList = Array.isArray(scenario.evaluation_criteria) ? scenario.evaluation_criteria.join(", ") : scenario.evaluation_criteria;

  const systemPrompt = `
Eres un cliente en una tienda de Retail deportivo actuando un roleplay de entrenamiento para vendedores.
Tu personalidad y actitud es estrictamente esta: "${scenario.ai_persona}". Mantenla en todo momento.

El vendedor debe lograr cumplir estos criterios exactos para considerarse "Aprobado":
${criteriaList}

Instrucciones:
1. Responde al vendedor de manera realista y natural según tu personalidad (breve, como un chat o en persona).
2. Analiza toda la conversación. Si el vendedor ha satisfecho completamente tus Criterios de Evaluación de forma natural, cambia la variable "completed" a true, de lo contrario manténla en false.
3. Devuelve estrictamente un objeto JSON y nada más.

Formato esperado:
{
  "reply": "Tu línea de diálogo en respuesta al asesor",
  "completed": true o false
}
`;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  for (const msg of messageHistory) {
      if (msg.sender === 'bot') {
          messages.push({ role: "assistant", content: msg.text });
      } else if (msg.sender === 'user') {
          messages.push({ role: "user", content: msg.text });
      }
  }

  messages.push({ role: "user", content: userMessage });

  try {
     return await runPrompt(messages);
  } catch (error) {
     console.error("Vercel/OpenAI Bridge Error:", error);
     return { reply: `[AI Error: ${error.message}]`, completed: false };
  }
}
