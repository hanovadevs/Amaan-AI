import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F5F6FA', surface: '#FFFFFF', surfaceEl: '#F0F1F5',
  primary: '#2563EB', primaryLight: '#DBEAFE', accent: '#059669', accentLight: '#D1FAE5',
  critical: '#DC2626',
  text: '#111827', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
};

export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = React.useState(true);
  const [smsEnabled, setSmsEnabled] = React.useState(false);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Navigation Guide */}
        <View style={s.guideCard}>
          <Ionicons name="help-circle-outline" size={14} color={C.primary} />
          <Text style={s.guideText}>
            Configure your CIRO experience below. API connections are required for live data — simulation mode works without keys.
          </Text>
        </View>

        {/* System Info */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle-outline" size={14} color={C.primary} />
            <Text style={s.label}>SYSTEM INFO</Text>
          </View>
          <InfoRow icon="cube-outline" label="System" value="CIRO v1.0.0" />
          <InfoRow icon="git-network-outline" label="Orchestration" value="Google Antigravity" valueColor={C.primary} />
          <InfoRow icon="hardware-chip-outline" label="LLM Backend" value="Gemini 2.0 Flash" />
          <InfoRow icon="shield-checkmark-outline" label="Agents" value="6 Active" valueColor={C.accent} />
          <InfoRow icon="server-outline" label="Backend" value="FastAPI / Cloud Run" />
          <InfoRow icon="cloud-outline" label="Database" value="Firebase Firestore" last />
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
              <Text style={s.toggleLabel}>SMS Alerts (Simulated)</Text>
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
            {['Islamabad', 'Lahore', 'Karachi'].map((city) => (
              <View key={city} style={s.regionChip}>
                <Ionicons name="location-outline" size={13} color={C.primary} />
                <Text style={s.regionText}>{city}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* API Config */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="key-outline" size={14} color={C.primary} />
            <Text style={s.label}>API CONNECTIONS</Text>
          </View>
          <ApiRow icon="diamond-outline" name="Gemini AI" status="placeholder" />
          <ApiRow icon="map-outline" name="Google Maps" status="placeholder" />
          <ApiRow icon="cloud-outline" name="OpenWeatherMap" status="placeholder" />
          <ApiRow icon="flame-outline" name="Firebase" status="placeholder" last />
        </View>

        {/* How to Use */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="book-outline" size={14} color={C.primary} />
            <Text style={s.label}>HOW TO USE CIRO</Text>
          </View>
          <HowToStep num="1" title="Dashboard" desc="Run the demo scenario or view active crisis results. The full 6-agent pipeline runs in real-time." />
          <HowToStep num="2" title="Report" desc="Type a crisis report in English or Roman Urdu. Use quick-report buttons for common scenarios." />
          <HowToStep num="3" title="Alerts" desc="Browse active crisis alerts for your city. Tap to expand details and location info." />
          <HowToStep num="4" title="Settings" desc="Configure notifications, API keys, and coverage regions." last />
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>CIRO — Crisis Intelligence & Response</Text>
          <Text style={s.footerSub}>Hackathon Build · May 2026 · Google Antigravity</Text>
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
  return (
    <View style={[rs.apiRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={rs.apiName}>{name}</Text>
      <View style={[rs.apiPill, { backgroundColor: isActive ? C.accentLight : '#FEF3C7' }]}>
        <View style={[rs.apiDot, { backgroundColor: isActive ? C.accent : '#D97706' }]} />
        <Text style={[rs.apiPillText, { color: isActive ? C.accent : '#D97706' }]}>
          {status.toUpperCase()}
        </Text>
      </View>
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
    padding: 10, marginBottom: 12, alignItems: 'flex-start', gap: 8 },
  guideText: { fontSize: 10, color: C.textSec, lineHeight: 15, flex: 1 },

  card: { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1,
    borderColor: C.border, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 1 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: C.text },
  toggleSub: { fontSize: 10, color: C.textMuted, marginTop: 1 },

  regionGrid: { flexDirection: 'row', gap: 8 },
  regionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceEl,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  regionText: { fontSize: 12, fontWeight: '600', color: C.text },

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
