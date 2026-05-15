import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { app_url } from '../url';

console.log(app_url);

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  const triggerDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${app_url}/api/signals/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '3 people collapsed near Gulshan chowrangi, ambulance needed urgently, extreme heat',
          location_mentioned: 'Gulshan-e-Iqbal',
          signal_type: 'heatstroke_case',
          source: 'app_demo'
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Mock signal injected. Triggering Analysis...', [
          { text: 'OK', onPress: () => navigation.navigate('AgentTrace') }
        ]);

        fetch(`${app_url}/api/crisis/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signals: [{ text: '3 people collapsed near Gulshan chowrangi', location_mentioned: 'Gulshan-e-Iqbal' }],
            weather_data: { temp: 45, humidity: 60 }
          })
        }).catch(e => console.log('Analyze endpoint error:', e));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to inject signal. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Heatwave Status</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CRITICAL</Text>
        </View>
        <Text style={styles.temperature}>45°C</Text>
        <Text style={styles.feelsLike}>Feels like: 52°C</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.statLabel}>Hospitals Full</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.demoBtn}
        onPress={triggerDemo}
        disabled={loading}
      >
        <Text style={styles.demoBtnText}>{loading ? 'Injecting...' : 'Trigger Demo Incident'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 16 },
  card: { backgroundColor: '#1A1A1A', padding: 20, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  halfCard: { flex: 1, marginHorizontal: 4 },
  row: { flexDirection: 'row', marginHorizontal: -4 },
  cardTitle: { color: '#FFFFFF', fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
  badge: { backgroundColor: '#D32F2F', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 10 },
  badgeText: { color: '#FFFFFF', fontWeight: 'bold' },
  temperature: { color: '#FF6F00', fontSize: 64, fontWeight: 'bold' },
  feelsLike: { color: '#888888', fontSize: 16 },
  statNumber: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold' },
  statLabel: { color: '#888888', fontSize: 14, textAlign: 'center', marginTop: 4 },
  demoBtn: { backgroundColor: '#FF6F00', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  demoBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
