# Walkthrough: CIRO Development & Multi-Agent Tracing Manual
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

This walkthrough document outlines the phase-by-phase implementation plan, team task matrices, simulated end-to-end multi-agent execution traces, and resolved edge-case handling for **CIRO (Crisis Intelligence & Response Orchestrator)**.

---

## 1. Implementation Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Ingestion & Extraction                            │
│           (REST Signals + Weather Proxy + Location/Count Extractor)         │
│                                      │                                      │
│                                      ▼                                      │
│                            Antigravity Orchestration                        │
│             (Workflow Config + Decision Gates + Agent Sequencing)           │
│                                      │                                      │
│                                      ▼                                      │
│                            Multi-Agent Execution                            │
│                 (Detection + Planning + Execution Pipeline)                 │
│                                      │                                      │
│                                      ▼                                      │
│                            WebSocket & Mobile Client                        │
│               (Real-Time Traces + Snapped Maps + Collapsible UI)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Signal Ingestion Layer
* **REST API**: Configured a `POST /api/signals/inject` route in `backend/index.js` to serve incoming raw citizen distress signals.
* **Weather Proxy**: Built `backend/services/weather.service.js` querying live temperature, humidity, and wind velocity metrics from OpenWeatherMap, applying a **38.5°C** fallback average if queries timeout.
* **Location & Count Parser**: Programmed `backend/services/locationExtractor.js` to process texts (in English and Roman Urdu) using a sub-second LLM inference, extracting place names and patient counts, then resolving addresses using Google Geocoding API.

### Phase 2: Google Antigravity Brain Layer
* **Orchestration Client**: Configured `agents/antigravityAgent.js` to serve as the master control plane.
* **Workflow Decisions**: Dictates boolean gates (`run_detection`, `run_planning`, `run_execution`) based on severity thresholds, and selects routing priorities (e.g. `LOAD_BALANCED` vs `NEAREST_HOSPITAL`).
* **Tool Permissions**: Authorizes tool tokens (`maps`, `hospital_system`, `traffic_simulation`, `alert_system`) depending on incident type.

### Phase 3: Detection Agent
* **Ingestion Fusion**: Integrates weather context and signal arrays in `backend/agents/detectionAgent.js`.
* **Risk Evaluation**: Calculates severity ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and confidence metrics (0-100%).
* **Count Syncing**: Maps the extracted `patientCount` to the incident's `estimated_affected_people` field.

### Phase 4: Planning Agent
* **Hospital Capacity Queries**: Integrates Google Places API (v1 Nearby Search) with field masking headers inside `backend/services/hospitalService.js`.
* **Load Balancing**: Checks simulated hospital bed counts, bypassing clinics that cannot accommodate the incident passenger count.
* **Multilingual Warnings**: Formulates structured evacuation details and localized alerts (English, Urdu, Roman Urdu).

### Phase 5: Execution Agent
* **Telematics Simulation**: Traces the transition of coordinates between phases in the simulation engine.
* **OSRM Navigation**: Snaps route coordinates to actual Karachi streets using OSRM geometry queries.
* **Database Logs**: Writes final reports to PostgreSQL using Prisma, compiling stats like coordination time saved and total lives secured.

### Phase 6: WebSockets Pipeline
* **High-Throughput Streams**: Uses Socket.io to coordinate traces, simulation logs, and active coordinate indicators.
* **Acceptance Gates**: Blocks orchestrator thread triggers at the `'waiting_acceptance'` phase until a driver acknowledges dispatch.

### Phase 7: Mobile App UI
* **Dashboard (`HomeScreen.js`)**: Displays Karachi weather values and incident triggers.
* **Trace Engine (`AgentTraceScreen.js`)**: Displays concurrent incident traces using horizontal tab selections.
* **Driver Hub (`AmbulanceScreen.js`)**: Snaps maps in Navy Dark mode using `absoluteFillObject`, manages collapsible sheets using a `PanResponder` gesture handle, and updates patient counts.

---

## 2. Task List (Per Team Member)

### I. Muaaz Ilyas — Lead Orchestration & AI Architect
- [x] Program Google Antigravity Agent logic, decision rules, and confidence parameters.
- [x] Configure intent classification prompts to categorize incoming reports.
- [x] Write metadata extraction models parsing geocoded locations and patient counts from Roman Urdu.
- [x] Implement the meteorological threshold screening (38°C cutoff) in the Orchestrator.

### II. Irbaz Motan — Backend & Database Engineer
- [x] Develop Node.js REST controllers (`/api/signals/inject`, `/api/weather/current`).
- [x] Setup Prisma schema modeling the relationship between `Incident`, `Signal`, and `ActionLog`.
- [x] Deploy connection pools linking queries to the Neon Serverless PostgreSQL instance.
- [x] Configure bidirectional Socket.io pipelines to stream traces and coordinates.

### III. Faran Khalil — Mobile UI & Experience Engineer
- [x] Design custom dark mode theme components in React Native.
- [x] Set up horizontally scrollable incident selectors on the Trace screen.
- [x] Build the full-screen MapView overlay snapped via `absoluteFillObject`.
- [x] Program draggable, collapsible bottom panels using `PanResponder` and `Animated` APIs.

### IV. Irbaz & Faran — GIS & Integration Leads
- [x] Hook geocoding queries to translate landmarks into coordinates.
- [x] Connect Google Places v1 Search Nearby API, adding field masks for display values.
- [x] Program polyline snapped matrices using OSRM route APIs.
- [x] Develop straight-line math fallback equations for offline simulators.

---

## 3. Antigravity Agent Trace Walkthrough

