# 📢 Pitch Deck Brief: CIRO (Crisis Intelligence & Response Orchestrator)
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

---

## Slide 1: Title Slide
* **Slide Title**: CIRO: Crisis Intelligence & Response Orchestrator
* **Subtitle**: Saving lives during climate extremes through real-time autonomous multi-agent coordination.
* **Core Messages**:
  * State-of-the-art emergency command center designed for Karachi, Pakistan.
  * Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration.
  * Decoupled event-driven architecture bridging AI reasoning and physical dispatch logistics.
* **Suggested Visual/Diagram**: A split dark-mode interface: one side showing a midnight navy city map of Karachi with glowing coordinates, and the other displaying a clean agent execution tree.

---

## Slide 2: The Problem
* **Slide Title**: Climate Catastrophe & Systemic Failures
* **Core Messages**:
  * **Karachi Heatwave Crisis**: Extreme heat indexes exceeding 49°C (120°F) in Karachi causing over 1,500 direct heatstroke deaths.
  * **Systemic Failure 1: Detection Lag**: Social media feeds and phone lines are flooded with fragmented emergency signals, but operators lack tools to fuse regional hotspots.
  * **Systemic Failure 2: Hospital Bed Overcrowding**: Ambulances blindly route patients to the largest public clinics (e.g. JPMC), creating fatal bottleneck queues while other ER beds sit vacant.
  * **Systemic Failure 3: GPS & Communication Gaps**: Traditional dispatch relies on straight-line vector estimations and analog radios, wasting precious transit minutes.
* **Suggested Visual/Diagram**: A timeline or flowchart highlighting the breakdown of manual coordination under emergency load (distress report ➔ operator lag ➔ blocked ER beds ➔ delayed ambulance).

---

## Slide 3: Our Solution
* **Slide Title**: CIRO Emergency Command Center
* **One-Sentence Pitch**: A real-time autonomous coordinator that processes climate signals and routes ambulance dispatches to load-balanced hospital beds.
* **Key Capabilities**:
  * **Multi-Source Signal Fusion**: Ingests citizen reports and meteorological sensors to map threat centers.
  * **Spoken Location Resolution**: Translates Roman Urdu and English landmarks (e.g., "DHA Suffa") into geographic coordinates.
  * **End-to-End Patient Count Alignment**: Extracts patient volumes from text feeds to book appropriate capacity down the chain.
  * **Closed-loop Capacity Matching**: Queries nearby ER beds dynamically, filtering out under-resourced hospitals.
  * **Street-Snapped Route Navigation**: Plots actual street paths using the OSRM routing engine instead of straight-line estimates.
* **Suggested Visual/Diagram**: Five distinct capability feature cards showing icons for Signal, Geocoding, Beds, Route, and Driver.

---

## Slide 4: How Google Antigravity Powers It
* **Slide Title**: Antigravity: The Brain Layer
* **Core Messages**:
  * **Control Plane Centralization**: Instead of running isolated chats, Google Antigravity acts as a stateful, rational gateway executing deterministic logic.
  * **Meteorological Threshold Gate**: Screens incoming reports against a strict 38°C cutoff to filter out false alarms and reserve execution resources.
  * **Dynamic Lifecycle Configuration**: Instantiates custom execution paths (e.g. automatically injecting `emergency_escalation` steps for `CRITICAL` incidents).
  * **Intelligent Tool Access**: Dynamically governs permissions (e.g., maps are unlocked for location threats; alerts are authorized only for public danger).
* **Suggested Visual/Diagram**: A flow schematic demonstrating how Google Antigravity acts as the gatekeeper between signal ingestion and downstream agent lane processing.

---

## Slide 5: System Architecture
* **Slide Title**: Event-Driven Ingestion & Dispatch Pipeline
* **Core Messages**:
  * **Ingestion Layer**: Ingests citizen messages, parses intent, and extracts geocoded coordinates and patient counts.
  * **Multi-Agent Core**: Sequentially executes the `Detection`, `Planning`, and `Execution` agents under Antigravity parameters.
  * **Real-time Synchronization**: Streams trace logs and ambulance coordinates to client screens via Socket.io WebSockets.
  * **Data Integrity**: Syncs and logs historical records to a PostgreSQL Neon database using Prisma ORM.
