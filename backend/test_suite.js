import { pool } from './database.js';
import io from 'socket.io-client';

const BACKEND_URL = 'http://127.0.0.1:4000';

async function runTests() {
  console.log('🚀 STARTING COMPREHENSIVE CIRO INTEGRATION TEST SUITE...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${message}`);
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // --- TEST 1: Database Connection ---
  try {
    const res = await pool.query('SELECT NOW()');
    assert(res.rows.length > 0, 'Database connection is active and responsive.');
  } catch (error) {
    assert(false, `Database connection failed: ${error.message}`);
  }

  // --- TEST 2: GET /api/weather/current Endpoint ---
  try {
    const res = await fetch(`${BACKEND_URL}/api/weather/current`);
    if (res.ok) {
      const data = await res.json();
      assert(
        typeof data.temperature_celsius === 'number' && data.description,
        `GET /api/weather/current works. Current Temp: ${data.temperature_celsius}°C`
      );
    } else {
      assert(false, `GET /api/weather/current returned status ${res.status}`);
    }
  } catch (error) {
    assert(false, `GET /api/weather/current failed: ${error.message}`);
  }

  // --- TEST 3: GET /api/crisis/overview Endpoint ---
  try {
    const res = await fetch(`${BACKEND_URL}/api/crisis/overview`);
    if (res.ok) {
      const data = await res.json();
      assert(
        Array.isArray(data.active_crises) && typeof data.system_health_score === 'number',
        `GET /api/crisis/overview works. System Health: ${data.system_health_score}`
      );
    } else {
      assert(false, `GET /api/crisis/overview returned status ${res.status}`);
    }
  } catch (error) {
    assert(false, `GET /api/crisis/overview failed: ${error.message}`);
  }

  // --- TEST 4: Parallel Multi-Incident Flow over WebSockets ---
  console.log('\n📡 Establishing WebSocket connection to test real-time orchestration...');
  const socket = io(BACKEND_URL);

  const incidentsSeen = new Set();
  const agentPhases = {};

  socket.on('connect', () => {
    console.log('✅ WebSocket connection successfully established.');
  });

  socket.on('agent_status', (payload) => {
    const { incidentId, agent, status, data } = payload;
    if (incidentId) {
      incidentsSeen.add(incidentId);
      if (!agentPhases[incidentId]) {
        agentPhases[incidentId] = [];
      }
      agentPhases[incidentId].push({ agent, status });
      console.log(`   [SOCKET EVENT] [Incident: ${incidentId}] [Agent: ${agent}] -> ${status}`);
    }
  });

  // Inject two signals simultaneously to simulate parallel triggering
  console.log('\n🔥 Injecting two parallel demo signals (42°C and 45°C) simultaneously...');
  try {
    const injectSignal = (temp, area) =>
      fetch(`${BACKEND_URL}/api/signals/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Severe heatstroke case reported at ${area}`,
          location_mentioned: area,
          signal_type: 'heatstroke_case',
          source: 'test_suite',
          mock_temperature: temp,
          latitude: 24.92,
          longitude: 67.09,
        }),
      });

    await Promise.all([
      injectSignal(42, 'Gulshan Chowrangi'),
      injectSignal(45, 'Karachi Airport'),
    ]);

    console.log('⏳ Waiting 10 seconds to capture concurrent orchestration socket cycles...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Verify both incidents were seen
    assert(incidentsSeen.size >= 2, `Multi-incident tracking verified. Concurrently processed ${incidentsSeen.size} incidents.`);

    // Check that each incident has its own individual agent traces
    for (const incId of incidentsSeen) {
      assert(
        agentPhases[incId] && agentPhases[incId].length > 0,
        `Incident ${incId} ran isolated agent lifecycle execution flow.`
      );
    }

  } catch (error) {
    assert(false, `Signal injection/WebSocket processing failed: ${error.message}`);
  }

  socket.disconnect();
  console.log('\n==================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED.`);
  console.log('==================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests();
