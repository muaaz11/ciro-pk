import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function runExecutionAgent(responsePlan, hospitals, coolingCenters) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    // System instruction isn't strictly requested by user for this agent, but helps set context
    systemInstruction: "You are an automated crisis execution system. You take a response plan, simulate the actions on the given resources, log them, and output the updated resources and an incident report. Always return valid JSON only."
  });

  const prompt = `
Response Plan:
${JSON.stringify(responsePlan, null, 2)}

Current Hospitals:
${JSON.stringify(hospitals, null, 2)}

Current Cooling Centers:
${JSON.stringify(coolingCenters, null, 2)}

Simulate the execution of each action. Update hospital bed counts and cooling center occupancies accordingly. Generate formatted alert messages and create an incident report.

Return this EXACT JSON structure:
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
    "hospitals": [ updated hospital array... ],
    "cooling_centers": [ updated cooling centers array... ]
  }
}
`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(result.response.text());
}
