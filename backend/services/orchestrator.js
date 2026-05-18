import { runDetectionAgent } from '../agents/detectionAgent.js';
import { runPlanningAgent } from '../agents/planningAgent.js';
import { runExecutionAgent } from '../agents/executionAgent.js';
import { runAntigravityAgent } from '../agents/antigravityAgent.js';
import { pool } from '../database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data');

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
    this.intervals = new Map();
  }

  start(executionPlan, incidentId) {
    if (this.intervals.has(incidentId)) {
      clearInterval(this.intervals.get(incidentId));
    }

    const steps = executionPlan.execution_log || [];
    let currentStepIndex = 0;

    const startCoords = executionPlan.hospital_coords || { latitude: 24.8945, longitude: 67.0768 };
    const destCoords = executionPlan.incident_coords || { latitude: 24.92, longitude: 67.09 };
    const hospitalName = executionPlan.hospital_name || "Liaquat National Hospital";

    this.io.emit('agent_status', { incidentId, agent: 'Execution', status: 'simulating' });

    let currentBeds = 15;
    let initialTraffic = 85;
    const alertStages = [
      "Preparing city-wide broadcast...",
      "Dispatching localized SMS alerts...",
      "Alerts successfully delivered to 5,000 residents.",
      "Emergency channels active.",
      "No active alerts pending."
    ];

    const intervalId = setInterval(() => {
      if (currentStepIndex >= steps.length) {
        clearInterval(this.intervals.get(incidentId));
        this.intervals.delete(incidentId);
        // Only emit completed when the simulation actually reaches the hospital destination!
        this.io.emit('agent_status', { incidentId, agent: 'Execution', status: 'completed', data: executionPlan });
        return;
      }

      const step = steps[currentStepIndex];
      const progress = ((currentStepIndex + 1) / steps.length) * 100;

      const currentLat = startCoords.latitude + ((destCoords.latitude - startCoords.latitude) * (progress / 100));
      const currentLng = startCoords.longitude + ((destCoords.longitude - startCoords.longitude) * (progress / 100));

      // --- Multi-object Simulation Logic ---
      if (progress > 50 && progress < 90 && currentStepIndex % 2 === 0) {
        currentBeds = Math.max(0, currentBeds - 1); // Mock victims taking beds
      }
      let hospitalLoad = Math.floor(100 - ((currentBeds / 15) * 100));
      
      let trafficStatus = Math.max(30, initialTraffic - Math.floor(progress / 2)); 
      
      let alertIndex = Math.floor((progress / 100) * alertStages.length);
      if (alertIndex >= alertStages.length) alertIndex = alertStages.length - 1;

      this.io.emit('simulation_tick', {
        incidentId,
        step,
        progress,
        ambulance_position: { latitude: currentLat, longitude: currentLng },
        incident_position: destCoords,
        hospital_position: startCoords,
        hospital_name: hospitalName,
        // Multi-system layers
        hospital_load: hospitalLoad + '% Full',
        traffic_status: trafficStatus + '% Congestion',
        active_alerts: [alertStages[alertIndex]]
      });
      currentStepIndex++;
    }, 3500); // Emits a step every 3.5 seconds for situational pacing
    
    this.intervals.set(incidentId, intervalId);
  }
}

export class Orchestrator {
  constructor(io) {
    this.io = io;
    this.simulationEngine = new SimulationEngine(io);
    this.resolveDriverAcceptance = new Map();
    this.activePlans = new Map();
  }

  syncActiveDispatch(socket) {
    for (const [incidentId, plan] of this.activePlans.entries()) {
      if (this.resolveDriverAcceptance.has(incidentId)) {
        console.log(`Syncing active dispatch plan for incident ${incidentId} with newly connected socket:`, socket.id);
        socket.emit('agent_status', { incidentId, agent: 'Ambulance', status: 'waiting_acceptance', data: plan });
      }
    }
  }

