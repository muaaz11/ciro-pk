# CIRO — Implementation Plan & System Architecture Manual
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

This document details the complete, highly technical implementation plan for **CIRO (Crisis Intelligence & Response Orchestrator)**. The plan is divided into 7 core phases, specifying objectives, engineering decisions, input/output contracts, dependencies, and failure modes for each.

---

## System Overview & Signal Flow
```
[Signal Ingest] ──► [Weather Gate] ──► [Antigravity Orchestrator]
                                                  │
    ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
    ▼                                             ▼                                             ▼
[Detection Agent]                           [Planning Agent]                            [Execution Agent]
- Fuses Weather & Distress feeds            - Queries Google Places API                 - OSRM Street Snapping
- Sets Severity & Patient Counts            - Books Beds & Drafts Alerts                - Simulates Driving Loop
    │                                             │                                             │
    └─────────────────────────────────────────────┼─────────────────────────────────────────────┘
                                                  ▼
                                      [Socket.io WebSocket Hub]
                                                  │
                                   ┌──────────────┴──────────────┐
                                   ▼                             ▼
                        [Agent Trace Screen]            [Tactical Driver Map]
                        - Log Trace Streams             - Draggable Info Sheet
```

---

## PHASE 1: Signal Ingestion Layer

### 1. Objectives
* Ingest emergency distress signals from citizens (via voice or typed text) and environmental data feeds.
* Standardize payloads, geocode landmarks, identify patient count thresholds, and fetch live meteorological weather indexes.

### 2. Key Technical Decisions
* **REST Routing**: Implemented `/api/signals/inject` route using Express.js middleware inside `backend/index.js`.
* **Meteorological Fetching**: Integrated `backend/services/weather.service.js` which queries OpenWeatherMap. Falls back to a safe default of **38.5°C** if queries timeout or return errors.
* **Location & Count Parser**: Created `backend/services/locationExtractor.js`. It utilizes a Groq prompt schema to parse place names and patient counts (`patient_count`, defaulting to 1) from Urdu, Roman Urdu, and English.
* **Geocode Resolution**: Resolves extracted locations using the Google Geocoding API, appending `"Karachi, Pakistan"` to bound results.

### 3. Input/Output Contracts
* **Input (Client REST Payload)**:
  ```json
  {
    "text": "3 people collapsed near Gulshan-e-Iqbal block 3",
    "signal_type": "heatstroke_case",
    "source": "app_voice",
    "latitude": 24.92,
    "longitude": 67.09
  }
  ```
* **Output (Ingested Signal Entity)**:
  ```json
  {
    "id": "sig_98df87f98sd7f",
    "text": "3 people collapsed near Gulshan-e-Iqbal block 3",
    "location_mentioned": "Gulshan-e-Iqbal block 3",
    "resolved_coordinates": { "lat": 24.9198, "lng": 67.0911 },
    "patient_count": 3,
    "temperature_celsius": 42.5,
    "source": "app_voice",
    "timestamp": "2026-05-20T22:18:00Z"
  }
  ```

### 4. Dependencies
* `express` REST controllers.
* `groq-sdk` for Llama-3.3 inferences.
* Google Geocoding Web Service endpoint.
* OpenWeatherMap API credentials.

### 5. Potential Failure Points & Mitigations
* **OpenWeatherMap API Offline**: Managed by returning a hardcoded `38.5°C` fallback.
* **Geocoding REQUEST_DENIED / Project Limits**: Managed by falling back to the coordinates reported by the client's GPS.
* **Incorrect Entity Extraction**: Safe parsing fallback: enforces `patient_count = 1` if extraction returns NaN.

---

## PHASE 2: Google Antigravity Brain Layer

### 1. Objectives
* Act as the master control plane, determining workflow executions, severity ratings, and tools permissions dynamically.

### 2. Key Technical Decisions
* **Central Orchestrator Core**: Programmed `agents/antigravityAgent.js` to execute structured completions utilizing Groq SDK.
* **Meteorological Gate**: Checks weather data before invoking LLMs. If temperature is < 38°C, the orchestrator classifies it as a false alarm and halts downstream agents.
* **Confidence Gating**: Evaluates detection outcomes. If confidence is < 60%, execution phases are denied, preventing accidental vehicle dispatches.
* **Tool Permissions Matrix**: Assigns map authorizations for coordinate tasks and alerts channels for mass dangers.

### 3. Input/Output Contracts
* **Input (Orchestrator Feed)**:
  ```json
  {
    "weather": { "temperature_celsius": 43 },
    "signal": { "text": "5 log behosh hain DHA Suffa mein", "patient_count": 5 },
    "timestamp": "2026-05-20T22:18:00Z"
  }
  ```
