# CIRO — Known Issues & Resolutions Log
### Google Antigravity Hackathon — Challenge 3: Real-Time Crisis Orchestration

This document lists the core operational bugs, edge-case anomalies, and architectural fallbacks identified during development of the **Crisis Intelligence & Response Orchestrator (CIRO)**.

---

## Issue 1: False Alarm — Temperature Below 38°C Threshold

* **Trigger Condition**: Ingestion of citizen distress signals reporting heatwave symptoms during periods where Karachi's ambient temperature reads below 38.0°C.
* **Detection Method**: The orchestrator checks the weather sensor metrics from the Weather Proxy before authorizing sub-agent completions.
* **Resolution Logic**:
  ```javascript
  function evaluateWeatherGate(weatherData) {
    const TEMP_THRESHOLD = 38.0;
    if (weatherData.temperature_celsius < TEMP_THRESHOLD) {
      return {
        gatePassed: false,
        action: "ABORT",
        reason: `Ambient temperature (${weatherData.temperature_celsius}°C) is below active crisis threshold (${TEMP_THRESHOLD}°C).`
      };
    }
    return { gatePassed: true, action: "CONTINUE" };
  }
  ```
* **Database State**: The incident is persisted with an `ABORTED` status. The multi-agent pipeline is bypassed, and no agent logs are generated.
  ```json
  {
    "id": "INC-20260520-9081",
    "status": "ABORTED",
    "severity": "LOW",
    "confidence": 100,
    "abort_reason": "Weather gate check failed: Temperature below 38°C"
  }
  ```
* **Sample Log Output**:
  ```
  [2026-05-20T22:23:01.002Z] [ORCHESTRATOR] [GATE_CHECK] Ingested temperature: 34.2°C. Target cutoff: 38.0°C.
  [2026-05-20T22:23:01.010Z] [ORCHESTRATOR] [GATE_CHECK] Result: FAIL. Overriding workflow. Aborting downstream agents.
  [2026-05-20T22:23:01.025Z] [ORCHESTRATOR] [DB_WRITE] Incident persisted with status: ABORTED. Client API response emitted: { status: "ignored", reason: "cold_weather_gate" }.
  ```
* **Prevention / Future Improvement**: Combine the weather gate check with air quality and humidity metrics to trigger alerts for lower temperature heatwaves with high humidity.

---

## Issue 2: GPS Coordinates Out of Karachi Bounds

* **Trigger Condition**: Ingestion of a report containing GPS coordinates outside the geographic boundary box of Karachi.
* **Detection Method**: Compare the coordinates against boundary limits during the location extraction phase in `locationExtractor.js`.
* **Resolution Logic**:
  ```javascript
  function enforceKarachiBounds(coords) {
    const BOUNDS = {
      latMin: 24.5,
      latMax: 25.5,
      lngMin: 66.5,
      lngMax: 67.5
    };
    const { lat, lng } = coords;
    if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lng < BOUNDS.lngMin || lng > BOUNDS.lngMax) {
      return {
        valid: false,
        fallbackApplied: true,
        coords: { lat: 24.92, lng: 67.09 } // Gulshan Chowrangi, Karachi
      };
    }
    return { valid: true, fallbackApplied: false, coords };
  }
  ```
* **Database State**: Incident is logged with the fallback coordinates. The `location_source` field is flagged as `gps_fallback` to document the override.
  ```json
  {
    "id": "INC-20260520-9082",
    "resolved_latitude": 24.92,
    "resolved_longitude": 67.09,
    "location_source": "gps_fallback"
  }
  ```
* **Sample Log Output**:
  ```
  [2026-05-20T22:23:02.112Z] [LOCATION_EXTRACTOR] [BOUNDS_CHECK] Coordinates resolved: { lat: 31.52, lng: 74.35 }.
  [2026-05-20T22:23:02.120Z] [LOCATION_EXTRACTOR] [BOUNDS_CHECK] Result: OUT_OF_BOUNDS (Outside Karachi bounding box).
  [2026-05-20T22:23:02.128Z] [LOCATION_EXTRACTOR] [BOUNDS_CHECK] Enforced fallback: { lat: 24.92, lng: 67.09 } (Gulshan Chowrangi).
  ```
* **Prevention / Future Improvement**: Integrate reverse geocoding to query city names directly, providing regional fallbacks for neighboring municipalities (e.g. Hyderabad, Thatta).

---

## Issue 3: OSRM Routing API Offline / Empty Route Returned

