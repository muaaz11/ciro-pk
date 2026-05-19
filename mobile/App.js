import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { app_url } from './url';
import { isExpoGo } from './utils/environment';
import { socket } from './utils/socket';

import HomeScreen from './screens/HomeScreen';
import AlertsScreen from './screens/AlertsScreen';
import ResourcesScreen from './screens/ResourcesScreen';
import AgentTraceScreen from './screens/AgentTraceScreen';
import MapScreen from './screens/MapScreen';
import AmbulanceScreen from './screens/AmbulanceScreen';
import VoiceCommandScreen from './screens/VoiceCommandScreen';
import CrisisReportScreen from './screens/CrisisReportScreen';

// Conditionally require expo-notifications only outside of Expo Go to prevent SDK 53 crash
let Notifications = null;
if (!isExpoGo()) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.log('[App] Failed to load expo-notifications:', e);
  }
}


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MyTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D32F2F',
    background: '#0A0A0A',
    card: '#1A1A1A',
    text: '#FFFFFF',
    border: '#1A1A1A',
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1A1A1A', shadowColor: 'transparent', elevation: 0 },
        headerTintColor: '#FFFFFF',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'AgentTrace') iconName = focused ? 'terminal' : 'terminal-outline';
          else if (route.name === 'DriverHub') iconName = focused ? 'car' : 'car-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#D32F2F',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#1A1A1A', borderTopWidth: 0 },
      })}
    >
   <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false, title: 'Home' }} />
      <Tab.Screen name="AgentTrace" component={AgentTraceScreen} options={{ title: 'AI Trace' }} />
      <Tab.Screen name="DriverHub" component={AmbulanceScreen} options={{ title: 'Driver Hub' }} />
     <Tab.Screen
  name="CrisisReport" // Name unique rakhein takay navigation crash na ho
  component={VoiceCommandScreen}
  options={{
    headerShown: false, // Yeh top bar aur uska name text completely gayab kar dega
    tabBarLabel: 'Crisis Report',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="mic" color={color} size={size} />
    ),
  }}
/>

    </Tab.Navigator>
  );
}

if (Notifications && Notifications.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo() || !Notifications) {
    console.warn('[Push Notifications Bypassed] Bypassing native push notification token generation inside Expo Go to prevent crashes on SDK 53+. Real push alerts require a standalone development build.');
    return 'mock_expo_go_push_token';
  }

  if (!Device.isDevice) return null; // Must be real device

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '002c918f-014e-474e-8a50-902a4fe37e0a',
  });

  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('heatwave-alerts', {
      name: 'Heatwave Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D32F2F',
      sound: 'default',
    });
  }

  return token;
}

export default function App() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token && token !== 'mock_expo_go_push_token') {
        fetch(`${app_url}/api/notifications/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, userId: 'citizen_' + Date.now() }),
        }).catch(err => console.log('Token registration failed:', err));
      }
    });
  }, []);

  useEffect(() => {
    socket.on('heatwave_warning', ({ temperature, condition }) => {
      if (isExpoGo()) {
        const title = condition === 'EXTREME' ? '🚨 HEATWAVE EMERGENCY' : '⚠️ Heat Alert';
        const body = condition === 'EXTREME' 
          ? `Danger! ${temperature}°C recorded. Stay indoors, drink cold water. Do NOT go outside.`
          : `Heat warning: ${temperature}°C. Stay hydrated. Avoid outdoor activity.`;
        setToast({ title, body, condition });
      }
    });

    return () => {
      socket.off('heatwave_warning');
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="VoiceCommand" component={VoiceCommandScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Custom Toast Fallback Banner for Expo Go testing */}
      {toast && (
        <View style={[styles.toastContainer, { borderColor: toast.condition === 'EXTREME' ? '#D32F2F' : '#FF9800' }]}>
          <View style={styles.toastHeader}>
            <Text style={[styles.toastTitle, { color: toast.condition === 'EXTREME' ? '#D32F2F' : '#FF9800' }]}>
              {toast.title}
            </Text>
            <TouchableOpacity onPress={() => setToast(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>
          <Text style={styles.toastBody}>{toast.body}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toastTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  toastBody: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
});