  acceptDispatch(incidentId) {
    if (this.resolveDriverAcceptance.has(incidentId)) {
      const resolveFn = this.resolveDriverAcceptance.get(incidentId);
      resolveFn();
      this.resolveDriverAcceptance.delete(incidentId);
    }
  }

  async handleNewSignal(signal) {
    this.io.emit('signal_received', signal);
    const incidentId = `INC-${Date.now()}`;
    // Run parallel processing workflow independently!
    this.processIncident(incidentId, [signal]);
  }

  async processIncident(incidentId, signalsToProcess) {
    try {
      const hospitals = await readDataFile('hospital.json');
      const coolingCenters = await readDataFile('cooling_centers.json');
      const currentTime = new Date().toISOString();
      let weather = { temperature_celsius: 45, humidity_percent: 60 }; // Fallback Mock

      const mockSignal = signalsToProcess.find(s => s.mock_temperature !== undefined);

      if (mockSignal && mockSignal.mock_temperature) {
        console.log(`[${incidentId}] Using MOCK temperature: ${mockSignal.mock_temperature}C for demo scenario`);
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
            console.log(`[${incidentId}] Real weather fetched:`, weather);
          }
        } catch (e) {
          console.error(`[${incidentId}] Failed to fetch real weather, using mock`, e.message);
        }
      }

      const firstSignal = signalsToProcess[0] || {};
      const incidentLat = firstSignal.latitude || 24.92;
      const incidentLng = firstSignal.longitude || 67.09;

      // --- ANTIGRAVITY BRAIN LAYER ---
      this.io.emit('agent_status', { incidentId, agent: 'Antigravity', status: 'thinking' });
      const agDecision = await runAntigravityAgent(signalsToProcess, weather, currentTime);
      console.log(`\n[ANTIGRAVITY_DECISION_TRACE] [${incidentId}]\n`, JSON.stringify(agDecision, null, 2), "\n");
      this.io.emit('agent_status', { incidentId, agent: 'Antigravity', status: 'completed', data: agDecision });

      let detection = { crisis_detected: false, severity: agDecision.severity_level || "LOW" };
      
      if (agDecision.run_detection) {
        this.io.emit('agent_status', { incidentId, agent: 'Detection', status: 'thinking' });
        await new Promise(r => setTimeout(r, 2000));

        // HARD LIMIT: If temp is below 38C, it's mathematically not a heatwave.
        if (weather.temperature_celsius < 38) {
          console.log(`[${incidentId}] Hard rejecting: Temp is ${weather.temperature_celsius}C (Below 38C limit)`);
          detection = {
            crisis_detected: false,
            severity: agDecision.severity_level || "LOW",
            confidence: 100,
            affected_areas: [],
            reasoning: `The current temperature is ${weather.temperature_celsius}°C. A heatwave crisis requires temperatures of 38°C or higher. Any reported collapses are likely unrelated to weather. No escalation needed.`
          };
        } else {
          detection = await runDetectionAgent(signalsToProcess, weather, currentTime);
          if (agDecision.severity_level) {
            detection.severity = agDecision.severity_level;
          }
        }

        detection.latitude = incidentLat;
        detection.longitude = incidentLng;
        detection.weather_context = weather;
        this.io.emit('agent_status', { incidentId, agent: 'Detection', status: 'completed', data: detection });
      } else {
        this.io.emit('agent_status', { incidentId, agent: 'Detection', status: 'skipped' });
        detection.crisis_detected = agDecision.run_planning || agDecision.run_execution;
      }