* **Trigger Condition**: Network timeout, API limit exhaustion, or routing failures from the Open Source Routing Machine (OSRM) service.
* **Detection Method**: Catch errors thrown during OSRM API fetch operations inside `ambulanceSimulation.js`.
* **Resolution Logic**:
  ```javascript
  async function fetchRoute(pickup, dropoff) {
    try {
      const response = await fetch(`http://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error("OSRM API error");
      const data = await response.json();
      return data.routes[0].geometry.coordinates.map(coord => ({ latitude: coord[1], longitude: coord[0] }));
    } catch (error) {
      console.warn("OSRM offline. Running straight-line interpolation fallback.");
      return [
        { latitude: pickup.lat, longitude: pickup.lng },
        { latitude: (pickup.lat + dropoff.lat) / 2, longitude: (pickup.lng + dropoff.lng) / 2 },
        { latitude: dropoff.lat, longitude: dropoff.lng }
      ];
    }
  }
  ```
* **Database State**: The routing path coordinates array is populated with the generated straight-line vector.
* **Sample Log Output**:
  ```
  [2026-05-20T22:23:03.445Z] [SIMULATOR] [ROUTE_FETCH] Failed to query OSRM routing server: Network Timeout.
  [2026-05-20T22:23:03.452Z] [SIMULATOR] [ROUTE_FETCH] Warning: OSRM Offline. Applying 3-point straight-line vector fallback.
  [2026-05-20T22:23:03.460Z] [SIMULATOR] [ROUTE_FETCH] Coordinates calculated: pickup -> interpolation -> dropoff. Simulation running.
  ```
* **Prevention / Future Improvement**: Implement local client-side offline routing calculations using Mapbox/Esri offline tile maps.

---

## Issue 4: Low Confidence Score — Dispatch Denied (<60%)

* **Trigger Condition**: Ingestion of conflicting signals (e.g., reports indicating severe heatstroke but weather readings are cool) or ambiguous Roman Urdu inputs that cannot be parsed.
* **Detection Method**: The orchestrator checks if the Detection Agent confidence score is under 60% before authorizing the Planning Agent phase.
* **Resolution Logic**:
  ```javascript
  function evaluateConfidenceGate(detectionResult) {
    const MIN_CONFIDENCE = 60;
    if (detectionResult.confidence < MIN_CONFIDENCE) {
      return {
        authorized: false,
        targetStatus: "UNVERIFIED",
        logMessage: `Confidence score (${detectionResult.confidence}%) is below minimum dispatch threshold (${MIN_CONFIDENCE}%).`
      };
    }
    return { authorized: true, targetStatus: "VERIFIED" };
  }
  ```
* **Database State**: The incident record is written with an `UNVERIFIED` status, and downstream ambulance dispatch operations are blocked.
  ```json
  {
    "id": "INC-20260520-9084",
    "status": "UNVERIFIED",
    "estimated_affected_people": 0,
    "reasoning": "Blocked dispatch: confidence score under 60%"
  }
  ```
* **Sample Log Output**:
  ```
  [2026-05-20T22:23:04.512Z] [ORCHESTRATOR] [CONFIDENCE_GATE] Detection confidence resolved to 48%. Target cutoff: 60%.
  [2026-05-20T22:23:04.520Z] [ORCHESTRATOR] [CONFIDENCE_GATE] Result: BLOCKED. Overriding workflow. Denying ambulance dispatch.
  [2026-05-20T22:23:04.532Z] [ORCHESTRATOR] [DB_WRITE] Incident persisted with status: UNVERIFIED. Dispatch aborted.
  ```
* **Prevention / Future Improvement**: Route unverified incidents to operator screens for manual triage, allowing operators to verify or reject dispatches.

---

## Issue 5: Roman Urdu Landmark Extraction Failure

* **Trigger Condition**: Ingestion of emergency posts that mention unrecognizable places or do not contain landmark names.
* **Detection Method**: The location extractor returns an empty place entity when parsing the text.
* **Resolution Logic**:
  ```javascript
  function resolveLocationFallback(extractorResult, gpsRaw) {
    if (!extractorResult.found || !extractorResult.placeName) {
      return {
        applied: true,
        source: "gps_fallback",
        coordinates: gpsRaw || { lat: 24.92, lng: 67.09 }
      };
    }
    return {
      applied: false,
      source: "text_extraction",
      coordinates: extractorResult.coordinates
    };
  }
  ```
* **Database State**: The location coordinates revert to the raw GPS value sent by the client, and the source is marked as `gps_fallback`.
* **Sample Log Output**:
  ```
  [2026-05-20T22:23:05.102Z] [LOCATION_EXTRACTOR] [PARSE_TEXT] No landmark extracted from raw text report.
  [2026-05-20T22:23:05.110Z] [LOCATION_EXTRACTOR] [FALLBACK] Reverting to Raw GPS coordinates: { lat: 24.8601, lng: 67.0736 }.
  ```
* **Prevention / Future Improvement**: Maintain an offline dictionary of common Karachi landmarks and neighborhoods to check before querying LLMs.

---

## Issue 6: Hospital Bed Count Insufficient for Patient Count

* **Trigger Condition**: An incident has a patient count greater than the available bed capacity at any individual nearby hospital.
* **Detection Method**: The Planning Agent searches nearby hospitals but finds none with available beds $\ge$ the required patient count.
* **Resolution Logic**:
  ```javascript
  function handleCapacityDeficit(nearbyHospitals, requiredBeds) {
    // Sort hospitals by proximity
    const sorted = [...nearbyHospitals].sort((a, b) => a.distance - b.distance);
    
    // Fallback strategy: Select nearest hospital and book partial capacity
    const bestFit = sorted[0];
    const bedsBooked = Math.min(bestFit.beds_available, requiredBeds);
    
    return {
      hospital: bestFit,
      bedsBooked: bedsBooked,
      remainingPatients: requiredBeds - bedsBooked,
      splitDispatchRequired: true
    };
  }
  ```
* **Database State**: The incident is flagged with `split_dispatch_required: true`. The primary hospital booking registers the partial allocation.
* **Sample Log Output**:
  ```
  [2026-05-20T22:23:06.211Z] [PLANNING_AGENT] [HOSPITAL_CHECK] Required beds: 6. Nearest AKU has 4 beds available.
  [2026-05-20T22:23:06.220Z] [PLANNING_AGENT] [HOSPITAL_CHECK] Warning: Capacity deficit. Booking partial allocation (4 beds) at AKU.
  [2026-05-20T22:23:06.228Z] [PLANNING_AGENT] [HOSPITAL_CHECK] Flagged split dispatch: 2 patients remaining.
  ```
* **Prevention / Future Improvement**: Split patients across multiple nearby hospitals, generating individual ambulance routes for each group.
