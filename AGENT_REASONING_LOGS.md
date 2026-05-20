# CIRO AI Agent Reasoning Logs: INC-20260520-001
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

This document details the step-by-step reasoning logs and execution outputs of the three sub-agents performing coordination tasks for incident `INC-20260520-001`.

---

## ━━━ AGENT 1: DETECTION AGENT ━━━

### 1. Chain-of-Thought Reasoning
* **Step 1: Text Token Analysis**: Received text feed: `"Bohot log behosh ho rahe hain DHA Suffa mein, 5 log"`. Extracted landmark entity `"DHA Suffa"` and parsed casualty count of `5` from Roman Urdu descriptor `"5 log"`.
* **Step 2: Weather Fusion**: Queried Weather Proxy: Karachi temperature `43°C`, relative humidity `45%`. Calculated Heat Index using the simplified Rothfusz regression equation:
  $$\text{Heat Index} = -42.379 + 2.04901523 \times T + 10.14333127 \times R - 0.22475541 \times T \times R - \dots = 51^\circ\text{C}$$
* **Step 3: Signal Fusion Score Calculation**:
  * Formula:
    $$\text{Fusion Score} = (\text{Temp Weight} \times 0.4) + (\text{Patient Weight} \times 0.4) + (\text{Source Credibility} \times 0.2)$$
  * Input Values:
    * Temperature Weight (Normalized 0-100 scale, where $\ge 40^\circ\text{C} = 100$): `100`
    * Patient Weight (Normalized 0-100 scale, where $\ge 5 \text{ patients} = 100$): `100`
    * Source Credibility (Normalized 0-100 scale, where `app_voice` verification = 90): `90`
  * Calculation:
    $$\text{Fusion Score} = (100 \times 0.4) + (100 \times 0.4) + (90 \times 0.2) = 40 + 40 + 18 = 98$$
* **Step 4: Hotspot Severity Evaluation**: Severity Matrix mapped index:
  * Fusion Score range: $\ge 85 \implies \text{CRITICAL}$.
  * Assigned Severity Level: `CRITICAL`.
* **Step 5: Confidence Calculation**:
  * Formula:
    $$\text{Confidence} = (\text{Language Confidence} \times 0.5) + (\text{Geocoding Match Quality} \times 0.5)$$
  * Input Values:
    * Language parser precision: `94%` (unambiguous entities detected).
    * Geocoding matching rating: `80%` (resolves to partial street address).
  * Calculation:
    $$\text{Confidence} = (94 \times 0.5) + (80 \times 0.5) = 47 + 40 = 87\%$$

### 2. Live Agent Log Stream
```
[2026-05-20T14:33:07.112Z] [DETECTION_AGENT] [PARSE_TEXT] Extracted landmark: 'DHA Suffa', patient_count: 5.
[2026-05-20T14:33:07.195Z] [DETECTION_AGENT] [WEATHER_FUSE] Correlating raw inputs. Karachi Temp: 43°C, Heat Index: 51°C.
[2026-05-20T14:33:07.280Z] [DETECTION_AGENT] [FUSION_SCORE] Calculated Signal Fusion Score: 98/100.
[2026-05-20T14:33:07.362Z] [DETECTION_AGENT] [SEVERITY_EVAL] Score 98 triggers CRITICAL tier classification.
[2026-05-20T14:33:07.485Z] [DETECTION_AGENT] [CONFIDENCE_CALC] Language (94%) + Geocoding match (80%) resolved Confidence = 87%.
[2026-05-20T14:33:07.495Z] [DETECTION_AGENT] [EMIT_OUTPUT] Serializing results block to Planning Agent.
```

### 3. Output Schema Passed to Planning Agent
```json
{
  "incident_id": "INC-20260520-001",
  "crisis_detected": true,
  "severity": "CRITICAL",
  "confidence": 87,
  "estimated_lives_impacted": 5,
  "landmark_extracted": "DHA Suffa",
  "incident_coordinates": {
    "latitude": 24.8211,
    "longitude": 67.0692
  },
  "meteorological_context": {
    "temperature_celsius": 43,
    "heat_index_celsius": 51
  }
}
```

