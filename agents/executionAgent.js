import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function runExecutionAgent(responsePlan, hospitals, coolingCenters) {
  const prompt = `
Response Plan: ${JSON.stringify(responsePlan, null, 2)}
Current Hospitals: ${JSON.stringify(hospitals, null, 2)}
Current Cooling Centers: ${JSON.stringify(coolingCenters, null, 2)}

Simulate execution of each action. Return ONLY this JSON, no extra text:
{
  "execution_log": [
    {
      "action_id": "A1",
      "status": "EXECUTED",
      "timestamp": "2025-06-15T12:00:00Z",
      "result": "what happened",
      "simulated_impact": "people helped"
    }
  ],
  "incident_report": {
    "report_id": "KHI-2025-0001",
    "created_at": "2025-06-15T12:00:00Z",
    "crisis_summary": "brief summary",
    "actions_taken": 3,
    "estimated_lives_impacted": 150,
    "status": "ACTIVE"
  },
  "updated_resources": {
    "hospitals": [],
    "cooling_centers": []
  }
}`

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are an automated crisis execution system. Always return valid JSON only. No markdown, no backticks.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3
  })

  const text = response.choices[0].message.content
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}