* **Output (Antigravity Plan Schema)**:
  ```json
  {
    "run_detection": true,
    "run_planning": true,
    "run_execution": true,
    "severity_level": "CRITICAL",
    "workflow_steps": ["detection", "hospital_routing", "emergency_escalation", "execution"],
    "tool_access": {
      "maps": true,
      "hospital_system": true,
      "traffic_simulation": true,
      "alert_system": true
    },
    "routing_strategy": {
      "priority": "LOAD_BALANCED",
      "fallback_enabled": true
    },
    "confidence": 95
  }
  ```

### 4. Dependencies
* Llama 3.3 70B model execution.
* System state variable maps.

### 5. Potential Failure Points & Mitigations
* **Llama Inference Timeouts**: Managed by falling back to a safe, default orchestrator plan (Severity: `MEDIUM`, Priority: `NEAREST_HOSPITAL`, Confidence: `50%`).
* **Malformed Orchestration JSON Output**: Strips markdown tags (` ```json ` and ` ``` `) and applies regex syntax cleaning before parsing.

---

## PHASE 3: Detection Agent

### 1. Objectives
* Run semantic analysis on signals to verify threats, evaluate severity levels, and map casualty figures.

### 2. Key Technical Decisions
* **Fusion Agent**: Fuses classified text intents (e.g. `heatwave`, `accident`) with meteorological values inside `backend/agents/detectionAgent.js`.
* **State Metric Mapping**: Automatically updates the incident state parameters, writing the geocoded place name and passenger counts to the execution variables.

### 3. Input/Output Contracts
* **Input (Ingested Payload)**:
  ```json
  {
    "text": "shadeed dhoop hai aur 2 log gir pare hain",
    "temperature": 41,
    "patient_count": 2
  }
  ```
* **Output (Detection Logs)**:
  ```json
  {
    "crisis_detected": true,
    "severity": "HIGH",
    "confidence": 88,
    "reasoning": "Heatstroke threat confirmed. Temperature is high at 41°C. Identified 2 casualties collapsed.",
    "estimated_affected_people": 2,
    "affected_areas": ["Karachi Area"]
  }
  ```

### 4. Dependencies
* `Groq` SDK completions.

### 5. Potential Failure Points & Mitigations
* **Casualty Count Mismatch**: Validates that `estimated_affected_people` matches the geocoding step metrics, falling back to database parameters if missing.

---

## PHASE 4: Planning Agent

### 1. Objectives
* Match incidents with nearby medical centers having sufficient available capacity, book bed allocations, and generate safety alerts.

### 2. Key Technical Decisions
* **Places Integration**: Implemented nearby searches inside `backend/services/hospitalService.js`.
* **Field Masking**: Uses Google Places API (v1 Nearby Search) with `'X-Goog-FieldMask'` headers to request only specific coordinates, display names, formatting addresses, and IDs, saving bandwidth.
* **Proximity Filter**: Restricts results to hospitals within a 10km radius, sorting by distance.
* **Urdu Alert Builder**: Compiles English, Urdu, and Roman Urdu warning dispatches based on incident scopes.

### 3. Input/Output Contracts
* **Input (Planning Demands)**:
  ```json
  {
    "incident_location": { "lat": 24.8211, "lng": 67.0692 },
    "patient_count": 3
  }
  ```
* **Output (Resource Plan)**:
  ```json
  {
    "assigned_hospital": {
      "id": "ChIJuS37s8s1SzkR",
      "name": "Aga Khan University Hospital",
      "location": { "lat": 24.8765, "lng": 67.0689 },
      "address": "National Stadium Rd, Karachi",
      "available_beds": 15
    },
    "beds_reserved": 3,
    "safety_advisory": {
      "english": "Emergency alert: 3 casualties in DHA. Take shelter.",
      "urdu": "ڈی ایچ اے میں ہنگامی الرٹ: 3 افراد متاثر۔",
      "roman_urdu": "Emergency alert: DHA mein 3 log behosh. Sayye mein rahein."
    }
  }
  ```

### 4. Dependencies
* Google Places API Web Service credentials.
* Static Karachi hospital coordinates fallback database.

### 5. Potential Failure Points & Mitigations
* **Zero Capacity at Nearby Clinics**: Matches against next-nearest hospital coordinates or triggers bed allocations dynamically by evicting low-risk mock bookings.
* **Google Places API Denials**: Reverts to local static seed hospital files (`data/hospital.json`).

---

## PHASE 5: Execution Agent

### 1. Objectives
* Simulate physical driving coordinates, coordinate telemetry snaps, and log closeout incident summaries to database.

