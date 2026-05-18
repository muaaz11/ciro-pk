import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import io from 'socket.io-client';
import { app_url } from '../url';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

export default function AgentTraceScreen({ route, navigation }) {
  const [incidents, setIncidents] = useState({});
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  useEffect(() => {
    // Poll for the latest trace for all tracked incidents
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${app_url}/api/crisis/overview`);
        if (res.ok) {
           const overview = await res.json();
           const activeCrises = overview.active_crises || [];
           
           setIncidents(prev => {
              const updated = { ...prev };
              let changed = false;
              
              for (const crisis of activeCrises) {
                 if (!updated[crisis.id]) {
                    updated[crisis.id] = createEmptyIncident();
                    changed = true;
                 }
                 updated[crisis.id].summary = crisis;
              }
              
              return changed ? updated : prev;
           });

           // Fetch traces for all known incidents
           for (const crisis of activeCrises) {
              const traceRes = await fetch(`${app_url}/api/trace/${crisis.id}`);
              if (traceRes.ok) {
                 const tData = await traceRes.json();
                 setIncidents(prev => {
                    const inc = prev[crisis.id] || createEmptyIncident();
                    // only update if different length to avoid rerenders
                    if (!inc.traceData || inc.traceData.length !== tData.antigravity_trace.length) {
                       return { ...prev, [crisis.id]: { ...inc, traceData: tData.antigravity_trace } };
                    }
                    return prev;
                 });
              }
           }
        }
      } catch(e) {
        // silently fail during dev
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const createEmptyIncident = () => ({
    logs: { detection: null, planning: null, execution: null },
    status: { detection: 'idle', planning: 'idle', execution: 'idle' },
    simProgress: 0,
    simSteps: [],
    waitAccept: false,
    driverAccept: false,
    planningText: 'Evaluating resources...',
    traceData: [],
    summary: null
  });

  useEffect(() => {
    const socket = io(app_url);

    socket.on('connect', () => {
      console.log('Connected to Orchestrator Socket');
    });

    socket.on('agent_status', ({ incidentId, agent, status: agentStatus, data }) => {
      if (!incidentId) return;

      setIncidents(prev => {
        const incState = prev[incidentId] || createEmptyIncident();

        if (agent === 'Antigravity' && agentStatus === 'thinking') {
           setSelectedIncidentId(incidentId); // Auto-focus new incident
        }

        if (agent === 'Ambulance') {
          if (agentStatus === 'waiting_acceptance') {
            incState.waitAccept = true;
            // Optionally auto navigate if it's the selected one
            if (selectedIncidentId === incidentId || !selectedIncidentId) {
               setTimeout(() => { navigation.navigate('DriverHub'); }, 2500);
            }
          } else if (agentStatus === 'accepted') {
            incState.waitAccept = false;
            incState.driverAccept = true;
          }
        } else {
          const lowerAgent = agent.toLowerCase();
          if (incState.status[lowerAgent] !== undefined) {
             incState.status[lowerAgent] = agentStatus;
          }
          if (agentStatus === 'completed' && data) {
            incState.logs[lowerAgent] = data;
          }
        }

        return { ...prev, [incidentId]: { ...incState } };
      });
    });

    socket.on('simulation_tick', ({ incidentId, step, progress }) => {
      if (!incidentId) return;

      setIncidents(prev => {
        if (!prev[incidentId]) return prev;
        const incState = { ...prev[incidentId] };
        incState.simProgress = progress;

        let customLog = "";
        if (progress < 20) {
          customLog = `» [DEPLOYED] Ambulance dispatched from standby station. Routing to incident coords.`;
        } else if (progress >= 20 && progress < 55) {
          customLog = `» [ON_SCENE] Ambulance arrived at incident scene. Stabilized and loaded victims.`;
        } else if (progress >= 55 && progress < 85) {
          customLog = `» [EN_ROUTE] Moving en route. AI balancing traffic logs to hospital.`;
        } else if (progress >= 85 && progress < 100) {
          customLog = `» [APPROACHING] Ambulance approaching emergency driveway. Admissions desk alerted.`;
        } else if (progress === 100) {
          customLog = `» [COMPLETED] Reached Hospital! All victims admitted into secured emergency beds successfully.`;
        }

        if (!incState.simSteps.includes(customLog) && customLog) {
           incState.simSteps = [...incState.simSteps, customLog];
        }

        return { ...prev, [incidentId]: incState };
      });
    });

    return () => socket.disconnect();
  }, [navigation, selectedIncidentId]);

  // Dynamic hospital calling simulation
  useEffect(() => {
    if (!selectedIncidentId) return;
    const selectedInc = incidents[selectedIncidentId];
    if (!selectedInc || selectedInc.status.planning !== 'thinking') return;

    const dialogue = [
      { text: "System. Initiating urgent medical sweep. Calling nearest facility.", statusText: "Contacting nearest facility...", pitch: 1.1, rate: 0.95 },
      { text: "This is Liaquat National. We are fully occupied due to heatstroke influx.", statusText: "Liaquat National: 0 Emergency Beds Available. REJECTED.", pitch: 0.85, rate: 0.95 },
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
        
        setIncidents(prev => {
           if (!prev[selectedIncidentId]) return prev;
           return { ...prev, [selectedIncidentId]: { ...prev[selectedIncidentId], planningText: phrase.statusText } };
        });

        Speech.speak(phrase.text, {
          pitch: phrase.pitch,
          rate: phrase.rate,
          onDone: () => {
            if (!active) return;
            currentIdx++;
            setTimeout(playNext, 1200);
          },
          onError: (err) => {
            console.log("Speech Error:", err);
            if (!active) return;
            currentIdx++;
            setTimeout(playNext, 2500);
          }
        });
      }
    };

    playNext();

    return () => {
      active = false;
      Speech.stop();
    };
  }, [selectedIncidentId, incidents[selectedIncidentId]?.status?.planning]);

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

  const incidentKeys = Object.keys(incidents).sort((a, b) => b.localeCompare(a)); // sort desc
  if (!selectedIncidentId && incidentKeys.length > 0) {
      setSelectedIncidentId(incidentKeys[0]);
  }

  const activeInc = selectedIncidentId ? incidents[selectedIncidentId] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>Multi-Incident AI Trace</Text>

      {/* --- INCIDENT SELECTION TABS --- */}
      {incidentKeys.length > 0 && (
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0, marginBottom: 16}}>
            {incidentKeys.map(id => {
               const inc = incidents[id];
               const isSelected = selectedIncidentId === id;
               return (
                  <TouchableOpacity 
                     key={id} 
                     style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                     onPress={() => setSelectedIncidentId(id)}
                  >
                     <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>{id}</Text>
                     <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                        <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: inc.summary?.severity === 'CRITICAL' ? '#D32F2F' : inc.summary?.severity === 'HIGH' ? '#FF9800' : '#4CAF50', marginRight: 4}} />
                        <Text style={{color: '#888', fontSize: 10}}>{inc.summary?.status || 'ACTIVE'}</Text>
                     </View>
                  </TouchableOpacity>
               )
            })}
         </ScrollView>
      )}

      {incidentKeys.length === 0 && (
         <Text style={{color: '#888', textAlign: 'center', marginTop: 50}}>No active incidents. Trigger a demo to begin.</Text>
      )}

      <ScrollView style={{flex: 1}}>
        {activeInc && (
          <>
            <Card title="Detection Agent" agentStatus={activeInc.status.detection}>
              {activeInc.status.detection === 'thinking' ? (
                <Text style={styles.bodyText}>Cross-referencing signals with live weather data...</Text>
              ) : activeInc.logs.detection ? (
                <View>
                  {activeInc.logs.detection.weather_context && (
                    <View style={styles.weatherBadge}>
                      <Ionicons name="thermometer-outline" size={16} color="#FF6F00" />
                      <Text style={styles.weatherText}>
                        Live Karachi Temp: {activeInc.logs.detection.weather_context.temperature_celsius}°C ({activeInc.logs.detection.weather_context.description})
                      </Text>
                    </View>
                  )}
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Crisis Detected:</Text>
                    <Text style={[styles.value, !activeInc.logs.detection.crisis_detected && { color: '#888' }]}>{activeInc.logs.detection.crisis_detected ? 'YES' : 'NO'}</Text>
                  </View>
                  {activeInc.logs.detection.crisis_detected && (
                    <View style={styles.rowBetween}>
                      <Text style={styles.label}>Severity:</Text>
                      <Text style={[styles.value, { color: '#D32F2F' }]}>{activeInc.logs.detection.severity}</Text>
                    </View>
                  )}
                  <Text style={styles.summaryTitle}>AI Reasoning:</Text>
                  <Text style={styles.summaryText}>{activeInc.logs.detection.reasoning}</Text>
                </View>
              ) : null}
            </Card>

            <Card title="Planning Agent" agentStatus={activeInc.status.planning}>
              {activeInc.status.planning === 'thinking' ? (
                <View>
                  <ActivityIndicator size="small" color="#FFEB3B" style={{ marginBottom: 10, alignSelf: 'flex-start' }} />
                  <Text style={[styles.bodyText, { color: '#FFEB3B', fontWeight: 'bold' }]}>{activeInc.planningText}</Text>
                </View>
              ) : activeInc.logs.planning ? (
                <View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Priority:</Text>
                    <Text style={[styles.value, { color: '#FF6F00' }]}>{activeInc.logs.planning.response_plan?.priority || 'IMMEDIATE'}</Text>
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
                  <Text style={styles.summaryText}>{activeInc.logs.planning.hospital_routing?.reasoning}</Text>

                  {activeInc.waitAccept && (
                    <View style={styles.acceptanceAlert}>
                      <Ionicons name="alarm" size={24} color="#FFEB3B" style={styles.alertIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>Awaiting Driver Acceptance</Text>
                        <Text style={styles.alertText}>Tactical dispatch coordinates sent to Driver Hub. Redirecting to Driver tab...</Text>
                      </View>
                    </View>
                  )}

                  {activeInc.driverAccept && (
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

            <Card title="Execution Simulator" agentStatus={activeInc.status.execution}>
              {activeInc.status.execution === 'thinking' ? (
                <Text style={styles.bodyText}>Preparing simulation parameters...</Text>
              ) : activeInc.status.execution === 'simulating' || activeInc.status.execution === 'completed' ? (
                <View>
                  <Text style={styles.summaryTitle}>Live Actions:</Text>
                  {activeInc.simSteps.map((step, i) => (
                    <Text key={i} style={styles.simulationText}>{step}</Text>
                  ))}
                  {activeInc.simProgress > 0 && activeInc.simProgress < 100 && (
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${activeInc.simProgress}%` }]} />
                    </View>
                  )}
                  {activeInc.status.execution === 'completed' && activeInc.logs.execution && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.summaryTitle}>Final Impact:</Text>
                      <Text style={styles.successText}>✓ {activeInc.logs.execution.incident_report?.estimated_lives_impacted} lives secured.</Text>
                      <Text style={styles.successText}>✓ {activeInc.logs.execution.incident_report?.actions_taken} total actions taken.</Text>
                      
                      {activeInc.logs.execution.impact_metrics && (
                        <View style={{ marginTop: 16 }}>
                          <Text style={styles.summaryTitle}>Outcome Impact Metrics:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                            <View style={{ backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, width: '48%', marginBottom: 12, borderWidth: 1, borderColor: '#333' }}>
                              <Text style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Traffic Congestion</Text>
                              <Text style={{ color: '#D32F2F', fontSize: 13, textDecorationLine: 'line-through' }}>{activeInc.logs.execution.impact_metrics.traffic_congestion?.before}</Text>
                              <Text style={{ color: '#4CAF50', fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>→ {activeInc.logs.execution.impact_metrics.traffic_congestion?.after}</Text>
                            </View>
                            
                            <View style={{ backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, width: '48%', marginBottom: 12, borderWidth: 1, borderColor: '#333' }}>
                              <Text style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Hospital Load</Text>
                              <Text style={{ color: '#D32F2F', fontSize: 13, textDecorationLine: 'line-through' }}>{activeInc.logs.execution.impact_metrics.hospital_load?.before}</Text>
                              <Text style={{ color: '#4CAF50', fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>→ {activeInc.logs.execution.impact_metrics.hospital_load?.after}</Text>
                            </View>

                            <View style={{ backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, width: '48%', marginBottom: 12, borderWidth: 1, borderColor: '#333' }}>
                              <Text style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Time Saved</Text>
                              <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: 'bold' }}>{activeInc.logs.execution.impact_metrics.estimated_response_time_saved}</Text>
                            </View>

                            <View style={{ backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, width: '48%', marginBottom: 12, borderWidth: 1, borderColor: '#333' }}>
                              <Text style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Lives Improvement</Text>
                              <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: 'bold' }}>+{activeInc.logs.execution.impact_metrics.lives_impacted_improvement}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : null}
            </Card>

            {/* --- AI REASONING TIMELINE --- */}
            {activeInc.traceData && activeInc.traceData.length > 0 && (
              <View style={{ marginTop: 20, marginBottom: 30 }}>
                <Text style={styles.mainTitle}>Step-by-Step AI Reasoning</Text>
                <View style={{ paddingLeft: 10 }}>
                  {activeInc.traceData.map((node, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 20 }}>
                      <View style={{ width: 20, alignItems: 'center', marginRight: 10 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#D32F2F', zIndex: 1 }} />
                        {i !== activeInc.traceData.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#333', marginTop: -2, marginBottom: -4 }} />}
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginTop: -4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{node.agent} Agent</Text>
                          <Text style={{ color: '#AAA', fontSize: 10 }}>{new Date(node.timestamp).toLocaleTimeString()}</Text>
                        </View>
                        <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 12, marginBottom: 6 }}>{node.decision}</Text>
                        <Text style={{ color: '#CCC', fontSize: 12, fontStyle: 'italic' }}>{node.reasoning}</Text>
                        {node.confidence && <Text style={{ color: '#888', fontSize: 10, marginTop: 6, textAlign: 'right' }}>Confidence: {node.confidence}%</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 16 },
  mainTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1A1A1A', borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#333' },
  tabBtnActive: { borderColor: '#FF6F00', backgroundColor: '#331B00' },
  tabBtnText: { color: '#888', fontWeight: 'bold' },
  tabBtnTextActive: { color: '#FF6F00' },
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
