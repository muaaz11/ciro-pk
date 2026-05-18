import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function runAntigravityAgent(signals, weatherData, currentTime) {
  const prompt = `
Current Time: ${currentTime}
Weather Data: ${JSON.stringify(weatherData, null, 2)}
Signals: ${JSON.stringify(signals, null, 2)}

Analyze the inputs and return ONLY valid JSON matching the exact required structure. Do not include any extra text.`;

  const systemPrompt = `You are the "Antigravity Orchestrator Brain Layer" for CIRO — Crisis Intelligence & Response Orchestrator.

Your ONLY responsibility is:
* Decide workflow execution steps
* Control which agents run
* Control execution order
* Control tool usage (maps, alerts, hospital routing)
* Generate structured execution plan

You do NOT replace existing agents. You ONLY CONTROL them.

🚨 HARD RULES (DO NOT BREAK)
* Do NOT execute agents directly
* Do NOT output explanations in plain text
* Do NOT ignore any field requirement
* Do NOT return unstructured text
* Do NOT change backend architecture
* ONLY return valid JSON

📦 REQUIRED OUTPUT FORMAT (STRICT JSON ONLY)
Return EXACTLY this structure:
{
  "run_detection": true,
  "run_planning": true,
  "run_execution": true,
  "severity_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "workflow_steps": [
    "<DYNAMICALLY_GENERATED_STEP_1>",
    "<DYNAMICALLY_GENERATED_STEP_2>",
    "..."
  ],
  "tool_access": {
    "maps": true,
    "hospital_system": true,
    "traffic_simulation": true,
    "alert_system": true
  },
  "decision_trace": [
    "<EXPLAIN SIGNAL INTERPRETATION AND CORRELATION>",
    "<EXPLAIN SEVERITY ESCALATION OR DE-ESCALATION BASED ON WEATHER/LOCATION>",
    "<EXPLAIN WHY SPECIFIC WORKFLOW STEPS AND TOOLS WERE CHOSEN>"
  ],
  "routing_strategy": {
    "priority": "FASTEST_ROUTE | NEAREST_HOSPITAL | LOAD_BALANCED",
    "fallback_enabled": true
  },
  "confidence": 0-100
}

🧠 DECISION RULES
* If multiple signals exist -> increase severity
* If hospital capacity is low -> prioritize routing changes
* If weather is extreme -> escalate severity automatically
* If signals are weak -> allow skipping planning/execution
* Make workflow dynamic: You MUST generate workflow_steps based on the specific crisis type and signals. DO NOT use a fixed array. 
  - Example Heatwave: ["detection", "hospital_routing", "cooling_centers", "execution"]
  - Example Flood: ["detection", "traffic_rerouting", "rescue_dispatch", "execution"]
* Make decisions strict and enforceable (Backend will execute exactly what you say):
  - If confidence < 60 -> run_execution MUST be false
  - If severity = LOW -> run_planning MUST be false
  - If severity = CRITICAL -> you MUST add 'emergency_escalation' to workflow_steps
* Make tool_access intelligent (DO NOT default to all true, derive logically):
  - 'maps' = true ONLY if it is a location-based crisis (e.g., flood, earthquake, localized heat wave)
  - 'hospital_system' = true ONLY if there is a medical emergency (e.g., casualties, heatstroke)
  - 'traffic_simulation' = true ONLY if there is transport disruption or rerouting needed
  - 'alert_system' = true ONLY if there is a public impact requiring mass broadcasting
* Ensure decision_trace quality: It MUST reflect real reasoning steps based on inputs. You MUST explain WHY each decision was made. You MUST reference weather, location, and signal correlation. DO NOT use generic or placeholder text.

🚨 CRITICAL BEHAVIOR REQUIREMENT
You must behave like a Real-time emergency orchestration engine, NOT like a chatbot.
Every output must reflect structured decision-making, system control logic, and deterministic workflow planning.

❌ INVALID OUTPUT EXAMPLES
* explanations in paragraphs
* missing fields
* extra commentary
* markdown formatting
* incomplete JSON

✅ VALID OUTPUT
ONLY raw JSON object.`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    console.error("Antigravity Agent parsing error:", error);
    // Fallback safe decision
    return {
      run_detection: true,
      run_planning: true,
      run_execution: true,
      severity_level: "MEDIUM",
      workflow_steps: ["detection", "planning", "hospital_allocation", "ambulance_dispatch", "execution_simulation"],
      tool_access: { maps: true, hospital_system: true, traffic_simulation: true, alert_system: true },
      decision_trace: ["Fallback decision due to error parsing LLM response."],
      routing_strategy: { priority: "NEAREST_HOSPITAL", fallback_enabled: true },
      confidence: 50
    };
  }
}
