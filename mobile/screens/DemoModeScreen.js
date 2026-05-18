import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import io from 'socket.io-client';
import { app_url } from '../url';
import { Ionicons } from '@expo/vector-icons';

export default function DemoModeScreen({ navigation }) {
  const [timer, setTimer] = useState(0);
  const [livesSecured, setLivesSecured] = useState(0);
  const [karachiTemp, setKarachiTemp] = useState(44);
  const [terminalText, setTerminalText] = useState('');
  const [stepStatus, setStepStatus] = useState(['pending', 'pending', 'pending', 'pending', 'pending']);
  const [isDemoRunning, setIsDemoRunning] = useState(true);
  const [showReportBtn, setShowReportBtn] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [demoDuration, setDemoDuration] = useState(0);

  const socketRef = useRef(null);
  const typewriterIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const cursorIntervalRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const analysisDataRef = useRef(null);

  // Karachi Mock/Real Weather Fetcher
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${app_url}/api/weather/current`);
        if (res.ok) {
          const data = await res.json();
          setKarachiTemp(data.temperature_celsius || 44);
        }
      } catch (e) {
        console.log('Using fallback Karachi temperature: 44°C');
        setKarachiTemp(44);
      }
    };
    fetchWeather();
  }, []);

  // Blinking Cursor Timer
  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 450);
    return () => clearInterval(cursorIntervalRef.current);
  }, []);

  // Active Timer Count-Up
  useEffect(() => {
    if (isDemoRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isDemoRunning]);

  // WebSocket Connection
  useEffect(() => {
    const socket = io(app_url);
    socketRef.current = socket;

    socket.on('connect', () => console.log('Demo Mode socket connected.'));

    // Listen for real dispatch acceptance if the driver hub is connected
    socket.on('agent_status', ({ agent, status }) => {
      if (agent === 'Ambulance' && status === 'accepted') {
        console.log('Real driver dispatch acceptance caught in Demo Mode!');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Helper function to update step state safely
  const setStepState = (index, statusValue) => {
    setStepStatus((prev) => {
      const updated = [...prev];
      updated[index] = statusValue;
      return updated;
    });
  };

  // Helper Typewriter Effect
  const typewrite = (text) => {
    return new Promise((resolve) => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
      setTerminalText('');
      let idx = 0;
      typewriterIntervalRef.current = setInterval(() => {
        if (idx < text.length) {
          setTerminalText((prev) => prev + text[idx]);
          idx++;
        } else {
          clearInterval(typewriterIntervalRef.current);
          resolve();
        }
      }, 15);
    });
  };

  // Timed Auto-Run Sequence
  // DemoModeScreen.js — useEffect replace karo

  useEffect(() => {
    const socket = io(app_url)
    socketRef.current = socket

    socket.on('connect', () => {
      // Sirf signal inject karo — baaki Orchestrator handle karega
      fetch(`${app_url}/api/signals/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: "3 people collapsed near Gulshan chowrangi, ambulance needed urgently, extreme heat",
          location_mentioned: "Gulshan-e-Iqbal",
          signal_type: "heatstroke_case",
          source: "app_demo",
          mock_temperature: 44,
          latitude: 24.92,
          longitude: 67.09
        })
      })
      // Step 1 complete — signal bheja
      setStepState(0, 'complete')
    })

    // Detection agent
    socket.on('agent_status', ({ agent, status, data }) => {

      if (agent === 'Detection' && status === 'thinking') {
        setStepState(1, 'active')
        typewrite("Analyzing signals...\nWeather: 44°C, humidity 65%\nLocation cluster: Gulshan-e-Iqbal\nChecking vulnerable indicators...")
      }

      if (agent === 'Detection' && status === 'completed') {
        analysisDataRef.current = { detection: data }
        typewrite(data.reasoning || "Crisis assessment complete.")
        setStepState(1, 'complete')
      }

      if (agent === 'Planning' && status === 'thinking') {
        setStepState(2, 'active')
        typewrite("Scanning hospital capacity...\nLiaquat National: checking beds...\nRunning load balancing algorithm...")
      }

      if (agent === 'Planning' && status === 'completed') {
        const routing = data?.response_plan?.hospital_routing || data?.hospital_routing
        if (analysisDataRef.current) {
          analysisDataRef.current.planning = { response_plan: data }
        }
        typewrite(
          `Plan generated.\n` +
          `Priority: ${data?.response_plan?.priority || 'IMMEDIATE'}\n` +
          `Hospital routing: ${routing?.recommendation}\n` +
          `Reason: ${routing?.reasoning}`
        )
        setStepState(2, 'complete')
      }

      if (agent === 'Ambulance' && status === 'waiting_acceptance') {
        setStepState(3, 'active')
        typewrite("Dispatch packet transmitted via WebSocket...\nDriver Hub alerted.\nAwaiting acceptance confirmation...")
      }

      if (agent === 'Ambulance' && status === 'accepted') {
        typewrite("Driver dispatch verified!\nAmbulance deployed. Commencing emergency tracking.")
        setStepState(3, 'complete')
        setStepState(4, 'active')
      }

      if (agent === 'Execution' && status === 'completed') {
        typewrite(
          `Tactical navigation complete.\n` +
          `Patient transported to hospital.\n` +
          `Mission complete.`
        )
        // Lives counter animate karo
        let count = 0
        const interval = setInterval(() => {
          count++
          setLivesSecured(count)
          if (count >= 3) {
            clearInterval(interval)
            setStepState(4, 'complete')
            setIsDemoRunning(false)
            setDemoDuration(timer)
            setShowSuccessBanner(true)
            setShowReportBtn(true)
          }
        }, 300)
      }
    })

    socket.on('simulation_tick', ({ progress }) => {
      typewrite(`Ambulance en route... ${Math.round(progress)}% complete`)
    })

    return () => socket.disconnect()
  }, [])
  // Format stopwatch timer (MM:SS)
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStepIcon = (statusValue) => {
    if (statusValue === 'active') return <ActivityIndicator size="small" color="#FF6F00" />;
    if (statusValue === 'complete') return <Ionicons name="checkmark" size={16} color="#FFF" />;
    if (statusValue === 'failed') return <Ionicons name="close" size={16} color="#FFF" />;
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
          <Text style={styles.backText}>Exit Demo</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AUTO DEMO ENGINE</Text>
      </View>

      {/* 1. Live Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statCell}>
          <Text style={styles.statEmoji}>🌡️</Text>
          <Text style={styles.statVal}>{karachiTemp}°C Karachi</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={[styles.statVal, { color: '#FF3D00', fontWeight: 'bold' }]}>⚡ CRISIS ACTIVE</Text>
        </View>
      </View>
      <View style={[styles.statsBar, { borderTopWidth: 1, borderTopColor: '#222', marginTop: 0 }]}>
        <View style={styles.statCell}>
          <Text style={styles.statEmoji}>🫀</Text>
          <Text style={styles.statVal}>Lives Secured: <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{livesSecured}</Text></Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statEmoji}>⏱️</Text>
          <Text style={styles.statVal}>{formatTimer(timer)}</Text>
        </View>
      </View>

      {/* 2. Step Progress Tracker (Timeline) */}
      <ScrollView contentContainerStyle={styles.timelineContainer}>
        {/* Step 1 */}
        <View style={styles.timelineRow}>
          <View style={styles.indicatorContainer}>
            <View style={[
              styles.circle,
              stepStatus[0] === 'active' && styles.circleActive,
              stepStatus[0] === 'complete' && styles.circleComplete,
              stepStatus[0] === 'failed' && styles.circleFailed
            ]}>
              {getStepIcon(stepStatus[0])}
            </View>
            <View style={styles.line} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Signal Ingested</Text>
            <Text style={styles.stepSubtitle}>Heatstroke reports logged near Gulshan Chowrangi</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.timelineRow}>
          <View style={styles.indicatorContainer}>
            <View style={[
              styles.circle,
              stepStatus[1] === 'active' && styles.circleActive,
              stepStatus[1] === 'complete' && styles.circleComplete,
              stepStatus[1] === 'failed' && styles.circleFailed
            ]}>
              {getStepIcon(stepStatus[1])}
            </View>
            <View style={styles.line} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>AI Detection Running</Text>
            <Text style={styles.stepSubtitle}>Analyzing distress signals & Karachi environment</Text>
          </View>
        </View>

        {/* Step 3 */}
        <View style={styles.timelineRow}>
          <View style={styles.indicatorContainer}>
            <View style={[
              styles.circle,
              stepStatus[2] === 'active' && styles.circleActive,
              stepStatus[2] === 'complete' && styles.circleComplete,
              stepStatus[2] === 'failed' && styles.circleFailed
            ]}>
              {getStepIcon(stepStatus[2])}
            </View>
            <View style={styles.line} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Response Plan Generated</Text>
            <Text style={styles.stepSubtitle}>Automated hospital capacity load-balancing</Text>
          </View>
        </View>

        {/* Step 4 */}
        <View style={styles.timelineRow}>
          <View style={styles.indicatorContainer}>
            <View style={[
              styles.circle,
              stepStatus[3] === 'active' && styles.circleActive,
              stepStatus[3] === 'complete' && styles.circleComplete,
              stepStatus[3] === 'failed' && styles.circleFailed
            ]}>
              {getStepIcon(stepStatus[3])}
            </View>
            <View style={styles.line} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Dispatch Sent to Driver</Text>
            <Text style={styles.stepSubtitle}>WebSocket route lock & bed receipt transmitted</Text>
          </View>
        </View>

        {/* Step 5 */}
        <View style={styles.timelineRow}>
          <View style={styles.indicatorContainer}>
            <View style={[
              styles.circle,
              stepStatus[4] === 'active' && styles.circleActive,
              stepStatus[4] === 'complete' && styles.circleComplete,
              stepStatus[4] === 'failed' && styles.circleFailed
            ]}>
              {getStepIcon(stepStatus[4])}
            </View>
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>Mission Success</Text>
            <Text style={styles.stepSubtitle}>3 heatstroke victims safely checked in at hospital</Text>
          </View>
        </View>
      </ScrollView>

      {/* 3. Live Agent Reasoning Box (Terminal) */}
      <View style={styles.terminalContainer}>
        <Text style={styles.terminalLabel}>AI REASONING TRACE</Text>
        <ScrollView style={styles.terminalBox} contentContainerStyle={{ paddingBottom: 10 }}>
          <Text style={styles.terminalText}>
            {terminalText}
            {cursorVisible && <Text style={{ color: '#00FF00', fontWeight: 'bold' }}>▋</Text>}
          </Text>
        </ScrollView>
      </View>

      {/* Success Notification Banner */}
      {showSuccessBanner && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>✓ MISSION COMPLETE — 3 Lives Secured in {demoDuration}s</Text>
        </View>
      )}

      {/* Full Trace Navigation Button */}
      {showReportBtn && (
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('AgentTrace', { telemetry: analysisDataRef.current })}
        >
          <Text style={styles.reportBtnText}>View Full Diagnostic Report</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 14, marginLeft: 6, fontWeight: '500' },
  headerTitle: { color: '#D32F2F', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111'
  },
  statCell: { flexDirection: 'row', alignItems: 'center' },
  statEmoji: { fontSize: 16, marginRight: 6 },
  statVal: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  timelineContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  timelineRow: { flexDirection: 'row', marginBottom: 16 },
  indicatorContainer: { alignItems: 'center', marginRight: 14, width: 28 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#444',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center'
  },
  circleActive: { borderColor: '#FF6F00' },
  circleComplete: { borderColor: '#2E7D32', backgroundColor: '#2E7D32' },
  circleFailed: { borderColor: '#D32F2F', backgroundColor: '#D32F2F' },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#333',
    marginTop: 4,
    height: 35
  },
  stepInfo: { flex: 1, justifyContent: 'center' },
  stepTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  stepSubtitle: { color: '#888888', fontSize: 11, marginTop: 2 },
  terminalContainer: { flex: 1, paddingHorizontal: 16, marginBottom: 16 },
  terminalLabel: { color: '#888888', fontSize: 11, fontWeight: 'bold', marginBottom: 6, letterSpacing: 0.5 },
  terminalBox: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    padding: 12
  },
  terminalText: { color: '#00FF00', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  successBanner: {
    backgroundColor: '#1B5E20',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  successBannerText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reportBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});
