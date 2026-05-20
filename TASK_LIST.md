# CIRO — Hackathon Development Task Matrix
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

This document lists the specific ownership details, task complexities, dependencies, and completion logs for the three CIRO hackathon engineering roles, followed by the parallel/sequential execution timeline.

---

## 1. Orchestration Architect (Muaaz Ilyas)

### Task 1: Google Antigravity Orchestrator Configuration and Setup
* **Description**: Configure the central master orchestrator client (`agents/antigravityAgent.js`) leveraging the Groq SDK to execute structured completions and control downstream lanes.
* **Dependencies**: Groq SDK, ESM modules structure.
* **Complexity**: High
* **Status**: Completed

### Task 2: Defining Agent Lane Contracts
* **Description**: Structure unified input/output JSON schemas ensuring deterministic state management across sub-agent communications.
* **Dependencies**: None.
* **Complexity**: Medium
* **Status**: Completed

### Task 3: Implementing 38°C Temperature Threshold Gate
* **Description**: Program weather temperature check gates inside the backend orchestrator, logging false alarms and bypassing AI agent completions if temperature is < 38°C.
* **Dependencies**: Weather Service API integration.
* **Complexity**: Low
* **Status**: Completed

### Task 4: Confidence Bound Enforcement
* **Description**: Establish verification rules blocking ambulance dispatch processes if the Detection Agent confidence score resolves under 60%.
* **Dependencies**: Detection Agent schemas.
* **Complexity**: Medium
* **Status**: Completed

### Task 5: Emergency Escalation Injection Pipeline
* **Description**: Program state override logic that injects custom urgent steps (e.g. `emergency_escalation`) into workflow arrays when incident severity is `CRITICAL`.
* **Dependencies**: Antigravity orchestrator schema.
* **Complexity**: Medium
* **Status**: Completed

### Task 6: Testing Multi-Agent Handoff Sequences
* **Description**: Build and execute backend test rigs verifying structured JSON handoffs between Detection, Planning, and Execution phases.
* **Dependencies**: Database pooling setup, test mock datasets.
* **Complexity**: High
* **Status**: Completed

### Task 7: Prompt Engineering for Agents
* **Description**: Craft and tune system templates for Detection, Planning, and Execution agents to produce formatted JSON outputs under Llama 3.3.
* **Dependencies**: Groq API key access.
* **Complexity**: High
* **Status**: Completed

### Task 8: Antigravity Trace Log Capture and Formatting
* **Description**: Set up streaming interceptors that capture step-by-step reasoning details from all agents and pipe them to Socket.io channels.
* **Dependencies**: Socket.io WebSocket server.
* **Complexity**: Medium
* **Status**: Completed

---

## 2. Mobile Engineer (Faran Khalil)

### Task 1: Expo React Native Project Scaffolding
* **Description**: Setup React Native environment layouts, custom dark themes, safe-area structures, and bottom tab navigators.
* **Dependencies**: Expo SDK, Node runtime.
* **Complexity**: Low
* **Status**: Completed

### Task 2: Home Dashboard Screen
* **Description**: Build the dashboard screen featuring live weather indicators, system health scores, and manual temperature simulators.
* **Dependencies**: Weather proxy routes.
* **Complexity**: Medium
* **Status**: Completed

### Task 3: AI Trace Screen
* **Description**: Develop horizontally scrollable tabs to switch between active incidents, displaying live logs streamed from WebSockets.
* **Dependencies**: Socket.io client integration.
* **Complexity**: Medium
* **Status**: Completed

### Task 4: Driver Hub Screen
* **Description**: Design pending dispatch cards that display patient volumes and nearest hospitals.
* **Dependencies**: Backend execution schemas.
* **Complexity**: Medium
* **Status**: Completed

### Task 5: Socket.io Client Integration
* **Description**: Wire Socket.io client configurations to subscribe to incident rooms and update coordinates in real time.
* **Dependencies**: Socket.io client libraries, backend server address.
* **Complexity**: High
* **Status**: Completed

### Task 6: Midnight Navy Map Theme Configuration
* **Description**: Load map overlay files with custom Dark Navy styling onto `react-native-maps` components.
* **Dependencies**: `react-native-maps`, JSON map skins.
* **Complexity**: Medium
* **Status**: Completed