      if (detection.crisis_detected) {
        let plan;

        if (agDecision.run_planning) {
          await new Promise(r => setTimeout(r, 2500));
          this.io.emit('agent_status', { incidentId, agent: 'Planning', status: 'thinking' });
          await new Promise(r => setTimeout(r, 14000)); // Paced perfectly to match the spoken speech dialogue!
          plan = await runPlanningAgent(detection, hospitals, coolingCenters);
          
          const targetHospitalName = plan.hospital_routing?.recommendation || plan.response_plan?.hospital_routing?.recommendation || "Agakhan University Hospital";
          const targetHospital = hospitals.find(h => h.name.toLowerCase().includes(targetHospitalName.toLowerCase())) || hospitals[1] || { lat: 24.8765, lng: 67.0689, name: "Agakhan University Hospital" };

          plan.hospital_coords = { latitude: targetHospital.lat, longitude: targetHospital.lng };
          plan.hospital_name = targetHospital.name;
          plan.incident_coords = { latitude: incidentLat, longitude: incidentLng };
          plan.incident_area = firstSignal.location_mentioned || "Gulshan Chowrangi";

          this.io.emit('agent_status', { incidentId, agent: 'Planning', status: 'completed', data: plan });
        } else {
          this.io.emit('agent_status', { incidentId, agent: 'Planning', status: 'skipped' });
          const targetHospital = hospitals[1] || { lat: 24.8765, lng: 67.0689, name: "Agakhan University Hospital" };
          plan = {
            hospital_coords: { latitude: targetHospital.lat, longitude: targetHospital.lng },
            hospital_name: targetHospital.name,
            incident_coords: { latitude: incidentLat, longitude: incidentLng },
            incident_area: firstSignal.location_mentioned || "Unknown"
          };
        }

        const isExecutionBlocked = (agDecision.confidence < 60) || (agDecision.run_execution === false);

        if (!isExecutionBlocked) {
          // WAIT FOR DRIVER TO ACCEPT DISPATCH (blocks execution flow for this incident only)
          this.activePlans.set(incidentId, plan);
          this.io.emit('agent_status', { incidentId, agent: 'Ambulance', status: 'waiting_acceptance', data: plan });
          console.log(`[${incidentId}] Blocking execution, waiting for driver acceptance...`);
          
          await new Promise((resolve) => {
            this.resolveDriverAcceptance.set(incidentId, resolve);
          });
          
          console.log(`[${incidentId}] Driver accepted dispatch! Resuming execution workflow...`);
          this.activePlans.delete(incidentId);

          this.io.emit('agent_status', { incidentId, agent: 'Ambulance', status: 'accepted' });
          await new Promise(r => setTimeout(r, 3000)); // Deliberate delay to show user dispatch confirmation

          this.io.emit('agent_status', { incidentId, agent: 'Execution', status: 'thinking' });
          await new Promise(r => setTimeout(r, 4500)); // Dramatic pacing for LLM generation
          const execution = await runExecutionAgent(plan, hospitals, coolingCenters);

          execution.incident_coords = plan.incident_coords;
          execution.hospital_coords = plan.hospital_coords;
          execution.hospital_name = plan.hospital_name;

          // Commencing simulation
          await new Promise(r => setTimeout(r, 1500));
          this.simulationEngine.start(execution, incidentId);

          this.saveIncidentToDB(detection, plan, execution, signalsToProcess).catch(err => console.error("DB Save Error:", err));
        } else {
          let skipReason = "Execution skipped by Antigravity Layer";
          if (agDecision.confidence < 60) {
            skipReason = `Execution BLOCKED by Antigravity Guard (Confidence too low: ${agDecision.confidence})`;
          }
          console.log(`\n[ANTIGRAVITY_ENFORCEMENT] [${incidentId}] ${skipReason}\n`);
          this.io.emit('agent_status', { incidentId, agent: 'Execution', status: 'skipped' });
          this.saveIncidentToDB(detection, plan, { execution_log: [], incident_report: { crisis_summary: skipReason, status: "ABORTED" } }, signalsToProcess).catch(err => console.error("DB Save Error:", err));
        }
      } else {
        this.io.emit('agent_status', { incidentId, agent: 'Planning', status: 'skipped' });
        this.io.emit('agent_status', { incidentId, agent: 'Execution', status: 'skipped' });
      }
    } catch (err) {
      console.error(`[${incidentId}] Orchestration Error:`, err);
      this.io.emit('agent_error', { incidentId, message: err.message });
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