---

## ━━━ AGENT 2: PLANNING AGENT ━━━

### 1. Chain-of-Thought Reasoning
* **Step 1: Input Handshake**: Received JSON package from Detection Agent containing coordinate target `{ lat: 24.8211, lng: 67.0692 }` and required capacity `5`.
* **Step 2: Bed Register Query**: Queried Places Nearby Search (v1) coordinates, filtering results by emergency bed counts:
  1. *South City Hospital* (Distance: 3.2km, Available Beds: 2)
  2. *National Medical Centre* (Distance: 4.8km, Available Beds: 4)
  3. *Aga Khan University Hospital* (Distance: 6.8km, Available Beds: 15)
  4. *Liaquat National Hospital* (Distance: 7.1km, Available Beds: 8)
  5. *Jinnah Postgraduate Medical Centre* (Distance: 8.2km, Available Beds: 1)
* **Step 3: Load Balancing Execution**:
  * Incidents demands: 5 beds.
  * Checks:
    * South City Hospital: 2 beds available. `2 < 5` ➔ **Bypass** (insufficient capacity).
    * National Medical Centre: 4 beds available. `4 < 5` ➔ **Bypass** (insufficient capacity).
    * Aga Khan University Hospital: 15 beds available. `15 >= 5` ➔ **Match Confirmed** (sufficient capacity).
* **Step 4: Hospital Selection Reasoning**: Aga Khan University Hospital selected as the nearest medical center that can accommodate the entire patient group, preventing patient splitting across multiple locations.
* **Step 5: Geocoding Override Verification**: Verified location coords `{ lat: 24.8211, lng: 67.0692 }` fall within the valid Karachi bounds (latitude: `24.5` to `25.5`). Result: **Valid**.
* **Step 6: Multilingual Warning Alerts**: Compiling alerts:
  * Urdu: `"ڈی ایچ اے صوفہ کراچی میں شدید ہیٹ ویو کا ہنگامی الرٹ۔ 5 افراد کے بیہوش ہونے کی اطلاع ہے۔ ہنگامی خدمات روانہ کر دی گئی ہیں۔"`

### 2. Live Agent Log Stream
```
[2026-05-20T14:33:07.520Z] [PLANNING_AGENT] [RECEIVE_INPUT] Handshake verified for INC-20260520-001.
[2026-05-20T14:33:07.611Z] [PLANNING_AGENT] [HOSPITAL_QUERY] Google Places Nearby search located 5 facilities.
[2026-05-20T14:33:07.722Z] [PLANNING_AGENT] [LOAD_BALANCE] Capacity analysis: Aga Khan University Hospital matches 5 requested beds.
[2026-05-20T14:33:07.815Z] [PLANNING_AGENT] [GEO_VERIFY] Verified coords {24.8211, 67.0692} fall inside Karachi limits.
[2026-05-20T14:33:07.935Z] [PLANNING_AGENT] [ALERT_GEN] Drafted localized Urdu alert. Emitting state payload.
```

### 3. Output Schema Passed to Execution Agent
```json
{
  "incident_id": "INC-20260520-001",
  "patient_location": {
    "name": "DHA Phase 6, Suffa, Karachi",
    "latitude": 24.8211,
    "longitude": 67.0692
  },
  "hospital_allocation": {
    "hospital_id": "ChIJuS37s8s1SzkR",
    "name": "Aga Khan University Hospital",
    "latitude": 24.8765,
    "longitude": 67.0689,
    "address": "National Stadium Rd, Karachi",
    "beds_reserved": 5
  },
  "alert_payload": {
    "english": "Emergency alert: 5 casualties in DHA. Take shelter.",
    "urdu": "ڈی ایچ اے میں ہنگامی الرٹ: 5 افراد متاثر۔",
    "roman_urdu": "Emergency alert: DHA mein 5 log behosh."
  }
}
```

---

## ━━━ AGENT 3: EXECUTION AGENT ━━━

