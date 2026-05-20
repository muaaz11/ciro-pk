import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function runPlanningAgent(crisisAssessment, hospitals, coolingCenters, patientCount = 1) {
  const prompt = `
Crisis Assessment: ${JSON.stringify(crisisAssessment, null, 2)}
Available Hospitals: ${JSON.stringify(hospitals, null, 2)}
Cooling Centers: ${JSON.stringify(coolingCenters, null, 2)}
Required Bed Allocation Count: ${patientCount}

EMERGENCY HOSPITAL ROUTING RULES:
1. Identify the incident location from the crisis assessment.
2. Filter the hospitals by proximity to the incident.
3. Check the "emergency_beds_available" count for the nearest hospital.
4. If "emergency_beds_available" is less than ${patientCount}, do NOT route to that hospital. You MUST check the next nearest hospital that can accommodate all ${patientCount} patients.
5. Repeat this process until you find the closest operational hospital with emergency_beds_available >= ${patientCount}.
6. Dispatch the ambulance to pick up the patients and transport them to the hospital that has available beds.

Return ONLY this JSON, no extra text:
IMPORTANT: You MUST set the "emergency_beds_available" under "hospital_routing" to exactly ${patientCount}.
{
  "response_plan": {
    "priority": "IMMEDIATE",
    "actions": [
      {
        "action_id": "A1",
        "type": "ambulance_dispatch",
        "target": "hospital name with available beds",
        "instruction": "Dispatch from source to Gulshan Chowrangi, pick up exactly ${patientCount} heatstroke victims, and transport to [hospital name]",
        "reasoning": "Reasoning based on bed availability and proximity"
      }
    ],
    "hospital_routing": {
      "recommendation": "hospital name",
      "emergency_beds_available": ${patientCount},
      "reasoning": "Explain why this hospital was chosen over others"
    },
    "public_message": {
      "english": "alert in english",
      "urdu": "اردو میں الرٹ",
      "roman_urdu": "roman urdu mein alert"
    }
  }
}`

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are an emergency health response coordinator for Karachi. Do hospital load balancing. Always return valid JSON only. No markdown, no backticks.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3
  })

  const text = response.choices[0].message.content
  const clean = text.replace(/```json|```/g, '').trim()
  const result = JSON.parse(clean);
  if (result.response_plan && result.response_plan.hospital_routing) {
    result.response_plan.hospital_routing.emergency_beds_available = patientCount;
  }
  return result;
}