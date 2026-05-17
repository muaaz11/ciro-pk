import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import io from 'socket.io-client';
import { app_url } from '../url';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const [ambulance, setAmbulance] = useState(null);
  const [incident, setIncident] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const karachiRegion = {
    latitude: 24.90,
    longitude: 67.08,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  useEffect(() => {
    const socket = io(app_url);

    socket.on('agent_status', ({ agent, status, data }) => {
       if (agent === 'Execution' && status === 'completed') {
         setIsSimulating(true);
       }
    });

    socket.on('simulation_tick', ({ step, progress, ambulance_position, incident_position, hospital_position, hospital_name }) => {
      setIsSimulating(true);
      if (progress > 0 && progress < 100) {
        setAmbulance({ ...ambulance_position, progress });
        setIncident({ ...incident_position, title: 'Heatstroke Incident' });
        setHospital({ ...hospital_position, name: hospital_name });
      } else if (progress === 100) {
        setAmbulance({ ...incident_position, progress: 100 });
        setTimeout(() => {
          setIsSimulating(false);
          setAmbulance(null);
          setIncident(null);
          setHospital(null);
        }, 8000); // Keep display visible for 8 seconds
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        initialRegion={karachiRegion}
        userInterfaceStyle="dark"
      >
        {/* Render Active Incident */}
        {incident && (
          <Marker 
            coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
            title={incident.title}
          >
             <View style={styles.pulseContainer}>
               <Ionicons name="warning" size={30} color="#D32F2F" />
             </View>
          </Marker>
        )}

        {/* Render Moving Ambulances */}
        {ambulance && (
          <Marker 
            coordinate={{ latitude: ambulance.latitude, longitude: ambulance.longitude }}
            title={`Ambulance - En Route (${Math.round(ambulance.progress)}%)`}
          >
            <View style={styles.ambulanceMarker}>
               <Ionicons name="medical" size={16} color="#FFF" />
            </View>
          </Marker>
        )}

        {/* Render Hospital Source */}
        {hospital && (
          <Marker 
            coordinate={{ latitude: hospital.latitude, longitude: hospital.longitude }}
            title={hospital.name}
          >
            <Ionicons name="business" size={30} color="#4CAF50" />
          </Marker>
        )}

        {/* Path line from Hospital to Incident */}
        {ambulance && incident && hospital && (
          <Polyline
            coordinates={[
              { latitude: hospital.latitude, longitude: hospital.longitude }, // Hospital
              { latitude: incident.latitude, longitude: incident.longitude } // Incident
            ]}
            strokeColor="#4CAF50"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Crisis Command Map</Text>
        <Text style={styles.overlayText}>
          {isSimulating && ambulance ? `Active Dispatch: Ambulance heading to hospital` : 'Monitoring City Sensors...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  map: { width: '100%', height: '100%' },
  pulseContainer: { 
    backgroundColor: 'rgba(211, 47, 47, 0.3)', 
    padding: 10, 
    borderRadius: 30, 
    borderWidth: 2, 
    borderColor: '#D32F2F' 
  },
  ambulanceMarker: { 
    backgroundColor: '#4CAF50', 
    padding: 6, 
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: '#000',
    elevation: 5
  },
  overlay: { 
    position: 'absolute', 
    top: 20, 
    left: 20, 
    right: 20, 
    backgroundColor: 'rgba(10, 10, 10, 0.85)', 
    padding: 15, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333'
  },
  overlayTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  overlayText: { color: '#4CAF50', marginTop: 5, fontSize: 14 }
});
