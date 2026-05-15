import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import AlertsScreen from './screens/AlertsScreen';
import ResourcesScreen from './screens/ResourcesScreen';
import AgentTraceScreen from './screens/AgentTraceScreen';

const Tab = createBottomTabNavigator();

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

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={MyTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: '#1A1A1A', shadowColor: 'transparent', elevation: 0 },
            headerTintColor: '#FFFFFF',
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Alerts') iconName = focused ? 'warning' : 'warning-outline';
              else if (route.name === 'Resources') iconName = focused ? 'medkit' : 'medkit-outline';
              else if (route.name === 'AgentTrace') iconName = focused ? 'terminal' : 'terminal-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#D32F2F',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: { backgroundColor: '#1A1A1A', borderTopWidth: 0 },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'CIRO Dashboard' }} />
          <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Live Alerts' }} />
          <Tab.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Resources' }} />
          <Tab.Screen name="AgentTrace" component={AgentTraceScreen} options={{ title: 'AI Trace' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
