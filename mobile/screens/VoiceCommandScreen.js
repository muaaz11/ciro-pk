import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  TextInput,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { app_url } from '../url';

let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = (event, callback) => {
  useEffect(() => {
    // Safe no-op stub for environments where native speech module is missing
  }, [event, callback]);
};

try {
  const SpeechModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = SpeechModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = SpeechModule.useSpeechRecognitionEvent;
} catch (e) {
  console.log("ExpoSpeechRecognition native module not found, STT disabled.");
}

const { width } = Dimensions.get('window');

function detectLanguage(text) {
  if (!text) return null;
  // Urdu script detection
  if (/[\u0600-\u06FF]/.test(text)) return 'اردو';
  // Roman Urdu detection (common words)
  const romanUrduWords = ['hai', 'mein', 'ka', 'ki', 'ko', 'se', 'pe', 'wala', 'gaya', 'hua', 'ho', 'kar', 'raha', 'hoga'];
  const words = text.toLowerCase().split(' ');
  const matchCount = words.filter(w => romanUrduWords.includes(w)).length;
  if (matchCount >= 2) return 'Roman Urdu';
  return 'EN';
}

export default function VoiceCommandScreen({ navigation }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState('Tap to start');
  const [hasPermission, setHasPermission] = useState(null);
  const [isSttAvailable, setIsSttAvailable] = useState(true);
  const [error, setError] = useState('');

  const userLocation = useLocation();

  // Animation values
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  // Silence timeout tracking
  const silenceTimerRef = useRef(null);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      handleSilenceTimeout();
    }, 10000);
  };

  const handleSilenceTimeout = () => {
    try {
      if (ExpoSpeechRecognitionModule) {
        ExpoSpeechRecognitionModule.abort();
      }
    } catch (e) {
      console.log("Error aborting on silence:", e);
    }
    setIsListening(false);
    setStatusText("No speech detected. Try again.");
  };

  const checkAvailabilityAndPermission = async () => {
    try {
      if (!ExpoSpeechRecognitionModule) {
        setIsSttAvailable(false);
        return;
      }
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      setIsSttAvailable(available);

      if (available) {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        setHasPermission(permission.granted);
      }
    } catch (e) {
      console.log("Error checking STT status:", e);
      setIsSttAvailable(false);
    }
  };

  useEffect(() => {
    checkAvailabilityAndPermission();
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      try {
        if (ExpoSpeechRecognitionModule) {
          ExpoSpeechRecognitionModule.abort();
        }
      } catch (e) {}
    };
  }, []);

  // Set up Speech Recognition Events
  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setStatusText("Listening...");
    resetSilenceTimer();
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    resetSilenceTimer();
    const text = event.results[0]?.transcript || "";
    setTranscript(text);
    if (text.trim()) {
      setStatusText("Ready to send");
    } else {
      setStatusText("Listening...");
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    console.log("Speech recognition error event:", event.error);
    if (event.error === 'no-speech') {
      setStatusText("No speech detected. Try again.");
    } else {
      setStatusText("Error occurred. Try again.");
    }
  });

  // Sonar Ring Ripple Effect
  useEffect(() => {
    if (isListening) {
      const animateRing = (anim, delay) => {
        anim.setValue(0);
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            })
          ])
        ).start();
      };

      animateRing(ring1, 0);
      animateRing(ring2, 500);
      animateRing(ring3, 1000);
    } else {
      ring1.stopAnimation();
      ring2.stopAnimation();
      ring3.stopAnimation();
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
    }
  }, [isListening]);

  // Transcript Box Glow Border Animation
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          })
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isListening]);

  const toggleListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      setIsSttAvailable(false);
      return;
    }
    if (isListening) {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        console.log("Error stopping STT:", e);
      }
      setIsListening(false);
    } else {
      if (hasPermission === false) {
        checkAvailabilityAndPermission();
        return;
      }
      setTranscript('');
      setStatusText("Starting...");
      try {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (permission.granted) {
          setHasPermission(true);
          ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
          });
        } else {
          setHasPermission(false);
        }
      } catch (e) {
        console.log("Error starting STT:", e);
        setStatusText("Error starting speech recognition.");
      }
    }
  };

  const handleSend = async () => {
    if (!transcript.trim()) return;

    try {
      const response = await fetch(`${app_url}/api/signals/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          location_mentioned: 'Karachi',
          signal_type: 'voice_report',
          source: 'voice',
          mock_temperature: 44,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        })
      });

      if (!response.ok) {
        showErrorToast("Failed to reach CIRO server. Check connection.");
        return;
      }

      navigation.navigate('MainTabs', {
        screen: 'AgentTrace',
        params: { fromVoice: true, voiceText: transcript }
      });
    } catch (e) {
      showErrorToast("Failed to reach CIRO server. Check connection.");
    }
  };

  const showErrorToast = (msg) => {
    setError(msg);
    setTimeout(() => {
      setError('');
    }, 3000);
  };

  const selectChip = (starterPhrase) => {
    setTranscript(starterPhrase);
    setStatusText("Ready to send");
  };

  // Interpolations
  const ringScale = (anim) => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2]
  });

  const ringOpacity = (anim) => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0]
  });

  const borderColor = isListening
    ? glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#00D4FF', '#0088AA']
      })
    : '#1E2A3A';

  const chips = [
    { label: "Heatwave 🌡️", phrase: "Extreme heat wave reported at " },
    { label: "Flood 🌊", phrase: "Flash flood reported at " },
    { label: "Accident 🚗", phrase: "Road accident reported at " },
    { label: "Road Block 🚧", phrase: "Road blocked at " },
    { label: "Fire 🔥", phrase: "Fire breakout reported at " },
    { label: "Other ⚠️", phrase: "Emergency reported at " }
  ];

  const examplePrompts = [
    "Flash flood on Shahrae Faisal for 30 mins",
    "Garmi ki wajah se 3 log behosh ho gaye",
    "Accident on Korangi Road, traffic jam"
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#00D4FF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Voice Report</Text>
          <Text style={styles.headerSubtitle}>Speak in any language</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {hasPermission === false && (
          <View style={styles.permissionCard}>
            <Ionicons name="mic-off" size={32} color="#FF4444" />
            <Text style={styles.permissionTitle}>Microphone Permission Required</Text>
            <Text style={styles.permissionText}>
              CIRO needs microphone and speech recognition access to transcribe your emergency voice reports.
            </Text>
            <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsButton}>
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.chipsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {chips.map((chip, idx) => (
              <TouchableOpacity key={idx} style={styles.chip} onPress={() => selectChip(chip.phrase)}>
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Animated.View style={[styles.transcriptBox, { borderColor: borderColor }]}>
          {transcript.trim() !== '' && (
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeText}>{detectLanguage(transcript)}</Text>
            </View>
          )}

          {isSttAvailable ? (
            <ScrollView style={styles.transcriptScrollContainer} contentContainerStyle={{ flexGrow: 1 }}>
              {transcript ? (
                <Text style={styles.transcriptText}>{transcript}</Text>
              ) : (
                <Text style={styles.placeholderText}>
                  Tap the microphone and describe the emergency...
                </Text>
              )}
            </ScrollView>
          ) : (
            <View style={styles.fallbackContainer}>
              <Text style={styles.fallbackNotice}>
                Speech recognition not available on this device. Please type your report.
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                placeholder="Describe the emergency here..."
                placeholderTextColor="#8892A4"
                value={transcript}
                onChangeText={(text) => {
                  setTranscript(text);
                  setStatusText(text.trim() ? "Ready to send" : "Tap to start");
                }}
              />
            </View>
          )}
        </Animated.View>

        <Text style={styles.statusText}>{statusText}</Text>

        {isSttAvailable && (
          <View style={styles.micWrapper}>
            <View style={styles.micButtonOuter}>
              {isListening && (
                <>
                  <Animated.View style={[styles.ring, { transform: [{ scale: ringScale(ring1) }], opacity: ringOpacity(ring1) }]} />
                  <Animated.View style={[styles.ring, { transform: [{ scale: ringScale(ring2) }], opacity: ringOpacity(ring2) }]} />
                  <Animated.View style={[styles.ring, { transform: [{ scale: ringScale(ring3) }], opacity: ringOpacity(ring3) }]} />
                </>
              )}
              <TouchableOpacity
                onPress={toggleListening}
                style={[styles.micButton, isListening && styles.micButtonListening]}
              >
                <Ionicons name="mic" size={32} color={isListening ? "#FFFFFF" : "#00D4FF"} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {transcript.trim() !== '' && !isListening && (
          <View style={styles.sendSection}>
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Analyze with CIRO Agents →</Text>
            </TouchableOpacity>
            <Text style={styles.sendButtonSub}>Will be processed by Antigravity Orchestrator</Text>
          </View>
        )}

        {transcript.trim() === '' && (
          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Try saying:</Text>
            {examplePrompts.map((promptText, idx) => (
              <TouchableOpacity key={idx} style={styles.exampleCard} onPress={() => selectChip(promptText)}>
                <Text style={styles.exampleText}>"{promptText}"</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {error !== '' && (
        <View style={styles.errorToast}>
          <Ionicons name="warning" size={20} color="#FF4444" style={{ marginRight: 8 }} />
          <Text style={styles.errorToastText}>{error}</Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3A',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#8892A4',
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  permissionCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },
  permissionText: {
    color: '#8892A4',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  settingsButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chipsSection: {
    marginBottom: 16,
  },
  chipsScroll: {
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2A3A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  transcriptBox: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderRadius: 16,
    height: 200,
    padding: 16,
    position: 'relative',
    marginBottom: 16,
  },
  langBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#00D4FF22',
    borderColor: '#00D4FF',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 10,
  },
  langBadgeText: {
    color: '#00D4FF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  transcriptScrollContainer: {
    flex: 1,
  },
  transcriptText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderText: {
    color: '#8892A4',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  fallbackContainer: {
    flex: 1,
  },
  fallbackNotice: {
    color: '#FFCC00',
    fontSize: 12,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  statusText: {
    color: '#8892A4',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  micWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  micButtonOuter: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  micButtonListening: {
    backgroundColor: '#00D4FF',
    borderColor: '#FFFFFF',
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
    borderWidth: 1.5,
    zIndex: 1,
  },
  sendSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  sendButton: {
    backgroundColor: '#00D4FF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonText: {
    color: '#0A0E1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendButtonSub: {
    color: '#8892A4',
    fontSize: 11,
    marginTop: 8,
  },
  examplesSection: {
    marginTop: 20,
  },
  examplesTitle: {
    color: '#8892A4',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  exampleCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2A3A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  exampleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  errorToast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1C1625',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  errorToastText: {
    color: '#FF4444',
    fontSize: 14,
    flex: 1,
  }
});
