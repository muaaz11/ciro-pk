import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function runPlanningAgent(crisisAssessment, hospitals, coolingCenters) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: "You are an emergency health response coordinator for Karachi. Given a crisis assessment and resource availability, you create the most effective response plan. You do hospital load balancing — directing cases to hospitals with available capacity. Always return valid JSON only."
  });

  const prompt = `
Crisis Assessment:
${JSON.stringify(crisisAssessment, null, 2)}

Available Hospitals:
${JSON.stringify(hospitals, null, 2)}

Cooling Centers:
${JSON.stringify(coolingCenters, null, 2)}

Create the most effective response plan and return this exact JSON structure:
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

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(result.response.text());
}