### 2. Key Technical Decisions
* **Driving Router**: Connects to the public OSRM Driving Engine API to snap ambulance paths to actual street geometries.
* **Simulation Loop**: Tracks state transitions: `EN_ROUTE_TO_PATIENT` ➔ `ARRIVED_AT_PATIENT` ➔ `TRANSPORTING_PATIENT` ➔ `COMPLETED`.
* **Prisma Persistence**: Saves incident summaries and action sequences to PostgreSQL.

### 3. Input/Output Contracts
* **Input (Simulation Requirements)**:
  ```json
  {
    "pickup": { "lat": 24.8211, "lng": 67.0692 },
    "dropoff": { "lat": 24.8765, "lng": 67.0689 },
    "patient_count": 3
  }
  ```
* **Output (Execution Log Summary)**:
  ```json
  {
    "status": "COMPLETED",
    "assigned_hospital": "Aga Khan University Hospital",
    "estimated_lives_impacted": 3,
    "action_logs": [
      { "action": "DISPATCHED", "result": "Ambulance dispatched from hospital" },
      { "action": "DELIVERED", "result": "Patients admitted to ER ward" }
    ],
    "lives_impacted_improvement": 3,
    "coordination_time_saved_minutes": 15.2
  }
  ```

### 4. Dependencies
* OSRM Web Service.
* Prisma PostgreSQL Database Client.

### 5. Potential Failure Points & Mitigations
* **OSRM API Server Down**: Reverts to direct vector straight-line mathematical updates (`ambulanceSimulation.js`).
* **Database Deadlocks**: Implements Prisma connection retry limits to handle serverless database warmups.

---

## PHASE 6: WebSocket / Socket.io Pipeline

### 1. Objectives
* Establish a real-time event pipeline to sync agent logs and coordinate telemetry between server and clients.

### 2. Key Technical Decisions
* **Rooms-Based Architecture**: Subscribes clients to room channels based on their `incidentId`.
* **Dynamic Event Channels**:
  * `agent_status`: Emits real-time text logs from the executing agents.
  * `waiting_acceptance`: Blocks execution processes until the driver accepts the dispatch.
  * `simulation_tick`: Emits coordinates, ETAs, percentages, and bearings every second.

### 3. Input/Output Contracts
* **Input (WebSocket Server Trigger)**:
  ```javascript
  io.to(incidentId).emit('simulation_tick', { coords, eta, status });
  ```
* **Output (WebSocket Client Packet)**:
  ```json
  {
    "incidentId": "INC-123",
    "coords": { "latitude": 24.8455, "longitude": 67.0543 },
    "eta": 45,
    "bearing": 120,
    "phase": "TRANSPORTING_PATIENT"
  }
  ```

### 4. Dependencies
* `socket.io` (server) & `socket.io-client` (React Native client).

### 5. Potential Failure Points & Mitigations
* **Network Interruptions**: The mobile client configures automatic reconnection strategies.
* **Event Flooding**: Telemetry updates are limited to a maximum rate of 1 frame per second to prevent UI lag.

---

## PHASE 7: Mobile App

### 1. Objectives
* Deliver a dark-mode tactical interface featuring real-time maps, log views, collapsible stats sheets, and speech inputs.

### 2. Key Technical Decisions
* **Screen Layout**: Bottom Tab Navigation (`Home`, `AgentTrace`, `DriverHub`), with Modal Stack screens for `VoiceCommand`.
* **Full-Screen Map Overlay**: Configured React Native Maps snapped to screen dimensions via `StyleSheet.absoluteFillObject`.
* **Interactive Bottom Panel**: Created using `PanResponder` and `Animated` libraries inside `AmbulanceScreen.js`. Enables vertical swipe transitions between minimized (300px offset) and maximized views.
* **Voice Ingestion**: Integrated `expo-speech-recognition` to handle emergency reports in English, Urdu, and Roman Urdu.

### 3. Input/Output Contracts
* **Input (Screen Props/Socket Event)**:
  ```json
  {
    "patientCount": 3,
    "patientLocation": { "name": "DHA Suffa", "lat": 24.8211, "lng": 67.0692 },
    "hospitalLocation": { "name": "Aga Khan University Hospital", "lat": 24.8765, "lng": 67.0689 }
  }
  ```
* **Output (UI State Interactions)**:
  * Emits `accept_dispatch` to resume the backend simulation thread.
  * Captures `PanResponder` touch gesture vectors to animate vertical layout adjustments.

### 4. Dependencies
* `react-native-maps`
* `expo-speech-recognition`
* `expo-location`

### 5. Potential Failure Points & Mitigations
* **Gestures Overriding Map Pan Controls**: Gestures are bound strictly to the top handle region of the bottom sheet.
* **Map Performance Lag**: snip coordinate lines are simplified to reduce CPU rendering overhead.
