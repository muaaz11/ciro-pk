import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runPlanningAgent(crisisAssessment, hospitals, coolingCenters) {
  const prompt = `
Crisis Assessment:
${JSON.stringify(crisisAssessment, null, 2)}

Available Hospitals:
${JSON.stringify(hospitals, null, 2)}

Cooling Centers:
${JSON.stringify(coolingCenters, null, 2)}

Create the most effective response plan and return this exact JSON structure with no extra text, no markdown, no backticks:
{
  "response_plan": {
    "priority": "IMMEDIATE" | "URGENT" | "MODERATE",
    "actions": [
      {
        "action_id": "A1",
        "type": "hospital_alert" | "cooling_center_activation" | "public_alert" | "ambulance_dispatch" | "resource_reallocation",
        "target": "name of hospital or area",
        "instruction": "what exactly to do",
        "reasoning": "why this action"
      }
    ],
    "hospital_routing": {
      "recommendation": "which hospital for new cases",
      "reasoning": "bed availability based logic"
    },
    "public_message": {
      "english": "alert message in english",
      "urdu": "اردو میں الرٹ",
      "roman_urdu": "roman urdu mein alert"
    }
  }
}
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: "You are an emergency health response coordinator for Karachi. Given a crisis assessment and resource availability, you create the most effective response plan. You do hospital load balancing — directing cases to hospitals with available capacity. Always return valid JSON only. No markdown, no backticks, no extra text.",
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;
  return JSON.parse(text);
}