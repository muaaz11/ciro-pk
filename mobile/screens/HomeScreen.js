import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { app_url } from '../url';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [customTemp, setCustomTemp] = useState('');

  useEffect(() => {
    fetchWeather();
    // Refresh weather every 5 minutes
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      const res = await fetch(`${app_url}/api/weather/current`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (e) {
      console.log('Error fetching weather:', e);
    }
  };

  const triggerDemo = async (mockTemp) => {
    setLoading(true);
    let coords = { latitude: 24.92, longitude: 67.09 }; // Default Gulshan Chowrangi fallback
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        // To make sure it stays in Karachi bounds for simulator/demo visuals if they are outside PK
        if (loc.coords.latitude < 24.5 || loc.coords.latitude > 25.5) {
          console.log("Outside Karachi, using simulated Karachi coordinate close to user");
          coords = { latitude: 24.92, longitude: 67.09 };
        } else {
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
        }
      }
    } catch (err) {
      console.log("Could not get live location, falling back:", err.message);
    }

    let areaName = 'Gulshan-e-Iqbal';
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let geocode = await Location.reverseGeocodeAsync(coords);
        if (geocode && geocode.length > 0) {
          const first = geocode[0];
          areaName = first.district || first.subregion || first.name || first.street || 'Gulshan-e-Iqbal';
        }
      }
    } catch (err) {
      console.log("Geocoding failed, using Gulshan-e-Iqbal fallback:", err);
    }

    try {
      await fetch(`${app_url}/api/signals/inject`, {
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
      });
      navigation.navigate('AgentTrace');

    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };


  const getBadgeState = () => {
    if (!weather) return { text: 'LOADING', color: '#888888' };
    if (weather.temperature_celsius >= 40) return { text: 'CRITICAL HEAT', color: '#D32F2F' };
    if (weather.temperature_celsius >= 35) return { text: 'WARNING', color: '#FF9800' };
    return { text: 'NORMAL', color: '#4CAF50' };
  };

  const badge = getBadgeState();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Weather Status (Karachi)</Text>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>

        {weather ? (
          <>
            <Text style={styles.temperature}>{weather.temperature_celsius}°C</Text>
            <Text style={styles.feelsLike}>Feels like: {weather.feels_like}°C | {weather.description}</Text>
          </>
        ) : (
          <ActivityIndicator size="large" color="#FF6F00" style={{ marginVertical: 20 }} />
        )}
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

      <Text style={{ color: '#888', marginTop: 20, marginBottom: 10, textAlign: 'center', fontWeight: 'bold' }}>SIMULATE CUSTOM TEMPERATURE</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <TextInput
          style={styles.tempInput}
          value={customTemp}
          onChangeText={setCustomTemp}
          keyboardType="numeric"
          placeholder="Leave empty to use real weather..."
          placeholderTextColor="#888"
        />
        <Text style={{ color: '#FFF', fontSize: 18, marginLeft: 10, fontWeight: 'bold' }}>°C</Text>
      </View>

      <TouchableOpacity
        style={styles.demoBtn}
        onPress={() => triggerDemo(customTemp.trim() ? Number(customTemp) : null)}
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
  tempInput: { flex: 1, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: 18, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' }
});
