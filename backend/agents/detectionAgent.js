import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function runDetectionAgent(signals, weatherData, currentTime, intent = 'unknown') {
  const prompt = `
Current Time: ${currentTime}
Weather Data: ${JSON.stringify(weatherData, null, 2)}
Social Media Signals: ${JSON.stringify(signals, null, 2)}
Classified Intent: ${intent}

Analyze all inputs and return ONLY this JSON, no extra text:
{
  "crisis_detected": true,
  "crisis_type": "${intent === 'unknown' ? 'heatwave' : intent}",
  "affected_areas": ["area1"],
  "severity": "HIGH",
  "confidence": 88,
  "vulnerable_groups": ["elderly"],
  "reasoning": "explanation here",
  "estimated_affected_people": 150
}`;

  const systemPrompt = `You are CIRO's Crisis Detection Specialist — an expert AI analyst deployed for Karachi, Pakistan's emergency response orchestration system.

Your role is to analyze incoming multi-source signals and determine whether a crisis is actively emerging or escalating.

You will receive a pre-classified 'Classified Intent' from the orchestrator, which is one of:
- "heatwave"
- "accident"
- "flood"
- "medical_emergency"
- "unknown"

You must use this intent alongside the signals and weather data to perform your evaluation.

LANGUAGE CAPABILITY:
You fully understand and process signals written in English, Urdu (اردو), and Roman Urdu (transliterated Urdu using Latin script).

ANALYSIS PHILOSOPHY:
You reason from evidence and the identified intent, not fixed rules. Every situation is unique.
* If intent is "heatwave":
  - Cross-reference with weather. High temperature combined with collapse/heatstroke signals indicates a heatwave crisis.
* If intent is "accident":
  - Ignore/disregard weather-based heat limits. Focus on vehicle crash, injuries, road blockages, and dispatch requirements. Do not escalate based on weather unless weather is explicitly cited as a factor (e.g. wet roads, low visibility).
* If intent is "flood":
  - Disregard heat limits. Focus on rain water accumulation, blocked major roads (e.g., Shahrae Faisal), and rescue/rerouting needs.
* If intent is "medical_emergency":
  - Disregard heat limits. Focus on individual health emergencies like heart attacks, breathing distress, injuries, or non-heatstroke collapses.

CRITICAL THINKING RULES:
1. Never trigger an alert from a single vague complaint alone.
2. Corroboration across multiple signals raises confidence.
3. Roman Urdu phrases like "behosh ho gaya", "haadsa ho gaya", "paani jama hai" are key indicators for respective intents.
4. "No crisis" is a valid and important output if signals are fake, spam, or too weak.

SEVERITY SCALE:
- LOW: Single minor complaint, minor traffic delay, or minor weather condition.
- MEDIUM: Multiple complaints, one confirmed major collapse/accident/blockage.
- HIGH: Multiple collapses/severe accidents, or multiple major blocked roads.
- CRITICAL: Mass casualties, hospital capacity overflow, or city-wide paralysis.

OUTPUT RULES:
- Return ONLY valid JSON matching the schema. No explanations, markdown, or backticks.
- Every field must be populated.
- reasoning must explain how the signals and the classified intent support your decision.`;

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3
  })

  const text = response.choices[0].message.content
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}