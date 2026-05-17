import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from './database.js';
import { fileURLToPath } from 'url';

// Agents
import { runDetectionAgent } from '../agents/detectionAgent.js';
import { runPlanningAgent } from '../agents/planningAgent.js';
import { runExecutionAgent } from '../agents/executionAgent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

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

// 1. POST /api/crisis/analyze
app.post('/api/crisis/analyze', async (req, res, next) => {
  try {
    const { signals, weather_data } = req.body;

    // Read current resources
    const hospitals = await readDataFile('hospital.json');
    const coolingCenters = await readDataFile('cooling_centers.json');

    const currentTime = new Date().toISOString();

    // Step 1: Detection
    const detectionResult = await runDetectionAgent(signals, weather_data, currentTime);

    // Step 2: Planning
    let planningResult = null;
    let executionResult = null;
    let newIncident = null;

    if (detectionResult.crisis_detected) {
      planningResult = await runPlanningAgent(detectionResult, hospitals, coolingCenters);

      // Step 3: Execution
      executionResult = await runExecutionAgent(planningResult, hospitals, coolingCenters);

      // Save to Neon DB using Prisma
      const incidentReport = executionResult.incident_report || {};
      const actionLogArray = executionResult.execution_log || [];

      newIncident = await prisma.incident.create({
        data: {
          report_id: incidentReport.report_id || `KHI-${Date.now()}`,
          crisis_summary: incidentReport.crisis_summary || 'Unknown crisis summary',
          actions_taken: incidentReport.actions_taken || actionLogArray.length || 0,
          estimated_lives_impacted: incidentReport.estimated_lives_impacted || 0,
          status: incidentReport.status || 'ACTIVE',
          action_logs: {
            create: actionLogArray.map(log => ({
              action_id: log.action_id || 'A_UNK',
              status: log.status || 'UNKNOWN',
              result: log.result || 'No result provided',
              simulated_impact: String(log.simulated_impact) || '0',
              timestamp: log.timestamp ? new Date(log.timestamp) : new Date()
            }))
          },
          // Associate passed signals with this incident
          signals: {
            create: signals && Array.isArray(signals) ? signals.map(sig => ({
              text: sig.text || '',
              location_mentioned: sig.location_mentioned || 'Unknown',
              signal_type: sig.signal_type || 'unknown',
              source: sig.source || 'unknown',
              language: sig.language || 'unknown',
              timestamp: sig.timestamp ? new Date(sig.timestamp) : new Date()
            })) : []
          }
        }
      });

      // Simulate persistence of updated resources to mock data file
      if (executionResult.updated_resources) {
        if (executionResult.updated_resources.hospitals) {
          await fs.writeFile(path.join(dataPath, 'hospital.json'), JSON.stringify(executionResult.updated_resources.hospitals, null, 4));
        }
        if (executionResult.updated_resources.cooling_centers) {
          await fs.writeFile(path.join(dataPath, 'cooling_centers.json'), JSON.stringify(executionResult.updated_resources.cooling_centers, null, 4));
        }
      }
    }

    res.json({
      detection: detectionResult,
      planning: planningResult,
      execution: executionResult,
      db_incident: newIncident
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/hospitals
app.get('/api/hospitals', async (req, res, next) => {
  try {
    const hospitals = await readDataFile('hospital.json');
    res.json(hospitals);
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/cooling-centers
app.get('/api/cooling-centers', async (req, res, next) => {
  try {
    const centers = await readDataFile('cooling_centers.json');
    res.json(centers);
  } catch (error) {
    next(error);
  }
});

// 4. GET /api/incidents
app.get('/api/incidents', async (req, res, next) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(incidents);
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/incidents/:id
app.get('/api/incidents/:id', async (req, res, next) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: {
        action_logs: true,
        signals: true
      }
    });
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

// 6. POST /api/signals/inject
app.post('/api/signals/inject', async (req, res, next) => {
  try {
    const { text, location_mentioned, signal_type, source, language } = req.body;

    const newSignal = await prisma.signal.create({
      data: {
        text,
        location_mentioned: location_mentioned || 'Unknown',
        signal_type: signal_type || 'manual_injection',
        source: source || 'app_demo',
        language: language || 'unknown'
      }
    });

    res.json({ message: 'Signal injected successfully', signal: newSignal });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
