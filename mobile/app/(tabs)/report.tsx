import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Animated, ActivityIndicator, StatusBar, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Web Compatibility Mock
let MapView: any = View;
let Location: any = {
  requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0 } })
};

if (Platform.OS !== 'web') {
  try {
    MapView = require('react-native-maps').default;
    Location = require('expo-location');
  } catch (e) {
    console.warn("Native modules failed to load", e);
  }
}
import ciroApi from '../../services/api';

const { width } = Dimensions.get('window');
const C = {
  bg: '#F5F6FA', surface: '#FFFFFF', surfaceEl: '#F0F1F5',
  primary: '#2563EB', primaryLight: '#DBEAFE', accent: '#059669', accentLight: '#D1FAE5',
  critical: '#DC2626', criticalLight: '#FEE2E2', high: '#D97706', highLight: '#FEF3C7',
  text: '#111827', textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
};

const crisisIcon = (t: string): keyof typeof Ionicons.glyphMap => {
  switch (t) { case 'urban_flooding': return 'water-outline'; case 'fire': return 'flame-outline';
    case 'road_blockage': return 'car-outline'; case 'accident': return 'alert-circle-outline';
    case 'infrastructure_failure': return 'flash-outline'; case 'heatwave': return 'thermometer-outline';
    default: return 'warning-outline'; }
};
const sevColor = (s: string) => {
  switch (s) { case 'critical': return C.critical; case 'high': return C.high;
    case 'medium': return C.primary; default: return C.accent; }
};
const sevBg = (s: string) => {
  switch (s) { case 'critical': return C.criticalLight; case 'high': return C.highLight;
    case 'medium': return C.primaryLight; default: return C.accentLight; }
};

const QUICK_REPORTS = [
  { label: 'Flooding', text: 'G-10 mein pani bhar gaya hai, gaariyan phans gayi hain', icon: 'water-outline' as const },
  { label: 'Fire', text: 'F-8 mein aag lag gayi hai, dhuan bohat hai', icon: 'flame-outline' as const },
  { label: 'Traffic', text: 'Blue Area mein bohot bada jam lag gaya hai', icon: 'car-outline' as const },
  { label: 'Accident', text: 'Srinagar Highway par bada hadsa ho gaya hai', icon: 'alert-circle-outline' as const },
  { label: 'Power', text: 'G-9 mein bijli nahi hai, andhera ho gaya', icon: 'flash-outline' as const },
  { label: 'Heatwave', text: 'Lahore mein bohot garmi hai, loo chal rahi hai', icon: 'thermometer-outline' as const },
];

