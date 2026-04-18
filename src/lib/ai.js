import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Instanciamiento seguro para frontend. 
// NOTA: Para producción real esto debe estar en un backend (Supabase Edge Function),
// pero para validar el MVP local se permite en frontend:
const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true 
});

export async function generateSimulationScenario(idea) {
  if (!apiKey) throw new Error("Falta configurar la llave de OpenAI en el entorno.");

  const promptText = `
Eres un creador experto de entrenamientos (roleplay) para vendedores de tiendas de retail deportivo (ej. Marathon Sports).
El administrador quiere crear una simulación basada en la siguiente idea del cliente: "${idea}".

Necesito que devuelvas la estructura de esta simulación estrictamente en el siguiente formato JSON, y NADA MÁS que el JSON (sin \`\`\`json ni texto extra):
{
  "title": "Nombre llamativo del escenario de simulación",
  "role": "asesor | cajero | bodeguero" (deduce de la idea el más apropiado),
  "persona": "Descripción súper breve y psicológica de la personalidad del cliente autómata (Ej: 'Padre apurado, busca botines caros pero no entiende de tecnología')",
  "xp": (Un valor numérico entre 50 y 150),
  "evaluation_criteria_arr": [
     "Criterio 1 a cumplir para tener nota máxima",
     "Criterio 2 a cumplir",
     "Criterio 3 a cumplir"
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo ultra rápido y económico
      messages: [{ role: "user", content: promptText }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("OpenAI Error:", error);
    throw new Error("No se pudo generar con IA en este momento.");
  }
}

export async function respondAsCustomer(scenario, messageHistory, userMessage) {
  if (!apiKey) throw new Error("Falta configurar la llave de OpenAI en el entorno.");

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

  // Construir historial en formato OpenAI
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

  // Agregar el mensaje nuevo del usuario
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error("OpenAI Error (Chat):", error);
    return { reply: "[Error de red: La Inteligencia no pudo procesar la respuesta. Intenta de nuevo]", completed: false };
  }
}
