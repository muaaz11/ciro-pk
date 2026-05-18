import React from 'react';
import RNMapView, { Marker as RNMarker, Polyline as RNPolyline } from 'react-native-maps';

export default function MapView(props) {
  return <RNMapView {...props} />;
}

export function Marker(props) {
  return <RNMarker {...props} />;
}

export function Polyline(props) {
  return <RNPolyline {...props} />;
}