* **Suggested Visual/Diagram**: An ASCII architecture flow showing signals routing through Ingestion ➔ Antigravity ➔ Prisma DB ➔ Socket Hub ➔ Mobile Clients.

---

## Slide 6: The 3 Agents
* **Slide Title**: Dedicated Multi-Agent Lane Processing
* **Core Messages**:
  * **Detection Agent**: Fuses weather logs and citizen reports to classify severity ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and confidence metrics.
  * **Planning Agent**: Queries hospital beds using the Google Places API Nearby Search (v1) with field masking, books capacity, and compiles bilingual alerts.
  * **Execution Agent**: Simulates the transport transitions, tracks telemetry along Karachi streets, and generates final incident reports.
* **Suggested Visual/Diagram**: A comparison table of the three agents, illustrating their input triggers, processing targets, and final outputs.

---

## Slide 7: Live Demo Flow
* **Slide Title**: Real-time Coordination Demo
* **Core Messages**:
  * **Step 1: Trigger Incident**: Ingests a heatwave report (e.g. 5 casualties collapsed at DHA Suffa) and geocodes it.
  * **Step 2: Stream Traces**: Displays real-time WebSocket traces from all agents via horizontally scrollable tabs on the mobile client.
  * **Step 3: Accept Dispatch & Track**: Driver reviews the dispatch, accepts it, and views the snapped path to the geocoded pickup spot and hospital on the dark mode map.
* **Suggested Visual/Diagram**: A three-step mock screenshot gallery illustrating the Dashboard, the horizontal Trace Tabs, and the Navy Dark map navigation.

---

## Slide 8: Results & Impact
* **Slide Title**: System Performance: Manual vs CIRO
* **Performance Metrics**:
  * **Response Latency**: Reduced from 12-25 minutes to sub-second processing (~1.6 seconds end-to-end).
  * **Hospital Bottlenecks**: Replaces blind routing with capacity-aware hospital selection, balancing local emergency room load.
  * **Routing Protocol**: Snaps paths to real Karachi road networks using OSRM, saving transit time.
  * **Multi-Incident Ingestion**: Handles parallel reports concurrently, separating tracking logs via independent WebSocket connections.
* **Suggested Visual/Diagram**: A prominent baseline comparison table highlighting CIRO's 90x latency improvement and balanced bed allocation.

---

## Slide 9: Tech Stack
* **Slide Title**: Tech Stack & API Integrations
* **Core Architecture Stack**:
  * **Llama 3.3 70B (Groq)**: Sub-second agent inference cycles.
  * **Google Places v1 & Geocoding**: Dynamic hospital search with field masking and landmark resolution.
  * **React Native + Expo**: Native mobile layouts with custom dark theme overlays.
  * **Node.js Express + Socket.io**: Real-time event communication.
  * **Neon Serverless PostgreSQL + Prisma ORM**: Cloud database storage.
  * **OSRM**: Karachi street-snapped coordinates routing.
* **Suggested Visual/Diagram**: A 2x3 grid displaying tech icons and service badges.

---

## Slide 10: Team Roles & Contributions
* **Slide Title**: The Engineering Team
* **Core Team & Roles**:
  * **Muaaz Ilyas** — Lead Orchestration & AI Architect: Programmed the Antigravity Agent, intent classification, Roman Urdu parsing, and threshold checking gates.
  * **Irbaz Motan** — Backend & Database Engineer: Managed Express REST APIs, Socket.io WebSocket connections, Prisma schema migrations, and Google Places integrations.
  * **Faran Khalil** — Mobile UI & Experience Engineer: Built React Native layouts, dark mode maps, draggable info sheets, and voice recognition modules.
* **Suggested Visual/Diagram**: Three card profiles detailing each member's core hackathon responsibilities.
