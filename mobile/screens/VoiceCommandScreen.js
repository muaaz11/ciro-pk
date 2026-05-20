import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { app_url } from '../url';
import { isExpoGo } from '../utils/environment';

// Dynamically load expo-speech-recognition to prevent import crashes in Expo Go
let ExpoSpeechRecognitionModule = null;
if (!isExpoGo()) {
  try {
    ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch (e) {
    console.warn('Could not load expo-speech-recognition:', e);
  }
}

const { width } = Dimensions.get('window');

function detectLanguage(text) {
  if (!text) return null;
  if (/[\u0600-\u06FF]/.test(text)) return 'اردو';
  const romanUrduWords = ['hai', 'mein', 'ka', 'ki', 'ko', 'se', 'pe', 'wala', 'gaya', 'hua', 'ho', 'kar', 'raha', 'hoga', 'garmi', 'pani', 'log', 'bohot'];
  const words = text.toLowerCase().split(' ');
  const matchCount = words.filter(w => romanUrduWords.includes(w)).length;
  if (matchCount >= 2) return 'Roman Urdu';
  return 'EN';
}

export default function VoiceCommandScreen({ navigation }) {
  const [transcript, setTranscript] = useState('');
  const [statusText, setStatusText] = useState('Type your report or tap the mic 🎤');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef(null);
  const userLocation = useLocation();

  // Pulse animation for mic hint
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Set up Speech Recognition Listeners dynamically (avoiding hooks that fail in Expo Go)
  useEffect(() => {
    if (isExpoGo() || !ExpoSpeechRecognitionModule) return;

    let startSub;
    let endSub;
    let errorSub;
    let resultSub;

    try {
      startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
        setIsListening(true);
        setStatusText('Listening... Speak now!');
      });
      
      endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
        setIsListening(false);
      });
      
      errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
        console.warn('Speech recognition error:', event.error, event.message);
        setError(event.message || 'Speech recognition error');
        setIsListening(false);
        setStatusText('Speech recognition stopped due to error.');
      });
      
      resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        if (event.results && event.results[0]) {
          const text = event.results[0].transcript || '';
          setTranscript(text);
          setStatusText(text.trim() ? 'Ready to send ✓' : 'Listening... Speak now!');
        }
      });
    } catch (err) {
      console.warn('Failed to attach speech recognition listeners:', err);
    }

    return () => {
      if (startSub) startSub.remove();
      if (endSub) endSub.remove();
      if (errorSub) errorSub.remove();
      if (resultSub) resultSub.remove();
    };
  }, []);

  useEffect(() => {
    // Subtle pulse on the mic button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (isFocused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isFocused]);

  const borderColor = isFocused
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#00D4FF', '#0066AA'] })
    : '#1E2A3A';

  const handleMicPress = async () => {
    if (isExpoGo()) {
      // Expo Go Fallback: Focus input area for keyboard dictation
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setStatusText('Expo Go Fallback: Tap 🎤 on your keyboard to speak!');
      return;
    }

    if (!ExpoSpeechRecognitionModule) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setStatusText('Direct speech not available. Tap 🎤 on keyboard.');
      return;
    }

    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        setStatusText('Stopped listening.');
      } else {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          setError('Microphone permission is required.');
          return;
        }
        setTranscript('');
        setStatusText('Initializing mic...');
        ExpoSpeechRecognitionModule.start({
          interimResults: true,
          continuous: false,
        });
        setIsListening(true);
      }
    } catch (err) {
      console.warn('Error starting/stopping speech recognition:', err);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      setStatusText('Tap 🎤 on your keyboard to speak!');
    }
  };

  const handleSend = async () => {
    if (!transcript.trim()) return;
    setIsSubmitting(true);
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
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
        }),
      });

      if (!response.ok) {
        showErrorToast('Failed to reach CIRO server. Check connection.');
        setIsSubmitting(false);
        return;
      }

      navigation.navigate('MainTabs', {
        screen: 'AgentTrace',
        params: { fromVoice: true, voiceText: transcript },
      });
    } catch (e) {
      showErrorToast('Failed to reach CIRO server. Check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showErrorToast = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 3000);
  };

  const selectChip = (phrase) => {
    setTranscript(phrase);
    setStatusText('Ready to send');
    if (inputRef.current) inputRef.current.focus();
  };

  const chips = [
    { label: 'Heatwave 🌡️', phrase: 'Extreme heat wave reported at ' },
    { label: 'Flood 🌊', phrase: 'Flash flood reported at ' },
    { label: 'Accident 🚗', phrase: 'Road accident reported at ' },
    { label: 'Road Block 🚧', phrase: 'Road blocked at ' },
    { label: 'Fire 🔥', phrase: 'Fire breakout reported at ' },
    { label: 'Other ⚠️', phrase: 'Emergency reported at ' },
  ];

  const examplePrompts = [
    'Severe heatwave reported in George Town for the past 30 minutes, temperatures reaching dangerous levels.',
    'G-10 mein shade aur pani ki kami hai, log garmi ki wajah se behaal ho rahe hain.',
    'Flash flood on Shahrae Faisal for 30 mins',
    'Accident on Korangi Road, traffic jam',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Home');
              }
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#00D4FF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Voice Report</Text>
            <Text style={styles.headerSubtitle}>Speak or type in any language</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mic Button — direct speech recognition or keyboard fallback */}
          <View style={styles.micSection}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                onPress={handleMicPress} 
                style={[styles.micButton, isListening && styles.micButtonActive]} 
                activeOpacity={0.8}
              >
                <Ionicons name={isListening ? "stop" : "mic"} size={36} color={isListening ? "#FF4444" : "#00D4FF"} />
              </TouchableOpacity>
            </Animated.View>
            <Text style={[styles.micHint, isListening && { color: '#FF4444' }]}>
              {isListening ? "Listening... Speak now!" : "Tap mic to start direct voice report"}
            </Text>
            <Text style={styles.micSubHint}>
              {isExpoGo() 
                ? "Running on Expo Go: Keyboard 🎤 dictation fallback active" 
                : "Direct speech-to-text enabled"}
            </Text>
          </View>

          {/* Chips */}
          <View style={styles.chipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {chips.map((chip, idx) => (
                <TouchableOpacity key={idx} style={styles.chip} onPress={() => selectChip(chip.phrase)}>
                  <Text style={styles.chipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Box */}
          <Animated.View style={[styles.inputBox, { borderColor }]}>
            {transcript.trim() !== '' && (
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>{detectLanguage(transcript)}</Text>
              </View>
            )}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              multiline
              numberOfLines={6}
              placeholder="Describe the emergency situation..."
              placeholderTextColor="#4A5568"
              value={transcript}
              onChangeText={(text) => {
                setTranscript(text);
                setStatusText(text.trim() ? 'Ready to send ✓' : 'Type your report or use keyboard mic 🎤');
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              textAlignVertical="top"
              autoCorrect
              spellCheck
            />
            {transcript.trim() !== '' && (
              <TouchableOpacity onPress={() => { setTranscript(''); setStatusText('Type your report or use keyboard mic 🎤'); }} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color="#4A5568" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Status */}
          <Text style={[styles.statusText, transcript.trim() ? styles.statusReady : null]}>
            {statusText}
          </Text>

          {/* Send Button */}
          {transcript.trim() !== '' && (
            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendButton, isSubmitting && styles.sendButtonDisabled]}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <Text style={styles.sendButtonText}>Sending to CIRO...</Text>
              ) : (
                <Text style={styles.sendButtonText}>Analyze with CIRO Agents →</Text>
              )}
            </TouchableOpacity>
          )}
          {transcript.trim() !== '' && (
            <Text style={styles.sendButtonSub}>Processed by Antigravity Orchestrator</Text>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR TRY AN EXAMPLE</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Example Prompts */}
          <View style={styles.examplesSection}>
            {examplePrompts.map((promptText, idx) => (
              <TouchableOpacity key={idx} style={styles.exampleCard} onPress={() => selectChip(promptText)} activeOpacity={0.7}>
                <Ionicons name="flash" size={14} color="#00D4FF" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.exampleText}>"{promptText}"</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Keyboard mic instructions */}
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>💡 How to use Voice</Text>
            <Text style={styles.instructionStep}>1. Tap the mic button above</Text>
            <Text style={styles.instructionStep}>2. Your keyboard will open</Text>
            <Text style={styles.instructionStep}>3. Tap the 🎤 mic on your keyboard</Text>
            <Text style={styles.instructionStep}>4. Speak your emergency report</Text>
            <Text style={styles.instructionStep}>5. Text appears automatically</Text>
            <Text style={styles.instructionNote}>Works in English, Urdu & Roman Urdu</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Toast */}
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
  backButton: { padding: 4 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#8892A4', fontSize: 12, marginTop: 2 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 60,
  },

  // Mic section
  micSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  micButtonActive: {
    borderColor: '#FF4444',
    shadowColor: '#FF4444',
    backgroundColor: '#1E1616',
  },
  micHint: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  micSubHint: {
    color: '#4A5568',
    fontSize: 12,
    marginTop: 4,
  },

  // Chips
  chipsSection: { marginBottom: 16 },
  chipsScroll: { paddingVertical: 4 },
  chip: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2A3A',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { color: '#FFFFFF', fontSize: 13 },

  // Input box
  inputBox: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderRadius: 16,
    minHeight: 160,
    padding: 14,
    position: 'relative',
    marginBottom: 12,
  },
  langBadge: {
    position: 'absolute',
    top: 10,
    right: 40,
    backgroundColor: '#00D4FF22',
    borderColor: '#00D4FF',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 10,
  },
  langBadgeText: { color: '#00D4FF', fontSize: 11, fontWeight: 'bold' },
  textInput: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 130,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  clearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },

  // Status
  statusText: {
    color: '#4A5568',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  statusReady: {
    color: '#00D4FF',
    fontWeight: '600',
  },

  // Send
  sendButton: {
    backgroundColor: '#00D4FF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#0A0E1A', fontSize: 16, fontWeight: 'bold' },
  sendButtonSub: { color: '#4A5568', fontSize: 11, textAlign: 'center', marginBottom: 20 },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E2A3A' },
  dividerText: { color: '#4A5568', fontSize: 11, marginHorizontal: 12, fontWeight: '600' },

  // Examples
  examplesSection: { marginBottom: 20 },
  exampleCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E2A3A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exampleText: { color: '#8892A4', fontSize: 13, fontStyle: 'italic', flex: 1, lineHeight: 18 },

  // Instructions
  instructionCard: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#1E2A3A',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  instructionTitle: { color: '#00D4FF', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  instructionStep: { color: '#8892A4', fontSize: 13, marginBottom: 5, lineHeight: 18 },
  instructionNote: { color: '#4A5568', fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  // Error toast
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
    elevation: 5,
  },
  errorToastText: { color: '#FF4444', fontSize: 14, flex: 1 },
});