### Task 7: PanResponder Collapsible Bottom Info Panel
* **Description**: Build the collapsible info panel on the Driver screen using `PanResponder` and `Animated` libraries, supporting vertical swiping.
* **Dependencies**: React Native gesture responder lifecycle.
* **Complexity**: High
* **Status**: Completed

### Task 8: Accept Dispatch Button Flow and State Management
* **Description**: Program the CTA action flow on the Driver screen that resumes the simulation thread and routes coordinate trackers.
* **Dependencies**: Socket.io event triggers.
* **Complexity**: Medium
* **Status**: Completed

---

## 3. GIS Lead (Irbaz Motan)

### Task 1: Google Places Nearby API Integration with Field Masking
* **Description**: Build dynamic nearby hospital query functions, applying field masks (`X-Goog-FieldMask`) to minimize data payloads.
* **Dependencies**: Google API credentials.
* **Complexity**: High
* **Status**: Completed

### Task 2: Google Geocoding API Integration for Landmark Resolution
* **Description**: Connect the geocoding service to translate landmarks identified in reports into latitude/longitude coordinates.
* **Dependencies**: Google Maps API access.
* **Complexity**: High
* **Status**: Completed

### Task 3: Karachi Boundary Enforcement
* **Description**: Code latitude/longitude validation filters ensuring coordinates fall within Karachi boundaries (lat 24.5 - 25.5).
* **Dependencies**: None.
* **Complexity**: Low
* **Status**: Completed

### Task 4: GPS Fallback Coordinate Logic
* **Description**: Setup standard fallback coordinates (Gulshan Chowrangi: `{ lat: 24.92, lng: 67.09 }`) to handle out-of-bounds reports.
* **Dependencies**: Karachi Boundary check script.
* **Complexity**: Low
* **Status**: Completed

### Task 5: OSRM API Integration for Street-Snapped Routing
* **Description**: Connect to the OSRM routing engine API to retrieve coordinates snapped to actual Karachi streets.
* **Dependencies**: OSRM Web Service endpoint.
* **Complexity**: High
* **Status**: Completed

### Task 6: Route Coordinate Streaming Pipeline
* **Description**: Design array mapping functions that feed step-by-step OSRM routes to the Socket.io hub.
* **Dependencies**: Socket.io server modules.
* **Complexity**: Medium
* **Status**: Completed

### Task 7: OSRM Offline Fallback
* **Description**: Code mathematical straight-line vector fallbacks to handle OSRM server timeouts without crashing the simulator.
* **Dependencies**: Route coordinate pipeline.
* **Complexity**: Low
* **Status**: Completed

### Task 8: Roman Urdu Landmark Extraction Logic
* **Description**: Optimize Groq SDK Llama prompts to extract place names and patient counts from Roman Urdu texts.
* **Dependencies**: Groq API credentials.
* **Complexity**: High
* **Status**: Completed

---

## 4. Hackathon Project Timeline

The following matrix displays task execution sequences, highlighting parallel workflows during the sprint.

| Sprint Phase | Task (Orchestration Architect) | Task (Mobile Engineer) | Task (GIS Lead) | Workflow Type |
|:---|:---|:---|:---|:---|
| **Phase 1: Setup** | Configure Antigravity Client | Scaffolding Mobile Project | Setup Geocoding & Boundary validations | **Parallel** |
| **Phase 2: Ingestion** | Define JSON schemas & contracts | Build Dashboard Screen | Implement Roman Urdu Extraction | **Parallel** |
| **Phase 3: Core AI** | Program 38°C Gates & confidence rules | Build AI Trace UI | Dynamic Google Places Nearby Integration | **Sequential** (Architect ➔ GIS) |
| **Phase 4: Routing** | Optimize LLM prompts | Integrate Map Skins | Configure OSRM Snapping routes & Fallbacks | **Parallel** |
| **Phase 5: Sync** | Format trace log capture | Integrate Socket.io clients | Set up Socket.io telemetry coordinate streams | **Sequential** (GIS ➔ Mobile) |
| **Phase 6: UI Polish** | Conduct multi-incident loop tests | Program PanResponder gestures & driver acceptance flows | Validate routing paths & offline fallbacks | **Parallel** |
| **Phase 7: Demo** | Verify multi-incident handoffs | Conduct end-to-end simulation validations | Audit coordinate accuracy | **Sequential** (All team verify) |