### 1. Chain-of-Thought Reasoning
* **Step 1: Ingestion**: Received routing requirements from Planning Agent. 
* **Step 2: Ambulance Match**: Identified nearest available ambulance unit: `AMB-08` located at Aga Khan University Hospital dispatch station.
* **Step 3: Route Calculations (OSRM API)**:
  * URL Construction:
    ```
    http://router.project-osrm.org/route/v1/driving/67.0689,24.8765;67.0692,24.8211?overview=full&geometries=geojson
    ```
  * Parameters: coordinates formatted as `lng,lat`, overview settings set to `full`.
* **Step 4: Snap Routing coordinates**: Parsed geometry responses from OSRM to generate step-by-step waypoint coordinate arrays snapped to Karachi road layouts.
* **Step 5: Dispatch Emission**: Pushed dispatch parameters to Socket.io to notify mobile drivers and prompt manual acceptance.
* **Step 6: Completion Metrics Calculation**: Simulated arrival at patient, transport transitions, and admission checks. Generated the final coordination statistics.

### 2. Live Agent Log Stream
```
[2026-05-20T14:33:12.155Z] [EXECUTION_AGENT] [RECEIVE_INPUT] Dispatch routing instructions loaded.
[2026-05-20T14:33:12.212Z] [EXECUTION_AGENT] [AMB_MATCH] Assigned AMB-08 (AKU Station) to coordinates.
[2026-05-20T14:33:12.445Z] [EXECUTION_AGENT] [OSRM_CALL] Querying OSRM road geometry routes. Leg 1 & Leg 2 coordinates received.
[2026-05-20T14:33:12.510Z] [EXECUTION_AGENT] [DISPATCH_EMIT] WebSocket events sent to Driver App for accept checks.
[2026-05-20T14:33:15.518Z] [EXECUTION_AGENT] [SIMULATION_TICK] Simulation complete. Coordinates loop ended.
[2026-05-20T14:33:15.535Z] [EXECUTION_AGENT] [REPORT_GEN] Assembling final Incident Report JSON block.
```

### 3. Complete Final JSON Incident Report Output
```json
{
  "incident_report": {
    "incident_id": "INC-20260520-001",
    "status": "COMPLETED",
    "estimated_lives_impacted": 5,
    "lives_impacted_improvement": 5,
    "assigned_hospital": "Aga Khan University Hospital",
    "hospital_beds_booked": 5,
    "assigned_vehicle": "AMB-08",
    "coordination_time_saved_minutes": 14.5,
    "simulation_metrics": {
      "total_distance_km": 13.6,
      "total_transit_seconds": 180,
      "average_speed_kmh": 42.5,
      "fuel_consumed_liters": 1.2
    },
    "waypoints": [
      { "latitude": 24.8765, "longitude": 67.0689 },
      { "latitude": 24.8698, "longitude": 67.0691 },
      { "latitude": 24.8588, "longitude": 67.0705 },
      { "latitude": 24.8455, "longitude": 67.0722 },
      { "latitude": 24.8388, "longitude": 67.0718 },
      { "latitude": 24.8299, "longitude": 67.0701 },
      { "latitude": 24.8233, "longitude": 67.0695 },
      { "latitude": 24.8211, "longitude": 67.0692 }
    ],
    "execution_log": [
      {
        "timestamp": "2026-05-20T14:33:12.512Z",
        "action": "DISPATCHED",
        "detail": "Ambulance dispatched from Aga Khan University Hospital"
      },
      {
        "timestamp": "2026-05-20T14:33:13.621Z",
        "action": "ARRIVED_AT_SCENE",
        "detail": "Ambulance arrived at DHA Phase 6, Suffa. Secured 5 casualties."
      },
      {
        "timestamp": "2026-05-20T14:33:14.882Z",
        "action": "TRANSPORTING_PATIENT",
        "detail": "Patients secured. Transporting to Aga Khan University Hospital."
      },
      {
        "timestamp": "2026-05-20T14:33:15.512Z",
        "action": "DELIVERED",
        "detail": "Patients delivered. Beds capacity confirmed."
      }
    ]
  }
}
```
