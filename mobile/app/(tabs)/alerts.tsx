import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, TouchableOpacity, StatusBar, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Web Compatibility Mock
let MapView: any = View;
let Marker: any = View;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.warn("Maps failed to load", e);
  }
}

const C = {
  bg: '#F5F6FA', surface: '#FFFFFF', surfaceEl: '#F0F1F5',
  primary: '#2563EB', primaryLight: '#DBEAFE', accent: '#059669', accentLight: '#D1FAE5',
  critical: '#DC2626', criticalLight: '#FEE2E2', high: '#D97706', highLight: '#FEF3C7',
  text: '#111827', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
};

const { width } = Dimensions.get('window');

const MOCK_ALERTS = [
  {
    id: 1, time: '2 min ago', icon: 'water-outline' as const,
    title: 'Flash Flood — G-10 Markaz',
    message: 'Flash flood in G-10. Avoid Markaz road. Use Srinagar Highway alternate.',
    severity: 'critical', location: 'G-10, Islamabad',
    coords: { latitude: 33.6800, longitude: 73.0150 }
  },
  {
    id: 2, time: '15 min ago', icon: 'car-outline' as const,
    title: 'Traffic Disruption — Blue Area',
    message: 'Heavy congestion on Jinnah Ave due to waterlogging. Expect 45+ min delays.',
    severity: 'high', location: 'Blue Area, Islamabad',
    coords: { latitude: 33.7100, longitude: 73.0600 }
  },
  {
    id: 3, time: '1 hour ago', icon: 'cloud-outline' as const,
    title: 'Heavy Rain Warning — Islamabad',
    message: 'Met department: 80-100mm rainfall expected next 3 hours. Flash flood advisory.',
    severity: 'high', location: 'Islamabad / Rawalpindi',
    coords: { latitude: 33.6844, longitude: 73.0479 }
  },
  {
    id: 4, time: '3 hours ago', icon: 'flash-outline' as const,
    title: 'Power Outage — Sectors G-8 to G-11',
    message: 'IESCO reports transformer fault. Estimated restoration: 4-6 hours.',
    severity: 'medium', location: 'G-8 to G-11, Islamabad',
    coords: { latitude: 33.6850, longitude: 73.0250 }
  },
  {
    id: 5, time: '5 hours ago', icon: 'checkmark-circle-outline' as const,
    title: 'Road Blockage Cleared — F-10',
    message: 'Fallen tree removed from F-10 Markaz road. Traffic flow restored.',
    severity: 'low', location: 'F-10, Islamabad',
    coords: { latitude: 33.6950, longitude: 73.0050 }
  },
];

const MOCK_SAFE_ZONES = [
  {
    id: 'sz1',
    title: 'Fatima Jinnah Park Shelter',
    message: 'Medical camp, food, and water available. 400 capacity.',
    coords: { latitude: 33.7020, longitude: 73.0180 }
  },
  {
    id: 'sz2',
    title: 'F-9 Sports Complex',
    message: 'Temporary emergency shelter. High ground.',
    coords: { latitude: 33.7080, longitude: 73.0120 }
  },
  {
    id: 'sz3',
    title: 'G-8 Medical Triage',
    message: 'PIMS Hospital emergency overflow camp.',
    coords: { latitude: 33.6930, longitude: 73.0500 }
  }
];

const sevColor = (s: string) => {
  switch (s) { case 'critical': return C.critical; case 'high': return C.high;
    case 'medium': return C.primary; default: return C.accent; }
};
const sevBg = (s: string) => {
  switch (s) { case 'critical': return C.criticalLight; case 'high': return C.highLight;
    case 'medium': return C.primaryLight; default: return C.accentLight; }
};

