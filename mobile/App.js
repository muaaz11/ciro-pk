import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import AlertsScreen from './screens/AlertsScreen';
import ResourcesScreen from './screens/ResourcesScreen';
import AgentTraceScreen from './screens/AgentTraceScreen';
import MapScreen from './screens/MapScreen';
import AmbulanceScreen from './screens/AmbulanceScreen';
import DemoModeScreen from './screens/DemoModeScreen';

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
              else if (route.name === 'AgentTrace') iconName = focused ? 'terminal' : 'terminal-outline';
              else if (route.name === 'DriverHub') iconName = focused ? 'car' : 'car-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#D32F2F',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: { backgroundColor: '#1A1A1A', borderTopWidth: 0 },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'CIRO Dashboard' }} />
          <Tab.Screen name="AgentTrace" component={AgentTraceScreen} options={{ title: 'AI Trace' }} />
          <Tab.Screen name="DriverHub" component={AmbulanceScreen} options={{ title: 'Driver Hub' }} />
          <Tab.Screen 
            name="DemoMode" 
            component={DemoModeScreen} 
            options={{ 
              title: 'Demo Mode',
              tabBarButton: () => null,
              headerShown: false
            }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
