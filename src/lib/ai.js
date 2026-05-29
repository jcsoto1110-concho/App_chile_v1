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
Eres un creador experto de entrenamientos corporativos interactivos para colaboradores de una empresa.
El administrador quiere crear una simulación de entrenamiento paso a paso basada en la siguiente instrucción o caso: "${idea}".

${knowledge ? `Utiliza la siguiente Base de Conocimiento de la empresa para hacer la simulación realista y apegada a los manuales oficiales:\n${knowledge}\n` : ''}

IMPORTANTE: La dinámica del entrenamiento es que el COLABORADOR es quien debe ejecutar el proceso o resolver el caso (describiendo qué hace o qué responde), y la IA (tú) actuará como un COACH, GUÍA o EVALUADOR experto que supervisa, corrige y guía paso a paso.

Necesito que devuelvas la estructura de esta simulación estrictamente en el siguiente formato JSON, y NADA MÁS que el JSON (sin \`\`\`json ni texto extra):
{
  "title": "Nombre llamativo del entrenamiento práctico",
  "role": "asesor | cajero | bodeguero" (deduce el rol al que va dirigido),
  "persona": "Descripción del rol del Coach. Ej: 'Coach experto en caja que verifica paso a paso que el colaborador cumpla las políticas, corrigiéndolo constructivamente en caso de error.'",
  "xp": (Un valor numérico entre 50 y 150),
  "evaluation_criteria_arr": [
     "Paso 1 que el colaborador debe realizar y describir",
     "Paso 2 que el colaborador debe realizar y describir",
     "Paso 3 que el colaborador debe realizar y describir"
  ]
}
`;
  return await runPrompt([{ role: "user", content: promptText }]);
}

export async function respondAsCustomer(scenario, messageHistory, userMessage) {
  const criteriaList = Array.isArray(scenario.evaluation_criteria) ? scenario.evaluation_criteria.join(", ") : scenario.evaluation_criteria;
  const knowledge = await getKnowledgeContext();

  const systemPrompt = `
Eres un Coach, Guía o Instructor experto interactuando en un entrenamiento práctico paso a paso con un colaborador de la empresa.
Tu personalidad y objetivo en este entrenamiento es estrictamente el siguiente: "${scenario.ai_persona}". Mantenla de forma constructiva, profesional y alentadora.

El empleado debe lograr cumplir secuencialmente o en su totalidad estos pasos exactos (criterios) para aprobar el entrenamiento:
${criteriaList}

${knowledge ? `A continuación, se te provee la Base de Conocimiento de la empresa. Úsala como tu verdad absoluta sobre políticas o procedimientos para evaluar si lo que hace o dice el empleado es correcto:\n${knowledge}\n` : ''}

Instrucciones:
1. Responde al empleado dándole feedback sobre la acción que acaba de describir o la respuesta que dio. Si es correcto, felicítalo e indícale la situación para que dé el siguiente paso. Si se equivoca, corrígelo constructivamente basándote en la Base de Conocimiento.
2. NUNCA resuelvas el proceso por el empleado; hazle preguntas guía u oblígalo a pensar cuál es el paso correcto a seguir.
3. Analiza toda la conversación. Si el empleado ya logró completar TODOS los pasos (criterios de evaluación) de forma correcta, despídete felicitándolo y cambia la variable "completed" a true. De lo contrario, mantenla en false.
4. Devuelve estrictamente un objeto JSON y nada más.

Formato esperado:
{
  "reply": "Tu retroalimentación, corrección o indicación del siguiente paso para el empleado",
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
