import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runExecutionAgent(responsePlan, hospitals, coolingCenters) {
  const prompt = `
Response Plan:
${JSON.stringify(responsePlan, null, 2)}

Current Hospitals:
${JSON.stringify(hospitals, null, 2)}

Current Cooling Centers:
${JSON.stringify(coolingCenters, null, 2)}

Simulate the execution of each action. Update hospital bed counts and cooling center occupancies accordingly. Generate formatted alert messages and create an incident report.

Return this EXACT JSON structure with no extra text, no markdown, no backticks:
{
  "execution_log": [
    {
      "action_id": "A1",
      "status": "EXECUTED",
      "timestamp": "ISO timestamp",
      "result": "what happened",
      "simulated_impact": "estimated people helped"
    }
  ],
  "incident_report": {
    "report_id": "KHI-YYYY-XXXX",
    "created_at": "timestamp",
    "crisis_summary": "brief summary",
    "actions_taken": number,
    "estimated_lives_impacted": number,
    "status": "ACTIVE" | "RESOLVING" | "RESOLVED"
  },
  "updated_resources": {
    "hospitals": [ updated hospital array ],
    "cooling_centers": [ updated cooling centers array ]
  }
}
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: "You are an automated crisis execution system. You take a response plan, simulate the actions on the given resources, log them, and output the updated resources and an incident report. Always return valid JSON only. No markdown, no backticks, no extra text.",
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;
  return JSON.parse(text);
}