import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { app_url } from '../url';

export default function ResourcesScreen() {
  const [tab, setTab] = useState('hospitals');
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData(tab);
  }, [tab]);

  const fetchData = async (type) => {
    try {
      const endpoint = type === 'hospitals' ? '/api/hospitals' : '/api/cooling-centers';
      const res = await fetch(`${app_url}${endpoint}`);
      const json = await res.json();
      if (Array.isArray(json)) setData(json);
    } catch (e) {
      console.log('Error', e);
    }
  };

  const renderItem = ({ item }) => {
    if (tab === 'hospitals') {
      const isFull = item.status === 'full';
      return (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.area}>{item.area}</Text>
          <View style={styles.row}>
            <Text style={styles.stats}>Beds: {item.emergency_beds_available}/{item.emergency_beds_total}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isFull ? '#D32F2F' : '#2E7D32' }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      );
    } else {
      const isOpen = item.status === 'open';
      return (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.area}>{item.area}</Text>
          <View style={styles.row}>
            <Text style={styles.stats}>Occupancy: {item.current_occupancy}/{item.capacity}</Text>
            {item.has_medical_staff && <Text style={styles.staffBadge}>Medical Staff</Text>}
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, tab === 'hospitals' && styles.activeTab]} onPress={() => setTab('hospitals')}>
          <Text style={[styles.tabText, tab === 'hospitals' && styles.activeTabText]}>Hospitals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'cooling' && styles.activeTab]} onPress={() => setTab('cooling')}>
          <Text style={[styles.tabText, tab === 'cooling' && styles.activeTabText]}>Cooling Centers</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  tabContainer: { flexDirection: 'row', padding: 16, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#FF6F00' },
  tabText: { color: '#888888', fontWeight: 'bold' },
  activeTabText: { color: '#FF6F00' },
  card: { backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12 },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  area: { color: '#888888', fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stats: { color: '#CCCCCC', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  staffBadge: { color: '#FF6F00', fontSize: 12, fontWeight: 'bold', borderColor: '#FF6F00', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }
});
