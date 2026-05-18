import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import io from 'socket.io-client';
import { app_url } from '../url';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

export default function AgentTraceScreen({ route, navigation }) {
  const [logs, setLogs] = useState({ detection: null, planning: null, execution: null });
  const [status, setStatus] = useState({ detection: 'idle', planning: 'idle', execution: 'idle' });
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simSteps, setSimSteps] = useState([]);
  const [waitingAcceptance, setWaitingAcceptance] = useState(false);
  const [driverAccepted, setDriverAccepted] = useState(false);
  const [planningSubtext, setPlanningSubtext] = useState('Evaluating resources...');

  useEffect(() => {
    const socket = io(app_url);

    socket.on('connect', () => {
      console.log('Connected to Orchestrator Socket');
      if (route.params?.triggerSignal) {
        const { mockTemp, areaName, coords } = route.params.triggerSignal;
        navigation.setParams({ triggerSignal: null });
        
        fetch(`${app_url}/api/signals/inject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `3 people collapsed near ${areaName}`,
            location_mentioned: areaName,
            signal_type: 'heatstroke_case',
            source: 'app_demo',
            mock_temperature: mockTemp,
            latitude: coords.latitude,
            longitude: coords.longitude
          })
        }).catch(err => console.error("Signal injection failed:", err));
      }
    });

    socket.on('agent_status', ({ agent, status: agentStatus, data }) => {
      if (agent === 'Detection' && agentStatus === 'thinking') {
        // A fresh demo scenario has been triggered! Reset all states programmatically
        setLogs({ detection: null, planning: null, execution: null });
        setStatus({ detection: 'thinking', planning: 'idle', execution: 'idle' });
        setSimulationProgress(0);
        setSimSteps([]);
        setWaitingAcceptance(false);
        setDriverAccepted(false);
        return;
      }

      if (agent === 'Ambulance') {
        if (agentStatus === 'waiting_acceptance') {
          setWaitingAcceptance(true);
          setTimeout(() => {
            navigation.navigate('DriverHub');
          }, 2500); // 2.5s delay to allow judge to read the transition
        } else if (agentStatus === 'accepted') {
          setWaitingAcceptance(false);
          setDriverAccepted(true);
        }
      } else {
        const lowerAgent = agent.toLowerCase();
        setStatus(prev => ({ ...prev, [lowerAgent]: agentStatus }));

        if (agentStatus === 'completed' && data) {
          setLogs(prev => ({ ...prev, [lowerAgent]: data }));
        }
      }
    });

    socket.on('simulation_tick', ({ step, progress }) => {
      setSimulationProgress(progress);

      // Dynamic visual logs completely synchronized with map coordinates & progress!
      let customLog = "";
      if (progress < 20) {
        customLog = `» [DEPLOYED] Ambulance dispatched from standby station. Routing to incident coords.`;
      } else if (progress >= 20 && progress < 55) {
        customLog = `» [ON_SCENE] Ambulance arrived at Gulshan Chowrangi. Stabilized and loaded 3 victims.`;
      } else if (progress >= 55 && progress < 85) {
        customLog = `» [EN_ROUTE] Moving en route. AI balancing traffic logs to Agakhan University Hospital.`;
      } else if (progress >= 85 && progress < 100) {
        customLog = `» [APPROACHING] Ambulance approaching emergency driveway. Admissions desk alerted.`;
      } else if (progress === 100) {
        customLog = `» [COMPLETED] Reached Hospital! All victims admitted into secured emergency beds successfully.`;
      }

      setSimSteps(prev => {
        if (prev.includes(customLog)) return prev;
        return [...prev, customLog];
      });
    });

    return () => socket.disconnect();
  }, [navigation]);

  // Dynamic hospital calling simulation with synchronized Expo Speech voice synthesis!
  useEffect(() => {
    if (status.planning === 'thinking') {
      const dialogue = [
        { text: "System. Initiating urgent medical sweep. Calling nearest facility, Liaquat National Hospital.", statusText: "Contacting nearest: Liaquat National Hospital...", pitch: 1.1, rate: 0.95 },
        { text: "This is Liaquat National. We are fully occupied due to heatstroke influx. Zero emergency beds available today.", statusText: "Liaquat National: 0 Emergency Beds Available. REJECTED.", pitch: 0.85, rate: 0.95 },
        { text: "Alert. Zero beds. Re-routing call to Aga Khan University Hospital.", statusText: "Contacting next nearest: Aga Khan University Hospital...", pitch: 1.1, rate: 0.95 },
        { text: "Aga Khan Admissions. Affirmative, we have fifteen emergency beds available. Securing capacity.", statusText: "Aga Khan University: 15 Emergency Beds Available. SECURED.", pitch: 0.9, rate: 0.95 },
        { text: "Capacity confirmed. Fifteen beds locked. Dispatching tactical ambulance immediately.", statusText: "Finalizing load-balanced tactical routing...", pitch: 1.1, rate: 0.95 }
      ];

      let currentIdx = 0;
      let active = true;

      const playNext = () => {
        if (!active) return;
        if (currentIdx < dialogue.length) {
          const phrase = dialogue[currentIdx];
          setPlanningSubtext(phrase.statusText);

          Speech.speak(phrase.text, {
            pitch: phrase.pitch,
            rate: phrase.rate,
            onDone: () => {
              if (!active) return;
              currentIdx++;
              setTimeout(playNext, 1200); // 1.2s delay between spoken turns for realism
            },
            onError: (err) => {
              console.log("Speech Error, falling back to simulated ticks:", err);
              if (!active) return;
              currentIdx++;
              setTimeout(playNext, 2500); // Auto advance fallback
            }
          });
        }
      };

      // Kickoff speech dialogue
      playNext();

      return () => {
        active = false;
        Speech.stop();
      };
    }
  }, [status.planning]);

  const getStatusIcon = (agentStatus) => {
    if (agentStatus === 'thinking' || agentStatus === 'simulating') return <ActivityIndicator size="small" color="#FFEB3B" />;
    if (agentStatus === 'completed') return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
    if (agentStatus === 'skipped') return <Ionicons name="close-circle" size={20} color="#888888" />;
    return <Ionicons name="time" size={20} color="#888888" />;
  };

  const getStatusText = (agentStatus, baseName) => {
    if (agentStatus === 'idle') return 'Waiting...';
    if (agentStatus === 'thinking') return `Analyzing...`;
    if (agentStatus === 'simulating') return `Simulating...`;
    if (agentStatus === 'completed') return `${baseName} Complete`;
    if (agentStatus === 'skipped') return `Skipped`;
    return agentStatus;
  };

  const Card = ({ title, agentStatus, children }) => (
    <View style={[styles.card, { borderColor: agentStatus === 'completed' ? '#4CAF50' : agentStatus === 'thinking' || agentStatus === 'simulating' ? '#FFEB3B' : agentStatus === 'skipped' ? '#555' : '#333' }]}>
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          {getStatusIcon(agentStatus)}
          <Text style={[styles.cardTitle, agentStatus === 'skipped' && { color: '#888' }]}>{title}</Text>
        </View>
        <Text style={styles.statusText}>{getStatusText(agentStatus, title)}</Text>
      </View>
      {agentStatus !== 'idle' && agentStatus !== 'skipped' && (
        <View style={styles.cardBody}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>AI Orchestrator Trace</Text>

      <Card title="Detection Agent" agentStatus={status.detection}>
        {status.detection === 'thinking' ? (
          <Text style={styles.bodyText}>Cross-referencing signals with live weather data...</Text>
        ) : logs.detection ? (
          <View>
            {logs.detection.weather_context && (
              <View style={styles.weatherBadge}>
                <Ionicons name="thermometer-outline" size={16} color="#FF6F00" />
                <Text style={styles.weatherText}>
                  Live Karachi Temp: {logs.detection.weather_context.temperature_celsius}°C ({logs.detection.weather_context.description})
                </Text>
              </View>
            )}
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Crisis Detected:</Text>
              <Text style={[styles.value, !logs.detection.crisis_detected && { color: '#888' }]}>{logs.detection.crisis_detected ? 'YES' : 'NO'}</Text>
            </View>
            {logs.detection.crisis_detected && (
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Severity:</Text>
                <Text style={[styles.value, { color: '#D32F2F' }]}>{logs.detection.severity}</Text>
              </View>
            )}
            <Text style={styles.summaryTitle}>AI Reasoning:</Text>
            <Text style={styles.summaryText}>{logs.detection.reasoning}</Text>
          </View>
        ) : null}
      </Card>

      <Card title="Planning Agent" agentStatus={status.planning}>
        {status.planning === 'thinking' ? (
          <View>
            <ActivityIndicator size="small" color="#FFEB3B" style={{ marginBottom: 10, alignSelf: 'flex-start' }} />
            <Text style={[styles.bodyText, { color: '#FFEB3B', fontWeight: 'bold' }]}>{planningSubtext}</Text>
          </View>
        ) : logs.planning ? (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Priority:</Text>
              <Text style={[styles.value, { color: '#FF6F00' }]}>{logs.planning.response_plan?.priority || 'IMMEDIATE'}</Text>
            </View>

            <View style={[styles.weatherBadge, { backgroundColor: '#1B2E1E', borderColor: '#4CAF50', marginTop: 10 }]}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: 6, fontSize: 12 }}>
                Hospital Load Balanced Successfully
              </Text>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Nearest Liaquat National: <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>0 BEDS AVAILABLE (REJECTED)</Text></Text>
              <Text style={styles.label}>Routed to Agakhan University: <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>15 BEDS AVAILABLE (SECURED)</Text></Text>
            </View>

            <Text style={styles.summaryTitle}>AI Reasoning & Tactical Routing:</Text>
            <Text style={styles.summaryText}>{logs.planning.hospital_routing?.reasoning}</Text>

            {waitingAcceptance && (
              <View style={styles.acceptanceAlert}>
                <Ionicons name="alarm" size={24} color="#FFEB3B" style={styles.alertIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Awaiting Driver Acceptance</Text>
                  <Text style={styles.alertText}>Tactical dispatch coordinates sent to Driver Hub. Redirecting to Driver tab...</Text>
                </View>
              </View>
            )}

            {driverAccepted && (
              <View style={[styles.acceptanceAlert, { backgroundColor: '#1B2E1E', borderColor: '#4CAF50' }]}>
                <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" style={styles.alertIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: '#4CAF50' }]}>Dispatch Accepted!</Text>
                  <Text style={{ color: '#81C784', fontSize: 12 }}>Ambulance driver confirmed the job. Execution Agent commencing route simulation.</Text>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </Card>

      <Card title="Execution Simulator" agentStatus={status.execution}>
        {status.execution === 'thinking' ? (
          <Text style={styles.bodyText}>Preparing simulation parameters...</Text>
        ) : status.execution === 'simulating' || status.execution === 'completed' ? (
          <View>
            <Text style={styles.summaryTitle}>Live Actions:</Text>
            {simSteps.map((step, i) => (
              <Text key={i} style={styles.simulationText}>» [{step.status}] {step.result}</Text>
            ))}
            {simulationProgress > 0 && simulationProgress < 100 && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${simulationProgress}%` }]} />
              </View>
            )}
            {status.execution === 'completed' && logs.execution && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.summaryTitle}>Final Impact:</Text>
                <Text style={styles.successText}>✓ {logs.execution.incident_report?.estimated_lives_impacted} lives secured.</Text>
                <Text style={styles.successText}>✓ {logs.execution.incident_report?.actions_taken} total actions taken.</Text>
              </View>
            )}
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 16 },
  mainTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#1A1A1A', borderRadius: 12, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#222222' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  statusText: { color: '#AAAAAA', fontSize: 12, fontStyle: 'italic' },
  cardBody: { padding: 16 },
  label: { color: '#888888', fontSize: 14 },
  value: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  summaryTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  summaryText: { color: '#CCCCCC', fontSize: 13, lineHeight: 18 },
  bodyText: { color: '#CCCCCC', fontSize: 14, fontStyle: 'italic' },
  listItem: { color: '#AAAAAA', fontSize: 13, marginLeft: 8, marginBottom: 2 },
  simulationText: { color: '#00FF00', fontFamily: 'monospace', fontSize: 12, marginBottom: 4 },
  successText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14, marginTop: 4 },
  progressBarContainer: { height: 6, backgroundColor: '#333', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#4CAF50' },
  weatherBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#331B00', padding: 8, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#FF6F00' },
  weatherText: { color: '#FF6F00', fontWeight: 'bold', marginLeft: 6, fontSize: 12 },
  acceptanceAlert: { flexDirection: 'row', backgroundColor: '#332700', padding: 12, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: '#FFEB3B', alignItems: 'center' },
  alertIcon: { marginRight: 12 },
  alertTitle: { color: '#FFEB3B', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  alertText: { color: '#FFE082', fontSize: 12, lineHeight: 16 }
});
