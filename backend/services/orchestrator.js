import { runDetectionAgent } from '../../agents/detectionAgent.js';
import { runPlanningAgent } from '../../agents/planningAgent.js';
import { runExecutionAgent } from '../../agents/executionAgent.js';
import { pool } from '../database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../../data');

async function readDataFile(filename) {
  try {
    const filePath = path.join(dataPath, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

export class SimulationEngine {
  constructor(io) {
    this.io = io;
    this.intervalId = null;
  }

  start(executionPlan) {
    if (this.intervalId) clearInterval(this.intervalId);

    const steps = executionPlan.execution_log || [];
    let currentStepIndex = 0;

    const startCoords = executionPlan.hospital_coords || { latitude: 24.8945, longitude: 67.0768 };
    const destCoords = executionPlan.incident_coords || { latitude: 24.92, longitude: 67.09 };
    const hospitalName = executionPlan.hospital_name || "Liaquat National Hospital";

    this.io.emit('agent_status', { agent: 'Execution', status: 'simulating' });

    this.intervalId = setInterval(() => {
      if (currentStepIndex >= steps.length) {
        clearInterval(this.intervalId);
        // Only emit completed when the simulation actually reaches the hospital destination!
        this.io.emit('agent_status', { agent: 'Execution', status: 'completed', data: executionPlan });
        return;
      }

      const step = steps[currentStepIndex];
      const progress = ((currentStepIndex + 1) / steps.length) * 100;

      const currentLat = startCoords.latitude + ((destCoords.latitude - startCoords.latitude) * (progress / 100));
      const currentLng = startCoords.longitude + ((destCoords.longitude - startCoords.longitude) * (progress / 100));

      this.io.emit('simulation_tick', {
        step,
        progress,
        ambulance_position: { latitude: currentLat, longitude: currentLng },
        incident_position: destCoords,
        hospital_position: startCoords,
        hospital_name: hospitalName
      });
      currentStepIndex++;
    }, 3500); // Emits a step every 3.5 seconds for situational pacing
  }
}

export class Orchestrator {
  constructor(io) {
    this.io = io;
    this.signalBuffer = [];
    this.isProcessing = false;
    this.simulationEngine = new SimulationEngine(io);
    this.resolveDriverAcceptance = null;
    this.activePlan = null;
  }

  syncActiveDispatch(socket) {
    if (this.activePlan && this.resolveDriverAcceptance) {
      console.log('Syncing active dispatch plan with newly connected socket:', socket.id);
      socket.emit('agent_status', { agent: 'Ambulance', status: 'waiting_acceptance', data: this.activePlan });
    }
  }

  acceptDispatch() {
    if (this.resolveDriverAcceptance) {
      this.resolveDriverAcceptance();
      this.resolveDriverAcceptance = null;
    }
  }

  async handleNewSignal(signal) {
    this.signalBuffer.push(signal);
    this.io.emit('signal_received', signal);

    // Evaluate if we should process
    if (this.signalBuffer.length >= 1 && !this.isProcessing) {
      // Trigger processing (For hackathon, trigger immediately on signal)
      this.processCycle();
    }
  }

  async processCycle() {
    this.isProcessing = true;
    const signalsToProcess = [...this.signalBuffer];
    this.signalBuffer = []; // clear buffer

    try {
      const hospitals = await readDataFile('hospital.json');
      const coolingCenters = await readDataFile('cooling_centers.json');
      const currentTime = new Date().toISOString();
      let weather = { temperature_celsius: 45, humidity_percent: 60 }; // Fallback Mock

      const mockSignal = signalsToProcess.find(s => s.mock_temperature !== undefined);

      if (mockSignal && mockSignal.mock_temperature) {
        console.log(`Using MOCK temperature: ${mockSignal.mock_temperature}C for demo scenario`);
        weather = {
          temperature_celsius: mockSignal.mock_temperature,
          humidity_percent: 60,
          description: "MOCK DEMO WEATHER"
        };
      } else {
        try {
          const apiKey = process.env.OPENWEATHER_API_KEY;
          const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Karachi&units=metric&appid=${apiKey}`);
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            weather = {
              temperature_celsius: Math.round(weatherData.main.temp),
              humidity_percent: weatherData.main.humidity,
              description: weatherData.weather[0].description
            };
            console.log('Real weather fetched:', weather);
          }
        } catch (e) {
          console.error("Failed to fetch real weather, using mock", e.message);
        }
      }

      const firstSignal = signalsToProcess[0] || {};
      const incidentLat = firstSignal.latitude || 24.92;
      const incidentLng = firstSignal.longitude || 67.09;

      this.io.emit('agent_status', { agent: 'Detection', status: 'thinking' });
      await new Promise(r => setTimeout(r, 2000));

      let detection;
      // HARD LIMIT: If temp is below 38C, it's mathematically not a heatwave.
      if (weather.temperature_celsius < 38) {
        console.log(`Hard rejecting: Temp is ${weather.temperature_celsius}C (Below 38C limit)`);
        detection = {
          crisis_detected: false,
          severity: "LOW",
          confidence: 100,
          affected_areas: [],
          reasoning: `The current temperature is ${weather.temperature_celsius}°C. A heatwave crisis requires temperatures of 38°C or higher. Any reported collapses are likely unrelated to weather. No escalation needed.`
        };
      } else {
        detection = await runDetectionAgent(signalsToProcess, weather, currentTime);
      }

      detection.latitude = incidentLat;
      detection.longitude = incidentLng;
      detection.weather_context = weather;
      this.io.emit('agent_status', { agent: 'Detection', status: 'completed', data: detection });

      if (detection.crisis_detected) {
        await new Promise(r => setTimeout(r, 2500));

        this.io.emit('agent_status', { agent: 'Planning', status: 'thinking' });
        await new Promise(r => setTimeout(r, 14000)); // Paced perfectly to match the spoken speech dialogue!
        const plan = await runPlanningAgent(detection, hospitals, coolingCenters);
        
        const targetHospitalName = plan.hospital_routing?.recommendation || plan.response_plan?.hospital_routing?.recommendation || "Agakhan University Hospital";
        const targetHospital = hospitals.find(h => h.name.toLowerCase().includes(targetHospitalName.toLowerCase())) || hospitals[1] || { lat: 24.8765, lng: 67.0689, name: "Agakhan University Hospital" };

        plan.hospital_coords = { latitude: targetHospital.lat, longitude: targetHospital.lng };
        plan.hospital_name = targetHospital.name;
        plan.incident_coords = { latitude: incidentLat, longitude: incidentLng };
        plan.incident_area = firstSignal.location_mentioned || "Gulshan Chowrangi";

        this.io.emit('agent_status', { agent: 'Planning', status: 'completed', data: plan });

        // WAIT FOR DRIVER TO ACCEPT DISPATCH (blocks execution flow)
        this.activePlan = plan;
        this.io.emit('agent_status', { agent: 'Ambulance', status: 'waiting_acceptance', data: plan });
        console.log("Blocking execution, waiting for driver acceptance...");
        await new Promise((resolve) => {
          this.resolveDriverAcceptance = resolve;
        });
        console.log("Driver accepted dispatch! Resuming execution workflow...");
        this.activePlan = null;

        this.io.emit('agent_status', { agent: 'Ambulance', status: 'accepted' });
        await new Promise(r => setTimeout(r, 3000)); // Deliberate delay to show user dispatch confirmation

        this.io.emit('agent_status', { agent: 'Execution', status: 'thinking' });
        await new Promise(r => setTimeout(r, 4500)); // Dramatic pacing for LLM generation
        const execution = await runExecutionAgent(plan, hospitals, coolingCenters);

        execution.incident_coords = { latitude: incidentLat, longitude: incidentLng };
        execution.hospital_coords = { latitude: targetHospital.lat, longitude: targetHospital.lng };
        execution.hospital_name = targetHospital.name;

        // Commencing simulation
        await new Promise(r => setTimeout(r, 1500));
        this.simulationEngine.start(execution);

        this.saveIncidentToDB(detection, plan, execution, signalsToProcess).catch(err => console.error("DB Save Error:", err));
      } else {
        this.io.emit('agent_status', { agent: 'Planning', status: 'skipped' });
        this.io.emit('agent_status', { agent: 'Execution', status: 'skipped' });
      }
    } catch (err) {
      console.error("Orchestration Error:", err);
      this.io.emit('agent_error', { message: err.message });
    } finally {
      this.isProcessing = false;
      if (this.signalBuffer.length > 0) {
        this.processCycle();
      }
    }
  }

  async saveIncidentToDB(detection, plan, execution, signals) {
    const incidentReport = execution.incident_report || {};
    const actionLogs = execution.execution_log || [];

    const incidentResult = await pool.query(
      `INSERT INTO "Incident" (id, report_id, crisis_summary, actions_taken, estimated_lives_impacted, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
         RETURNING *`,
      [
        incidentReport.report_id || `KHI-${Date.now()}`,
        incidentReport.crisis_summary || 'Unknown',
        incidentReport.actions_taken || actionLogs.length || 0,
        incidentReport.estimated_lives_impacted || 0,
        incidentReport.status || 'ACTIVE'
      ]
    );

    const incidentId = incidentResult.rows[0].id;

    for (const log of actionLogs) {
      await pool.query(
        `INSERT INTO "ActionLog" (id, incident_id, action_id, status, result, simulated_impact, timestamp)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        [
          incidentId,
          log.action_id || 'A_UNK',
          log.status || 'UNKNOWN',
          log.result || 'No result',
          String(log.simulated_impact || '0')
        ]
      );
    }

    if (signals && Array.isArray(signals)) {
      for (const sig of signals) {
        await pool.query(
          `INSERT INTO "Signal" (id, incident_id, text, location_mentioned, signal_type, source, language, timestamp)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
          [
            incidentId,
            sig.text || '',
            sig.location_mentioned || 'Unknown',
            sig.signal_type || 'unknown',
            sig.source || 'unknown',
            sig.language || 'unknown'
          ]
        );
      }
    }
  }
}
