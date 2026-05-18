// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CIRO AMBULANCE SIMULATION ENGINE
// State machine + countdown timer + smooth interpolation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const STATES = {
  IDLE:                 'IDLE',
  DISPATCHED:           'DISPATCHED',
  EN_ROUTE_TO_PATIENT:  'EN_ROUTE_TO_PATIENT',
  ARRIVED_AT_PATIENT:   'ARRIVED_AT_PATIENT',
  TRANSPORTING_PATIENT: 'TRANSPORTING_PATIENT',
  ARRIVED_AT_HOSPITAL:  'ARRIVED_AT_HOSPITAL',
  COMPLETED:            'COMPLETED',
};

export const STATE_LABELS = {
  IDLE:                 'Standing By...',
  DISPATCHED:           'Dispatch Accepted — Preparing',
  EN_ROUTE_TO_PATIENT:  'Heading to Patient',
  ARRIVED_AT_PATIENT:   'Arrived at Patient',
  TRANSPORTING_PATIENT: 'Transporting Patient',
  ARRIVED_AT_HOSPITAL:  'Reached Hospital',
  COMPLETED:            'Mission Complete',
};

export const STATE_COLORS = {
  IDLE:                 '#888888',
  DISPATCHED:           '#FF9800',
  EN_ROUTE_TO_PATIENT:  '#2196F3',
  ARRIVED_AT_PATIENT:   '#FF5722',
  TRANSPORTING_PATIENT: '#9C27B0',
  ARRIVED_AT_HOSPITAL:  '#4CAF50',
  COMPLETED:            '#4CAF50',
};

// Linear interpolation between two coordinates
export const lerpCoord = (start, end, t) => ({
  latitude:  start.latitude  + (end.latitude  - start.latitude)  * t,
  longitude: start.longitude + (end.longitude - start.longitude) * t,
});

// Haversine distance in km
export const getDistanceKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = (b.latitude  - a.latitude)  * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 +
    Math.cos(a.latitude * Math.PI/180) *
    Math.cos(b.latitude * Math.PI/180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
};

// Bearing angle for marker rotation
export const getBearing = (start, end) => {
  if (!start || !end) return 0;
  const sLat = start.latitude  * Math.PI / 180;
  const sLng = start.longitude * Math.PI / 180;
  const eLat = end.latitude    * Math.PI / 180;
  const eLng = end.longitude   * Math.PI / 180;
  const dLng = eLng - sLng;
  const x = Math.sin(dLng) * Math.cos(eLat);
  const y = Math.cos(sLat) * Math.sin(eLat) -
            Math.sin(sLat) * Math.cos(eLat) * Math.cos(dLng);
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
};

export const formatTimer = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIMULATION RUNNER
// Call start(), get tick callbacks, call stop() on cleanup
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EN_ROUTE_DURATION  = 45;  // seconds hospital → patient
const TRANSPORT_DURATION = 120; // seconds patient → hospital (countdown)
const ARRIVED_PAUSE      = 2;   // seconds pause at patient before transport

export function createSimulation({ hospitalCoords, incidentCoords, onTick, onComplete }) {
  let intervalId  = null;
  let phase       = 'EN_ROUTE';   // EN_ROUTE | ARRIVED_PAUSE | TRANSPORT
  let elapsed     = 0;            // seconds elapsed in current phase
  let transportRemaining = TRANSPORT_DURATION;

  const stop = () => {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  };

  const start = () => {
    stop();

    // Emit initial tick immediately
    onTick({
      state:     STATES.EN_ROUTE_TO_PATIENT,
      position:  hospitalCoords,
      bearing:   getBearing(hospitalCoords, incidentCoords),
      countdown: null,
      progress:  0,
    });

    intervalId = setInterval(() => {
      elapsed++;

      if (phase === 'EN_ROUTE') {
        const t = Math.min(elapsed / EN_ROUTE_DURATION, 1);
        const pos = lerpCoord(hospitalCoords, incidentCoords, t);

        onTick({
          state:     STATES.EN_ROUTE_TO_PATIENT,
          position:  pos,
          bearing:   getBearing(hospitalCoords, incidentCoords),
          countdown: null,
          progress:  Math.round(t * 50), // 0-50%
        });

        if (t >= 1) {
          phase   = 'ARRIVED_PAUSE';
          elapsed = 0;
          onTick({
            state:     STATES.ARRIVED_AT_PATIENT,
            position:  incidentCoords,
            bearing:   0,
            countdown: null,
            progress:  50,
          });
        }

      } else if (phase === 'ARRIVED_PAUSE') {
        if (elapsed >= ARRIVED_PAUSE) {
          phase              = 'TRANSPORT';
          elapsed            = 0;
          transportRemaining = TRANSPORT_DURATION;
          onTick({
            state:     STATES.TRANSPORTING_PATIENT,
            position:  incidentCoords,
            bearing:   getBearing(incidentCoords, hospitalCoords),
            countdown: formatTimer(TRANSPORT_DURATION),
            progress:  50,
          });
        }

      } else if (phase === 'TRANSPORT') {
        transportRemaining = Math.max(TRANSPORT_DURATION - elapsed, 0);
        const t   = elapsed / TRANSPORT_DURATION;
        const tClamped = Math.min(t, 1);
        const pos = lerpCoord(incidentCoords, hospitalCoords, tClamped);
        const progress = 50 + Math.round(tClamped * 50); // 50-100%

        onTick({
          state:     STATES.TRANSPORTING_PATIENT,
          position:  pos,
          bearing:   getBearing(incidentCoords, hospitalCoords),
          countdown: formatTimer(transportRemaining),
          progress,
        });

        if (transportRemaining <= 0) {
          stop();
          onTick({
            state:     STATES.ARRIVED_AT_HOSPITAL,
            position:  hospitalCoords,
            bearing:   0,
            countdown: '00:00',
            progress:  100,
          });
          setTimeout(() => {
            onComplete({
              state:    STATES.COMPLETED,
              position: hospitalCoords,
            });
          }, 2000);
        }
      }
    }, 1000);
  };

  return { start, stop };
}
