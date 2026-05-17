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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const orchestrator = new Orchestrator(io);

io.on('connection', (socket) => {
  console.log('Frontend connected:', socket.id);
  
  socket.on('accept_dispatch', () => {
    console.log('Driver accepted dispatch event received');
    orchestrator.acceptDispatch();
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
// Replaced by orchestrated flow, but kept for legacy/direct triggering if needed
app.post('/api/crisis/analyze', async (req, res, next) => {
  try {
    const { signals, weather_data } = req.body;
    // Push directly to orchestrator
    if (signals && Array.isArray(signals)) {
      for (const sig of signals) {
        orchestrator.handleNewSignal(sig);
      }
    }
    res.json({ message: 'Analysis triggered via Orchestrator' });
  } catch (error) {
    next(error);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

server.listen(PORT, () => {
  console.log(`Server (with Orchestrator & Socket.io) running on port ${PORT}`);
});