### Ingested Incident Context
* **Meteorological Temp**: `43°C`
* **Raw Citizen Signal**: `"Bohot log behosh ho rahe hain DHA Suffa mein, 5 log"`
* **Extracted Landmark**: `"DHA Suffa"` (Geocoded to `{ lat: 24.8211, lng: 67.0692 }`)
* **Extracted Casualty Count**: `5`

### Step 1: Google Antigravity Orchestrator Decision Trace
```json
{
  "run_detection": true,
  "run_planning": true,
  "run_execution": true,
  "severity_level": "CRITICAL",
  "workflow_steps": [
    "detection",
    "hospital_routing",
    "emergency_escalation",
    "execution"
  ],
  "tool_access": {
    "maps": true,
    "hospital_system": true,
    "traffic_simulation": true,
    "alert_system": true
  },
  "decision_trace": [
    "Ambient Karachi temperature is 43°C, exceeding the 38°C heatwave threshold. Proceeding with active flow.",
    "Distress report signals multiple collapsed individuals (5 people) at DHA Suffa.",
    "Escalated severity level to CRITICAL. Enabled maps, hospital bed search, and public warning alert systems."
  ],
  "routing_strategy": {
    "priority": "LOAD_BALANCED",
    "fallback_enabled": true
  },
  "confidence": 95
}
```

### Step 2: Detection Agent Reasoning Trace
```json
{
  "crisis_detected": true,
  "severity": "CRITICAL",
  "confidence": 87,
  "reasoning": "Extremely hot climate context (43°C) confirmed. Input report indicates 5 heatstroke casualties collapsed at DHA Suffa. Threat matches heatwave crisis criteria.",
  "estimated_affected_people": 5,
  "affected_areas": [
    "DHA Suffa"
  ]
}
```

### Step 3: Planning Agent Allocation Trace
```json
{
  "hospital_routing": {
    "recommendation": "Aga Khan University Hospital",
    "distance_km": 6.8,
    "emergency_beds_available": 15,
    "beds_booked": 5,
    "status": "confirmed"
  },
  "public_alerts": {
    "english": "Emergency heatwave alert in DHA Suffa, Karachi. 5 casualties reported. Emergency services are en route. Take shelter.",
    "urdu": "ڈی ایچ اے صوفہ کراچی میں شدید ہیٹ ویو کا ہنگامی الرٹ۔ 5 افراد کے بیہوش ہونے کی اطلاع ہے۔ ہنگامی خدمات روانہ کر دی گئی ہیں۔",
    "roman_urdu": "DHA Suffa Karachi mein shadeed heatwave emergency. 5 log behosh hone ki khabar hai. Madad bheji ja chuki hai. Garmi se bachein."
  }
}
```

### Step 4: Execution Agent Route & Report Trace
```json
{
  "incident_report": {
    "status": "COMPLETED",
    "estimated_lives_impacted": 5,
    "crisis_summary": "Heatstroke emergency successfully resolved at DHA Suffa, Karachi. 5 patients safely transported.",
    "assigned_hospital": "Aga Khan University Hospital",
    "hospital_beds_booked": 5,
    "time_elapsed_seconds": 180,
    "average_speed_kmh": 42.5
  },
  "impact_metrics": {
    "lives_impacted_improvement": 5,
    "coordination_time_saved_minutes": 14.5
  },
  "execution_log": [
    {
      "action_id": "DISPATCHED",
      "status": "COMPLETED",
      "result": "Ambulance dispatched from Aga Khan University Hospital",
      "simulated_impact": "5 patients helped"
    },
    {
      "action_id": "ARRIVED_AT_SCENE",
      "status": "COMPLETED",
      "result": "Arrived at DHA Suffa and secured 5 patients",
      "simulated_impact": "5 patients helped"
    },
    {
      "action_id": "TRANSPORTING_PATIENT",
      "status": "COMPLETED",
      "result": "Transporting patients to Aga Khan University Hospital",
      "simulated_impact": "5 patients helped"
    },
    {
      "action_id": "DELIVERED",
      "status": "COMPLETED",
      "result": "Patients admitted to Aga Khan University Hospital",
      "simulated_impact": "5 patients helped"
    }
  ]
}
```

---

## 4. Known Issues & Resolutions Log

### I. False Alarm Handling (Temperature Gate Screen)
* **Issue**: Citizen distress texts reporting heat strokes can overwhelm system resources during cool season temperatures.
* **Resolution**: The orchestrator checks OpenWeatherMap values before running LLMs. If temperature is < 38°C, the orchestrator overrides downstream steps, flags the record as an aborted false alarm in PostgreSQL, and outputs a rejection trace.

### II. GPS Bounding Enforcements
* **Issue**: GPS geocoding requests can drift outside Karachi boundaries, causing map routing failures.
* **Resolution**: The `locationExtractor` evaluates geocoded coordinates. If coordinates fall outside the Karachi box (`latitude` < 24.5 or > 25.5), it automatically overrides the position with a safe default center: `{ lat: 24.92, lng: 67.09 }` (Gulshan Chowrangi).

### III. OSRM Routing Offline Fallbacks
* **Issue**: Network timeouts or OSRM server failures can prevent snaps, locking driver screens.
* **Resolution**: If OSRM routing throws an exception, `ambulanceSimulation.js` intercepts it, creates a direct coordinate straight-line vector, and updates simulator telematics.

### IV. Low Confidence Mitigation
* **Issue**: Fragmented or fake citizen signals could trigger accidental ambulance dispatches.
* **Resolution**: If the Detection Agent evaluates a signal with a confidence rating < 60%, the Antigravity Orchestration Layer locks the execution phase, flags the incident status as `unverified` in the database, and denies ambulance dispatch.
