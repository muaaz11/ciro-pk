import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import io from 'socket.io-client';
import { app_url } from '../url';
import { Ionicons } from '@expo/vector-icons';

export default function AmbulanceScreen({ navigation }) {
  const [activeJob, setActiveJob] = useState(null);
  const [pendingJob, setPendingJob] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [driverStatus, setDriverStatus] = useState('IDLE'); // IDLE, ASSIGNED, AT_INCIDENT, EN_ROUTE_HOSPITAL, COMPLETED
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);

  const karachiRegion = {
    latitude: 24.90,
    longitude: 67.08,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  useEffect(() => {
    // Pulsing animation for the accept button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pendingJob]);

  useEffect(() => {
    const socket = io(app_url);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Driver connected to socket');
      socket.emit('get_active_dispatch');
    });

    socket.on('agent_status', ({ agent, status, data }) => {
      if (agent === 'Planning' && status === 'thinking') {
        setIsPlanning(true);
        setActiveJob(null);
        setPendingJob(null);
      }
      if (agent === 'Planning' && status === 'completed') {
        setIsPlanning(false);
      }
      if (agent === 'Ambulance' && status === 'waiting_acceptance') {
        setIsPlanning(false);
        const routeInfo = data?.hospital_routing || {};
        const recommendation = routeInfo.recommendation || "Agakhan University Hospital";
        const targetActions = data?.response_plan?.actions?.[0] || {};

        setPendingJob({
          hospitalName: recommendation,
          instruction: targetActions.instruction || "Proceed immediately to retrieve patient.",
          reasoning: routeInfo.reasoning || "Balanced load to available beds.",
          bedsAvailable: routeInfo.emergency_beds_available || 15,
          incidentCoords: data.incident_coords || { latitude: 24.92, longitude: 67.09 },
          hospitalCoords: data.hospital_coords || { latitude: 24.8765, longitude: 67.0689 }
        });
      }
    });

    socket.on('simulation_tick', ({ step, progress, ambulance_position, incident_position, hospital_position, hospital_name }) => {
      // Update coordinates
      setActiveJob(prev => {
        if (!prev) return null;
        return {
          ...prev,
          incidentCoords: incident_position,
          hospitalCoords: hospital_position,
          hospitalName: hospital_name,
          currentPos: ambulance_position
        };
      });
    });

    return () => socket.disconnect();
  }, []);

  const handleAcceptJob = () => {
    if (socketRef.current && pendingJob) {
      socketRef.current.emit('accept_dispatch');
      setActiveJob(pendingJob);
      setPendingJob(null);
      setDriverStatus('ASSIGNED');

      // Programmatically navigate back to trace to watch the agents execute
      Alert.alert("Dispatch Accepted!", "Proceeding with ambulance deployment...");
      setTimeout(() => {
        navigation.navigate('AgentTrace');
      }, 1000);
    }
  };

  const handleStatusPress = (status) => {
    setDriverStatus(status);
    if (status === 'COMPLETED') {
      Alert.alert(
        "Mission Completed!",
        "Ambulance reported delivered. All victims successfully checked in at Aga Khan University Hospital. Resetting terminal to Standby.",
        [{ text: "OK" }]
      );
      setTimeout(() => {
        setActiveJob(null);
        setPendingJob(null);
        setDriverStatus('IDLE');
      }, 4000); // 4-second delay to show final standby transition
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>Tactical Ambulance Terminal</Text>

      {/* Case 1: Agent is currently calling hospitals */}
      {isPlanning && (
        <View style={styles.callingCard}>
          <ActivityIndicator size="large" color="#FFEB3B" style={{ marginBottom: 16 }} />
          <Text style={styles.callingTitle}>TACTICAL AGENT DISPATCH IN PROGRESS</Text>
          <Text style={styles.callingText}>AI agent is contacting nearest hospitals for real-time bed capacity check...</Text>
          <View style={styles.callingLogs}>
            <Text style={styles.logLine}>» PING: Liaquat National Hospital... 0 BEDS (REJECTED)</Text>
            <Text style={styles.logLine}>» PING: Agakhan University Hospital... Checking...</Text>
          </View>
        </View>
      )}

      {/* Case 2: Dispatch request received, awaiting driver confirmation */}
      {pendingJob && !activeJob && (
        <View style={styles.incomingCard}>
          <View style={styles.incomingHeader}>
            <View style={styles.pulseDot} />
            <Text style={styles.incomingHeaderTitle}>🚨 INCOMING EMERGENCY DISPATCH</Text>
          </View>

          <Text style={styles.patientTitle}>Victim Details:</Text>
          <Text style={styles.patientText}>3 Heatstroke Victims reported collapsed near Gulshan Chowrangi.</Text>

          <View style={styles.divider} />

          <View style={styles.incomingRow}>
            <Text style={styles.label}>AI Rerouting Action:</Text>
            <Text style={[styles.value, { color: '#FFEB3B' }]}>{pendingJob.instruction}</Text>
          </View>

          <View style={styles.incomingRow}>
            <Text style={styles.label}>Hospital Routed:</Text>
            <Text style={styles.value}>{pendingJob.hospitalName}</Text>
          </View>

          <View style={styles.incomingRow}>
            <Text style={styles.label}>Bed Verification Status:</Text>
            <Text style={[styles.value, { color: '#4CAF50' }]}>✓ SECURED ({pendingJob.bedsAvailable} available)</Text>
          </View>

          <Text style={styles.incomingReason}>AI Logic: Nearest hospital Liaquat was rejected due to 0% capacity (fully packed). Patient redirected to Aga Khan which has 15 open beds.</Text>

          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 20 }}>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptJob}>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.acceptButtonText}>ACCEPT DISPATCH DISPATCH</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Case 3: Job in progress (ambulance moving) */}
      {activeJob && (
        <View>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.jobBadge}>DEPLOYMENT ACTIVE</Text>
              <Text style={[styles.statusBadge, 
                driverStatus === 'ASSIGNED' && { backgroundColor: '#FF9800' },
                driverStatus === 'AT_INCIDENT' && { backgroundColor: '#FF5722' },
                driverStatus === 'EN_ROUTE_HOSPITAL' && { backgroundColor: '#2196F3' },
                driverStatus === 'COMPLETED' && { backgroundColor: '#4CAF50' }
              ]}>
                {driverStatus.replace('_', ' ')}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Dispatch Instructions:</Text>
            <Text style={styles.instructionText}>"{activeJob.instruction}"</Text>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Destination Hospital:</Text>
              <Text style={styles.value}>{activeJob.hospitalName}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.label}>Capacity Check:</Text>
              <Text style={[styles.value, { color: '#4CAF50' }]}>✓ YES ({activeJob.bedsAvailable} beds)</Text>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={karachiRegion}
              userInterfaceStyle="dark"
            >
              {activeJob.incidentCoords && (
                <Marker coordinate={activeJob.incidentCoords} title="Pickup Point">
                  <Ionicons name="warning" size={24} color="#D32F2F" />
                </Marker>
              )}

              {activeJob.hospitalCoords && (
                <Marker coordinate={activeJob.hospitalCoords} title={activeJob.hospitalName}>
                  <Ionicons name="business" size={24} color="#4CAF50" />
                </Marker>
              )}

              {activeJob.currentPos && (
                <Marker coordinate={activeJob.currentPos} title="My Ambulance">
                  <View style={styles.ambulanceMarker}>
                    <Ionicons name="medical" size={14} color="#FFF" />
                  </View>
                </Marker>
              )}

              {activeJob.hospitalCoords && activeJob.incidentCoords && (
                <Polyline
                  coordinates={[activeJob.hospitalCoords, activeJob.incidentCoords]}
                  strokeColor="#2196F3"
                  strokeWidth={4}
                />
              )}
            </MapView>
          </View>

          {/* Manual Driver Overrides */}
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Driver Check-In Logs</Text>
            <View style={styles.buttonGrid}>
              <TouchableOpacity 
                style={[styles.actionBtn, driverStatus === 'ASSIGNED' && styles.activeBtn]}
                onPress={() => handleStatusPress('ASSIGNED')}
              >
                <Text style={styles.btnText}>Heading to Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, driverStatus === 'AT_INCIDENT' && styles.activeBtn]}
                onPress={() => handleStatusPress('AT_INCIDENT')}
              >
                <Text style={styles.btnText}>Arrived at Scene</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, driverStatus === 'EN_ROUTE_HOSPITAL' && styles.activeBtn]}
                onPress={() => handleStatusPress('EN_ROUTE_HOSPITAL')}
              >
                <Text style={styles.btnText}>Transporting Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, driverStatus === 'COMPLETED' && styles.activeBtn]}
                onPress={() => handleStatusPress('COMPLETED')}
              >
                <Text style={styles.btnText}>Delivered & Available</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Case 4: Standing by */}
      {!isPlanning && !pendingJob && !activeJob && (
        <View style={styles.emptyCard}>
          <Ionicons name="radio-outline" size={54} color="#FF6F00" style={styles.pulseEmpty} />
          <Text style={styles.emptyText}>Standing By...</Text>
          <Text style={styles.subEmptyText}>Tactical Emergency Dispatch Link Active. Listening for crisis incidents...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 16 },
  mainTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 10, textAlign: 'center' },
  card: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  jobBadge: { backgroundColor: '#FF6F00', color: '#FFF', fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 11 },
  statusBadge: { color: '#FFF', fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 11 },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  instructionText: { color: '#FFEB3B', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: '#888888', fontSize: 14 },
  value: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  mapContainer: { height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#333' },
  map: { width: '100%', height: '100%' },
  ambulanceMarker: { backgroundColor: '#2196F3', padding: 5, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFF' },
  actionsCard: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 30, borderWidth: 1, borderColor: '#333' },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: { width: '48%', backgroundColor: '#222', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  activeBtn: { backgroundColor: '#FF6F00', borderColor: '#FF9800' },
  btnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  emptyCard: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40, borderWidth: 1, borderColor: '#222' },
  emptyText: { color: '#888888', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  subEmptyText: { color: '#555', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  callingCard: { backgroundColor: '#1A1500', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#FFEB3B', marginTop: 20 },
  callingTitle: { color: '#FFEB3B', fontWeight: 'bold', fontSize: 14, marginTop: 8, marginBottom: 6, textAlign: 'center' },
  callingText: { color: '#FFE082', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  callingLogs: { alignSelf: 'stretch', backgroundColor: '#000', padding: 12, borderRadius: 6 },
  logLine: { color: '#00FF00', fontFamily: 'monospace', fontSize: 11, marginBottom: 4 },
  incomingCard: { backgroundColor: '#1A0B0B', borderRadius: 12, padding: 20, borderWidth: 1.5, borderColor: '#D32F2F', marginTop: 10 },
  incomingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D32F2F', marginRight: 10 },
  incomingHeaderTitle: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
  patientTitle: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  patientText: { color: '#FFF', fontSize: 14, marginTop: 4, fontWeight: 'bold' },
  incomingRow: { marginBottom: 10 },
  incomingReason: { color: '#AAA', fontSize: 12, fontStyle: 'italic', lineHeight: 16, marginTop: 10 },
  acceptButton: { backgroundColor: '#D32F2F', padding: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  acceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
