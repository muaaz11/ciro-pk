import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { pool } from './database.js';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { Orchestrator } from './services/orchestrator.js';

import Groq from 'groq-sdk';
import cron from 'node-cron';
import { savePushToken, sendHeatwaveNotification, getTokenCount, setSocketEmitter } from './services/notificationService.js';

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, './data');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Configure the notification service to broadcast events over WebSocket
setSocketEmitter((event, payload) => io.emit(event, payload));

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const orchestrator = new Orchestrator(io);

// --- City Crisis Overview Aggregation Layer ---
const globalActiveCrises = new Map();
const globalTraces = new Map(); // [NEW] Track decision traces

const originalEmit = io.emit;
io.emit = function(eventName, payload) {
  // Call original emit
  originalEmit.apply(io, arguments);

  // Intercept agent_status to track incident lifecycle safely without touching orchestrator
  if (eventName === 'agent_status') {
    const { incidentId, agent, status, data } = payload;
    if (!incidentId) return; // Ensure incidentId exists
    
    // [NEW] Initialize trace when Antigravity starts thinking
    if (agent === 'Antigravity' && status === 'thinking') {
       if (!globalTraces.has(incidentId)) {
         globalTraces.set(incidentId, []);
       }
       if (!globalActiveCrises.has(incidentId)) {
         globalActiveCrises.set(incidentId, {
           id: incidentId,
           location: 'Analyzing Context...',
           latitude: 24.92,
           longitude: 67.09,
           severity: 'EVALUATING',
           status: 'ANALYZING',
           timestamp: new Date().toISOString()
         });
       }
    }
    
    // [NEW] Log decisions when any agent completes
    if (status === 'completed' && data && globalTraces.has(incidentId)) {
       let logEntry = {
          timestamp: new Date().toISOString(),
          agent: agent,
          input: "Analyzed current context & signals",
          decision: "",
          confidence: data.confidence || null,
          reasoning: ""
       };

       if (agent === 'Antigravity') {
          logEntry.decision = `Trigger Detection: ${data.run_detection}, Planning: ${data.run_planning}, Execution: ${data.run_execution}`;
          logEntry.reasoning = Array.isArray(data.decision_trace) ? data.decision_trace.join(' | ') : "Orchestrated workflow.";
       } else if (agent === 'Detection') {
          logEntry.decision = `Crisis Detected: ${data.crisis_detected}, Severity: ${data.severity}`;
          logEntry.reasoning = data.reasoning || "Detection rules evaluated.";
       } else if (agent === 'Planning') {
          logEntry.decision = `Routed to: ${data.hospital_name || 'Nearest Facility'}`;
          logEntry.reasoning = data.hospital_routing?.reasoning || data.response_plan?.hospital_routing?.reasoning || "Hospital capacities analyzed.";
       } else if (agent === 'Execution') {
          logEntry.decision = `Generated Simulation Plan (${data.incident_report?.estimated_lives_impacted || 0} lives impacted)`;
          logEntry.reasoning = data.incident_report?.crisis_summary || "Simulating response.";
       }

       const traceArray = globalTraces.get(incidentId);
       if (traceArray) traceArray.push(logEntry);
    }
    
    // When detection is completed, track new incident
    if (agent === 'Detection' && status === 'completed' && data && data.crisis_detected) {
      const inc = globalActiveCrises.get(incidentId) || {};
      globalActiveCrises.set(incidentId, {
        ...inc,
        id: incidentId,
        location: data.affected_areas?.[0] || 'Unknown Area',
        latitude: data.latitude,
        longitude: data.longitude,
        severity: data.severity || 'MEDIUM',
        status: 'ACTIVE',
        timestamp: new Date().toISOString()
      });
    } else if (agent === 'Detection' && status === 'completed' && data && !data.crisis_detected) {
      const inc = globalActiveCrises.get(incidentId);
      if (inc) {
         inc.status = 'REJECTED';
         globalActiveCrises.set(incidentId, inc);
      }
    }

    // When execution completes, mark as resolved
    if (agent === 'Execution' && status === 'completed') {
       if (globalActiveCrises.has(incidentId)) {
          const inc = globalActiveCrises.get(incidentId);
          inc.status = 'RESOLVED';
          globalActiveCrises.set(incidentId, inc);
       }
    }
  }
};
// ----------------------------------------------

