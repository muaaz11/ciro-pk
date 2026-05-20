import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function runExecutionAgent(responsePlan, hospitals, coolingCenters, patientCount = 1) {
  const prompt = `
Response Plan: ${JSON.stringify(responsePlan, null, 2)}
Current Hospitals: ${JSON.stringify(hospitals, null, 2)}
Current Cooling Centers: ${JSON.stringify(coolingCenters, null, 2)}
Dispatched Patient Count: ${patientCount}

Simulate execution of each action. Return ONLY this JSON, no extra text:
IMPORTANT: 
- Set "estimated_lives_impacted" in the incident_report to exactly ${patientCount}.
- Set "lives_impacted_improvement" in the impact_metrics to exactly ${patientCount}.
- Set "simulated_impact" for each action to exactly "${patientCount} patients helped".
{
  "execution_log": [
    {
      "action_id": "A1",
      "status": "EXECUTED",
      "timestamp": "2025-06-15T12:00:00Z",
      "result": "Dispatched ambulance and safely picked up ${patientCount} patients",
      "simulated_impact": "${patientCount} patients helped"
    }
  ],
  "incident_report": {
    "report_id": "KHI-2025-0001",
    "created_at": "2025-06-15T12:00:00Z",
    "crisis_summary": "brief summary",
    "actions_taken": 3,
    "estimated_lives_impacted": ${patientCount},
    "status": "ACTIVE"
  },
  "updated_resources": {
    "hospitals": [],
    "cooling_centers": []
  },
  "impact_metrics": {
    "traffic_congestion": {
      "before": "High",
      "after": "Moderate"
    },
    "hospital_load": {
      "before": "100%",
      "after": "85%"
    },
    "estimated_response_time_saved": "12 minutes",
    "lives_impacted_improvement": ${patientCount}
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
  const result = JSON.parse(clean);
  if (result.incident_report) {
    result.incident_report.estimated_lives_impacted = patientCount;
  }
  if (result.impact_metrics) {
    result.impact_metrics.lives_impacted_improvement = patientCount;
  }
  if (result.execution_log && result.execution_log.length > 0) {
    result.execution_log[0].simulated_impact = `${patientCount} patients helped`;
  }
  return result;
}