const PAKISTAN_CITIES = [
  { name: 'Islamabad', towns: ['F-6', 'F-7', 'F-8', 'G-8', 'G-9', 'G-10', 'G-11', 'Blue Area', 'I-8', 'DHA'] },
  { name: 'Lahore', towns: ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Bahria Town', 'Walled City'] },
  { name: 'Karachi', towns: ['Clifton', 'DHA', 'Gulshan-e-Iqbal', 'Saddar', 'Korangi', 'Lyari', 'Tariq Road'] },
  { name: 'Rawalpindi', towns: ['Saddar', 'Bahria Town', 'Satellite Town', 'Peshawar Road', 'Chaklala'] },
  { name: 'Peshawar', towns: ['Hayatabad', 'Saddar', 'University Road', 'Cantonment', 'Warsak Road'] }
];

export default function ReportScreen() {
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const CATEGORIES = [
    { id: 'flooding', icon: 'water-outline', label: 'Flooding' },
    { id: 'fire', icon: 'flame-outline', label: 'Fire' },
    { id: 'medical', icon: 'medkit-outline', label: 'Medical' },
    { id: 'traffic', icon: 'car-outline', label: 'Traffic' },
    { id: 'power', icon: 'flash-outline', label: 'Power' },
    { id: 'other', icon: 'warning-outline', label: 'Other' },
  ];

  const [mapRegion, setMapRegion] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [useMap, setUseMap] = useState(false);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Manual Entry States
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showTownMenu, setShowTownMenu] = useState(false);

  const getCurrentLocation = async () => {
    setLoadingLoc(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      setLoadingLoc(false);
      return;
    }

    let loc = await Location.getCurrentPositionAsync({});
    const newRegion = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setMapRegion(newRegion);
    setLocation(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
    setUseMap(true);
    setLoadingLoc(false);
  };

  const submitReport = async (reportText?: string) => {
    let input = reportText;
    if (!input) {
      let finalLoc = location;
      if (!useMap) {
        if (!selectedCity || !selectedTown) return; // Prevent submission if manual location is incomplete
        finalLoc = `${addressLine ? addressLine + ', ' : ''}${selectedTown}, ${selectedCity}`;
      }
      if (!category || !finalLoc.trim() || !description.trim()) return;
      input = `[${category.toUpperCase()}] Location: ${finalLoc}. Details: ${description}`;
    }
    
    setLoading(true);
    setSubmitted(false);
    const response = await ciroApi.quickReport(input);
    setResult(response);
    setLoading(false);
    setSubmitted(true);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const cr = result?.crisis_report;
  
  const isFormValid = category !== '' && 
    (useMap ? location.trim().length > 0 : (selectedCity !== '' && selectedTown !== '')) && 
    description.trim().length > 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={C.primary} />
          <Text style={s.infoText}>
            Fill out the structured form below or use a quick report. The AI pipeline will automatically classify, locate, and assess the crisis.
          </Text>
        </View>

        {/* Structured Form */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="document-text-outline" size={14} color={C.primary} />
            <Text style={s.cardLabel}>STRUCTURED REPORT FORM</Text>
          </View>

          <Text style={s.inputLabel}>1. Category</Text>
          <View style={s.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.categoryChip, category === cat.id && s.categoryChipActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons name={cat.icon as any} size={14} color={category === cat.id ? '#fff' : C.textSec} />
                <Text style={[s.categoryText, category === cat.id && s.categoryTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>2. Exact Location</Text>
          <View style={s.locBtnRow}>
            <TouchableOpacity style={s.locBtn} onPress={getCurrentLocation} activeOpacity={0.7}>
              {loadingLoc ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="navigate" size={16} color={C.primary} />}
              <Text style={s.locBtnText}>Use My Location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.locBtn} onPress={() => setUseMap(!useMap)} activeOpacity={0.7}>
              <Ionicons name="map-outline" size={16} color={C.primary} />
              <Text style={s.locBtnText}>{useMap ? 'Hide Map' : 'Pick on Map'}</Text>
            </TouchableOpacity>
          </View>

          {useMap && (
            <View style={s.mapPickerContainer}>
              <MapView
                style={s.mapView}
                region={mapRegion}
                onRegionChangeComplete={(r: any) => {
                  setMapRegion(r);
                  if (r && r.latitude) {
                    setLocation(`${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`);
                  }
                }}
              />
              <View style={s.centerPin} pointerEvents="none">
                <Ionicons name="location" size={36} color={C.critical} />
              </View>
            </View>
          )}

          {!useMap && (
            <View style={s.manualLocationBox}>
              <View style={{ flexDirection: 'row', gap: 10, zIndex: 20 }}>
                {/* City Dropdown */}
                <View style={{ flex: 1 }}>
                  <TouchableOpacity style={s.dropdownBtn} onPress={() => { setShowCityMenu(!showCityMenu); setShowTownMenu(false); }} activeOpacity={0.7}>
                    <Text style={s.dropdownBtnText}>{selectedCity || 'Select City'}</Text>
                    <Ionicons name={showCityMenu ? "chevron-up" : "chevron-down"} size={14} color={C.textSec} />
                  </TouchableOpacity>
                  {showCityMenu && (
                    <View style={s.dropdownMenu}>
                      {PAKISTAN_CITIES.map(city => (
                        <TouchableOpacity key={city.name} style={s.dropdownItem} onPress={() => { setSelectedCity(city.name); setSelectedTown(''); setShowCityMenu(false); }}>
                          <Text style={s.dropdownItemText}>{city.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Town Dropdown */}
                <View style={{ flex: 1 }}>
                  <TouchableOpacity style={[s.dropdownBtn, !selectedCity && s.dropdownBtnDisabled]} onPress={() => { if(selectedCity) setShowTownMenu(!showTownMenu); setShowCityMenu(false); }} activeOpacity={0.7}>
                    <Text style={s.dropdownBtnText}>{selectedTown || 'Select Town'}</Text>
                    <Ionicons name={showTownMenu ? "chevron-up" : "chevron-down"} size={14} color={C.textSec} />
                  </TouchableOpacity>
                  {showTownMenu && selectedCity && (
                    <View style={s.dropdownMenu}>
                      <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                        {PAKISTAN_CITIES.find(c => c.name === selectedCity)?.towns.map(town => (
                          <TouchableOpacity key={town} style={s.dropdownItem} onPress={() => { setSelectedTown(town); setShowTownMenu(false); }}>
                            <Text style={s.dropdownItemText}>{town}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <TextInput
                style={[s.inputField, { marginTop: 10, marginBottom: 0, zIndex: 1 }]}
                placeholder="Address Line (e.g. Street 4, House 12)"
                placeholderTextColor={C.textMuted}
                value={addressLine}
                onChangeText={setAddressLine}
              />
            </View>
          )}

          <Text style={[s.inputLabel, { marginTop: 12 }]}>3. Incident Description</Text>
          <TextInput
            style={[s.inputField, { minHeight: 80 }]}
            placeholder="Describe the situation in English or Roman Urdu..."
            placeholderTextColor={C.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[s.submitBtn, !isFormValid && { opacity: 0.5 }]}
            onPress={() => submitReport()}
            disabled={loading || !isFormValid}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={s.submitBtnInner}>
                <Ionicons name="send-outline" size={14} color="#fff" />
                <Text style={s.submitText}>Submit Report for AI Analysis</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Reports */}
        <View style={s.quickHeader}>
          <Ionicons name="flash-outline" size={14} color={C.textSec} />
          <Text style={s.quickLabel}>QUICK REPORT</Text>
        </View>
        <Text style={s.quickSub}>Tap to instantly send a pre-built crisis signal</Text>
        <View style={s.quickGrid}>
          {QUICK_REPORTS.map((qr, i) => (
            <TouchableOpacity
              key={i}
              style={s.quickCard}
              onPress={() => submitReport(qr.text)}
              disabled={loading}
              activeOpacity={0.6}
            >
              <Ionicons name={qr.icon} size={20} color={C.primary} />
              <Text style={s.quickCardLabel}>{qr.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result Preview */}
        {submitted && cr && (
          <Animated.View style={[s.resultCard, { opacity: fadeAnim }]}>
            <View style={s.resultHeader}>
              <View style={[s.resultIconBox, { backgroundColor: sevBg(cr.severity) }]}>
                <Ionicons name={crisisIcon(cr.crisis_type)} size={20} color={sevColor(cr.severity)} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.resultType}>
                  {cr.crisis_type?.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="location-outline" size={11} color={C.textSec} />
                  <Text style={s.resultLoc}>{cr.location}</Text>
                </View>
              </View>
              <View style={[s.sevBadge, { backgroundColor: sevBg(cr.severity) }]}>
                <Text style={[s.sevText, { color: sevColor(cr.severity) }]}>
                  {cr.severity?.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={s.resultMetrics}>
              <Text style={s.resultConf}>
                Confidence: {(cr.confidence_score * 100).toFixed(0)}%
              </Text>
              <Text style={s.resultAffected}>
                {cr.estimated_affected_people?.toLocaleString()} affected
              </Text>
            </View>
            <Text style={s.resultReason}>{cr.reasoning}</Text>
            <View style={s.viewDashRow}>
              <Ionicons name="arrow-forward-circle-outline" size={14} color={C.primary} />
              <Text style={s.viewDash}>View full pipeline on Dashboard tab</Text>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 14 },

  infoCard: { flexDirection: 'row', backgroundColor: C.primaryLight, borderRadius: 8,
    padding: 10, marginBottom: 12, alignItems: 'flex-start', gap: 8 },
  infoText: { fontSize: 11, color: C.textSec, lineHeight: 16, flex: 1 },

  card: { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1,
    borderColor: C.border, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardLabel: { fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 1 },
  inputField: { backgroundColor: C.surfaceEl, borderRadius: 8, padding: 12, color: C.text,
    fontSize: 13, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: C.text, marginBottom: 6 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceEl,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, gap: 4 },
  categoryChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryText: { fontSize: 11, color: C.textSec, fontWeight: '500' },
  categoryTextActive: { color: '#fff', fontWeight: '700' },
  submitBtn: { backgroundColor: C.primary, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  submitBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  submitText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  locBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  locBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.surfaceEl, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  locBtnText: { fontSize: 11, fontWeight: '600', color: C.text },
  mapPickerContainer: { height: 180, width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: C.border, position: 'relative', zIndex: 1 },
  mapView: { flex: 1 },
  centerPin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -36, zIndex: 10 },

  manualLocationBox: { backgroundColor: C.bg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, zIndex: 20 },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  dropdownBtnDisabled: { backgroundColor: C.surfaceEl, opacity: 0.5 },
  dropdownBtnText: { fontSize: 12, color: C.text },
  dropdownMenu: { position: 'absolute', top: 40, left: 0, right: 0, backgroundColor: C.surface, borderRadius: 6, borderWidth: 1, borderColor: C.border, zIndex: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.surfaceEl },
  dropdownItemText: { fontSize: 12, color: C.text },

  quickHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 2, marginBottom: 2, zIndex: 1 },
  quickLabel: { fontSize: 10, fontWeight: '700', color: C.textSec, letterSpacing: 1 },
  quickSub: { fontSize: 10, color: C.textMuted, marginBottom: 10, paddingLeft: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  quickCard: { width: (width - 52) / 3, backgroundColor: C.surface, borderRadius: 10, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 6 },
  quickCardLabel: { fontSize: 10, fontWeight: '600', color: C.text },

  resultCard: { backgroundColor: C.surface, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: C.accent },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  resultIconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultType: { fontSize: 12, fontWeight: '700', color: C.text },
  resultLoc: { fontSize: 10, color: C.textSec },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  resultMetrics: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  resultConf: { fontSize: 11, color: C.accent, fontWeight: '600' },
  resultAffected: { fontSize: 11, color: C.textSec },
  resultReason: { fontSize: 11, color: C.textSec, lineHeight: 16, fontStyle: 'italic', marginBottom: 10 },
  viewDashRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDash: { fontSize: 11, color: C.primary, fontWeight: '600' },
});
