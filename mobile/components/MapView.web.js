import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapView({ children, style, initialRegion }) {
  return (
    <View style={[styles.mapContainer, style]}>
      {/* Dynamic Grid Background for high-tech dashboard feel */}
      <View style={styles.gridBg} />
      
      {/* Compass/Radar Graphic */}
      <View style={styles.radarRing1} />
      <View style={styles.radarRing2} />
      
      {/* Map Labels */}
      <Text style={styles.mapLabel}>KARACHI TACTICAL REGION</Text>
      <Text style={styles.gridLabel}>GRID 24.90N / 67.08E</Text>
      
      {children}
    </View>
  );
}

export function Marker({ children, coordinate, title }) {
  // We can roughly map the coordinates to percentages for visual simulation on the grid
  // Karachi center: lat 24.90, lng 67.08
  // Delta: ~0.1 degrees
  const latOffset = coordinate ? (coordinate.latitude - 24.84) / 0.12 : 0.5;
  const lngOffset = coordinate ? (coordinate.longitude - 67.02) / 0.12 : 0.5;
  
  // Constrain bounds between 5% and 95%
  const top = `${Math.min(Math.max((1 - latOffset) * 100, 5), 95)}%`;
  const left = `${Math.min(Math.max(lngOffset * 100, 5), 95)}%`;

  return (
    <View style={[styles.markerContainer, { top, left }]}>
      {children}
      {title && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{title}</Text>
        </View>
      )}
    </View>
  );
}

export function Polyline({ coordinates, strokeColor, strokeWidth }) {
  // Web fallback polyline: we don't render a line, or we can just render a simple connection status
  return null;
}

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#0F0F12',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  gridBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    borderWidth: 1,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    // We simulate a grid by using repeating lines in web CSS if needed, 
    // but a clean styling looks fantastic
  },
  radarRing1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.15)',
    borderStyle: 'dashed',
  },
  radarRing2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
    borderStyle: 'dashed',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  gridLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    color: '#666',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  markerContainer: {
    position: 'absolute',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  tooltip: {
    position: 'absolute',
    bottom: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    whiteSpace: 'nowrap',
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'monospace',
  }
});
