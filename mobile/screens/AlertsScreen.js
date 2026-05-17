import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { app_url } from '../url';

const API_URL = 'http://localhost:3000'; // Change to 10.0.2.2 for android emulator

export default function AlertsScreen() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${app_url}/api/incidents`);
      const data = await res.json();
      if (Array.isArray(data)) setIncidents(data);
    } catch (e) {
      console.log('Fetch error', e);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.summary}>{item.crisis_summary}</Text>
      <View style={styles.footer}>
        <Text style={styles.actions}>{item.actions_taken} Actions Taken</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No active incidents.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  card: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { backgroundColor: '#D32F2F', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  time: { color: '#888888', fontSize: 12 },
  summary: { color: '#FFFFFF', fontSize: 16, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { color: '#2E7D32', fontSize: 14, fontWeight: 'bold' },
  empty: { color: '#888888', textAlign: 'center', marginTop: 50 }
});