export default function AlertsScreen() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.headerCard}>
          <View style={s.headerRow}>
            <Ionicons name="map-outline" size={18} color={C.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.headerTitle}>Live Crisis Map</Text>
              <Text style={s.headerSub}>Active emergencies & Safe Zones</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={s.legendBadge}>
                <View style={[s.legendDot, { backgroundColor: C.critical }]} />
                <Text style={s.legendText}>Alert</Text>
              </View>
              <View style={[s.legendBadge, { borderColor: C.accent, backgroundColor: C.accentLight }]}>
                <View style={[s.legendDot, { backgroundColor: C.accent }]} />
                <Text style={[s.legendText, { color: C.accent }]}>Safe</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Map View */}
        <View style={s.mapContainer}>
          <MapView
            style={s.map}
            initialRegion={{
              latitude: 33.6844,
              longitude: 73.0479,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
            showsUserLocation={true}
          >
            {MOCK_ALERTS.map((alert) => (
              <Marker
                key={`alert-${alert.id}`}
                coordinate={alert.coords}
                title={alert.title}
                description={alert.message}
                pinColor={sevColor(alert.severity)}
              />
            ))}
            {MOCK_SAFE_ZONES.map((zone) => (
              <Marker
                key={zone.id}
                coordinate={zone.coords}
                title={`🛡️ ${zone.title}`}
                description={zone.message}
                pinColor={C.accent} // Green
              />
            ))}
          </MapView>
        </View>

        <View style={s.feedSectionHeader}>
          <Text style={s.feedSectionTitle}>Live Broadcasts</Text>
          <View style={s.liveIndicator}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {MOCK_ALERTS.map((alert) => (
            <View key={alert.id} style={s.feedCard}>
              {/* Header */}
              <View style={s.feedHeader}>
                <View style={s.ciroAvatar}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={s.feedAuthor}>CIRO System</Text>
                    <Ionicons name="checkmark-circle" size={12} color={C.primary} />
                  </View>
                  <Text style={s.feedTime}>{alert.time}</Text>
                </View>
                <View style={[s.sevPill, { backgroundColor: sevBg(alert.severity) }]}>
                  <Text style={[s.sevPillText, { color: sevColor(alert.severity) }]}>
                    {alert.severity.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Body */}
              <Text style={s.feedTitle}>{alert.title}</Text>
              <Text style={s.feedMessage}>{alert.message}</Text>
              
              <View style={s.feedLocRow}>
                <Ionicons name="location-outline" size={12} color={C.primary} />
                <Text style={s.feedLocation}>{alert.location}</Text>
              </View>

              {/* Footer Actions */}
              <View style={s.feedFooter}>
                <TouchableOpacity style={s.feedAction}>
                  <Ionicons name="share-social-outline" size={16} color={C.textSec} />
                  <Text style={s.feedActionText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.feedAction}>
                  <Ionicons name="shield-half-outline" size={16} color={C.textSec} />
                  <Text style={s.feedActionText}>I'm Safe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.feedAction}>
                  <Ionicons name="map-outline" size={16} color={C.primary} />
                  <Text style={[s.feedActionText, { color: C.primary, fontWeight: '600' }]}>Route</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 14 },

  headerCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1,
    borderColor: C.border, marginBottom: 10 },
  mapContainer: { height: 200, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: C.border },
  map: { width: '100%', height: '100%' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 11, color: C.textSec, marginTop: 1 },
  legendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.criticalLight, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: C.criticalLight },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  legendText: { fontSize: 9, fontWeight: '700', color: C.critical },

  feedSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
  feedSectionTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', marginRight: 4 },
  liveText: { fontSize: 9, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },

  feedCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  feedHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  ciroAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  feedAuthor: { fontSize: 14, fontWeight: '700', color: C.text },
  feedTime: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  sevPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  sevPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  feedTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
  feedMessage: { fontSize: 13, color: C.textSec, lineHeight: 19, marginBottom: 10 },
  
  feedLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, backgroundColor: C.surfaceEl, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  feedLocation: { fontSize: 11, color: C.primary, fontWeight: '600' },

  feedFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, paddingHorizontal: 8 },
  feedAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedActionText: { fontSize: 12, color: C.textSec, fontWeight: '500' },
});