io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
  
  socket.on('accept_dispatch', (incidentId) => {
    console.log(`Driver accepted dispatch event received for incident ${incidentId}`);
    orchestrator.acceptDispatch(incidentId);
  });

  socket.on('injectSignal', (data) => {
    console.log('Signal received via Socket:', data);
    const { text, location, source, timestamp, mock_temperature } = data;
    orchestrator.handleNewSignal({
      text,
      location_mentioned: location ? (location.name || "Karachi") : "Karachi",
      signal_type: 'voice_report',
      source: source || 'voice',
      latitude: location ? location.latitude : 24.90,
      longitude: location ? location.longitude : 67.08,
      timestamp,
      mock_temperature: mock_temperature !== undefined ? mock_temperature : 44
    });
  });

  socket.on('get_active_dispatch', () => {
    console.log('Client requested active dispatch state');
    orchestrator.syncActiveDispatch(socket);
  });

  socket.on('disconnect', () => console.log('Frontend disconnected:', socket.id));
});

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
    const { text, temperature } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text prompt/signal is required.' });
    }

    const systemPrompt = `You are the CIRO Antigravity Orchestrator. Analyze the crisis signal and respond with ONLY a valid JSON object:
{
  "orchestrator": { "decision": "string", "threshold_met": true/false, "routing": "NEAREST_HOSPITAL | LOAD_BALANCED | FASTEST_ROUTE" },
  "detection": { "severity": "CRITICAL|HIGH|MEDIUM|LOW", "confidence": 85, "signals_fused": ["string","string"], "situation": "string" },
  "planning": { "hospital": "string", "actions": ["string","string","string","string"], "alert_text": "string" },
  "execution": { "steps": ["string","string","string","string"], "outcome": "string", "lives_impacted": 3 },
  "affectedArea": "location name",
  "coordinates": { "lat": 24.92, "lng": 67.09 },
  "impactAreas": ["string","string","string"]
}`;

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not defined in backend configuration.');
    }

    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Crisis Text: "${text}"\nCurrent Temperature: ${temperature !== undefined ? temperature : 'unknown'}°C` }
      ],
      temperature: 0.1
    });

    const reply = response.choices[0].message.content;
    const cleanJson = reply.replace(/```json|```/g, '').trim();
    const parsedJSON = JSON.parse(cleanJson);

    res.json({ success: true, data: parsedJSON });
  } catch (error) {
    console.error('Crisis analysis endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1.5 GET /api/weather/current
app.get('/api/weather/current', async (req, res, next) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OpenWeather API Key' });

    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Karachi&units=metric&appid=${apiKey}`);
    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      res.json({
        temperature_celsius: Math.round(weatherData.main.temp),
        feels_like: Math.round(weatherData.main.feels_like),
        description: weatherData.weather[0].main.toUpperCase(),
        humidity_percent: weatherData.main.humidity
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch weather from OpenWeather' });
    }
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
    const result = await pool.query('SELECT * FROM "Incident" ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/incidents/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "Incident" WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const logsRes = await pool.query('SELECT * FROM "ActionLog" WHERE incident_id = $1 ORDER BY timestamp ASC', [req.params.id]);
    const signalsRes = await pool.query('SELECT * FROM "Signal" WHERE incident_id = $1 ORDER BY timestamp ASC', [req.params.id]);

    const incident = result.rows[0];
    incident.action_logs = logsRes.rows;
    incident.signals = signalsRes.rows;

    res.json(incident);
  } catch (error) {
    next(error);
  }
});

app.post('/api/signals/inject', async (req, res, next) => {
  try {
    const { text, location_mentioned, signal_type, source, language, mock_temperature, latitude, longitude } = req.body;

    // Pass to orchestrator for real-time processing
    orchestrator.handleNewSignal({ text, location_mentioned, signal_type, source, language, mock_temperature, latitude, longitude });

    res.json({ message: 'Signal injected and passed to Orchestrator' });
  } catch (error) {
    next(error);
  }
});

