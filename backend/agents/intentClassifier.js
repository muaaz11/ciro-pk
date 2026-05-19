import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function classifySignalIntent(signals) {
  const signalText = (signals || []).map(s => s.text).join('\n');
  
  if (!signalText.trim()) {
    return { intent: 'unknown', reasoning: 'Empty signal text.' };
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are the Intent Classifier for CIRO (Crisis Intelligence & Response Orchestrator).
Analyze the incoming emergency text and classify the primary crisis intent into exactly one of the following lowercase strings:
- "heatwave" (use for heat stroke, dehydration, extreme summer temperature collapses, garmi, high heat)
- "accident" (use for vehicle crash, road collision, traffic accident, road block, accident)
- "flood" (use for flash flood, urban flooding, rain water logging, Shahrae Faisal overflow, rain storm)
- "medical_emergency" (use for general medical issues like heart attack, breathing difficulty, injury, or generic collapse not explicitly tied to weather/heat)
- "unknown" (use for vague, unrelated, or unclassifiable signals)

Return ONLY valid JSON matching this format:
{
  "intent": "heatwave | accident | flood | medical_emergency | unknown",
  "reasoning": "Brief explanation of why it was classified this way"
}`
        },
        {
          role: 'user',
          content: `Emergency Signal Text:\n"${signalText}"`
        }
      ],
      temperature: 0.1
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    
    let intent = (result.intent || 'unknown').toLowerCase().trim();
    if (intent === 'medical emergency') intent = 'medical_emergency';
    
    if (!['heatwave', 'accident', 'flood', 'medical_emergency', 'unknown'].includes(intent)) {
      intent = 'unknown';
    }

    return {
      intent,
      reasoning: result.reasoning || 'Classified by LLM.'
    };
  } catch (error) {
    console.error("Intent classification error:", error);
    
    // Rule-based heuristic fallback
    const lowerText = signalText.toLowerCase();
    let intent = 'unknown';
    if (lowerText.includes('heat') || lowerText.includes('garmi') || lowerText.includes('stroke') || lowerText.includes('sun')) {
      intent = 'heatwave';
    } else if (lowerText.includes('accident') || lowerText.includes('collision') || lowerText.includes('crash')) {
      intent = 'accident';
    } else if (lowerText.includes('flood') || lowerText.includes('rain') || lowerText.includes('water')) {
      intent = 'flood';
    } else if (lowerText.includes('collapse') || lowerText.includes('heart') || lowerText.includes('breath') || lowerText.includes('hurt')) {
      intent = 'medical_emergency';
    }
    
    return { intent, reasoning: 'Fallback heuristic classification due to error.' };
  }
}
