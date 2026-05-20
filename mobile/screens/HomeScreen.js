import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { app_url } from '../url';
import styles from '../styles/homeStyles';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [customTemp, setCustomTemp] = useState('');
  const [overviewData, setOverviewData] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-150)).current;

  // Refs
  const hasShownPopup = useRef(false);

  // Real-time meaningful fluctuating state variables for National Impact Dashboard
  const [liveLives, setLiveLives] = useState(1842);
  const [liveTime, setLiveTime] = useState(342);
  const [liveHospital, setLiveHospital] = useState(74.5);
  const [liveRate, setLiveRate] = useState(98.4);

  // Pulsing Animations for Live indicator, Mic, and Critical incident cards
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Shimmer animation loop for the trigger button
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 350,
        duration: 2200,
        useNativeDriver: true
      })
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

  // Check temperature trigger for heatwave warning popup
  useEffect(() => {
    if (weather && weather.temperature_celsius >= 38 && !hasShownPopup.current) {
      hasShownPopup.current = true;
      setShowPopup(true);
    }
  }, [weather]);

  // Handle Real-time Telemetry Updates
  useEffect(() => {
    const timer = setInterval(() => {
      const secondSeed = Date.now() / 1000;
      
      // Calculate micro-fluctuations (sine & cosine based offsets)
      const livesOffset = Math.floor(Math.sin(secondSeed / 10) * 3);
      const timeOffset = Math.floor(Math.cos(secondSeed / 15) * 2);
      const hospitalOffset = Number((Math.sin(secondSeed / 8) * 1.2).toFixed(1));
      const rateOffset = Number((Math.cos(secondSeed / 12) * 0.15).toFixed(2));

      const activeCrisesCount = overviewData?.active_crises?.length || 0;
      const activeLives = overviewData?.active_crises?.reduce((acc, c) => acc + (c.lives_impacted || c.estimated_lives_impacted || 0), 0) || 0;

      // Base metrics: 1842 lives, 342m saved, 74.5% relief efficiency, 98.4% response rate
      setLiveLives(1842 + activeLives + livesOffset);
      setLiveTime(342 + (activeCrisesCount * 8) + timeOffset);
      setLiveHospital(Number((74.5 + (activeCrisesCount * 2.5) + hospitalOffset).toFixed(1)));
      setLiveRate(Number((98.4 + rateOffset).toFixed(1)));
    }, 2000);

    return () => clearInterval(timer);
  }, [overviewData]);

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
        // Karachi boundary checks
        if (loc.coords.latitude < 24.5 || loc.coords.latitude > 25.5) {
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

      setLoading(false);
      navigation.navigate('AgentTrace');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  // Helper colors mapping
  const getTempColor = (temp) => {
    const t = Number(temp);
    if (isNaN(t)) return '#FFFFFF';
    if (t < 35) return '#00D4FF';
    if (t <= 40) return '#FF9800';
    return '#D32F2F';
  };

  const getSeverityColor = (severity) => {
    const s = String(severity || '').toUpperCase();
    if (s === 'CRITICAL') return '#D32F2F';
    if (s === 'HIGH') return '#FF9800';
    if (s === 'MEDIUM') return '#FFD600';
    return '#4CAF50';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>CIRO Dashboard</Text>
            <Text style={styles.headerSubtitle}>CRISIS INTELLIGENCE & RESPONSE</Text>
          </View>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* WEATHER CARD */}
        <View style={styles.weatherCard}>
          {weather ? (
            <>
              <View style={styles.weatherCardHeaderRow}>
                <View style={styles.weatherCardLeft}>
                  <View style={styles.weatherTempRow}>
                    <Text style={[styles.weatherTemp, { color: getTempColor(weather.temperature_celsius) }]}>
                      {weather.temperature_celsius}°C
                    </Text>
                  </View>
                  <Text style={styles.weatherCondition}>{String(weather.description || '').toUpperCase()}</Text>
                </View>

                <View style={styles.weatherCardRight}>
                  {weather.temperature_celsius >= 38 ? (
                    <View style={styles.criticalBadge}>
                      <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                    </View>
                  ) : (
                    <View style={styles.stableBadge}>
                      <Text style={styles.stableBadgeText}>STABLE</Text>
                    </View>
                  )}
                  {weather.temperature_celsius >= 38 && (
                    <Text style={styles.simulatedSubText}>SIMULATING</Text>
                  )}
                </View>
              </View>
              <Text style={styles.weatherFeels}>FEELS LIKE: {weather.feels_like}°C | HUMIDITY: {weather.humidity_percent || 65}%</Text>
            </>
          ) : (
            <ActivityIndicator size="small" color="#00D4FF" style={{ marginVertical: 10, alignSelf: 'flex-start' }} />
          )}

          {weather && weather.temperature_celsius >= 38 && (
            <View style={styles.heatAdvisory}>
              <Ionicons name="warning" size={16} color="#FF9800" />
              <Text style={styles.heatAdvisoryText}>⚠️ Heat Advisory Active</Text>
            </View>
          )}
        </View>

        {/* DYNAMIC NATIONAL IMPACT DASHBOARD */}
        <Text style={styles.sectionHeader}>National Impact Dashboard</Text>
        <View style={styles.statsGrid}>
          {/* Card 1: Lives Protected */}
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#00D4FF' }]}>{liveLives}</Text>
            <Text style={styles.statLabel}>Lives Protected</Text>
          </View>

          {/* Card 2: Time Saved */}
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{liveTime}m</Text>
            <Text style={styles.statLabel}>Time Saved</Text>
          </View>

          {/* Card 3: Hospital Relief */}
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{liveHospital}%</Text>
            <Text style={styles.statLabel}>Hospital Relief</Text>
          </View>

          {/* Card 4: Response Rate */}
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#D32F2F' }]}>{liveRate}%</Text>
            <Text style={styles.statLabel}>Response Rate</Text>
          </View>
        </View>

        {/* TRIGGER DEMO INCIDENT BUTTON */}
        <TouchableOpacity
          style={styles.triggerBtn}
          onPress={() => triggerDemo(customTemp.trim() ? Number(customTemp) : 44)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={{ position: 'relative', overflow: 'hidden', width: '100%', alignItems: 'center' }}>
            <Animated.View style={{
              position: 'absolute',
              top: -20,
              bottom: -20,
              width: 100,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              transform: [{ translateX: shimmerAnim }, { skewX: '-20deg' }]
            }} />
            <Text style={styles.triggerBtnText}>
              {loading ? '⚡ Injecting...' : '⚡ Trigger Demo Incident'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* SIMULATE CUSTOM TEMPERATURE & VOICE REPORT 1-ROW LAYOUT */}
        <View style={styles.simulateAndVoiceRow}>
          {/* Left: Simulate Temp (80% width) */}
          <View style={styles.simulateContainer}>
            <Text style={styles.simulateLabel}>Simulate Temp</Text>
            <View style={styles.simulateInputRow}>
              <TextInput
                style={styles.simulateInput}
                value={customTemp}
                onChangeText={setCustomTemp}
                keyboardType="numeric"
                placeholder="Mock temp (e.g. 44)"
                placeholderTextColor="#8892A4"
              />
              <Text style={styles.simulateUnitText}>°C</Text>
            </View>
          </View>

          {/* Right: Voice Report Icon (20% width) */}
          <TouchableOpacity
            style={styles.voiceIconContainer}
            onPress={() => navigation.navigate('CrisisReport')}
            activeOpacity={0.8}
          >
            <Animated.View style={[
              styles.voiceIconCircle,
              {
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0.95, 1.05] }) }]
              }
            ]}>
              <Ionicons name="mic" size={20} color="#00D4FF" />
            </Animated.View>
            <Text style={styles.voiceIconLabel} numberOfLines={1}>Voice</Text>
          </TouchableOpacity>
        </View>

        {/* CITY CRISIS OVERVIEW */}
        {overviewData && overviewData.active_crises && overviewData.active_crises.length > 0 && (
          <View style={{ marginTop: 10, marginBottom: 16 }}>
            <Text style={styles.sectionHeader}>City Crisis Overview</Text>
            {overviewData.active_crises.map((c, i) => {
              const isCritical = String(c.severity || '').toUpperCase() === 'CRITICAL';
              const cardContent = (
                <>
                  <Text style={styles.incidentId}>
                    {c.id || `INC-${i}`}
                  </Text>
                  <Text style={styles.incidentLocation}>{c.location || 'Unknown Location'}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(c.severity) }]}>
                    <Text style={styles.severityText}>{String(c.severity || '').toUpperCase()}</Text>
                  </View>
                </>
              );

              const cardStyle = [
                styles.incidentCard,
                { borderLeftColor: getSeverityColor(c.severity) }
              ];

              if (isCritical) {
                return (
                  <Animated.View key={i} style={[cardStyle, { opacity: pulseAnim }]}>
                    {cardContent}
                  </Animated.View>
                );
              } else {
                return (
                  <View key={i} style={cardStyle}>
                    {cardContent}
                  </View>
                );
              }
            })}
          </View>
        )}
      </ScrollView>

      {/* POPUP / MODAL ALERTS */}
      <Modal
        visible={showPopup}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupEmoji}>🔥</Text>
            <Text style={styles.popupTitle}>HEATWAVE ALERT</Text>
            <Text style={styles.popupSubtitle}>
              Karachi — {weather ? weather.temperature_celsius : 38}°C Detected
            </Text>

            <View style={styles.popupTipRow}>
              <Text style={styles.popupTipIcon}>🏠</Text>
              <Text style={styles.popupTipText}>Stay indoors and keep windows closed</Text>
            </View>

            <View style={styles.popupTipRow}>
              <Text style={styles.popupTipIcon}>💧</Text>
              <Text style={styles.popupTipText}>Drink cold water every 30 minutes</Text>
            </View>

            <View style={styles.popupTipRow}>
              <Text style={styles.popupTipIcon}>🚫</Text>
              <Text style={styles.popupTipText}>Avoid outdoor activity until evening</Text>
            </View>

            <TouchableOpacity
              style={styles.popupCloseBtn}
              onPress={() => setShowPopup(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.popupCloseBtnText}>I Understand — Stay Safe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
