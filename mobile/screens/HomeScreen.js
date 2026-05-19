import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Animated } from 'react-native';
import * as Location from 'expo-location';
import { app_url } from '../url';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [customTemp, setCustomTemp] = useState('');
  const [overviewData, setOverviewData] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchWeather();
    fetchOverview();
    const interval = setInterval(() => {
       fetchWeather();
       fetchOverview();
    }, 5000);
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

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${app_url}/api/crisis/overview`);
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
      }
    } catch (e) {
      console.log('Error fetching overview:', e);
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
      // INJECT SIGNAL DIRECTLY FROM HOME SCREEN
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

      setLoading(false);
      navigation.navigate('AgentTrace');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
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
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
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
            <Text style={styles.statNumber}>{overviewData ? overviewData.active_crises.length : 0}</Text>
            <Text style={styles.statLabel}>Active Incidents</Text>
          </View>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={[styles.statNumber, {color: overviewData?.system_health_score < 50 ? '#D32F2F' : '#4CAF50'}]}>
               {overviewData ? overviewData.system_health_score : 100}
            </Text>
            <Text style={styles.statLabel}>System Health</Text>
          </View>
        </View>

        {/* --- VOICE REPORT BANNER --- */}
        <View style={styles.voiceBanner}>
          <View style={styles.voiceBannerContent}>
            <Text style={styles.voiceBannerTitle}>🎙️ Report by Voice</Text>
            <Text style={styles.voiceBannerSubtitle}>Speak in English, Urdu, or Roman Urdu</Text>
          </View>
          <TouchableOpacity 
            style={styles.voiceBannerBtn}
            onPress={() => navigation.navigate('VoiceCommand')}
          >
            <Text style={styles.voiceBannerBtnText}>Try Now →</Text>
          </TouchableOpacity>
        </View>

        {/* --- CRISIS OVERVIEW --- */}
        {overviewData && overviewData.active_crises.length > 0 && (
           <View style={{marginTop: 10, marginBottom: 20}}>
              <Text style={styles.cardTitle}>City Crisis Overview</Text>
              {overviewData.active_crises.map((c, i) => (
                 <View key={i} style={{backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: c.severity === 'CRITICAL' ? '#D32F2F' : c.severity === 'HIGH' ? '#FF9800' : '#4CAF50'}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>{c.id}</Text>
                    <Text style={{color: '#AAA', fontSize: 12}}>{c.location}</Text>
                    <Text style={{color: c.severity === 'CRITICAL' ? '#D32F2F' : '#FF9800', fontSize: 10, marginTop: 4, fontWeight: 'bold'}}>SEVERITY: {c.severity}</Text>
                 </View>
              ))}
           </View>
        )}

        {/* --- IMPACT DASHBOARD --- */}
        <View style={{marginTop: 10, marginBottom: 20}}>
           <Text style={styles.cardTitle}>Global Impact Dashboard</Text>
           <View style={{backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12}}>
               <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12}}>
                   <View>
                       <Text style={{color: '#888', fontSize: 12}}>Congestion Reduced</Text>
                       <View style={{flexDirection: 'row', alignItems: 'center'}}>
                           <Text style={{color: '#D32F2F', fontSize: 14, textDecorationLine: 'line-through'}}>85%</Text>
                           <Text style={{color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginLeft: 8}}>→ 35%</Text>
                       </View>
                   </View>
                   <View>
                       <Text style={{color: '#888', fontSize: 12}}>Time Saved</Text>
                       <Text style={{color: '#4CAF50', fontSize: 18, fontWeight: 'bold'}}>12 mins</Text>
                   </View>
               </View>
               <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                   <View>
                       <Text style={{color: '#888', fontSize: 12}}>Hospital Load Shift</Text>
                       <View style={{flexDirection: 'row', alignItems: 'center'}}>
                           <Text style={{color: '#D32F2F', fontSize: 14, textDecorationLine: 'line-through'}}>100%</Text>
                           <Text style={{color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginLeft: 8}}>→ 80%</Text>
                       </View>
                   </View>
                   <View>
                       <Text style={{color: '#888', fontSize: 12}}>Lives Impacted</Text>
                       <Text style={{color: '#4CAF50', fontSize: 18, fontWeight: 'bold'}}>+3</Text>
                   </View>
               </View>
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
          onPress={() => triggerDemo(customTemp.trim() ? Number(customTemp) : 44)}
          disabled={loading}
        >
          <Text style={styles.demoBtnText}>{loading ? 'Injecting...' : 'Trigger Demo Incident'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FAB Voice Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('VoiceCommand')}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 24 }}>🎙️</Text>
          <Animated.View style={[styles.fabBadge, { opacity: pulseAnim }]} />
        </TouchableOpacity>
        <Text style={styles.fabLabel}>Voice Report</Text>
      </View>
    </View>
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
  tempInput: { flex: 1, backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: 18, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  voiceBanner: {
    backgroundColor: '#111827',
    borderLeftWidth: 4,
    borderLeftColor: '#00D4FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  voiceBannerContent: {
    flex: 1,
    marginRight: 12,
  },
  voiceBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  voiceBannerSubtitle: {
    color: '#8892A4',
    fontSize: 12,
    marginTop: 4,
  },
  voiceBannerBtn: {
    backgroundColor: '#00D4FF1E',
    borderColor: '#00D4FF',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  voiceBannerBtnText: {
    color: '#00D4FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 999,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  fabBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  fabLabel: {
    color: '#00D4FF',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
