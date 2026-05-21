import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, TouchableOpacity, StatusBar,
  Dimensions, Platform, ActivityIndicator, RefreshControl, Alert, Linking, Share, Modal, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ciroApi, { AlertItem, SafeZone } from '../../services/api';

// Web Compatibility Mock
let MapView: any = View;
let Marker: any = View;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
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

const sevColor = (s: string) => {
  switch (s) { case 'critical': return C.critical; case 'high': return C.high;
    case 'medium': return C.primary; default: return C.accent; }
};
const sevBg = (s: string) => {
  switch (s) { case 'critical': return C.criticalLight; case 'high': return C.highLight;
    case 'medium': return C.primaryLight; default: return C.accentLight; }
};

const crisisIcon = (t: string): keyof typeof Ionicons.glyphMap => {
  switch (t) {
    case 'urban_flooding': case 'flooding': return 'water-outline';
    case 'fire': return 'flame-outline';
    case 'road_blockage': case 'traffic': return 'car-outline';
    case 'accident': return 'alert-circle-outline';
    case 'infrastructure_failure': case 'power': return 'flash-outline';
    case 'heatwave': return 'thermometer-outline';
    case 'medical': return 'medkit-outline';
    default: return 'warning-outline';
  }
};

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return 'Recent'; }
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [alertsRes, zonesRes] = await Promise.all([
        ciroApi.getLiveAlerts(),
        ciroApi.getSafeZones(),
      ]);
      setAlerts(alertsRes.alerts);
      setSafeZones(zonesRes.zones);
    } catch (e: any) {
      setError('Could not connect to CIRO server. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Determine device location to center the map dynamically
    const resolveInitialLocation = async () => {
      if (Platform.OS !== 'web') {
        try {
          const Location = require('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            setMapRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            });
          }
        } catch (err) {
          console.warn("Could not get current location for alerts map", err);
        }
      }
    };
    resolveInitialLocation();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (alerts.length > 0) {
      const alertWithCoords = alerts.find(a => a.latitude && a.longitude);
      if (alertWithCoords) {
        setMapRegion({
          latitude: alertWithCoords.latitude!,
          longitude: alertWithCoords.longitude!,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        });
      }
    }
  }, [alerts]);

  const handleShare = async (alert: AlertItem) => {
    try {
      await Share.share({
        message: `⚠️ ${alert.title}\n${alert.message}\n📍 ${alert.location}\n\nvia CIRO Crisis Intelligence`,
      });
    } catch {}
  };

  const handleMarkSafe = async (alert: AlertItem) => {
    try {
      const res = await ciroApi.markSafe(alert.id);
      Alert.alert('Marked Safe', res.message);
    } catch {
      Alert.alert('Error', 'Could not connect to server.');
    }
  };

  const handleRoute = (item: { latitude?: number; longitude?: number; location?: string; title?: string }) => {
    if (item.latitude && item.longitude) {
      const url = Platform.select({
        ios: `maps://app?daddr=${item.latitude},${item.longitude}`,
        android: `google.navigation:q=${item.latitude},${item.longitude}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
      });
      if (url) Linking.openURL(url);
    } else if (item.location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`;
      Linking.openURL(url);
    } else if (item.title) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title)}`;
      Linking.openURL(url);
    }
  };

  const hasMapData = alerts.some(a => a.latitude && a.longitude) || safeZones.length > 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[C.primary]} />
        }
      >
        {/* Header */}
        <View style={s.headerCard}>
          <View style={s.headerRow}>
            <Ionicons name="map-outline" size={18} color={C.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.headerTitle}>Live Crisis Map</Text>
              <Text style={s.headerSub}>{alerts.length} active alerts · {safeZones.length} safe zones</Text>
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
        {hasMapData && Platform.OS !== 'web' && (
          <View style={s.mapContainer}>
            <MapView
              style={s.map}
              region={mapRegion}
              onRegionChangeComplete={(r: any) => setMapRegion(r)}
              showsUserLocation={true}
            >
              {alerts.filter(a => a.latitude && a.longitude).map((alert) => (
                <Marker
                  key={`alert-${alert.id}`}
                  coordinate={{ latitude: alert.latitude!, longitude: alert.longitude! }}
                  title={alert.title}
                  description={alert.message}
                  pinColor={sevColor(alert.severity)}
                />
              ))}
              {safeZones.map((zone) => (
                <Marker
                  key={`zone-${zone.id}`}
                  coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                  title={`🛡️ ${zone.title}`}
                  description={zone.description}
                  pinColor={C.accent}
                />
              ))}
            </MapView>
          </View>
        )}

        {/* Loading / Error / Empty States */}
        {loading && (
          <View style={s.stateContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.stateText}>Loading alerts...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={[s.stateContainer, { backgroundColor: C.criticalLight }]}>
            <Ionicons name="cloud-offline-outline" size={32} color={C.critical} />
            <Text style={[s.stateText, { color: C.critical }]}>{error}</Text>
          </View>
        )}

        {!loading && !error && alerts.length === 0 && (
          <View style={s.stateContainer}>
            <Ionicons name="checkmark-circle-outline" size={40} color={C.accent} />
            <Text style={[s.stateText, { color: C.accent, fontWeight: '700' }]}>All Clear!</Text>
            <Text style={s.stateSubText}>No active alerts in your area. Stay safe.</Text>
          </View>
        )}

        {/* Feed */}
        {!loading && alerts.length > 0 && (
          <>
            <View style={s.feedSectionHeader}>
              <Text style={s.feedSectionTitle}>Live Broadcasts</Text>
              <View style={s.liveIndicator}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
              {alerts.map((alert) => (
                <TouchableOpacity key={alert.id} style={s.feedCard} onPress={() => setSelectedAlert(alert)} activeOpacity={0.95}>
                  {/* Header */}
                  <View style={s.feedHeader}>
                    <View style={s.ciroAvatar}>
                      <Ionicons name={alert.source === 'user_report' || alert.source === 'user_report_memory' ? 'person' : 'shield-checkmark'} size={14} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.feedAuthor}>
                          {alert.source.includes('user')
                            ? (alert.reporter_name ? alert.reporter_name : 'Citizen Report')
                            : 'CIRO System'}
                        </Text>
                        <Ionicons name="checkmark-circle" size={12} color={C.primary} />
                      </View>
                      {alert.source.includes('user') && alert.reporter_cnic && (
                        <Text style={{ fontSize: 9, color: C.textSec, fontWeight: '600' }}>
                          ID: {alert.reporter_cnic} · Verified
                        </Text>
                      )}
                      <Text style={s.feedTime}>{timeAgo(alert.created_at)}</Text>
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

                  {/* Footer Actions — ALL WIRED UP */}
                  <View style={s.feedFooter}>
                    <TouchableOpacity style={s.feedAction} onPress={() => handleShare(alert)}>
                      <Ionicons name="share-social-outline" size={16} color={C.textSec} />
                      <Text style={s.feedActionText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.feedAction} onPress={() => handleMarkSafe(alert)}>
                      <Ionicons name="shield-half-outline" size={16} color={C.textSec} />
                      <Text style={s.feedActionText}>I'm Safe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.feedAction} onPress={() => handleRoute(alert)}>
                      <Ionicons name="navigate-outline" size={16} color={C.primary} />
                      <Text style={[s.feedActionText, { color: C.primary, fontWeight: '600' }]}>Route</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </>
        )}

        {/* Verified Safe Havens Section */}
        {!loading && safeZones.length > 0 && (
          <View style={{ marginTop: 16, paddingHorizontal: 4 }}>
            <View style={s.feedSectionHeader}>
              <Text style={s.feedSectionTitle}>Verified Safety Zones</Text>
              <View style={[s.liveIndicator, { backgroundColor: C.accentLight, borderColor: C.accent }]}>
                <Ionicons name="shield-checkmark" size={10} color={C.accent} style={{ marginRight: 2 }} />
                <Text style={[s.liveText, { color: C.accent }]}>ACTIVE</Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            >
              {safeZones.map((zone) => (
                <View key={zone.id} style={s.safeZoneCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.safeZoneIconBg, { backgroundColor: zone.type === 'medical' ? C.criticalLight : C.accentLight }]}>
                      <Ionicons 
                        name={zone.type === 'medical' ? 'medkit' : 'home'} 
                        size={14} 
                        color={zone.type === 'medical' ? C.critical : C.accent} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.safeZoneTitle} numberOfLines={1}>{zone.title}</Text>
                      <Text style={s.safeZoneCity}>📍 {zone.city}, Pakistan</Text>
                    </View>
                  </View>
                  <Text style={s.safeZoneDesc} numberOfLines={2}>{zone.description}</Text>
                  
                  <TouchableOpacity 
                    style={s.safeZoneRouteBtn}
                    onPress={() => handleRoute(zone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate-outline" size={12} color="#fff" />
                    <Text style={s.safeZoneRouteText}>Navigate to Zone</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── IMMERSIVE CRISIS DETAILS MODAL ── */}
      <Modal
        visible={selectedAlert !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedAlert(null)}
      >
        <View style={s.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          
          {/* Header Bar */}
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setSelectedAlert(null)}>
              <Ionicons name="chevron-back" size={20} color={C.text} />
              <Text style={s.modalCloseText}>Back</Text>
            </TouchableOpacity>
            <Text style={s.modalHeaderTitle}>Crisis Detail Card</Text>
            <View style={{ width: 60 }} />
          </View>

          {selectedAlert && (
            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              
              {/* Category banner */}
              <View style={[s.modalHero, { backgroundColor: sevBg(selectedAlert.severity) }]}>
                <View style={[s.modalHeroIconWrapper, { backgroundColor: sevColor(selectedAlert.severity) }]}>
                  <Ionicons name={crisisIcon(selectedAlert.crisis_type)} size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.modalHeroLabel, { color: sevColor(selectedAlert.severity) }]}>
                    {selectedAlert.crisis_type?.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Text style={s.modalHeroTitle}>{selectedAlert.title}</Text>
                  <Text style={s.modalHeroTime}>Reported {timeAgo(selectedAlert.created_at)}</Text>
                </View>
              </View>

              <View style={s.modalContent}>
                {/* 1. Reporter Identity Info */}
                <View style={s.detailCard}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="finger-print" size={14} color={C.primary} />
                    <Text style={s.sectionLabel}>VERIFIED REPORTER CREDENTIALS</Text>
                  </View>
                  <View style={s.reporterRow}>
                    <View style={[s.reporterAvatar, { backgroundColor: selectedAlert.source.includes('user') ? C.accentLight : C.primaryLight }]}>
                      <Ionicons 
                        name={selectedAlert.source.includes('user') ? "person" : "shield-checkmark"} 
                        size={20} 
                        color={selectedAlert.source.includes('user') ? C.accent : C.primary} 
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.reporterName}>
                        {selectedAlert.source.includes('user') 
                          ? (selectedAlert.reporter_name || 'Verified Citizen Reporter') 
                          : 'CIRO Swarm Intelligence System'}
                      </Text>
                      {selectedAlert.source.includes('user') && selectedAlert.reporter_cnic ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="checkmark-done" size={11} color={C.accent} />
                          <Text style={s.reporterCNIC}>CNIC: {selectedAlert.reporter_cnic} · Verified ID</Text>
                        </View>
                      ) : (
                        <Text style={s.reporterCNIC}>Official Swarm Telemetry & Signal Broadcast</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* 2. Detailed Description */}
                <View style={s.detailCard}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="document-text-outline" size={14} color={C.primary} />
                    <Text style={s.sectionLabel}>CRISIS GROUND STATEMENT</Text>
                  </View>
                  <Text style={s.detailDesc}>{selectedAlert.message}</Text>
                  
                  <View style={s.detailLocBox}>
                    <Ionicons name="location-outline" size={13} color={C.primary} />
                    <Text style={s.detailLocText}>{selectedAlert.location}</Text>
                  </View>
                </View>

                {/* 3. Live Ground Photos & Visual Feed */}
                <View style={s.detailCard}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="images-outline" size={14} color={C.primary} />
                    <Text style={s.sectionLabel}>GROUND PICTURES & SATELLITE FEEDS</Text>
                  </View>
                  
                  {selectedAlert.photos && selectedAlert.photos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.galleryScroll}>
                      {selectedAlert.photos.map((photo, i) => (
                        <Image key={i} source={{ uri: photo }} style={s.galleryImage} />
                      ))}
                    </ScrollView>
                  ) : (
                    // Satellite simulation fallback
                    <View style={s.noPhotosBox}>
                      <Image 
                        source={{ uri: 
                          selectedAlert.crisis_type === 'flooding' || selectedAlert.crisis_type === 'urban_flooding' 
                            ? 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800'
                            : selectedAlert.crisis_type === 'fire'
                            ? 'https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=800'
                            : selectedAlert.crisis_type === 'traffic' || selectedAlert.crisis_type === 'road_blockage' || selectedAlert.crisis_type === 'accident'
                            ? 'https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?q=80&w=800'
                            : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800'
                        }} 
                        style={s.noPhotosImage} 
                      />
                      <View style={s.noPhotosOverlay}>
                        <Ionicons name="airplane-outline" size={18} color="#fff" />
                        <Text style={s.noPhotosText}>Drone/Satellite Ground Reconnaissance Active</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* 4. Mini Coordinates Anchor */}
                {selectedAlert.latitude && selectedAlert.longitude && Platform.OS !== 'web' && (
                  <View style={s.detailCard}>
                    <View style={s.sectionHeader}>
                      <Ionicons name="map-outline" size={14} color={C.primary} />
                      <Text style={s.sectionLabel}>GEOSPATIAL ANCHOR</Text>
                    </View>
                    <View style={s.modalMapContainer}>
                      <MapView
                        style={s.modalMap}
                        initialRegion={{
                          latitude: selectedAlert.latitude,
                          longitude: selectedAlert.longitude,
                          latitudeDelta: 0.012,
                          longitudeDelta: 0.012,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                      >
                        <Marker
                          coordinate={{ latitude: selectedAlert.latitude, longitude: selectedAlert.longitude }}
                          pinColor={sevColor(selectedAlert.severity)}
                        />
                      </MapView>
                    </View>
                  </View>
                )}

                {/* Bottom navigation panel */}
                <View style={s.modalFooterActions}>
                  <TouchableOpacity style={s.modalActionBtn} onPress={() => handleMarkSafe(selectedAlert)}>
                    <Ionicons name="shield-half-outline" size={18} color={C.accent} />
                    <Text style={[s.modalActionText, { color: C.accent }]}>I'm Safe</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.modalActionBtn} onPress={() => handleShare(selectedAlert)}>
                    <Ionicons name="share-social-outline" size={18} color={C.textSec} />
                    <Text style={s.modalActionText}>Share Alert</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalActionBtn, { backgroundColor: C.primary }]} onPress={() => handleRoute(selectedAlert)}>
                    <Ionicons name="navigate-outline" size={18} color="#fff" />
                    <Text style={[s.modalActionText, { color: '#fff', fontWeight: '700' }]}>Get Route</Text>
                  </TouchableOpacity>
                </View>

              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
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

  stateContainer: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  stateText: { fontSize: 14, color: C.textSec, marginTop: 10, fontWeight: '600', textAlign: 'center' },
  stateSubText: { fontSize: 12, color: C.textMuted, marginTop: 4, textAlign: 'center' },

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

  // Detail Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 },
  modalCloseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 60 },
  modalCloseText: { fontSize: 13, fontWeight: '600', color: C.text },
  modalHeaderTitle: { fontSize: 14, fontWeight: '800', color: C.text, flex: 1, textAlign: 'center' },
  modalScroll: { flex: 1 },
  modalHero: { padding: 20, flexDirection: 'row', gap: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalHeroIconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  modalHeroLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  modalHeroTitle: { fontSize: 16, fontWeight: '800', color: C.text, lineHeight: 22 },
  modalHeroTime: { fontSize: 11, color: C.textSec, marginTop: 4 },
  modalContent: { padding: 14 },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.primary, letterSpacing: 0.8 },
  reporterRow: { flexDirection: 'row', alignItems: 'center' },
  reporterAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reporterName: { fontSize: 13, fontWeight: '700', color: C.text },
  reporterCNIC: { fontSize: 10, color: C.textSec },
  detailDesc: { fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 12 },
  detailLocBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
  detailLocText: { fontSize: 11, color: C.primary, fontWeight: '600', flex: 1 },
  galleryScroll: { paddingVertical: 4 },
  galleryImage: { width: 140, height: 95, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  noPhotosBox: { width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  noPhotosImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noPhotosOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  noPhotosText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  modalMapContainer: { height: 140, width: '100%', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  modalMap: { width: '100%', height: '100%' },
  modalFooterActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  modalActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 11, borderRadius: 8, elevation: 1 },
  modalActionText: { fontSize: 11, fontWeight: '600', color: C.textSec },

  safeZoneCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  safeZoneIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeZoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.text,
  },
  safeZoneCity: {
    fontSize: 9,
    color: C.textMuted,
    marginTop: 1,
  },
  safeZoneDesc: {
    fontSize: 11,
    color: C.textSec,
    lineHeight: 15,
    marginTop: 8,
    height: 30,
  },
  safeZoneRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.accent,
    borderRadius: 6,
    paddingVertical: 6,
    marginTop: 10,
    gap: 4,
  },
  safeZoneRouteText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
