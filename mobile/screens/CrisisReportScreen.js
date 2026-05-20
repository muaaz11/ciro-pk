import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { app_url } from '../url';
import { useLocation } from '../hooks/useLocation';

const { width } = Dimensions.get('window');

// Dark Map style array matching existing screen
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#0A0A0A" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#0A0A0A" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#1A1A1A" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6b9a76" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#1A1A1A" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#2A2A2A" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#2C2C2C" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#3D3D3D" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#0F172A" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  }
];

// Hospital coordinates static markers
const HOSPITALS = [
  { id: 'H1', title: "Liaquat National", coordinate: { latitude: 24.8945, longitude: 67.0768 } },
  { id: 'H2', title: "Agakhan Hospital", coordinate: { latitude: 24.8765, longitude: 67.0689 } },
  { id: 'H3', title: "JPMC", coordinate: { latitude: 24.8517, longitude: 67.0331 } }
];

// Suggested chips
const SUGGESTED_CHIPS = [
  { label: 'Heatwave 🌡️', phrase: 'Extreme heat wave reported at ' },
  { label: 'G-10 Shade ☀️', phrase: 'G-10 mein shade aur pani ki kami hai, log garmi ki wajah se behaal ho rahe hain' },
  { label: 'George Town 🌡️', phrase: 'Severe heatwave reported in George Town for the past 30 minutes, temperatures reaching dangerous levels.' },
  { label: 'Flood 🌊', phrase: 'Flash flood reported at ' },
  { label: 'Accident 🚗', phrase: 'Road accident reported at ' },
  { label: 'Fire 🔥', phrase: 'Fire breakout reported at ' },
];

// Monospace font style helper
const monoFont = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace'
});

