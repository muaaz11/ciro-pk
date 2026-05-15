import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function AgentTraceScreen() {
  const [expanded, setExpanded] = useState({ detection: true, planning: false, execution: false });
  const [logs, setLogs] = useState({ detection: '', planning: '', execution: '' });

  useEffect(() => {
    let t1, t2, t3;
    const simulateLog = () => {
      const dLog = "Analyzing 12 signals + weather data...\n[!] HEATWAVE DETECTED\nConfidence: 94%\nAffected: Gulshan, FB Area\nReasoning: Multiple heatstroke reports matched with 45C temp and 60% humidity.";
      const pLog = "Generating Response Plan...\nPriority: URGENT\n- Alerting Hospital H004 (Liaquat National)\n- Activating Cooling Centers CC001, CC002\n- Dispatching ambulances to Gulshan.";
      const eLog = "Executing actions...\n[OK] Alert sent to H004\n[OK] Updated DB capacity for H004\n[OK] Public SMS broadcasted\nIncident KHI-2026-991 Active.";

      let dIndex = 0;
      t1 = setInterval(() => {
        if (dIndex <= dLog.length) {
          setLogs(prev => ({ ...prev, detection: dLog.slice(0, dIndex) }));
          dIndex++;
        } else {
          clearInterval(t1);
          setExpanded(prev => ({ ...prev, planning: true }));
          let pIndex = 0;
          t2 = setInterval(() => {
            if (pIndex <= pLog.length) {
              setLogs(prev => ({ ...prev, planning: pLog.slice(0, pIndex) }));
              pIndex++;
            } else {
              clearInterval(t2);
              setExpanded(prev => ({ ...prev, execution: true }));
              let eIndex = 0;
              t3 = setInterval(() => {
                if (eIndex <= eLog.length) {
                  setLogs(prev => ({ ...prev, execution: eLog.slice(0, eIndex) }));
                  eIndex++;
                } else clearInterval(t3);
              }, 30);
            }
          }, 30);
        }
      }, 30);
    };

    simulateLog();
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, []);

  const toggle = (section) => setExpanded({ ...expanded, [section]: !expanded[section] });

  const Section = ({ title, log, isExpanded, onToggle, color }) => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.header} onPress={onToggle}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <Text style={styles.icon}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.logContainer}>
          <Text style={styles.logText}>{log}</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>Live Agent Reasoning Log</Text>
      <Section title="1. Detection Agent" log={logs.detection} isExpanded={expanded.detection} onToggle={() => toggle('detection')} color="#D32F2F" />
      <Section title="2. Planning Agent" log={logs.planning} isExpanded={expanded.planning} onToggle={() => toggle('planning')} color="#FF6F00" />
      <Section title="3. Execution Agent" log={logs.execution} isExpanded={expanded.execution} onToggle={() => toggle('execution')} color="#2E7D32" />

      <TouchableOpacity style={styles.exportBtn}>
        <Text style={styles.exportBtnText}>Export JSON Log</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 16 },
  mainTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  section: { marginBottom: 16, backgroundColor: '#1A1A1A', borderRadius: 8, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#222222' },
  title: { fontSize: 16, fontWeight: 'bold' },
  icon: { color: '#888888' },
  logContainer: { padding: 16, backgroundColor: '#000000' },
  logText: { color: '#00FF00', fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
  exportBtn: { marginTop: 20, padding: 16, borderColor: '#888888', borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  exportBtnText: { color: '#FFFFFF', fontWeight: 'bold' }
});
