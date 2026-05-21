import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Switch, TouchableOpacity, ActivityIndicator, Linking, Alert, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ciroApi from '../../services/api';

const C = {
  bg: '#F5F6FA', surface: '#FFFFFF', surfaceEl: '#F0F1F5',
  primary: '#2563EB', primaryLight: '#DBEAFE', accent: '#059669', accentLight: '#D1FAE5',
  critical: '#DC2626', criticalLight: '#FEE2E2',
  text: '#111827', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
};

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverReachable, setServerReachable] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
    loadUser();

    const subscription = DeviceEventEmitter.addListener('auth-state-change', () => {
      loadUser();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('ciro_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Verified Citizen Account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('ciro_user');
            DeviceEventEmitter.emit('auth-state-change');
          }
        }
      ]
    );
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const st = await ciroApi.getStatus();
      setStatus(st);
      setServerReachable(true);
    } catch {
      setStatus(null);
      setServerReachable(false);
    } finally {
      setLoading(false);
    }
  };

  // Derive real API statuses from backend response
  const getApiStatus = (name: string): 'active' | 'offline' | 'loading' => {
    if (loading) return 'loading';
    if (!serverReachable || !status?.tools) return 'offline';
    const key = name === 'Gemini AI' ? 'gemini_ai'
      : name === 'Google Maps' ? 'google_maps'
      : name === 'OpenWeatherMap' ? 'openweathermap'
      : name === 'Firebase' ? 'firebase'
      : '';
    return status.tools[key] ? 'active' : 'offline';
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Server Status Banner */}
        <View style={[s.guideCard, { backgroundColor: serverReachable ? C.accentLight : C.criticalLight }]}>
          <Ionicons
            name={serverReachable ? 'checkmark-circle' : 'cloud-offline-outline'}
            size={14}
            color={serverReachable ? C.accent : C.critical}
          />
          <Text style={[s.guideText, { color: serverReachable ? '#065F46' : C.critical }]}>
            {loading
              ? 'Checking server connection...'
              : serverReachable
                ? `Connected to CIRO server. ${status?.pipeline_runs || 0} pipeline runs completed.`
                : 'Cannot reach CIRO server. Check that the backend is running.'}
          </Text>
          {!loading && (
            <TouchableOpacity onPress={fetchStatus} style={{ padding: 4 }}>
              <Ionicons name="refresh-outline" size={14} color={serverReachable ? C.accent : C.critical} />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile Card */}
        {user && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="shield-checkmark" size={14} color={C.accent} />
              <Text style={[s.label, { color: C.accent }]}>VERIFIED CITIZEN ACCOUNT</Text>
            </View>
            <InfoRow icon="person-outline" label="Full Name" value={user.name} />
            <InfoRow icon="card-outline" label="CNIC Number" value={user.cnic} />
            <InfoRow icon="call-outline" label="Phone Number" value={user.phone} />
            
            <TouchableOpacity 
              style={[s.serverUrlRow, { marginTop: 14, backgroundColor: C.criticalLight }]}
              onPress={handleLogout}
            >
              <Text style={{ fontSize: 12, color: C.critical, fontWeight: '600' }}>Log Out of Account</Text>
              <Ionicons name="log-out-outline" size={14} color={C.critical} />
            </TouchableOpacity>
          </View>
        )}

        {/* System Info */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle-outline" size={14} color={C.primary} />
            <Text style={s.label}>SYSTEM INFO</Text>
          </View>
          <InfoRow icon="cube-outline" label="System" value="CIRO v1.0.0" />
          <InfoRow icon="git-network-outline" label="Orchestration" value="6-Agent Pipeline" valueColor={C.primary} />
          <InfoRow icon="hardware-chip-outline" label="LLM Backend" value="Gemini 2.0 Flash" />
          <InfoRow icon="shield-checkmark-outline" label="Agents" value={`${status?.tools_active || 0}/${status?.tools_total || 0} APIs Active`} valueColor={C.accent} />
          <InfoRow icon="server-outline" label="Backend" value={serverReachable ? 'Online' : 'Offline'} valueColor={serverReachable ? C.accent : C.critical} />
          <InfoRow icon="analytics-outline" label="Pipeline Runs" value={String(status?.pipeline_runs || 0)} last />
        </View>

        {/* Notifications */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="notifications-outline" size={14} color={C.primary} />
            <Text style={s.label}>NOTIFICATIONS</Text>
          </View>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Push Notifications</Text>
              <Text style={s.toggleSub}>Receive crisis alerts via push</Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled}
              trackColor={{ false: C.surfaceEl, true: C.primaryLight }} thumbColor={pushEnabled ? C.primary : '#ccc'} />
          </View>
          <View style={[s.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>SMS Alerts</Text>
              <Text style={s.toggleSub}>Receive SMS for critical crises</Text>
            </View>
            <Switch value={smsEnabled} onValueChange={setSmsEnabled}
              trackColor={{ false: C.surfaceEl, true: C.primaryLight }} thumbColor={smsEnabled ? C.primary : '#ccc'} />
          </View>
        </View>

        {/* Coverage */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="map-outline" size={14} color={C.primary} />
            <Text style={s.label}>COVERAGE REGION</Text>
          </View>
          <View style={s.regionGrid}>
            {(status?.cities_supported || ['islamabad', 'lahore', 'karachi']).map((city: string) => (
              <View key={city} style={s.regionChip}>
                <Ionicons name="location-outline" size={13} color={C.primary} />
                <Text style={s.regionText}>{city.charAt(0).toUpperCase() + city.slice(1)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* API Connections — LIVE STATUS */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="key-outline" size={14} color={C.primary} />
            <Text style={s.label}>API CONNECTIONS</Text>
            {loading && <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 8 }} />}
          </View>
          <ApiRow icon="diamond-outline" name="Gemini AI" status={getApiStatus('Gemini AI')} />
          <ApiRow icon="map-outline" name="Google Maps" status={getApiStatus('Google Maps')} />
          <ApiRow icon="cloud-outline" name="OpenWeatherMap" status={getApiStatus('OpenWeatherMap')} />
          <ApiRow icon="flame-outline" name="Firebase" status={getApiStatus('Firebase')} last />
        </View>

        {/* How to Use */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="book-outline" size={14} color={C.primary} />
            <Text style={s.label}>HOW TO USE CIRO</Text>
          </View>
          <HowToStep num="1" title="Dashboard" desc="View real-time crisis data. Civilian mode shows alerts & SOS. Responder mode runs the AI pipeline." />
          <HowToStep num="2" title="Report" desc="Submit structured crisis reports. Pick location on map or manually. Reports are analyzed by the AI pipeline." />
          <HowToStep num="3" title="Ask CIRO" desc="Chat with the AI assistant. Get real-time safety advice powered by Gemini and live crisis data." />
          <HowToStep num="4" title="Alerts" desc="Live alert feed from all sources. Share alerts, mark yourself safe, and get navigation routes." last />
        </View>

        {/* Backend URL */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="link-outline" size={14} color={C.primary} />
            <Text style={s.label}>SERVER</Text>
          </View>
          <TouchableOpacity
            style={s.serverUrlRow}
            onPress={() => Linking.openURL(__DEV__ ? `${ciroApi.baseUrl}/docs` : '#')}
          >
            <Text style={s.serverUrlText}>
              {__DEV__ ? ciroApi.baseUrl : 'Production Server'}
            </Text>
            <Ionicons name="open-outline" size={14} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>CIRO — Crisis Intelligence & Response</Text>
          <Text style={s.footerSub}>Built for Pakistan · 2026</Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ──

function InfoRow({ icon, label, value, valueColor, last }: any) {
  return (
    <View style={[rs.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={rs.infoLabel}>{label}</Text>
      <Text style={[rs.infoVal, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function ApiRow({ icon, name, status, last }: any) {
  const isActive = status === 'active';
  const isLoading = status === 'loading';
  return (
    <View style={[rs.apiRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={rs.apiName}>{name}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={C.primary} />
      ) : (
        <View style={[rs.apiPill, { backgroundColor: isActive ? C.accentLight : C.criticalLight }]}>
          <View style={[rs.apiDot, { backgroundColor: isActive ? C.accent : C.critical }]} />
          <Text style={[rs.apiPillText, { color: isActive ? C.accent : C.critical }]}>
            {isActive ? 'ACTIVE' : 'OFFLINE'}
          </Text>
        </View>
      )}
    </View>
  );
}

function HowToStep({ num, title, desc, last }: any) {
  return (
    <View style={[rs.howRow, last && { borderBottomWidth: 0 }]}>
      <View style={rs.howNum}>
        <Text style={rs.howNumText}>{num}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={rs.howTitle}>{title}</Text>
        <Text style={rs.howDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── Styles ──

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 14 },

  guideCard: { flexDirection: 'row', backgroundColor: C.primaryLight, borderRadius: 8,
    padding: 10, marginBottom: 12, alignItems: 'center', gap: 8 },
  guideText: { fontSize: 10, color: C.textSec, lineHeight: 15, flex: 1 },

  card: { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1,
    borderColor: C.border, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 1 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  toggleSub: { fontSize: 10, color: C.textMuted, marginTop: 1 },

  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceEl,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  regionText: { fontSize: 12, fontWeight: '600', color: C.text },

  serverUrlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surfaceEl, padding: 10, borderRadius: 8 },
  serverUrlText: { fontSize: 12, color: C.primary, fontWeight: '600', fontFamily: 'monospace' },

  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  footerSub: { fontSize: 10, color: C.textMuted, marginTop: 3 },
});

const rs = StyleSheet.create({
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  infoLabel: { fontSize: 12, color: C.textSec, flex: 1 },
  infoVal: { fontSize: 12, fontWeight: '600', color: C.text },

  apiRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  apiName: { fontSize: 12, color: C.text, flex: 1 },
  apiPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 4, gap: 4 },
  apiDot: { width: 5, height: 5, borderRadius: 3 },
  apiPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },

  howRow: { flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, alignItems: 'flex-start' },
  howNum: { width: 22, height: 22, borderRadius: 6, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center' },
  howNumText: { fontSize: 11, fontWeight: '700', color: C.primary },
  howTitle: { fontSize: 12, fontWeight: '600', color: C.text },
  howDesc: { fontSize: 10, color: C.textSec, lineHeight: 15, marginTop: 2 },
});
