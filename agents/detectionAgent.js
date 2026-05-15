import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function runDetectionAgent(signals, weatherData, currentTime) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    systemInstruction: "You are a crisis detection specialist for Karachi, Pakistan. You analyze social media signals and weather data to detect heatwave health emergencies. You understand Urdu, Roman Urdu, and English. You never use fixed rules — you reason from evidence. Always return valid JSON only."
  });

  const prompt = `
Current Time: ${currentTime}

Weather Data:
${JSON.stringify(weatherData, null, 2)}

Social Media Signals:
${JSON.stringify(signals, null, 2)}

Analyze all inputs together and return this exact JSON structure:
{
  "crisis_detected": boolean,
  "crisis_type": "heatwave",
  "affected_areas": ["area1", "area2"],
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number (0-100),
  "vulnerable_groups": ["group1", "group2"],
  "reasoning": "explanation of why this conclusion",
  "estimated_affected_people": number
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
