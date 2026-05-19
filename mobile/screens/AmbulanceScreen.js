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
  getBearing, getDistanceKm, formatTimer, createSimulation, fetchOSRMRoute
} from '../services/ambulanceSimulation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const KARACHI = { latitude: 24.90, longitude: 67.08, latitudeDelta: 0.09, longitudeDelta: 0.09 };

export default function AmbulanceScreen({ navigation }) {
  const [missions, setMissions] = useState({});
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const simRefs = useRef({});

  const slideAnim = useRef(new Animated.Value(400)).current;

  // Pulse loops for UI
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const hospitalPulse = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    const socket = io(app_url);
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('get_active_dispatch'));

    socket.on('agent_status', ({ incidentId, agent, status, data }) => {
      if (!incidentId) return;

      if (agent === 'Ambulance' && status === 'waiting_acceptance') {
        const routeInfo = data?.hospital_routing || {};
        const name      = routeInfo.recommendation || 'Aga Khan University Hospital';
        const incCoords = data.incident_coords  || { latitude: 24.92,   longitude: 67.09 };
        const hosCoords = data.hospital_coords  || { latitude: 24.8765, longitude: 67.0689 };

        // Initialize with direct fallback routes
        const initMission = {
          incidentId,
          status: 'pending',
          phase: STATES.DISPATCHED,
          hospitalName: name,
          bedsAvailable: routeInfo.emergency_beds_available || 15,
          incidentArea: data.incident_area || 'Unknown Area',
          incidentCoords: incCoords,
          hospitalCoords: hosCoords,
          ambulancePos: hosCoords,
          bearing: 0,
          countdown: null,
          progress: 0,
          livesSecured: 0,
          patientRoute: [hosCoords, incCoords],
          hospitalRoute: [incCoords, hosCoords]
        };

        setMissions(prev => ({
          ...prev,
          [incidentId]: initMission
        }));

        setSelectedIncidentId(incidentId);

        // Fetch high-fidelity street paths dynamically from OSRM
        Promise.all([
          fetchOSRMRoute(hosCoords, incCoords), // Route to Patient
          fetchOSRMRoute(incCoords, hosCoords)  // Route to Hospital
        ]).then(([pRoute, hRoute]) => {
          setMissions(prev => {
            if (!prev[incidentId]) return prev;
            return {
              ...prev,
              [incidentId]: {
                ...prev[incidentId],
                patientRoute: pRoute,
                hospitalRoute: hRoute
              }
            };
          });
        }).catch(err => console.log("OSRM route fetch ignored:", err));

        mapRef.current?.animateToRegion({
          latitude:      (incCoords.latitude  + hosCoords.latitude)  / 2,
          longitude:     (incCoords.longitude + hosCoords.longitude) / 2,
          latitudeDelta:  Math.abs(incCoords.latitude  - hosCoords.latitude)  * 2 || 0.05,
          longitudeDelta: Math.abs(incCoords.longitude - hosCoords.longitude) * 2 || 0.05,
        }, 1200);
      }
    });

    return () => { 
      socket.disconnect(); 
      Object.values(simRefs.current).forEach(sim => sim.stop());
    };
  }, []);

  useEffect(() => {
    const visible = Object.keys(missions).length > 0;
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 400,
      tension: 40, friction: 8, useNativeDriver: true,
    }).start();
  }, [missions]);

  const handleAccept = (incId) => {
    if (!socketRef.current || !missions[incId]) return;
    socketRef.current.emit('accept_dispatch', incId);

    const accepted = missions[incId];

    setMissions(prev => ({
       ...prev,
       [incId]: { ...prev[incId], status: 'accepted', phase: STATES.EN_ROUTE_TO_PATIENT }
    }));

    if (simRefs.current[incId]) {
       simRefs.current[incId].stop();
    }

    const sim = createSimulation({
      hospitalCoords: accepted.hospitalCoords,
      incidentCoords: accepted.incidentCoords,
      patientRoute: accepted.patientRoute || [],
      hospitalRoute: accepted.hospitalRoute || [],
      onTick: ({ state, position, bearing: b, countdown: cd, progress: p }) => {
        setMissions(prev => {
           if(!prev[incId]) return prev;
           return {
              ...prev,
              [incId]: { ...prev[incId], phase: state, ambulancePos: position, bearing: b, countdown: cd, progress: p }
           };
        });

        if (selectedIncidentId === incId) {
          mapRef.current?.animateCamera(
            { center: position, zoom: 14, heading: b, pitch: 40 },
            { duration: 900 }
          );
        }
      },
      onComplete: ({ position }) => {
        setMissions(prev => {
           if(!prev[incId]) return prev;
           return {
              ...prev,
              [incId]: { ...prev[incId], phase: STATES.COMPLETED, ambulancePos: position, livesSecured: 3 }
           };
        });
      },
    });
    
    simRefs.current[incId] = sim;
    sim.start();

    Alert.alert('Dispatch Accepted!', 'Simulation started for incident ' + incId);
    setTimeout(() => navigation.navigate('AgentTrace'), 800);
  };

  const handleManualStatus = (incId, newPhase) => {
    setMissions(prev => ({
       ...prev,
       [incId]: { ...prev[incId], phase: newPhase }
    }));
    if (newPhase === STATES.COMPLETED) {
      if (simRefs.current[incId]) simRefs.current[incId].stop();
      setMissions(prev => ({
         ...prev,
         [incId]: { ...prev[incId], livesSecured: 3 }
      }));
    }
  };

  const handleStandby = (incId) => {
    if (simRefs.current[incId]) simRefs.current[incId].stop();
    setMissions(prev => {
       const copy = {...prev};
       delete copy[incId];
       return copy;
    });
    if (selectedIncidentId === incId) {
       setSelectedIncidentId(null);
       mapRef.current?.animateToRegion(KARACHI, 1200);
    }
  };

  const missionKeys = Object.keys(missions).sort((a,b) => b.localeCompare(a));
  if (!selectedIncidentId && missionKeys.length > 0) {
      setSelectedIncidentId(missionKeys[0]);
  }

  const selectedMission = selectedIncidentId ? missions[selectedIncidentId] : null;

  return (
    <View style={s.root}>
      {/* ── MAP ──────────────────────────────────────────────── */}
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={KARACHI}
          userInterfaceStyle="dark"
          customMapStyle={PREMIUM_NAVY_MAP}
        >
          {missionKeys.map(id => {
             const m = missions[id];
             const isSelected = id === selectedIncidentId;
             const isPending = m.status === 'pending';
             const isMapVisible = m.phase !== STATES.IDLE;
             const patientPickedUp = [STATES.TRANSPORTING_PATIENT, STATES.ARRIVED_AT_HOSPITAL, STATES.COMPLETED].includes(m.phase);
             const isNearHospital = getDistanceKm(m.ambulancePos, m.hospitalCoords) < 0.5;

             if (!isMapVisible) return null;

             return (
               <React.Fragment key={id}>
                 {/* Planned dynamic street route - Glowing Dotted Neon Orange */}
                 {isPending && m.patientRoute && isSelected && (
                   <Polyline 
                     coordinates={m.patientRoute} 
                     strokeColor="#FF6F00" 
                     strokeWidth={4} 
                     lineDashPattern={[8, 6]} 
                   />
                 )}

                 {/* Blue street-snapped line: hospital → patient */}
                 {!isPending && m.phase === STATES.EN_ROUTE_TO_PATIENT && m.patientRoute && isSelected && (
                   <Polyline 
                     coordinates={m.patientRoute} 
                     strokeColor="#00E5FF" 
                     strokeWidth={6} 
                     shadowColor="#00E5FF"
                     shadowOffset={{ width: 0, height: 0 }}
                     shadowOpacity={1}
                     shadowRadius={6}
                   />
                 )}

                 {/* Green street-snapped line: patient → hospital */}
                 {!isPending && m.phase === STATES.TRANSPORTING_PATIENT && m.hospitalRoute && isSelected && (
                   <Polyline 
                     coordinates={m.hospitalRoute} 
                     strokeColor="#00E676" 
                     strokeWidth={6} 
                     shadowColor="#00E676"
                     shadowOffset={{ width: 0, height: 0 }}
                     shadowOpacity={1}
                     shadowRadius={6}
                   />
                 )}

                 {/* Incident marker */}
                 {m.incidentCoords && (
                   <Marker coordinate={m.incidentCoords} anchor={{ x: 0.5, y: 0.5 }} opacity={isSelected ? 1 : 0.4}>
                     {patientPickedUp ? (
                       <View style={[s.markerCircle, { backgroundColor: '#00E676' }]}>
                         <Ionicons name="checkmark" size={14} color="#FFF" />
                       </View>
                     ) : (
                       <Animated.View style={[s.markerPulse, { opacity: isSelected ? pulseOpacity : 0.8 }]}>
                         <View style={[s.markerCircle, { backgroundColor: '#FF1744' }]}>
                           <Ionicons name="flame" size={14} color="#FFF" />
                         </View>
                       </Animated.View>
                     )}
                   </Marker>
                 )}

                 {/* Hospital marker */}
                 {m.hospitalCoords && (
                   <Marker coordinate={m.hospitalCoords} anchor={{ x: 0.5, y: 0.5 }} opacity={isSelected ? 1 : 0.4}>
                     {isNearHospital && !isPending ? (
                       <Animated.View style={[s.markerPulse, { transform: [{ scale: isSelected ? hospitalPulse : 1 }] }]}>
                         <View style={[s.markerCircle, { backgroundColor: '#00E676' }]}>
                           <Ionicons name="business" size={14} color="#FFF" />
                         </View>
                       </Animated.View>
                     ) : (
                       <View style={[s.markerCircle, { backgroundColor: '#00C853' }]}>
                         <Ionicons name="business" size={14} color="#FFF" />
                       </View>
                     )}
                   </Marker>
                 )}

                 {/* Ambulance marker */}
                 <Marker coordinate={m.ambulancePos} flat rotation={m.bearing} anchor={{ x: 0.5, y: 0.5 }} opacity={isSelected ? 1 : 0.5} zIndex={isSelected ? 100 : 10}>
                   <View style={[s.ambMarker, !isSelected && {borderColor: '#888'}]}>
                     <Text style={{ fontSize: 24 }}>🚑</Text>
                   </View>
                 </Marker>
               </React.Fragment>
             );
          })}
        </MapView>

        {selectedMission && (
           <View style={s.headerChip}>
             <View style={[s.statusDot, { backgroundColor: STATE_COLORS[selectedMission.phase] || '#888' }]} />
             <Text style={s.headerText}>{STATE_LABELS[selectedMission.phase] || selectedMission.phase}</Text>
           </View>
        )}
      </View>

      {/* ── SLIDING BOTTOM SHEET ─────────────────────────────── */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {missionKeys.length > 0 && (
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16, flexGrow: 0}}>
              {missionKeys.map(id => {
                 const m = missions[id];
                 const isSelected = selectedIncidentId === id;
                 return (
                    <TouchableOpacity 
                       key={id} 
                       style={[s.tabBtn, isSelected && s.tabBtnActive]}
                       onPress={() => setSelectedIncidentId(id)}
                    >
                       <Text style={[s.tabBtnText, isSelected && s.tabBtnTextActive]}>{id}</Text>
                       <Text style={{color: '#888', fontSize: 10, marginTop: 4}}>{m.status.toUpperCase()}</Text>
                    </TouchableOpacity>
                 )
              })}
           </ScrollView>
        )}

        <ScrollView style={{maxHeight: SCREEN_HEIGHT * 0.4}}>
          {selectedMission && selectedMission.status === 'pending' && (
            <View>
              <View style={s.rowCenter}>
                <View style={s.redDot} />
                <Text style={s.dispatchTitle}>🚨 INCOMING EMERGENCY DISPATCH</Text>
              </View>

              <View style={s.twoCol}>
                <View>
                  <Text style={s.subLabel}>📍 Pickup</Text>
                  <Text style={s.subVal}>{selectedMission.incidentArea}</Text>
                </View>
                <View>
                  <Text style={s.subLabel}>🏥 Drop-off</Text>
                  <Text style={s.subVal} numberOfLines={1}>{selectedMission.hospitalName}</Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.specGrid}>
                <Text style={s.spec}>👥 Victims: <Text style={s.specVal}>3 Heatstroke</Text></Text>
                <Text style={s.spec}>🛏️ Beds: <Text style={[s.specVal, { color: '#00E676' }]}>{selectedMission.bedsAvailable} ✓</Text></Text>
                <Text style={s.spec}>📏 Distance: <Text style={s.specVal}>~{(getDistanceKm(selectedMission.hospitalCoords, selectedMission.incidentCoords)).toFixed(1)} km</Text></Text>
                <Text style={s.spec}>⏱️ ETA: <Text style={s.specVal}>~{Math.round((getDistanceKm(selectedMission.hospitalCoords, selectedMission.incidentCoords) / 40) * 60)} min</Text></Text>
              </View>

              <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(selectedMission.incidentId)}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={s.acceptText}>ACCEPT DISPATCH</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedMission && selectedMission.status === 'accepted' && selectedMission.phase !== STATES.COMPLETED && (
            <View>
              <View style={s.missionHeader}>
                <Text style={s.missionBadge}>DEPLOYMENT ACTIVE</Text>
                <View style={[s.phasePill, { backgroundColor: STATE_COLORS[selectedMission.phase] || '#888' }]}>
                  <Text style={s.phasePillText}>{selectedMission.phase.replace(/_/g, ' ')}</Text>
                </View>
              </View>

              <Text style={s.missionInfo}>
                🏥 <Text style={s.missionVal}>{selectedMission.hospitalName}</Text>
              </Text>
              <Text style={s.missionInfo}>
                🛏️ Beds Secured: <Text style={[s.missionVal, { color: '#00E676' }]}>{selectedMission.bedsAvailable} ✓</Text>
              </Text>

              {selectedMission.countdown && (
                <View style={s.timerBox}>
                  <Ionicons name="timer-outline" size={18} color="#FF6F00" />
                  <Text style={s.timerLabel}> Transport Countdown: </Text>
                  <Text style={s.timerVal}>{selectedMission.countdown}</Text>
                </View>
              )}

              <View style={s.progressWrap}>
                <View style={[s.progressFill, { width: `${selectedMission.progress}%` }]} />
                <Text style={s.progressTxt}>{selectedMission.progress}%</Text>
              </View>

              <View style={s.divider} />

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
                    style={[s.checkBtn, selectedMission.phase === b.id && { backgroundColor: STATE_COLORS[selectedMission.phase] || '#888', borderColor: STATE_COLORS[selectedMission.phase] || '#888' }]}
                    onPress={() => handleManualStatus(selectedMission.incidentId, b.id)}
                  >
                    <Text style={s.checkBtnTxt}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedMission && selectedMission.phase === STATES.COMPLETED && (
            <View style={s.statsBox}>
               <Ionicons name="checkmark-circle" size={48} color="#00E676" />
               <Text style={s.completeTitle}>✓ MISSION COMPLETE</Text>
               <Text style={s.livesText}>🫀 {selectedMission.livesSecured} Lives Secured</Text>
               <Text style={s.statRow}>Hospital: {selectedMission.hospitalName}</Text>
               <Text style={s.statRow}>Patients Delivered: 3</Text>
               <Text style={s.statRow}>Beds Updated in System: ✓</Text>
               <TouchableOpacity style={[s.standbyBtn, {marginTop: 16}]} onPress={() => handleStandby(selectedMission.incidentId)}>
                 <Text style={s.standbyTxt}>Close & Return to Standby</Text>
               </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </Animated.View>

      {/* Idle state */}
      {missionKeys.length === 0 && (
        <View style={s.idleCard}>
          <Ionicons name="radio" size={44} color="#FF6F00" />
          <Text style={s.idleTitle}>Standing By...</Text>
          <Text style={s.idleSub}>Tactical Dispatch Link Active — Listening for crisis incidents</Text>
        </View>
      )}

    </View>
  );
}

