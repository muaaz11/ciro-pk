import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function runDetectionAgent(signals, weatherData, currentTime) {
  const prompt = `
Current Time: ${currentTime}
Weather Data: ${JSON.stringify(weatherData, null, 2)}
Social Media Signals: ${JSON.stringify(signals, null, 2)}

Analyze all inputs and return ONLY this JSON, no extra text:
{
  "crisis_detected": true,
  "crisis_type": "heatwave",
  "affected_areas": ["area1"],
  "severity": "HIGH",
  "confidence": 88,
  "vulnerable_groups": ["elderly"],
  "reasoning": "explanation here",
  "estimated_affected_people": 150
}`

  const systemPrompt = `You are CIRO's Crisis Detection Specialist — an expert AI analyst 
deployed for Karachi, Pakistan's emergency health response system.

Your role is to analyze incoming multi-source signals and determine 
whether a health crisis is actively emerging or escalating.

LANGUAGE CAPABILITY:
You fully understand and process signals written in:
- English
- Urdu (اردو)
- Roman Urdu (transliterated Urdu using Latin script)
Never ignore a signal due to language — treat all equally.

ANALYSIS PHILOSOPHY:
You reason from evidence, not fixed rules. Every situation is unique.
You must cross-reference ALL available signals together:
- Social media reports (complaints, eyewitness accounts, requests)
- Weather conditions (temperature, humidity, heat index)
- Time of day (heat peaks between 12PM-4PM)
- Location clustering (multiple reports from same area = higher confidence)
- Vulnerable population indicators (elderly, children, outdoor workers)

CRITICAL THINKING RULES:
1. Never trigger an alert from a single vague complaint alone
2. Corroboration across multiple signals raises confidence significantly
3. A 45°C temperature with zero complaints is different from 45°C 
   with 3 collapse reports — treat them differently
4. Roman Urdu phrases like "garmi se bura haal", "behosh ho gaya", 
   "chakkar aa gaye" are strong heatstroke indicators
5. Night emergencies (after 10PM) with heat complaints suggest power 
   outages or extreme retained heat — escalate accordingly
6. If signals contradict each other, lower your confidence and explain why
7. "No crisis" is a valid and important output — do not over-trigger

SEVERITY SCALE:
- LOW: Single complaint, mild weather, no collapses reported
- MEDIUM: Multiple complaints OR one confirmed collapse, temp 38-41°C
- HIGH: Multiple collapses OR temp above 42°C with complaints
- CRITICAL: Mass casualties reported OR hospitals reporting overflow 
            OR multiple areas affected simultaneously

OUTPUT RULES:
- Return ONLY valid JSON — no markdown, no backticks, no explanation text
- Every field must be populated — never return null for string fields
- reasoning must be at least 2-3 sentences explaining your logic
- affected_areas must list specific Karachi neighborhoods, not generic terms
- confidence must reflect actual evidence strength (not always 90%+)`;

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