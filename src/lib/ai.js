import OpenAI from 'openai';
import { supabase } from './supabase';

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

// Función auxiliar para obtener el contexto de "Pregúntame"
async function getKnowledgeContext() {
  const { data, error } = await supabase.from('knowledge_documents').select('title, content');
  if (error || !data || data.length === 0) return "";
  
  let context = "INFORMACIÓN DE LA BASE DE CONOCIMIENTO DE LA EMPRESA:\n";
  data.forEach(doc => {
     context += `--- Documento: ${doc.title} ---\n${doc.content}\n\n`;
  });
  return context;
}

export async function generateSimulationScenario(idea) {
  const knowledge = await getKnowledgeContext();

  const promptText = `
Eres un creador experto de entrenamientos corporativos (roleplay) para colaboradores de una empresa de retail deportivo.
El administrador quiere crear una simulación basada en la siguiente instrucción o caso: "${idea}".

${knowledge ? `Utiliza la siguiente Base de Conocimiento de la empresa para hacer la simulación realista y apegada a los manuales y políticas oficiales:\n${knowledge}\n` : ''}

Necesito que devuelvas la estructura de esta simulación estrictamente en el siguiente formato JSON, y NADA MÁS que el JSON (sin \`\`\`json ni texto extra):
{
  "title": "Nombre llamativo del escenario de simulación",
  "role": "asesor | cajero | bodeguero" (deduce de la idea el rol al que va dirigido el entrenamiento),
  "persona": "Descripción breve del personaje que TÚ (la IA) vas a tomar para interactuar con el empleado. Puede ser un cliente, un supervisor, un auditor, etc. (Ej: 'Supervisor estricto haciendo preguntas sobre el cierre de caja' o 'Cliente molesto')",
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
  const knowledge = await getKnowledgeContext();

  const systemPrompt = `
Eres un personaje interactuando en un roleplay de entrenamiento corporativo con un empleado que está practicando.
Tu rol y personalidad en este escenario es estrictamente el siguiente: "${scenario.ai_persona}". Mantenla en todo momento de forma inmersiva.

El empleado debe lograr cumplir estos criterios exactos para considerarse "Aprobado":
${criteriaList}

${knowledge ? `A continuación, se te provee la Base de Conocimiento de la empresa. Úsala como tu verdad absoluta sobre políticas, garantías, características de productos o procedimientos para responder y evaluar al empleado de manera realista:\n${knowledge}\n` : ''}

Instrucciones:
1. Responde al empleado de manera realista y natural según tu personaje (actúa como ese supervisor, auditor, cliente, etc. de forma conversacional y concisa).
2. Analiza toda la conversación. Si el empleado ha satisfecho completamente tus Criterios de Evaluación de forma natural y apegado a los manuales, cambia la variable "completed" a true, de lo contrario manténla en false.
3. Devuelve estrictamente un objeto JSON y nada más.

Formato esperado:
{
  "reply": "Tu línea de diálogo en respuesta al empleado",
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