// ── STYLES ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#090A0E' },
  mapWrap:      { height: SCREEN_HEIGHT * 0.62, position: 'relative' },
  map:          { flex: 1 },
  headerChip:   {
    position: 'absolute', top: 48, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(18,19,28,0.95)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#2E324A',
  },
  statusDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  headerText:   { color: '#FFF', fontSize: 13, fontWeight: '700' },
  markerPulse:  { justifyContent: 'center', alignItems: 'center', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,23,68,0.2)' },
  markerCircle: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  ambMarker:    { backgroundColor: '#12131C', padding: 4, borderRadius: 99, borderWidth: 2, borderColor: '#00E5FF', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },

  // Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#11121A', borderTopLeftRadius: 22,
    borderTopRightRadius: 22, borderWidth: 1, borderColor: '#23263B',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30,
  },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1A1C28', borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#2E324A' },
  tabBtnActive: { borderColor: '#FF6F00', backgroundColor: '#3A2612' },
  tabBtnText: { color: '#7E8299', fontWeight: 'bold' },
  tabBtnTextActive: { color: '#FF6F00' },

  divider:    { height: 1, backgroundColor: '#23263B', marginVertical: 12 },
  rowCenter:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  redDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF1744', marginRight: 10 },
  dispatchTitle: { color: '#FF1744', fontWeight: '700', fontSize: 14 },
  twoCol:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subLabel:      { color: '#7E8299', fontSize: 11, fontWeight: '700' },
  subVal:        { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 2, maxWidth: 160 },
  specGrid:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  spec:          { width: '48%', color: '#7E8299', fontSize: 12, marginBottom: 6 },
  specVal:       { color: '#FFF', fontWeight: '700' },
  acceptBtn:     { backgroundColor: '#FF1744', paddingVertical: 14, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  acceptText:    { color: '#FFF', fontWeight: '700', fontSize: 15 },

  missionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  missionBadge:    { backgroundColor: '#FF6F00', color: '#FFF', fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 10 },
  phasePill:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  phasePillText:   { color: '#FFF', fontSize: 10, fontWeight: '700' },
  missionInfo:     { color: '#7E8299', fontSize: 12, marginBottom: 5 },
  missionVal:      { color: '#FFF', fontWeight: '700' },

  timerBox:   { flexDirection: 'row', alignItems: 'center', marginVertical: 8, backgroundColor: '#1A1C28', padding: 10, borderRadius: 8 },
  timerLabel: { color: '#7E8299', fontSize: 13 },
  timerVal:   { color: '#FF6F00', fontSize: 20, fontWeight: '700', letterSpacing: 2, fontVariant: ['tabular-nums'] },

  progressWrap: { height: 20, backgroundColor: '#1A1C28', borderRadius: 10, overflow: 'hidden', justifyContent: 'center', marginVertical: 4 },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FF6F00' },
  progressTxt:  { alignSelf: 'center', color: '#FFF', fontSize: 11, fontWeight: '700' },

  checkTitle: { color: '#FFF', fontWeight: '700', fontSize: 13, marginBottom: 8 },
  btnGrid:    { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  checkBtn:   { width: '48%', backgroundColor: '#1E2030', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#2E324A' },
  checkBtnTxt:{ color: '#FFF', fontSize: 11, fontWeight: '700' },

  idleCard: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: '#11121A', borderRadius: 14, borderWidth: 1, borderColor: '#23263B', paddingVertical: 32, alignItems: 'center' },
  idleTitle:{ color: '#7E8299', fontSize: 16, fontWeight: '700', marginTop: 10 },
  idleSub:  { color: '#3A3C52', fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20, lineHeight: 16 },

  completeTitle:{ color: '#00E676', fontSize: 20, fontWeight: '700', letterSpacing: 1, marginTop: 10 },
  statsBox:     { alignSelf: 'stretch', backgroundColor: '#090A0E', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#23263B', marginVertical: 20, alignItems: 'center' },
  livesText:    { color: '#FF3D00', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  statRow:      { color: '#7E8299', fontSize: 12, marginBottom: 4 },
  standbyBtn:   { backgroundColor: '#00E676', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  standbyTxt:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

// Premium Navy Custom Map Style for an ultra premium, rich neon tactical look
const PREMIUM_NAVY_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#12131C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E91A1' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#12131C' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#23263B' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#161722' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1D1E2D' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#282B3E' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3B3F5B' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4A4E70' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B0C10' }] }
];