// Proxy endpoint for mobile client Crisis Report Screen Claude calls
app.post('/api/anthropic/proxy', async (req, res, next) => {
  try {
    const { model, system, messages, max_tokens } = req.body;
    const userMsg = messages?.[0]?.content || '';

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not defined.');
    }

    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system || 'You are a helpful assistant.' },
        { role: 'user', content: userMsg }
      ],
      temperature: 0.2
    });

    const reply = response.choices[0].message.content;

    // Return in Anthropic Messages API format
    res.json({
      content: [
        {
          type: 'text',
          text: reply
        }
      ]
    });
  } catch (error) {
    console.error('Anthropic proxy error:', error);
    res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
});


// 5. GET /api/crisis/overview
app.get('/api/crisis/overview', (req, res) => {
  const activeCrisesList = Array.from(globalActiveCrises.values());
  
  // Generate mock heatmap data around Karachi
  const severityHeatmap = activeCrisesList.map(c => ({
    latitude: c.latitude,
    longitude: c.longitude,
    weight: c.severity === 'CRITICAL' ? 100 : c.severity === 'HIGH' ? 80 : 50
  }));
  
  // Add some mock heatmap blur points around the incident to look realistic
  if (activeCrisesList.length > 0) {
     const mainPoint = activeCrisesList[0];
     severityHeatmap.push({ latitude: mainPoint.latitude + 0.005, longitude: mainPoint.longitude + 0.005, weight: 40 });
     severityHeatmap.push({ latitude: mainPoint.latitude - 0.005, longitude: mainPoint.longitude - 0.005, weight: 40 });
  }

  // System Health Score (0-100)
  // Drops by 15 for every ACTIVE incident
  const activeCount = activeCrisesList.filter(c => c.status === 'ACTIVE').length;
  const systemHealthScore = Math.max(0, 100 - (activeCount * 15));

  res.json({
    active_crises: activeCrisesList,
    severity_heatmap: severityHeatmap,
    system_health_score: systemHealthScore
  });
});

// 6. GET /api/trace/:incident_id
app.get('/api/trace/:incident_id', (req, res) => {
  const trace = globalTraces.get(req.params.incident_id);
  if (!trace) {
    return res.status(404).json({ error: 'Trace not found for this incident' });
  }
  res.json({ antigravity_trace: trace });
});

// --- Push Notification Service API and Cron Job ---

// A) POST /api/notifications/register
app.post('/api/notifications/register', (req, res) => {
  const { token, userId } = req.body;
  savePushToken(token, userId);
  res.json({ success: true, message: 'Token registered' });
});

// B) POST /api/notifications/test-send
app.post('/api/notifications/test-send', async (req, res) => {
  try {
    await sendHeatwaveNotification(44, 'EXTREME');
    res.json({ success: true, tokenCount: getTokenCount() });
  } catch (err) {
    console.error('[API Test Send] Error:', err);
    res.status(500).json({ error: 'Failed to send notification', message: err.message });
  }
});

// C) node-cron job running every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  try {
    // Fetch Karachi weather (reuse existing weather service or fetch directly)
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Karachi&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );
    const weatherData = await weatherResponse.json();
    const temp = weatherData.main?.temp || 38.5;
    
    let condition = null;
    if (temp >= 44) condition = 'EXTREME';
    else if (temp >= 40) condition = 'HIGH';
    
    if (condition) {
      await sendHeatwaveNotification(temp, condition);
      console.log(`[CIRO Alerts] Sent heatwave notification: ${temp}°C (${condition})`);
    } else {
      console.log(`[CIRO Alerts] Temperature ${temp}°C — no alert needed`);
    }
  } catch (err) {
    console.error('[CIRO Alerts] Cron job error:', err.message);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

server.listen(PORT, () => {
  console.log(`Server (with Orchestrator & Socket.io) running on port ${PORT}`);
});
