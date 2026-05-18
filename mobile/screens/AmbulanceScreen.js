import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, Dimensions, ScrollView, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { app_url } from '../url';
import {
  STATES, STATE_LABELS, STATE_COLORS,
  getBearing, getDistanceKm, formatTimer, createSimulation
} from '../services/ambulanceSimulation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const KARACHI = { latitude: 24.90, longitude: 67.08, latitudeDelta: 0.09, longitudeDelta: 0.09 };

export default function AmbulanceScreen({ navigation }) {
  // ── Core state ───────────────────────────────────────────
  const [phase, setPhase]             = useState(STATES.IDLE);
  const [pendingJob, setPendingJob]   = useState(null);   // waiting acceptance
  const [job, setJob]                 = useState(null);   // accepted job
  const [isPlanning, setIsPlanning]   = useState(false);

  // ── Live simulation state ─────────────────────────────────
  const [ambulancePos, setAmbulancePos] = useState(KARACHI);
  const [bearing, setBearing]           = useState(0);
  const [countdown, setCountdown]       = useState(null); // '02:00' string
  const [progress, setProgress]         = useState(0);    // 0-100
  const [livesSecured, setLivesSecured] = useState(0);

  // ── Overlay ───────────────────────────────────────────────
  const [showComplete, setShowComplete] = useState(false);

  // ── Animations ────────────────────────────────────────────
  const slideAnim      = useRef(new Animated.Value(400)).current;
  const pulseOpacity   = useRef(new Animated.Value(1)).current;
  const hospitalPulse  = useRef(new Animated.Value(1)).current;
  const checkScale     = useRef(new Animated.Value(0)).current;

  // ── Refs ──────────────────────────────────────────────────
  const socketRef    = useRef(null);
  const mapRef       = useRef(null);
  const simRef       = useRef(null);   // simulation instance

  // ── Pulse loops ───────────────────────────────────────────
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseOpacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseOpacity, { toValue: 1.0, duration: 900, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(hospitalPulse, { toValue: 1.25, duration: 1000, useNativeDriver: true }),
      Animated.timing(hospitalPulse, { toValue: 1.0,  duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  // ── Slide sheet ───────────────────────────────────────────
  useEffect(() => {
    const visible = isPlanning || pendingJob || job;
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      tension: 40, friction: 8, useNativeDriver: true,
    }).start();
  }, [isPlanning, pendingJob, job]);

  // ── Complete overlay animation ─────────────────────────────
  useEffect(() => {
    if (!showComplete) return;
    checkScale.setValue(0);
    Animated.spring(checkScale, { toValue: 1, tension: 30, friction: 5, useNativeDriver: true }).start();
    let c = 0;
    const t = setInterval(() => { c++; setLivesSecured(c); if (c >= 3) clearInterval(t); }, 400);
    return () => clearInterval(t);
  }, [showComplete]);

  // ── Socket ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(app_url);
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('get_active_dispatch'));

    socket.on('agent_status', ({ agent, status, data }) => {
      if (agent === 'Planning' && status === 'thinking') {
        setIsPlanning(true); setPendingJob(null); setJob(null);
      }
      if (agent === 'Planning' && status === 'completed') {
        setIsPlanning(false);
      }
      if (agent === 'Ambulance' && status === 'waiting_acceptance') {
        setIsPlanning(false);
        const routeInfo = data?.hospital_routing || {};
        const name      = routeInfo.recommendation || 'Aga Khan University Hospital';
        const incCoords = data.incident_coords  || { latitude: 24.92,   longitude: 67.09 };
        const hosCoords = data.hospital_coords  || { latitude: 24.8765, longitude: 67.0689 };

        setAmbulancePos(hosCoords);
        setPendingJob({
          hospitalName:   name,
          bedsAvailable:  routeInfo.emergency_beds_available || 15,
          incidentArea:   data.incident_area || 'Gulshan Chowrangi',
          incidentCoords: incCoords,
          hospitalCoords: hosCoords,
        });
        setPhase(STATES.DISPATCHED);

        // Centre map on route midpoint
        mapRef.current?.animateToRegion({
          latitude:      (incCoords.latitude  + hosCoords.latitude)  / 2,
          longitude:     (incCoords.longitude + hosCoords.longitude) / 2,
          latitudeDelta:  Math.abs(incCoords.latitude  - hosCoords.latitude)  * 2 || 0.05,
          longitudeDelta: Math.abs(incCoords.longitude - hosCoords.longitude) * 2 || 0.05,
        }, 1200);
      }
    });

    return () => { socket.disconnect(); simRef.current?.stop(); };
  }, []);

  // ── Accept dispatch ────────────────────────────────────────
  const handleAccept = () => {
    if (!socketRef.current || !pendingJob) return;
    socketRef.current.emit('accept_dispatch');

    const accepted = pendingJob;
    setPendingJob(null);
    setJob(accepted);
    setPhase(STATES.EN_ROUTE_TO_PATIENT);

    // Start client-side simulation engine
    simRef.current?.stop();
    const sim = createSimulation({
      hospitalCoords: accepted.hospitalCoords,
      incidentCoords: accepted.incidentCoords,
      onTick: ({ state, position, bearing: b, countdown: cd, progress: p }) => {
        setPhase(state);
        setAmbulancePos(position);
        setBearing(b);
        setCountdown(cd);
        setProgress(p);

        // Camera tracking
        mapRef.current?.animateCamera(
          { center: position, zoom: 14, heading: b, pitch: 40 },
          { duration: 900 }
        );
      },
      onComplete: ({ position }) => {
        setPhase(STATES.COMPLETED);
        setAmbulancePos(position);
        setShowComplete(true);
      },
    });
    simRef.current = sim;
    sim.start();

    Alert.alert('Dispatch Accepted!', 'Simulation started. Heading to patient...');
    setTimeout(() => navigation.navigate('AgentTrace'), 800);
  };

  // ── Manual check-in override ───────────────────────────────
  const handleManualStatus = (newPhase) => {
    setPhase(newPhase);
    if (newPhase === STATES.COMPLETED) {
      simRef.current?.stop();
      setShowComplete(true);
    }
  };

  // ── Return to standby ──────────────────────────────────────
  const handleStandby = () => {
    simRef.current?.stop();
    setShowComplete(false);
    setJob(null); setPendingJob(null);
    setPhase(STATES.IDLE);
    setProgress(0); setCountdown(null); setBearing(0); setLivesSecured(0);
    mapRef.current?.animateToRegion(KARACHI, 1200);
  };

  // ── Derived display values ─────────────────────────────────
  const incCoords = job?.incidentCoords  || pendingJob?.incidentCoords;
  const hosCoords = job?.hospitalCoords  || pendingJob?.hospitalCoords;
  const isNearHospital = job && getDistanceKm(ambulancePos, job.hospitalCoords) < 0.5;
  const distKm  = pendingJob
    ? getDistanceKm(pendingJob.hospitalCoords, pendingJob.incidentCoords)
    : 0;
  const etaMin  = Math.round((distKm / 40) * 60);

  const phaseColor  = STATE_COLORS[phase]  || '#888';
  const phaseLabel  = STATE_LABELS[phase]  || phase;
  const showMap     = phase !== STATES.IDLE;
  const patientPickedUp = [
    STATES.TRANSPORTING_PATIENT,
    STATES.ARRIVED_AT_HOSPITAL,
    STATES.COMPLETED,
  ].includes(phase);

  return (
    <View style={s.root}>

      {/* ── MAP ──────────────────────────────────────────────── */}
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={KARACHI}
          userInterfaceStyle="dark"
          customMapStyle={DARK_MAP}
        >
          {/* Planned route (dashed orange) — pending only */}
          {pendingJob && incCoords && hosCoords && (
            <Polyline
              coordinates={[hosCoords, incCoords]}
              strokeColor="rgba(255,111,0,0.65)"
              strokeWidth={3}
              lineDashPattern={[8, 5]}
            />
          )}

          {/* Blue line: ambulance → patient (en route) */}
          {job && phase === STATES.EN_ROUTE_TO_PATIENT && incCoords && (
            <Polyline
              coordinates={[ambulancePos, incCoords]}
              strokeColor="#2196F3"
              strokeWidth={5}
            />
          )}

          {/* Green line: ambulance → hospital (transport) */}
          {job && phase === STATES.TRANSPORTING_PATIENT && hosCoords && (
            <Polyline
              coordinates={[ambulancePos, hosCoords]}
              strokeColor="#4CAF50"
              strokeWidth={5}
            />
          )}

          {/* Incident marker */}
          {incCoords && (
            <Marker coordinate={incCoords} anchor={{ x: 0.5, y: 0.5 }}>
              {patientPickedUp ? (
                <View style={[s.markerCircle, { backgroundColor: '#4CAF50' }]}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              ) : (
                <Animated.View style={[s.markerPulse, { opacity: pulseOpacity }]}>
                  <View style={[s.markerCircle, { backgroundColor: '#D32F2F' }]}>
                    <Ionicons name="flame" size={14} color="#FFF" />
                  </View>
                </Animated.View>
              )}
            </Marker>
          )}

          {/* Hospital marker */}
          {hosCoords && (
            <Marker coordinate={hosCoords} anchor={{ x: 0.5, y: 0.5 }}>
              {isNearHospital ? (
                <Animated.View style={[s.markerPulse, { transform: [{ scale: hospitalPulse }] }]}>
                  <View style={[s.markerCircle, { backgroundColor: '#4CAF50' }]}>
                    <Ionicons name="business" size={14} color="#FFF" />
                  </View>
                </Animated.View>
              ) : (
                <View style={[s.markerCircle, { backgroundColor: '#388E3C' }]}>
                  <Ionicons name="business" size={14} color="#FFF" />
                </View>
              )}
            </Marker>
          )}

          {/* Ambulance marker */}
          {showMap && (
            <Marker
              coordinate={ambulancePos}
              flat rotation={bearing}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={s.ambMarker}>
                <Text style={{ fontSize: 22 }}>🚑</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Header chip */}
        <View style={s.headerChip}>
          <View style={[s.statusDot, { backgroundColor: phaseColor }]} />
          <Text style={s.headerText}>{phaseLabel}</Text>
        </View>

        {/* Patient onboard popover */}
        {patientPickedUp && phase !== STATES.COMPLETED && (
          <View style={s.onboardPop}>
            <Text style={s.onboardText}>Patient Onboard 🚑</Text>
          </View>
        )}
      </View>

      {/* ── SLIDING BOTTOM SHEET ─────────────────────────────── */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

        {/* Planning */}
        {isPlanning && (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#FFEB3B" />
            <Text style={s.planTitle}>AI Contacting Hospitals...</Text>
            <View style={s.logBox}>
              <Text style={s.logLine}>» PING: Liaquat National... 0 BEDS (REJECTED)</Text>
              <Text style={s.logLine}>» PING: Aga Khan University... Checking...</Text>
            </View>
          </View>
        )}

        {/* Pending dispatch */}
        {pendingJob && !job && (
          <View>
            <View style={s.rowCenter}>
              <View style={s.redDot} />
              <Text style={s.dispatchTitle}>🚨 INCOMING EMERGENCY DISPATCH</Text>
            </View>

            <View style={s.twoCol}>
              <View>
                <Text style={s.subLabel}>📍 Pickup</Text>
                <Text style={s.subVal}>{pendingJob.incidentArea}</Text>
              </View>
              <View>
                <Text style={s.subLabel}>🏥 Drop-off</Text>
                <Text style={s.subVal} numberOfLines={1}>{pendingJob.hospitalName}</Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.specGrid}>
              <Text style={s.spec}>👥 Victims: <Text style={s.specVal}>3 Heatstroke</Text></Text>
              <Text style={s.spec}>🛏️ Beds: <Text style={[s.specVal, { color: '#4CAF50' }]}>{pendingJob.bedsAvailable} ✓</Text></Text>
              <Text style={s.spec}>📏 Distance: <Text style={s.specVal}>~{distKm.toFixed(1)} km</Text></Text>
              <Text style={s.spec}>⏱️ ETA: <Text style={s.specVal}>~{etaMin} min</Text></Text>
            </View>

            <Text style={s.aiNote}>AI Logic: Liaquat bypassed (0 beds). AKUH selected (15 available).</Text>

            <TouchableOpacity style={s.acceptBtn} onPress={handleAccept}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={s.acceptText}>ACCEPT DISPATCH</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active mission */}
        {job && (
          <View>
            <View style={s.missionHeader}>
              <Text style={s.missionBadge}>DEPLOYMENT ACTIVE</Text>
              <View style={[s.phasePill, { backgroundColor: phaseColor }]}>
                <Text style={s.phasePillText}>{phase.replace(/_/g, ' ')}</Text>
              </View>
            </View>

            <Text style={s.missionInfo}>
              🏥 <Text style={s.missionVal}>{job.hospitalName}</Text>
            </Text>
            <Text style={s.missionInfo}>
              🛏️ Beds Secured: <Text style={[s.missionVal, { color: '#4CAF50' }]}>{job.bedsAvailable} ✓</Text>
            </Text>

            {/* Countdown timer */}
            {countdown && (
              <View style={s.timerBox}>
                <Ionicons name="timer-outline" size={18} color="#FF6F00" />
                <Text style={s.timerLabel}> Transport Countdown: </Text>
                <Text style={s.timerVal}>{countdown}</Text>
              </View>
            )}

            {/* Progress bar */}
            <View style={s.progressWrap}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
              <Text style={s.progressTxt}>{progress}%</Text>
            </View>

            <View style={s.divider} />

            {/* Manual check-in buttons */}
            <Text style={s.checkTitle}>Driver Check-In:</Text>
            <View style={s.btnGrid}>
              {[
                { id: STATES.EN_ROUTE_TO_PATIENT,  label: 'Heading to Patient' },
                { id: STATES.ARRIVED_AT_PATIENT,   label: 'Arrived at Scene' },
                { id: STATES.TRANSPORTING_PATIENT, label: 'Transporting' },
                { id: STATES.COMPLETED,             label: 'Delivered ✓' },
              ].map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[s.checkBtn, phase === b.id && { backgroundColor: phaseColor, borderColor: phaseColor }]}
                  onPress={() => handleManualStatus(b.id)}
                >
                  <Text style={s.checkBtnTxt}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Idle state */}
      {phase === STATES.IDLE && (
        <View style={s.idleCard}>
          <Ionicons name="radio" size={44} color="#FF6F00" />
          <Text style={s.idleTitle}>Standing By...</Text>
          <Text style={s.idleSub}>Tactical Dispatch Link Active — Listening for crisis incidents</Text>
        </View>
      )}

      {/* ── MISSION COMPLETE OVERLAY ──────────────────────────── */}
      {showComplete && (
        <View style={s.overlayBg}>
          <Animated.View style={[s.completeCard, { transform: [{ scale: checkScale }] }]}>
            <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
            <Text style={s.completeTitle}>✓ MISSION COMPLETE</Text>

            <View style={s.statsBox}>
              <Text style={s.livesText}>🫀 {livesSecured} Lives Secured</Text>
              <Text style={s.statRow}>Hospital: {job?.hospitalName || 'Aga Khan'}</Text>
              <Text style={s.statRow}>Patients Delivered: 3</Text>
              <Text style={s.statRow}>Beds Updated in System: ✓</Text>
            </View>

            <TouchableOpacity style={s.standbyBtn} onPress={handleStandby}>
              <Text style={s.standbyTxt}>Return to Standby</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ── STYLES ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#0A0A0A' },
  mapWrap:      { height: SCREEN_HEIGHT * 0.62, position: 'relative' },
  map:          { flex: 1 },
  headerChip:   {
    position: 'absolute', top: 48, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22,22,24,0.92)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#333',
  },
  statusDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  headerText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },
  onboardPop:   {
    position: 'absolute', bottom: 14, alignSelf: 'center',
    backgroundColor: 'rgba(76,175,80,0.93)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  onboardText:  { color: '#FFF', fontWeight: '700', fontSize: 12 },
  markerPulse:  { justifyContent: 'center', alignItems: 'center', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(211,47,47,0.25)' },
  markerCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  ambMarker:    { backgroundColor: '#FFF', padding: 5, borderRadius: 99, borderWidth: 2.5, borderColor: '#2196F3' },

  // Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#141416', borderTopLeftRadius: 22,
    borderTopRightRadius: 22, borderWidth: 1, borderColor: '#2D2D30',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30,
  },
  divider:    { height: 1, backgroundColor: '#2D2D30', marginVertical: 12 },
  center:     { alignItems: 'center', paddingVertical: 8 },
  planTitle:  { color: '#FFEB3B', fontWeight: '700', fontSize: 14, marginTop: 10, marginBottom: 12 },
  logBox:     { alignSelf: 'stretch', backgroundColor: '#0A0A0B', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#222' },
  logLine:    { color: '#00FF00', fontSize: 11, fontFamily: 'monospace', marginBottom: 3 },

  rowCenter:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  redDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F', marginRight: 10 },
  dispatchTitle: { color: '#D32F2F', fontWeight: '700', fontSize: 14 },
  twoCol:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subLabel:      { color: '#888', fontSize: 11, fontWeight: '700' },
  subVal:        { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 2, maxWidth: 160 },
  specGrid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  spec:          { width: '48%', color: '#777', fontSize: 12, marginBottom: 6 },
  specVal:       { color: '#FFF', fontWeight: '700' },
  aiNote:        { color: '#888', fontSize: 11, fontStyle: 'italic', backgroundColor: '#1C1C1E', padding: 8, borderRadius: 6, marginBottom: 14 },
  acceptBtn:     { backgroundColor: '#D32F2F', paddingVertical: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  acceptText:    { color: '#FFF', fontWeight: '700', fontSize: 15 },

  missionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  missionBadge:    { backgroundColor: '#FF6F00', color: '#FFF', fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 10 },
  phasePill:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  phasePillText:   { color: '#FFF', fontSize: 10, fontWeight: '700' },
  missionInfo:     { color: '#888', fontSize: 12, marginBottom: 5 },
  missionVal:      { color: '#FFF', fontWeight: '700' },

  timerBox:   { flexDirection: 'row', alignItems: 'center', marginVertical: 8, backgroundColor: '#1C1C1E', padding: 10, borderRadius: 8 },
  timerLabel: { color: '#888', fontSize: 13 },
  timerVal:   { color: '#FF6F00', fontSize: 20, fontWeight: '700', letterSpacing: 2, fontVariant: ['tabular-nums'] },

  progressWrap: { height: 20, backgroundColor: '#1C1C1E', borderRadius: 10, overflow: 'hidden', justifyContent: 'center', marginVertical: 4 },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FF6F00' },
  progressTxt:  { alignSelf: 'center', color: '#FFF', fontSize: 11, fontWeight: '700' },

  checkTitle: { color: '#FFF', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  btnGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  checkBtn:   { width: '48%', backgroundColor: '#1E1E22', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  checkBtnTxt:{ color: '#FFF', fontSize: 11, fontWeight: '700' },

  idleCard: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: '#141416', borderRadius: 14, borderWidth: 1, borderColor: '#2D2D30', paddingVertical: 32, alignItems: 'center' },
  idleTitle:{ color: '#888', fontSize: 16, fontWeight: '700', marginTop: 10 },
  idleSub:  { color: '#444', fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20, lineHeight: 16 },

  overlayBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  completeCard: { width: '85%', backgroundColor: '#141416', borderRadius: 18, borderWidth: 1, borderColor: '#2D2D30', padding: 28, alignItems: 'center' },
  completeTitle:{ color: '#4CAF50', fontSize: 20, fontWeight: '700', letterSpacing: 1, marginTop: 10 },
  statsBox:     { alignSelf: 'stretch', backgroundColor: '#0A0A0B', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#222', marginVertical: 20, alignItems: 'center' },
  livesText:    { color: '#FF3D00', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  statRow:      { color: '#666', fontSize: 12, marginBottom: 4 },
  standbyBtn:   { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  standbyTxt:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
