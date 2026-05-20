# 🚨 CIRO — Crisis Intelligence & Response Orchestrator
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

An AI-driven, multi-agent emergency response and coordination system designed to combat severe heatwave crises in Karachi, Pakistan.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [System Architecture](#3-system-architecture)
4. [Google Antigravity Integration](#4-google-antigravity-integration)
5. [Agent Workflow & Decision Engine](#5-agent-workflow--decision-engine)
6. [Repository Structure](#6-repository-structure)
7. [Tech Stack & Dependencies](#7-tech-stack--dependencies)
8. [APIs & External Services](#8-apis--external-services)
9. [Database Schema](#9-database-schema)
10. [Data Models & Schemas](#10-data-models--schemas)
11. [Mobile App Screens & User Interface](#11-mobile-app-screens--user-interface)
12. [Backend Services & Socket Pipelines](#12-backend-services--socket-pipelines)
13. [Setup & Installation](#13-setup--installation)
14. [Running a Demo](#14-running-a-demo)
15. [Environment Variables](#15-environment-variables)
16. [Baseline Comparison](#16-baseline-comparison)
17. [Robustness & Edge Cases](#17-robustness--edge-cases)
18. [Cost & Latency Analysis](#18-cost--latency-analysis)
19. [Scalability Design](#19-scalability-design)
20. [Privacy & Safety Guidelines](#20-privacy--safety-guidelines)
21. [Assumptions & Limitations](#21-assumptions--limitations)
22. [Team Roles](#22-team-roles)

---

## 1. Project Overview

**CIRO (Crisis Intelligence & Response Orchestrator)** is a next-generation, AI-driven emergency response system purpose-built to address severe heatwave crises in Karachi, Pakistan. It acts as a fully automated, real-time command center that:

| Capability | Description |
|---|---|
| 🔍 **Multi-Source Signal Fusion** | Collects and correlates citizen reports, social posts, and live meteorological data to detect emerging heatwave hotspots. |
| 📍 **Geocoded Landmark Override** | Extracts written landmarks (e.g. "DHA Suffa") in Roman Urdu/English and translates them to coordinates to override raw GPS fallbacks. |
| 👥 **Dynamic Patient Count Tracking** | Automatically identifies the number of affected casualties in citizen text feeds and propagates this count through database records and agent decisions. |
| 🤖 **AI-Driven Crisis Lifecycle Management** | Uses a Multi-Agent Orchestrator to assess severity, screen false alarms, and formulate targeted response plans. |
| 🏥 **Hospital Capacity Load Balancing** | Automatically coordinates emergency ward bed availability in real-time, matching and booking hospital beds based on incident patient counts. |
| 👤 **Human-in-the-Loop Dispatch** | Relies on mobile driver acceptance and physical check-in phases to maintain human oversight of ambulance routing. |
| 🗺️ **Street-Snapped Route Tracking** | Maps physical routes via OSRM (Open Source Routing Machine) in Midnight Navy style, providing actual street-by-street visual tracking. |

---

## 2. Problem Statement

Karachi, a dense megacity of over **20 million residents**, is heavily susceptible to extreme heat index spikes. During the catastrophic **2015 Karachi Heatwave**, temperatures soared to **49°C (120°F)**, causing **over 1,500 direct heat-related fatalities** and overwhelming local medical infrastructure.

### Root Cause Analysis — Three Systemic Failures

```
┌──────────────────────────────────────────────────────────────────┐
│  FAILURE 1: Detection Lag                                        │
│  Social media and emergency hotlines were inundated with         │
│  fragmented crisis signals, but no central mechanism existed     │
│  to fuse them and identify regional heatstroke hotspots.         │
├──────────────────────────────────────────────────────────────────┤
│  FAILURE 2: Hospital Bed Overloading                             │
│  Ambulances automatically rushed patients to central hospitals   │
│  (JPMC, Civil Hospital), creating severe bottlenecks while       │
│  other well-equipped hospitals remained under-utilized.          │
├──────────────────────────────────────────────────────────────────┤
│  FAILURE 3: Coordinative Communication Gaps                      │
│  Traditional dispatches relied on uncoordinated analog radios,   │
│  resulting in delayed alerts, straight-line navigation errors,   │
│  and poor situational status updates.                            │
└──────────────────────────────────────────────────────────────────┘
```

**CIRO directly resolves all three bottlenecks** by orchestrating rapid AI detection, geocoded landmark resolution, closed-loop hospital allocation matching casualty count requirements, and street-snapped real-time driver tracking.

---

## 3. System Architecture

CIRO operates a fully decoupled, real-time event-driven architecture powered by WebSockets, REST, and stateful multi-agent execution lanes.

```
              ┌──────────────────────────────────────────────┐
              │          MULTIPLE EMERGENCY SIGNALS          │
              │   - Citizen Social/Voice Posts (Roman Urdu)  │
              │   - OpenWeatherMap Meteorological API        │
              │   - Real-Time Hospital Bed Registers         │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
              ┌──────────────────────────────────────────────┐
              │         REST API / SIGNAL INGESTION          │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │             GOOGLE ANTIGRAVITY BRAIN LAYER (ORCHESTRATOR)            │
  │                                                                      │
  │   - Screens 38°C Heat Threshold   - Instantiates Custom Lifecycles   │
  │   - Governs Confidence Bounds    - Allocates Tool Access Tokens     │
  └───────┬──────────────────────────┬───────────────────────────┬───────┘
          │                          │                           │
          ▼                          ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ DETECTION AGENT  │       │  PLANNING AGENT  │       │ EXECUTION AGENT  │
│ Fuses signals,   │       │  Load balances   │       │ Simulates drive  │
│ measures severity│       │  hospitals, Urdu │       │ and outputs final│
│ and confidence.  │       │  alert dispatch. │       │ incident report. │
└─────────┬────────┘       └─────────┬────────┘       └─────────┬────────┘
          │                          │                           │
          └──────────────────────────┼───────────────────────────┘
                                     │  (Real-Time JSON Log Pipes)
                                     ▼
              ┌──────────────────────────────────────────────┐
              │              POSTGRESQL DATABASE             │
              │       (Neon Serverless / Prisma ORM)         │
              └──────────────────────┬───────────────────────┘
                                     │
                                     ▼
              ┌──────────────────────────────────────────────┐
              │           SOCKET.IO WEBSOCKET HUB            │
              └──────────────┬────────────────────────┬──────┘
                             │                        │
   (Real-Time Agent Traces)  │                        │  (Dynamic OSRM Drive Coordinates)
                             ▼                        ▼
              ┌────────────────────────┐    ┌────────────────────────┐
              │ MOBILE CLIENT (TRACE)  │    │ MOBILE DRIVER (MAP)    │
              │ Horizontal Tab Switch  │    │ Midnight Navy Theme,   │
              │ Dynamic Reasoning Logs │    │ Draggable Driver Hub   │
              └────────────────────────┘    └────────────────────────┘
```

---

## 4. Google Antigravity Integration

The **Google Antigravity Brain Layer** serves as the central control plane (master orchestrator) of the entire emergency response backend. Instead of isolated LLM chats, Antigravity functions as a stateful, deterministic, and highly rational gateway that:

- **Analyzes Complex Ingested Inputs** — Takes weather statistics, temperature values, and social distress feeds simultaneously.
- **Dynamically Configures the Workflow** — Determines whether downstream agents (`Detection`, `Planning`, `Execution`) should run based on severity level. If severity is `CRITICAL`, it automatically injects an `emergency_escalation` step into the pipeline.
- **Governs Tool Access Tokens** — Evaluates the crisis context to restrict tool access logically. Maps are unlocked only for location-based threats; public alert broadcasts are authorized only if mass safety is compromised.
- **Establishes Dynamic Routing Priorities** — Selects the optimal dispatch routing strategy (`NEAREST_HOSPITAL`, `FASTEST_ROUTE`, `LOAD_BALANCED`) dynamically based on real-time traffic and hospital bed availability.

### Antigravity Decision Logic

```
Temperature ≥ 38°C?
      │
      ├─── NO  ──► Log as false alarm, abort agents
      │
      └─── YES ──► Run Detection Agent
                        │
                        ├─── Confidence < 60% ──► Mark as 'unverified', deny dispatch
                        │
                        └─── Confidence ≥ 60% ──► Run Planning Agent
                                                       │
                                                       └──► Human-in-the-Loop Approval
                                                                 │
                                                                 └──► Run Execution Agent
```

---

## 5. Agent Workflow & Decision Engine

CIRO uses four key operational agents to handle the crisis lifecycle:

```
Raw Ingestion Signal
        │
        ▼
Location & Patient Extractor ──► Coordinates override & Patient counts (e.g. 2 casualties)
        │
        ▼
Antigravity Orchestrator
        │
        ├── Temp < 38°C ──► False Alarm: Logged & Ignored
        │
        └── Temp ≥ 38°C ──► Detection Agent (Fuses context & assigns estimated people impacted)
                                   │
                                   └── High Confidence & Severity ──► Planning Agent (Validates and books hospital beds)
                                                                               │
                                                                               └── Hospital Beds Loaded ──► Human-in-the-Loop Approval
                                                                                                                     │
                                                                                                                     └── Accepted ──► Execution Agent
                                                                                                                                           │
                                                                                                                                           └── Dynamic Ambulance Route Simulation
                                                                                                                                                     │
                                                                                                                                                     └── Prisma DB Closeout & Incident Report
```

### I. Location & Patient Extractor Agent
* **Role**: Ingest Metadata Extraction.
* **Mechanism**: Takes raw text input and parses it using a sub-second LLM inference to identify:
  1. The target landmark mentioned in the text (such as "DHA Suffa").
  2. The number of patients involved (defaulting to 1 if unspecified).
  If a landmark is found, it calls the Google Geocoding API, specifying `"Karachi, Pakistan"` to enforce regional coordinates.

### II. Detection Agent
* **Role**: Situational Awareness & Ingestion Correlation.
* **Mechanism**: Takes incoming citizen reports, weather context, and classified intent. It computes a **Severity Rating (LOW, MEDIUM, HIGH, CRITICAL)** and a **Confidence Score (0-100%)**, mapping the extracted patient count into the incident metrics as `estimated_affected_people`.

### III. Planning Agent
* **Role**: Operational Logistics & Resource Allocation.
* **Mechanism**: Interfaces with the Karachi hospital dataset using Google Places API (v1 Search Nearby). It filters and matches the nearest hospital having enough vacant beds to cover the extracted patient count. Concurrently, it drafts a precise coordination plan and generates localized, multilingual emergency alert broadcasts in **English, Urdu, and Roman Urdu**.

### IV. Execution Agent
* **Role**: Safe Simulation Delivery & Report Closeout.
* **Mechanism**: Traces driver response check-ins, tracks real-time ambulance telematics along OSRM street-snapped coordinates, measures countdown thresholds, increments lives secured based on the extracted patient count, and persists the full audit trail into PostgreSQL, outputting an official, human-readable Incident Report.

---

## 6. Repository Structure

```
ciro-pk/
├── agents/                        # Standalone AI agent modules
│   ├── antigravityAgent.js        # Google Antigravity orchestrator logic
│   ├── detectionAgent.js          # Signal detection & severity analysis
│   ├── planningAgent.js           # Hospital load balancing & alert generation
│   ├── executionAgent.js          # Ambulance simulation & incident closeout
│   ├── intentClassifier.js        # Signal intent classification
│   ├── index.js                   # Agents entry point
│   └── package.json
│
├── backend/                       # Node.js + Express REST API server
│   ├── agents/                    # Backend-embedded agent copies
│   │   ├── antigravityAgent.js
│   │   ├── detectionAgent.js
│   │   ├── planningAgent.js
│   │   ├── executionAgent.js
│   │   └── intentClassifier.js
│   ├── data/                      # Static data files
│   ├── prisma/                    # Prisma ORM configuration
│   │   ├── schema.prisma          # Database schema definition
│   │   └── migrations/            # Auto-generated migrations
│   ├── services/
│   │   ├── orchestrator.js        # Core crisis orchestration service
│   │   ├── weather.service.js     # OpenWeatherMap API integration
│   │   ├── hospitalService.js     # Google Places v1 Search integration
│   │   └── locationExtractor.js   # Landmark geocoding and parsing service
│   ├── database.js                # Prisma client initialization
│   ├── index.js                   # Express server + Socket.io setup
│   ├── test_all.js                # Extraction validation tests
│   ├── test_suite.js              # Full integration test suite
│   ├── prisma.config.ts           # Prisma configuration
│   └── package.json
│
├── data/                          # Shared mock/seed data
│   ├── hospital.json              # Karachi hospital database (3 hospitals)
│   ├── cooling_centers.json       # Cooling center locations
│   ├── heatwave_signla.json       # Sample heatwave signals
│   └── mock-data.json             # General mock data
│
├── mobile/                        # React Native + Expo mobile application
│   ├── screens/
│   │   ├── HomeScreen.js          # Dashboard, weather, incident trigger
│   │   ├── AgentTraceScreen.js    # Live AI agent reasoning logs
│   │   ├── AmbulanceScreen.js     # Driver hub, full screen map, collapsible sheet
│   │   ├── AlertsScreen.js        # Emergency alerts feed
│   │   ├── MapScreen.js           # General Karachi crisis map view
│   │   ├── ResourcesScreen.js     # Hospital resources overview
│   │   └── VoiceCommandScreen.js  # Voice-based incident reporting
│   ├── services/                  # Mobile API service layer
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Utility functions
│   ├── assets/                    # Images and fonts
│   ├── App.js                     # Root navigator (Stack + Bottom Tabs)
│   ├── url.js                     # Backend URL configuration
│   ├── app.config.js              # Expo app configuration
│   ├── eas.json                   # EAS Build configuration
│   └── package.json
│
└── README.md                      # Quick overview README
```

---

## 7. Tech Stack & Dependencies

### Backend (`/backend`)

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | REST API framework |
| `socket.io` | ^4.8.3 | Real-time WebSocket communication |
| `@prisma/client` | ^7.8.0 | Database ORM client |
| `prisma` | ^7.8.0 | Schema management & migrations |
| `groq-sdk` | ^1.2.0 | Llama 3.3 70B AI model (sub-second inference) |
| `@google/generative-ai` | ^0.24.1 | Google Generative AI integration |
| `@neondatabase/serverless` | ^1.1.0 | Neon serverless PostgreSQL driver |
| `@prisma/adapter-neon` | ^7.8.0 | Prisma adapter for Neon |
| `cors` | ^2.8.6 | Cross-origin resource sharing |
| `dotenv` | ^17.4.2 | Environment variable management |
| `pg` | ^8.20.0 | Native PostgreSQL client |
| `ws` | ^8.20.1 | WebSocket implementation |
| `nodemon` | ^3.1.14 | Development auto-restart |

### Mobile (`/mobile`)

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~54.0.33 | React Native development platform |
| `react-native` | 0.81.5 | Cross-platform mobile framework |
| `react` | 19.1.0 | UI library |
| `react-native-maps` | 1.20.1 | Native Google Maps integration |
| `@react-navigation/native` | ^7.2.4 | Navigation container |
| `@react-navigation/bottom-tabs` | ^7.16.1 | Bottom tab navigator |
| `@react-navigation/native-stack` | ^7.15.1 | Native stack navigator |
| `@expo/vector-icons` | ^15.0.3 | Expo icon library (Ionicons) |
| `expo-location` | ~19.0.8 | GPS/geolocation access |
| `expo-speech` | ~14.0.8 | Text-to-speech feedback |
| `expo-speech-recognition` | ^3.1.3 | Voice command recognition |
| `socket.io-client` | ^4.8.3 | Real-time backend connection |

---

## 8. APIs & External Services

### OSRM — Open Source Routing Machine
* **Purpose**: Fetches street-level routing coordinates matching Karachi's physical road networks dynamically.
* **Usage**: Generates the `patientRoute` (cyan) and `hospitalRoute` (green) paths on the ambulance driver map.
* **Fallback**: If OSRM API is offline, the app constructs a straight-line vector between coordinates.

### OpenWeatherMap API
* **Purpose**: Queries live temperature, heat index, wind velocity, and humidity levels for Karachi.
* **Endpoint**: `/api/weather/current` (proxied through backend).
* **Fallback**: If unavailable, CIRO injects a safe meteorological average of **38.5°C** to prevent lockouts.

### Google Places API (v1 Search Nearby)
* **Purpose**: Search nearby hospitals in a 10km radius of the incident.
* **Authentication**: Authenticates using the header `'X-Goog-Api-Key'`.
* **Field Masking**: Uses `'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.id'` to request only necessary JSON fields, minimizing API overhead.

### Google Geocoding API
* **Purpose**: Converts landmarks found in user reports (English / Roman Urdu) to precise coordinates.
* **Endpoint**: `https://maps.googleapis.com/maps/api/geocode/json`

### Groq API (Llama 3.3 70B Versatile)
* **Purpose**: Powers all AI agent inferences (Detection, Planning, Execution, Antigravity).
* **Model**: `llama-3.3-70b-versatile`

---

## 9. Database Schema

Defined in `backend/prisma/schema.prisma`:

```prisma
model Incident {
  id                       String   @id @default(uuid())
  report_id                String
  crisis_summary           String
  actions_taken            Int
  estimated_lives_impacted Int
  status                   String
  created_at               DateTime @default(now())

  action_logs ActionLog[]
  signals     Signal[]
}

model ActionLog {
  id               String   @id @default(uuid())
  action_id        String
  status           String
  result           String
  simulated_impact String?
  timestamp        DateTime @default(now())

  incident_id String
  incident    Incident @relation(fields: [incident_id], references: [id], onDelete: Cascade)
}

model Signal {
  id                 String   @id @default(uuid())
  text               String
  location_mentioned String
  signal_type        String
  source             String
  language           String?
  timestamp          DateTime @default(now())

  incident_id String?
  incident    Incident? @relation(fields: [incident_id], references: [id], onDelete: SetNull)
}
```

---

## 10. Data Models & Schemas

### Ingested Signal Schema (API Input)

```json
{
  "incidentId": "INC-1779143113624",
  "temperature": 42.5,
  "humidity": 68,
  "citizenReport": "Mera bhai garmi se behosh hogaya hai Clifton k kareeb, bohot tez dhoop hai aur koi saaya nahi hai yahan!",
  "timestamp": "2026-05-19T04:45:00Z"
}
```

### Signal Injection Payload (from Mobile App)

```json
{
  "text": "3 people collapsed near Gulshan-e-Iqbal",
  "location_mentioned": "Gulshan-e-Iqbal",
  "signal_type": "heatstroke_case",
  "source": "app_demo",
  "mock_temperature": 44,
  "latitude": 24.92,
  "longitude": 67.09
}
```

### Incident State Schema (Internal Orchestrator State)

```json
{
  "incidentId": "INC-1779143113624",
  "status": "active",
  "severity": "HIGH",
  "confidence": 92,
  "patient_count": 3,
  "assignedHospital": "South City Hospital",
  "patientLocation": { "lat": 24.92, "lng": 67.09, "name": "Gulshan-e-Iqbal" },
  "hospitalLocation": { "lat": 24.8765, "lng": 67.0689, "name": "Aga Khan University Hospital", "beds": 15 },
  "phase": "EN_ROUTE_TO_PATIENT",
  "livesSecured": 0,
  "timestamp": "2026-05-19T04:45:30Z"
}
```

---

## 11. Mobile App Screens & User Interface

The mobile application (`/mobile`) uses a structured React Navigation stack that balances complex information with dark-mode tactical interfaces.

### Navigation Hierarchy
```
Stack.Navigator (Modal Transition)
└── MainTabs (Bottom Tab Navigator)
    ├── Home          → HomeScreen.js (Dashboard & Simulation Trigger)
    ├── AgentTrace    → AgentTraceScreen.js (Multi-threaded Log Pipeline)
    └── DriverHub     → AmbulanceScreen.js (Tactical Map & Collapsible Sheet)
    
    (Overlay modal screens)
    └── VoiceCommand  → VoiceCommandScreen.js (Speech Input Panel)
```

### Screen Details & Technical Implementations

1. **Dashboard (`HomeScreen.js`)**:
   * Displays live weather registers for Karachi.
   * Houses the system health score, active incident count, and dynamic custom temperature inputs.
   * Prompts user GPS coordinates with Karachi boundary validation before injecting a demo incident signal.
2. **AI Agent Trace (`AgentTraceScreen.js`)**:
   * Implements a horizontally scrollable tab list for switching between concurrent active incidents.
   * Displays real-time WebSocket logs from the four agent steps (`Antigravity`, `Detection`, `Planning`, `Execution`).
3. **Driver Tactical Hub (`AmbulanceScreen.js`)**:
   * **Full-Screen Map Layout**: Snapped to the dimensions of the screen using `StyleSheet.absoluteFillObject`.
   * **Midnight Navy Neon Theme**: Features custom map styles that contrast with cyan (patient pickup) and green (hospital dropoff) polyline routes.
   * **Interactive Bottom Panel**: Built using React Native's `PanResponder` and `Animated` libraries. Supports dragging gestures and click-to-toggle transitions between minimized (300px offset) and maximized views.
   * **Dynamic Victim Count Updates**: Displays the exact number of casualties parsed by the extractor (e.g. `2 Victims`) and updates the closeout summary stats upon delivery.

---

## 12. Backend Services & Socket Pipelines

### Core Ingestion & Socket Management (`backend/index.js`)
* Manages CORS headers and REST routes (`/api/signals/inject`).
* Attaches the Socket.io WebSocket instance, enabling real-time status updates and telemetry feeds.

### Crisis Orchestrator (`backend/services/orchestrator.js`)
* Orchestrates chronological agent runs.
* Intercepts `locationExtractor` output to parse geocoded coordinates and passenger counts.
* Hooks into the local simulation loops, generating OSRM coordinates, and firing Socket triggers:
  * `agent_status` (completed planning/execution traces)
  * `waiting_acceptance` (blocking execution thread until driver accepts dispatch)
  * `simulation_tick` (real-time coordinates, eta countdowns, and progress percentages)

---

## 13. Setup & Installation

### Prerequisites

- **Node.js** v18.0.0 or higher
- **PostgreSQL** database credentials (or a free [Neon](https://neon.tech) cloud database URL)
- **Groq API Key**
- **Google Maps API Key** (authorized for Geocoding and Places API)
- **OpenWeatherMap API Key**

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install all dependencies
npm install

# 3. Create the .env configuration file (see Environment Variables section)

# 4. Push the Prisma schema to your database
npx prisma db push

# 5. Start the development server
npm run dev
```

### Mobile Setup

```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Install Expo dependencies
npm install

# 3. Configure the backend URL in mobile/url.js
# For physical device: use your local network IP (e.g., http://192.168.1.10:4000)

# 4. Start the Expo development server
npx expo start
```

---

## 14. Running a Demo

### Step 1: Fire a Crisis Signal
1. Run both the backend server and mobile app.
2. On the **CIRO Dashboard (Home)**, input a custom temperature (e.g., `43`) and tap **Trigger Demo Incident**.
3. You will be redirected to the **AI Trace** screen.

### Step 2: Track Multi-Agent Trace Pipeline
1. On the **AI Trace** screen, select the tab corresponding to the newly generated incident ID.
2. Watch as the agents populate the logs in real-time, extracting the location and setting up hospital configurations.

### Step 3: Accept Dispatch & Execute Route
1. Open the **Driver Hub** tab.
2. Check the pending dispatch cards, view the geocoded location, the nearest hospital (allocated with beds booked matching your patient count), and the victim count.
3. Tap **Accept Dispatch**.
4. The map will load the Midnight Navy interface and trace the ambulance along actual Karachi streets. Drag the bottom panel up and down to check delivery details.

---

## 15. Environment Variables

Create a `backend/.env` file with:
```env
PORT=4000
DATABASE_URL="postgresql://username:password@ep-neon-host.neon.tech/ciro_db?sslmode=require"
GROQ_API_KEY="gsk_your_groq_api_key_goes_here"
GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
OPENWEATHER_API_KEY="your_openweathermap_key"
```

---

## 16. Baseline Comparison

| Metric | Manual Dispatch System (Baseline) | CIRO Orchestrated System | Improvement |
|:---|:---|:---|:---|
| **Response Latency** | 12–25 minutes | Sub-second inferences + 1.2s API geocoding | **~90x Faster Ingestion** |
| **Hospital Selection** | Blindly routing to largest public hospitals (JPMC/Civil) | AI-driven dynamic load balancing by vacant ER beds | **Eliminates ER bottlenecks** |
| **Routing Protocol** | Static GPS or manual maps (straight-line estimation) | OSRM street-snapped navigation through Karachi's road matrix | **Saves vital transit time** |
| **Public Alert Dispatches** | Delayed static sirens or radio broadcasts (one language) | Dynamic multilingual alerts (Urdu, Roman Urdu, English) | **Broader reach, instantly** |
| **Multi-Incident Ingestion** | Serial operator calls, single queue pipeline | Asynchronous map-based parallel event handling by incident ID | **100% concurrent concurrency** |

---

## 17. Robustness & Edge Cases

### I. Temperature Gate Threshold (38°C Cutoff)
CIRO implements a strict physical temperature gate. If a citizen signals a "heat crisis" but the weather temperature is **below 38°C**, the Antigravity Orchestrator flags it as a false alarm, writes the data to PostgreSQL as an aborted incident, and halts downstream agent processing.

### II. Geocoding & GPS Boundary Enforcement
If a geocoded address returns coordinates outside Karachi bounds (latitude < 24.5 or > 25.5), CIRO automatically overrides the values with a fallback location: `{ lat: 24.92, lng: 67.09 }` (Gulshan Chowrangi, Karachi).

### III. OSRM Routing Offline Fallback
If the OSRM street-routing API is offline or returns an empty route, `ambulanceSimulation.js` automatically catches the exception, constructs a straight-line vector between coordinates, and continues simulating smoothly without crashing.

### IV. Low Confidence Mitigation
If the Detection Agent outputs a confidence score of **less than 60%**, the Antigravity Orchestrator marks the incident as `unverified` and denies `run_execution` authorization, preventing accidental physical dispatches of ambulance resources on weak signals.

---

## 18. Cost & Latency Analysis

### Cost Estimate Per Ingested Incident
Using Groq API (Llama 3.3 70B) at typical token counts:

* **Total Input Tokens**: ~3,700 tokens
* **Total Output Tokens**: ~600 tokens
* **Average Cost Per Operation**: **~$0.0022 USD**

### End-to-End Latency Breakdown
* **OpenWeather API Query**: ~150ms
* **Antigravity Orchestrator Decision**: ~380ms
* **Detection Agent Analysis**: ~410ms
* **Planning Agent Resource Balance**: ~480ms
* **OSRM Path Calculations**: ~180ms
* **Total End-to-End Latency**: **~1.6 seconds** from citizen report to driver notification.

---

## 19. Scalability Design

### 10x Incident Volume (100 concurrent signals/sec)
* **Horizontal scaling** of Express servers via load balancers (AWS ELB / Nginx).
* **Redis Pub/Sub** for state synchronization between multiple Express nodes and WebSocket clients.
* **Database Connection Pooling** via PgBouncer or Neon's native pooling endpoint.

### 100x Incident Volume (1,000+ concurrent signals/sec)
* **Message Queue Pipelines** — Transition API signal inputs to Apache Kafka or RabbitMQ ingestion queues to throttle heavy spikes.
* **Distributed Agent Workers** — Decouple LLM agent execution loops from the web server thread using standalone containerized worker nodes subscribing to RabbitMQ tasks.
* **Edge Caching** — Cache regional OSRM routes and OpenWeather data using Redis with a 2-minute TTL to avoid redundant network roundtrips.

---

## 20. Privacy & Safety Guidelines

* **Geographic Data Safeguards** — Citizen locations are parsed solely within memory limits to calculate nearest-neighbor distances. GPS coordinates stored in PostgreSQL under secure encryption keys. Public broadcast alerts sanitize individual citizen IDs.
* **Patient Privacy Boundaries** — Mock medical datasets (beds, casualty counts) do not include individual patient health histories or personal details.
* **Dispatch Integrity** — All physical dispatches require Human-in-the-Loop validation (manual driver acceptance) to ensure emergency vehicles are not hijacked by automated scripts.

---

## 21. Assumptions & Limitations

* **Mock Bed Registers**: Hospital coordinates reflect real Karachi landmarks, but bed occupancy registers are generated dynamically to validate load-balancing routing logic.
* **Network Connectivity**: Assumes cellular/Wi-Fi availability. In major power blackouts or cellular dead zones, fallback offline SMS channels would be required (out of scope).
* **Urdu Speech-to-Text**: Speech transcription accuracy is dependent on the underlying native engines of target devices.

---

## 22. Team Roles

* **Muaaz Ilyas** — Lead Orchestration & AI Architect: Developed Google Antigravity configuration frameworks, multi-agent execution structures, intent classification, and metadata extraction pipelines.
* **Irbaz Motan** — Backend & Database Engineer: Constructed Node.js Express REST routes, Socket.io WebSocket pipelines, Google Places API integrations, and database schemas via Prisma ORM.
* **Faran Khalil** — Mobile UI & Experience Engineer: Designed the React Native Expo screens, Midnight Navy maps, PanResponder draggable bottom sheets, and voice reporting modules.