export default function CrisisReportScreen({ navigation }) {
  const userLoc = useLocation();

  // State Variables
  const [inputText, setInputText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [agentStep, setAgentStep] = useState(0);

  // Refs
  const inputRef = useRef(null);
  const mapRef = useRef(null);
  const agentIntervalRef = useRef(null);
  const tooltipTimerRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (agentIntervalRef.current) clearInterval(agentIntervalRef.current);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  // Dots Animation loop
  useEffect(() => {
    let anim;
    if (loading) {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);

      anim = Animated.loop(
        Animated.stagger(150, [
          Animated.sequence([
            Animated.timing(dot1, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(dot1, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot2, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dot3, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
    } else {
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [loading]);

  // Pulse Marker Animation loop
  useEffect(() => {
    let pulse;
    if (result) {
      pulseAnim.setValue(1);
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 900,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true
          })
        ])
      );
      pulse.start();
    }
    return () => {
      if (pulse) pulse.stop();
    };
  }, [result]);

  const handleChipPress = (phrase) => {
    setInputText(phrase);
    inputRef.current?.focus();
  };

  const handleMicPress = () => {
    inputRef.current?.focus();
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(true);
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 4000);
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAgentStep(1);

    // Progress Bar Animation (0 -> 100% loop during loading)
    progressAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 3500,
          useNativeDriver: false
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false
        })
      ])
    ).start();

    // Increment agent steps (1 -> 4) every 1200ms
    if (agentIntervalRef.current) clearInterval(agentIntervalRef.current);
    agentIntervalRef.current = setInterval(() => {
      setAgentStep((prev) => {
        if (prev >= 4) {
          clearInterval(agentIntervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    try {
      const response = await fetch(`${app_url}/api/crisis/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: inputText,
          temperature: 44
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const rawData = await response.json();
      if (!rawData.success || !rawData.data) {
        throw new Error(rawData.error || "Analysis failed to produce structured data.");
      }

      const data = rawData.data;

      // Ensure agent interval is cleared and steps set to finished
      if (agentIntervalRef.current) clearInterval(agentIntervalRef.current);
      setAgentStep(5);
      setResult(data);

      // Focus map to incident coordinate
      const coords = data.coordinates || { lat: 24.92, lng: 67.09 };
      const lat = Number(coords.lat || coords.latitude);
      const lng = Number(coords.lng || coords.longitude);

      if (mapRef.current && !isNaN(lat) && !isNaN(lng)) {
        setTimeout(() => {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          }, 1500);
        }, 300);
      }

    } catch (err) {
      if (agentIntervalRef.current) clearInterval(agentIntervalRef.current);
      setAgentStep(0);
      setError(err.message || "An unexpected error occurred during analysis.");
      console.error("Submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render severity badge
  const renderSeverityBadge = (severity) => {
    const s = String(severity || '').toUpperCase();
    let color = '#4CAF50'; // LOW
    if (s === 'CRITICAL' || s === 'HIGH') {
      color = '#D32F2F';
    } else if (s === 'MEDIUM') {
      color = '#FF9800';
    }

    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{s || 'UNKNOWN'}</Text>
      </View>
    );
  };

  // Helper to format confidence color
  const getConfidenceStyle = (confidenceVal) => {
    const val = Number(confidenceVal || 0);
    if (val > 75) return { color: '#4CAF50' };
    if (val >= 50) return { color: '#FF9800' };
    return { color: '#D32F2F' };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* SECTION 1: HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#00D4FF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>🚨 Crisis Report</Text>
            <Text style={styles.headerSubtitle}>Speak or type — Antigravity will analyze</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 2: INPUT AREA */}
          <View style={styles.inputSection}>
            {/* Horizontal scrollable chips row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {SUGGESTED_CHIPS.map((chip, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.chip}
                  onPress={() => handleChipPress(chip.phrase)}
                  disabled={loading}
                >
                  <Text style={styles.chipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* WhatsApp-style input card */}
            <View style={styles.inputCard}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Describe the crisis or emergency details..."
                placeholderTextColor="#8892A4"
                multiline
                editable={!loading}
                value={inputText}
                onChangeText={setInputText}
                autoCorrect={true}
                spellCheck={true}
                returnKeyType="done"
              />

              <View style={styles.inputActionRow}>
                <TouchableOpacity
                  style={styles.micButton}
                  onPress={handleMicPress}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic" size={24} color="#00D4FF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { opacity: inputText.trim().length > 0 ? 1 : 0.4 }
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || inputText.trim().length === 0}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#00D4FF" />
                  ) : (
                    <Ionicons name="send" size={22} color="#00D4FF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Mic Tooltip text */}
            {showTooltip && (
              <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipText}>Tap 🎤 on your keyboard to speak</Text>
              </View>
            )}

            {/* Whatsapp Bubble output representing current text */}
            {inputText.trim().length > 0 && (
              <View style={styles.bubbleRow}>
                <View style={styles.msgBubble}>
                  <Text style={styles.msgBubbleText}>{inputText}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ERROR CARD */}
          {error && (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                <Text style={styles.errorTitle}>Analysis Request Failed</Text>
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* SECTION 3: LIVE AGENT REASONING */}
          {loading && agentStep > 0 && (
            <View style={styles.agentCard}>
              <Text style={styles.agentCardTitle}>🤖 Active AI Reasoning Timeline</Text>

              {/* Step 1: Orchestrator */}
              <View
                style={[
                  styles.agentStepRow,
                  agentStep === 1 && styles.stepRowActive,
                  agentStep > 1 && styles.stepRowDone
                ]}
              >
                <View
                  style={[
                    styles.stepDot,
                    agentStep === 1 && { backgroundColor: '#00D4FF' },
                    agentStep > 1 && { backgroundColor: '#4CAF50' }
                  ]}
                />
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepName, agentStep < 1 && styles.textMuted]}>
                    🧠 Antigravity Orchestrator
                  </Text>
                  <Text style={styles.stepSubtitle}>Screening threshold & routing...</Text>
                </View>
                <View style={styles.stepStatus}>
                  {agentStep === 1 && <ActivityIndicator size="small" color="#00D4FF" />}
                  {agentStep > 1 && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />}
                </View>
              </View>

              {/* Step 2: Detection */}
              <View
                style={[
                  styles.agentStepRow,
                  agentStep === 2 && styles.stepRowActive,
                  agentStep > 2 && styles.stepRowDone
                ]}
              >
                <View
                  style={[
                    styles.stepDot,
                    agentStep === 2 && { backgroundColor: '#00D4FF' },
                    agentStep > 2 && { backgroundColor: '#4CAF50' }
                  ]}
                />
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepName, agentStep < 2 && styles.textMuted]}>
                    🔍 Detection Agent
                  </Text>
                  <Text style={styles.stepSubtitle}>Fusing signals, measuring severity...</Text>
                </View>
                <View style={styles.stepStatus}>
                  {agentStep === 2 && <ActivityIndicator size="small" color="#00D4FF" />}
                  {agentStep > 2 && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />}
                </View>
              </View>

              {/* Step 3: Planning */}
              <View
                style={[
                  styles.agentStepRow,
                  agentStep === 3 && styles.stepRowActive,
                  agentStep > 3 && styles.stepRowDone
                ]}
              >
                <View
                  style={[
                    styles.stepDot,
                    agentStep === 3 && { backgroundColor: '#00D4FF' },
                    agentStep > 3 && { backgroundColor: '#4CAF50' }
                  ]}
                />
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepName, agentStep < 3 && styles.textMuted]}>
                    📋 Planning Agent
                  </Text>
                  <Text style={styles.stepSubtitle}>Load balancing hospitals, dispatching alerts...</Text>
                </View>
                <View style={styles.stepStatus}>
                  {agentStep === 3 && <ActivityIndicator size="small" color="#00D4FF" />}
                  {agentStep > 3 && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />}
                </View>
              </View>

              {/* Step 4: Execution */}
              <View
                style={[
                  styles.agentStepRow,
                  agentStep === 4 && styles.stepRowActive,
                  agentStep > 4 && styles.stepRowDone
                ]}
              >
                <View
                  style={[
                    styles.stepDot,
                    agentStep === 4 && { backgroundColor: '#00D4FF' },
                    agentStep > 4 && { backgroundColor: '#4CAF50' }
                  ]}
                />
                <View style={styles.stepInfo}>
                  <Text style={[styles.stepName, agentStep < 4 && styles.textMuted]}>
                    ⚙️ Execution Agent
                  </Text>
                  <Text style={styles.stepSubtitle}>Simulating dispatch & closing incident...</Text>
                </View>
                <View style={styles.stepStatus}>
                  {agentStep === 4 && <ActivityIndicator size="small" color="#00D4FF" />}
                  {agentStep > 4 && <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />}
                </View>
              </View>

              {/* Pulsing horizontal progress bar */}
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]}
                />
              </View>

              {/* Animated processing dots below */}
              <View style={styles.processingRow}>
                <Text style={styles.processingText}>Antigravity Agents Processing</Text>
                <View style={styles.loaderDots}>
                  <Animated.View style={[styles.loaderDot, { opacity: dot1 }]} />
                  <Animated.View style={[styles.loaderDot, { opacity: dot2 }]} />
                  <Animated.View style={[styles.loaderDot, { opacity: dot3 }]} />
                </View>
              </View>
            </View>
          )}

          {/* SECTION 4: RESULT CARD */}
          {result && agentStep === 5 && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Orchestrator Analysis</Text>
                {renderSeverityBadge(result.detection?.severity)}
              </View>

              <View style={styles.resultDivider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🔍 Detected Situation:</Text>
                <Text style={[styles.resultValue, { fontFamily: monoFont }]}>
                  {result.detection?.situation || 'Unknown'}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>📊 Confidence:</Text>
                <Text
                  style={[
                    styles.resultValue,
                    getConfidenceStyle(result.detection?.confidence),
                    { fontWeight: 'bold' }
                  ]}
                >
                  {result.detection?.confidence || 0}%
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🧠 Orchestrator Decision:</Text>
                <Text style={styles.resultValue}>
                  {result.orchestrator?.decision || 'No Decision'}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🏥 Assigned Hospital:</Text>
                <Text style={styles.resultValue}>
                  {result.planning?.hospital || 'None'}
                </Text>
              </View>

              <View style={styles.resultBlock}>
                <Text style={styles.resultLabel}>📢 Alert Issued:</Text>
                <Text style={styles.alertText}>
                  "{result.planning?.alert_text || 'No alert text generated.'}"
                </Text>
              </View>

              {/* Bullet lists */}
              {result.impactAreas && result.impactAreas.length > 0 && (
                <View style={styles.bulletSection}>
                  <Text style={styles.bulletTitle}>⚠️ Impact Areas:</Text>
                  {result.impactAreas.map((item, idx) => (
                    <Text key={idx} style={styles.bulletItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}

              {result.planning?.actions && result.planning.actions.length > 0 && (
                <View style={styles.bulletSection}>
                  <Text style={styles.bulletTitle}>✅ Recommended Actions:</Text>
                  {result.planning.actions.map((item, idx) => (
                    <Text key={idx} style={styles.bulletItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}

              {result.execution?.steps && result.execution.steps.length > 0 && (
                <View style={styles.bulletSection}>
                  <Text style={styles.bulletTitle}>⚙️ Simulated Execution:</Text>
                  {result.execution.steps.map((item, idx) => (
                    <Text key={idx} style={[styles.bulletItem, { fontFamily: monoFont }]}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.resultDivider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>🏁 Outcome:</Text>
                <Text style={[styles.resultValue, { fontWeight: 'bold' }]}>
                  {result.execution?.outcome || 'Pending'}
                </Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>👥 Lives Impacted:</Text>
                <Text style={[styles.resultValue, styles.livesImpacted]}>
                  {result.execution?.lives_impacted || 0}
                </Text>
              </View>
            </View>
          )}

          {/* SECTION 5: MAP SIMULATION */}
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>🗺️ Incident Map & Hospital Coordination</Text>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={darkMapStyle}
                initialRegion={{
                  latitude: 24.92,
                  longitude: 67.09,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1
                }}
              >
                {/* Hospital Markers */}
                {HOSPITALS.map((hospital) => (
                  <Marker
                    key={hospital.id}
                    coordinate={hospital.coordinate}
                    title={hospital.title}
                    pinColor="#4CAF50"
                  >
                    <View style={styles.hospitalMarker}>
                      <Ionicons name="business" size={18} color="#4CAF50" />
                    </View>
                  </Marker>
                ))}

                {/* User location marker if available */}
                {userLoc && (
                  <Marker
                    coordinate={userLoc}
                    title="Your Location"
                    pinColor="#00D4FF"
                  />
                )}

                {/* Pulsing incident marker */}
                {result && result.coordinates && (
                  <Marker
                    coordinate={{
                      latitude: Number(result.coordinates.lat || result.coordinates.latitude || 24.92),
                      longitude: Number(result.coordinates.lng || result.coordinates.longitude || 67.09)
                    }}
                    title={result.affectedArea || "Incident Location"}
                  >
                    <View style={styles.incidentMarkerContainer}>
                      <Animated.View
                        style={[
                          styles.markerPulse,
                          {
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim.interpolate({
                              inputRange: [1, 1.4],
                              outputRange: [0.8, 0]
                            })
                          }
                        ]}
                      />
                      <View style={styles.markerCenterDot} />
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
    backgroundColor: '#0A0E1A'
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8892A4',
    marginTop: 2
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  inputSection: {
    marginBottom: 20,
  },
  chipsScroll: {
    marginBottom: 12,
  },
  chipsContent: {
    paddingRight: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2A3A',
  },
  chipText: {
    fontSize: 13,
    color: '#00D4FF',
    fontWeight: '500'
  },
  inputCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2A3A',
    minHeight: 120,
    justifyContent: 'space-between'
  },
  textInput: {
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 10
  },
  inputActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E2A3A',
    paddingTop: 10,
    marginTop: 6
  },
  micButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#0A0E1A',
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0A0E1A',
    borderWidth: 1,
    borderColor: '#1E2A3A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  tooltipContainer: {
    marginTop: 8,
    backgroundColor: '#1E2A3A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  tooltipText: {
    color: '#00D4FF',
    fontSize: 12
  },
  bubbleRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: 14
  },
  msgBubble: {
    backgroundColor: '#1E2A3A',
    padding: 12,
    borderRadius: 12,
    borderTopRightRadius: 2,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  msgBubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20
  },
  errorCard: {
    backgroundColor: '#2D1515',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D32F2F',
    marginBottom: 20
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D32F2F'
  },
  errorText: {
    fontSize: 13,
    color: '#FFAAAA',
    lineHeight: 18
  },
  agentCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2A3A',
    marginBottom: 20
  },
  agentCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 14
  },
  agentStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1E2A3A'
  },
  stepRowActive: {
    borderLeftWidth: 3,
    borderLeftColor: '#00D4FF',
    borderColor: '#1E2A3A'
  },
  stepRowDone: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    borderColor: '#1E2A3A'
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#374151',
    marginRight: 12
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  stepSubtitle: {
    fontSize: 11,
    color: '#8892A4',
    marginTop: 2
  },
  stepStatus: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textMuted: {
    color: '#4B5563'
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1F2937',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 12
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00D4FF',
    borderRadius: 2
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 6
  },
  processingText: {
    fontSize: 12,
    color: '#8892A4'
  },
  loaderDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  loaderDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00D4FF'
  },
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2A3A',
    marginBottom: 20
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#1E2A3A',
    marginVertical: 12
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  resultLabel: {
    fontSize: 13,
    color: '#8892A4',
    flex: 1
  },
  resultValue: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 1.2
  },
  resultBlock: {
    marginBottom: 12
  },
  alertText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#00D4FF',
    marginTop: 4,
    lineHeight: 18
  },
  bulletSection: {
    marginTop: 10,
    marginBottom: 4
  },
  bulletTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8892A4',
    marginBottom: 4
  },
  bulletItem: {
    fontSize: 12,
    color: '#D1D5DB',
    marginLeft: 8,
    marginBottom: 3,
    lineHeight: 16
  },
  livesImpacted: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00D4FF'
  },
  mapCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E2A3A',
    overflow: 'hidden'
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10
  },
  mapContainer: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden'
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  hospitalMarker: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  incidentMarkerContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  markerPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D32F2F'
  },
  markerCenterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D32F2F',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  }
});
