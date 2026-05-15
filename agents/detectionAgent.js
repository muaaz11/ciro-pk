import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function runDetectionAgent(signals, weatherData, currentTime) {
  const prompt = `
Current Time: ${currentTime}

Weather Data:
${JSON.stringify(weatherData, null, 2)}

Social Media Signals:
${JSON.stringify(signals, null, 2)}

Analyze all inputs together and return this exact JSON structure with no extra text, no markdown, no backticks:
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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: "You are a crisis detection specialist for Karachi, Pakistan. You analyze social media signals and weather data to detect heatwave health emergencies. You understand Urdu, Roman Urdu, and English. You never use fixed rules — you reason from evidence. Always return valid JSON only. No markdown, no backticks, no extra text.",
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text;
  return JSON.parse(text);
}