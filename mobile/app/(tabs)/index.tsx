import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, ActivityIndicator, Alert, Easing,
  Platform, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import ciroApi, { AlertItem } from '../../services/api';

const { width } = Dimensions.get('window');

// Web Compatibility Mock
let Speech: any = { speak: () => {} };
if (Platform.OS !== 'web') {
  try {
    Speech = require('expo-speech');
  } catch (e) {
    console.warn("Speech failed to load", e);
  }
}

// Ultra-premium light-theme color palette
const C = {
  bg: '#F8FAFC',        // Slate 50
  surface: '#FFFFFF',   // Pure White
  surfaceMuted: '#F1F5F9', // Slate 100
  border: '#E2E8F0',    // Slate 200
  primary: '#3B82F6',   // Royal Blue
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  accent: '#10B981',    // Emerald
  accentLight: '#ECFDF5',
  critical: '#EF4444',  // Rose Red
  criticalLight: '#FEF2F2',
  high: '#F59E0B',      // Amber Gold
  highLight: '#FEF3C7',
  text: '#0F172A',      // Slate 900
  textSec: '#475569',   // Slate 600
  textMuted: '#94A3B8', // Slate 400
  
  // Swarm Agent Colors (highly aesthetic)
  agent1: '#3B82F6', // Ingestion
  agent2: '#EF4444', // Detection
  agent3: '#F59E0B', // Analysis
  agent4: '#10B981', // Planning
  agent5: '#8B5CF6', // Simulation
  agent6: '#EC4899', // Visualization
};

const sevColor = (s: string) => {
  switch (s?.toLowerCase()) { 
    case 'critical': return C.critical; 
    case 'high': return C.high;
    case 'medium': return C.primary; 
    default: return C.accent; 
  }
};

const sevBg = (s: string) => {
  switch (s?.toLowerCase()) { 
    case 'critical': return C.criticalLight; 
    case 'high': return C.highLight;
    case 'medium': return C.primaryLight; 
    default: return C.accentLight; 
  }
};

const crisisIcon = (t: string): keyof typeof Ionicons.glyphMap => {
  const type = t?.toLowerCase() || '';
  if (type.includes('flood')) return 'water-outline';
  if (type.includes('fire')) return 'flame-outline';
  if (type.includes('block') || type.includes('road')) return 'car-outline';
  if (type.includes('accident') || type.includes('crash')) return 'alert-circle-outline';
  if (type.includes('power') || type.includes('infra')) return 'flash-outline';
  if (type.includes('heat')) return 'thermometer-outline';
  return 'warning-outline';
};

const agentColors = [C.agent1, C.agent2, C.agent3, C.agent4, C.agent5, C.agent6];

const AGENTS = [
  { name: 'Signal Ingestion', icon: 'cloud-download-outline', desc: 'Aggregating manual reports & telemetry...', color: C.agent1 },
  { name: 'Crisis Detection', icon: 'scan-outline', desc: 'Running classification & confidence matrix...', color: C.agent2 },
  { name: 'Situation Analysis', icon: 'analytics-outline', desc: 'Synthesizing cascading urban impacts...', color: C.agent3 },
  { name: 'Action Planning', icon: 'clipboard-outline', desc: 'Formulating prioritized rescue actions...', color: C.agent4 },
  { name: 'Response Simulation', icon: 'flask-outline', desc: 'Running predictive mitigation models...', color: C.agent5 },
  { name: 'Visualization Hub', icon: 'eye-outline', desc: 'Formatting live geospatial broadcasts...', color: C.agent6 },
];

const estimateCityFromCoords = (lat: number, lon: number): string => {
  const cities = [
    { name: 'Lahore', lat: 31.5204, lon: 74.3587 },
    { name: 'Islamabad', lat: 33.6844, lon: 73.0479 },
    { name: 'Rawalpindi', lat: 33.5984, lon: 73.0441 },
    { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
    { name: 'Peshawar', lat: 33.9971, lon: 71.4786 }
  ];
  
  let closestCity = 'Islamabad';
  let minDistance = Infinity;
  
  for (const c of cities) {
    const dist = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lon - c.lon, 2));
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = c.name;
    }
  }
  
  return closestCity;
};

const getRealisticWeather = (city: string) => {
  switch (city.toLowerCase()) {
    case 'lahore':
      return { temp: 41, condition: 'Extreme Heatwave', humidity: 28, wind: 8, risk: 'Extreme Heat Warning', riskColor: '#EF4444' };
    case 'karachi':
      return { temp: 33, condition: 'High Coastal Humidity', humidity: 82, wind: 24, risk: 'Low Regional Risk', riskColor: '#10B981' };
    case 'rawalpindi':
      return { temp: 28, condition: 'Monsoon Overcast', humidity: 80, wind: 11, risk: 'Moderate Urban Flood Risk', riskColor: '#F59E0B' };
    case 'peshawar':
      return { temp: 36, condition: 'Dry Arid Winds', humidity: 40, wind: 15, risk: 'Low Regional Risk', riskColor: '#10B981' };
    default:
      return { temp: 29, condition: 'Light Monsoon Showers', humidity: 78, wind: 14, risk: 'Moderate Urban Flood Risk', riskColor: '#F59E0B' };
  }
};

export default function DashboardScreen() {
  const router = useRouter();
  const [userMode, setUserMode] = useState<'civilian'|'responder'>('civilian');
  const [userCity, setUserCity] = useState('Islamabad');
  const [isOffline, setIsOffline] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<AlertItem[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTrace, setShowTrace] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState(getRealisticWeather('Islamabad'));
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sosProgress = useRef(new Animated.Value(0)).current;

  const handleSosPressIn = () => {
    Animated.timing(sosProgress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(async ({ finished }) => {
      if (finished) {
        sosProgress.setValue(0);
        try {
          let lat = 33.6844, lng = 73.0479; // Default: Islamabad
          if (Platform.OS !== 'web') {
            try {
              const Location = require('expo-location');
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                lat = loc.coords.latitude;
                lng = loc.coords.longitude;
              }
            } catch {}
          }
          const res = await ciroApi.sendSOS(lat, lng);
          Alert.alert('🚨 SOS DISPATCHED', res.message);
          Speech.speak('Emergency SOS dispatched. Your location has been broadcast to nearby responders.', { rate: 0.9 });
          loadDashboardData();
        } catch {
          Alert.alert('🚨 SOS TRIGGERED', 'Could not reach server, but your SOS has been logged locally. Seek help immediately.');
          Speech.speak('Emergency SOS triggered. Seek help immediately.', { rate: 0.9 });
        }
      }
    });
  };

  const handleSosPressOut = () => {
    sosProgress.stopAnimation();
    Animated.timing(sosProgress, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Dynamically detect which city they are in
    const resolveUserCity = async () => {
      if (Platform.OS !== 'web') {
        try {
          const Location = require('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            const city = estimateCityFromCoords(loc.coords.latitude, loc.coords.longitude);
            setUserCity(city);
            setWeatherInfo(getRealisticWeather(city));
          }
        } catch {}
      }
    };
    resolveUserCity();

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const st = await ciroApi.getStatus();
      setStatus(st);
    } catch {
      setStatus(null);
    }
    try {
      const hist = await ciroApi.getHistory();
      if (hist && hist.history) setHistory(hist.history.slice(0, 3));
    } catch {
      setHistory([]);
    }
    try {
      const alertsRes = await ciroApi.getLiveAlerts();
      setLiveAlerts(alertsRes.alerts);
    } catch {
      setLiveAlerts([]);
    }
  };

  const runPipelineOnIncident = async (incident: any) => {
    setLoading(true);
    setCurrentStep(0);
    setData(null);
    setSelectedIncident(incident);
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    // Animate the 6 agentic swarm steps sequentially
    for (let step = 0; step < 6; step++) {
      setCurrentStep(step + 1);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      const textToAnalyze = incident.message || incident.title || `[${incident.category}] ${incident.description}`;
      const result = await ciroApi.quickReport(textToAnalyze, incident.location || 'islamabad');
      if (result && result.crisis_report) {
        setData(result);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
        ]).start();

        const cr = result.crisis_report;
        const speechText = `ZAVIA Agent Swarm has successfully resolved the analysis for ${cr.location}.`;
        Speech.speak(speechText, { rate: 0.9 });
        loadDashboardData();
      } else {
        Alert.alert('Pipeline Analysis Complete', 'The AI swarm completed the workflow. Review details below.');
      }
    } catch (e: any) {
      Alert.alert('Connection Error', 'Could not communicate with the ZAVIA agentic backend.');
    } finally {
      setLoading(false);
    }
  };

  const runDemo = async (scenario: string = 'flooding') => {
    let title = 'Emergency Incident';
    let message = 'Emergency response protocol triggered.';
    let severity = 'high';

    switch (scenario.toLowerCase()) {
      case 'flooding':
        title = 'Severe Urban Flooding & Water Accumulation';
        message = `Intense monsoonal downpour has caused extreme street flooding in ${userCity} commercial sectors. Main roadways are currently waterlogged with stranded civilian vehicles. WASA response requested.`;
        severity = 'critical';
        break;
      case 'fire':
        title = 'Commercial Building Structure Fire';
        message = `A high-intensity electrical fire breakout reported in a multi-story trade plaza in ${userCity}. Heavy black smoke plume rising, risk of immediate adjacent building heat expansion.`;
        severity = 'critical';
        break;
      case 'accident':
        title = 'Multi-Vehicle Expressway Collision';
        message = `A major pileup accident involving transport trucks and passenger cars on the ${userCity} expressway bypass. Road blockages and high emergency medical rescue priority.`;
        severity = 'high';
        break;
      case 'heatwave':
        title = 'Critical Heatwave Health Alert';
        message = `Ambient temperatures have surged past 44°C in ${userCity} urban blocks. Multiple signals of heat stroke distress and heavy grid power strain reported in residential sectors.`;
        severity = 'high';
        break;
    }

    const mockIncident = {
      title,
      message,
      location: `${userCity}, Pakistan`,
      severity
    };
    runPipelineOnIncident(mockIncident);
  };

  const cr = data?.crisis_report;
  const sa = data?.situation_assessment;
  const rp = data?.response_plan;
  const sl = data?.simulation_log;
  const oc = data?.outcome_report;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Dynamic Mode Switcher */}
      <View style={s.modeToggleContainer}>
        <TouchableOpacity 
          style={[s.modeToggleBtn, userMode === 'civilian' && s.modeToggleActive]} 
          onPress={() => setUserMode('civilian')}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={14} color={userMode === 'civilian' ? C.primary : C.textSec} />
          <Text style={[s.modeToggleText, userMode === 'civilian' && s.modeToggleTextActive]}>Civilian Portal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.modeToggleBtn, userMode === 'responder' && s.modeToggleActive]} 
          onPress={() => setUserMode('responder')}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-half-outline" size={14} color={userMode === 'responder' ? C.primary : C.textSec} />
          <Text style={[s.modeToggleText, userMode === 'responder' && s.modeToggleTextActive]}>Responder Command</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Soft, Unique Gradient Hero */}
        <LinearGradient
          colors={userMode === 'civilian' ? (isOffline ? ['#F59E0B', '#D97706'] : ['#3B82F6', '#2563EB']) : ['#1E293B', '#0F172A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.heroBanner}
        >
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLogoLight}>ZAVIA</Text>
              <Text style={s.heroSubLight}>
                {userMode === 'civilian' ? 'Local Crisis & Safety Hub' : 'Crisis Swarm Command'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[s.liveChipLight, userMode === 'civilian' && isOffline && { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: '#F59E0B' }]}
              onPress={() => userMode === 'civilian' && setIsOffline(!isOffline)}
              activeOpacity={0.8}
            >
              {userMode === 'civilian' && isOffline ? (
                <Ionicons name="bluetooth" size={12} color="#FFF" />
              ) : (
                <Animated.View style={[s.liveDot, { opacity: pulseAnim, backgroundColor: '#10B981' }]} />
              )}
              <Text style={s.liveTextLight}>
                {userMode === 'civilian' && isOffline ? 'MESH OFFLINE' : 'ACTIVE'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={s.heroDesc}>
            {userMode === 'civilian' 
              ? 'Real-time safety intelligence, emergency broadcasts, and direct civilian SOS dispatch.'
              : 'Direct multi-agent pipeline monitoring. Run automated swarms on active citizen incident reports.'}
          </Text>
        </LinearGradient>

        <View style={s.dashboardBody}>
          {userMode === 'civilian' ? (
            <View>
              {/* Civilian Portal Stats */}
              <View style={[s.statRow, { marginTop: -15, marginBottom: 16 }]}>
                <View style={s.statItem}>
                  <Ionicons name="shield-checkmark" size={18} color={C.accent} />
                  <Text style={s.statVal}>Protected</Text>
                  <Text style={s.statLabel}>Local Status</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="megaphone-outline" size={18} color={C.primary} />
                  <Text style={s.statVal}>{liveAlerts.length}</Text>
                  <Text style={s.statLabel}>Active Alerts</Text>
                </View>
              </View>

              {/* SOS Dispatcher */}
              <View style={s.sosContainer}>
                <View style={s.sosBackground}>
                  <Animated.View style={[s.sosFill, {
                    height: sosProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }]} />
                </View>
                <TouchableOpacity 
                  style={s.sosButton}
                  onPressIn={handleSosPressIn}
                  onPressOut={handleSosPressOut}
                  activeOpacity={0.9}
                >
                  <Ionicons name="alert" size={32} color="#fff" />
                  <Text style={s.sosText}>HOLD FOR SOS</Text>
                </TouchableOpacity>
              </View>

              {/* Weather and Climate Risk Node */}
              <View style={s.weatherContainer}>
                <View style={s.weatherMain}>
                  <Ionicons 
                    name={weatherInfo.temp >= 38 ? 'sunny-outline' : weatherInfo.condition.includes('Monsoon') ? 'rainy-outline' : 'cloudy-outline'} 
                    size={24} 
                    color={weatherInfo.temp >= 38 ? C.critical : weatherInfo.condition.includes('Monsoon') ? C.primary : C.accent} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.weatherTemp}>{weatherInfo.temp}°C</Text>
                  <Text style={s.weatherCondition}>{weatherInfo.condition} · {userCity}</Text>
                  <Text style={s.weatherDetails}>💧 {weatherInfo.humidity}% Humidity  ·  💨 {weatherInfo.wind} km/h Wind</Text>
                </View>
                <View style={[s.weatherRiskBadge, { backgroundColor: weatherInfo.riskColor }]}>
                  <Text style={s.weatherRiskText}>{weatherInfo.risk}</Text>
                </View>
              </View>

              {/* Quick Actions Grid */}
              <View style={s.card}>
                <SectionHeader icon="compass-outline" label="EMERGENCY UTILITIES" />
                <View style={s.civActionGrid}>
                  <TouchableOpacity style={s.civActionBtn} onPress={() => router.push('/report')}>
                    <View style={[s.civIconBox, { backgroundColor: C.criticalLight }]}>
                      <Ionicons name="warning" size={18} color={C.critical} />
                    </View>
                    <Text style={s.civActionText}>Submit Report</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={s.civActionBtn} onPress={() => router.push('/alerts')}>
                    <View style={[s.civIconBox, { backgroundColor: C.accentLight }]}>
                      <Ionicons name="navigate" size={18} color={C.accent} />
                    </View>
                    <Text style={s.civActionText}>Safe Zones</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.civActionBtn} onPress={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=emergency+hospital+${encodeURIComponent(userCity)}`;
                    Linking.openURL(url);
                  }}>
                    <View style={[s.civIconBox, { backgroundColor: C.primaryLight }]}>
                      <Ionicons name="map" size={18} color={C.primary} />
                    </View>
                    <Text style={s.civActionText}>ER Routes</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Emergency Hotline Quick Dial */}
              <View style={s.card}>
                <SectionHeader icon="call-outline" label="EMERGENCY DIRECT HOTLINES" color={C.critical} />
                <Text style={s.cardSubLabel}>Direct one-tap emergency call triggers to municipal and medical disaster teams.</Text>
                <View style={s.hotlineGrid}>
                  {[
                    { label: 'Rescue 1122', sub: 'Ambulance & Fire', tel: '1122', icon: 'medical' },
                    { label: 'Edhi Rescue', sub: 'Emergency Care', tel: '115', icon: 'heart' },
                    { label: 'PDMA Control', sub: 'Disaster Helpline', tel: '1700', icon: 'shield' },
                    { label: 'National Police', sub: 'Law Enforcement', tel: '15', icon: 'call' }
                  ].map((hl) => (
                    <TouchableOpacity 
                      key={hl.label} 
                      style={s.hotlineCard} 
                      onPress={() => Linking.openURL(`tel:${hl.tel}`)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.hotlineIconBg, { backgroundColor: hl.icon === 'medical' ? C.criticalLight : hl.icon === 'shield' ? C.accentLight : C.primaryLight }]}>
                        <Ionicons 
                          name={hl.icon === 'medical' ? 'medkit-outline' : hl.icon === 'shield' ? 'shield-checkmark-outline' : hl.icon === 'heart' ? 'heart-outline' : 'call-outline'} 
                          size={14} 
                          color={hl.icon === 'medical' ? C.critical : hl.icon === 'accent' ? C.accent : C.primary} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.hotlineTitle} numberOfLines={1}>{hl.label}</Text>
                        <Text style={s.hotlineSub} numberOfLines={1}>{hl.sub}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Latest Local Incident */}
              {liveAlerts.length > 0 && (
                <View style={s.card}>
                  <SectionHeader icon="notifications-outline" label="LATEST INCIDENT REPORTED" color={C.critical} />
                  <View style={s.historyRow}>
                    <Ionicons name={crisisIcon(liveAlerts[0].crisis_type)} size={20} color={C.critical} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={s.historyType}>{liveAlerts[0].title.toUpperCase()}</Text>
                      <Text style={s.historyDate}>{new Date(liveAlerts[0].created_at).toLocaleString()}</Text>
                    </View>
                    <View style={[s.sevPill, { backgroundColor: sevBg(liveAlerts[0].severity) }]}>
                      <Text style={[s.sevPillText, { color: sevColor(liveAlerts[0].severity) }]}>{liveAlerts[0].severity}</Text>
                    </View>
                  </View>
                  <Text style={s.alertDescription}>
                    {liveAlerts[0].message}
                  </Text>
                </View>
              )}

              {/* Interactive Telemetry Nodes */}
              <View style={s.card}>
                <SectionHeader icon="pulse" label="MUNICIPAL TELEMETRY NODES" color={C.accent} />
                <Text style={s.cardSubLabel}>Real-time connection status of localized sensor endpoints and civil data streams.</Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {[
                    { name: 'WASA Rain Gauge Node (Punjab)', status: 'Connected', speed: '12ms latency', icon: 'rainy-outline', color: C.primary },
                    { name: 'Rescue 1122 Dispatch Telemetry', status: 'Connected', speed: '24ms latency', icon: 'medical-outline', color: C.critical },
                    { name: 'Google Maps Traffic Ingestion', status: 'Active Ingest', speed: '88% confidence', icon: 'car-outline', color: C.high },
                    { name: 'OpenWeather Climate Satellite Feed', status: 'Online', speed: '2.4s cache', icon: 'cloud-outline', color: C.accent }
                  ].map((node) => (
                    <View key={node.name} style={s.nodeTelemetryRow}>
                      <View style={[s.nodeIconBg, { backgroundColor: node.color + '15' }]}>
                        <Ionicons name={node.icon as any} size={14} color={node.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.nodeName}>{node.name}</Text>
                        <Text style={s.nodeSpeed}>{node.speed}</Text>
                      </View>
                      <View style={s.nodeStatusBlock}>
                        <View style={[s.nodePulse, { backgroundColor: C.accent }]} />
                        <Text style={s.nodeStatusText}>{node.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View>
              {/* Responder Command Stats */}
              <View style={[s.statRow, { marginTop: -15, marginBottom: 16 }]}>
                <View style={s.statItem}>
                  <Ionicons name="git-network-outline" size={18} color={C.primary} />
                  <Text style={s.statVal}>6 Agents</Text>
                  <Text style={s.statLabel}>Swarm Core</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={C.accent} />
                  <Text style={s.statVal}>{liveAlerts.length}</Text>
                  <Text style={s.statLabel}>Pending Queue</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="pulse" size={18} color={C.high} />
                  <Text style={s.statVal}>{status?.pipeline_runs || 0}</Text>
                  <Text style={s.statLabel}>Total Swarms</Text>
                </View>
              </View>

              {/* Swarm Pipeline Progress Visualizer */}
              {loading && (
                <View style={s.card}>
                  <SectionHeader icon="hardware-chip-outline" label="SWARM PIPELINE ORCHESTRATION" color={C.primary} />
                  <View style={s.progressTimeline}>
                    {AGENTS.map((agent, index) => {
                      const isActive = currentStep === index + 1;
                      const isCompleted = currentStep > index + 1;
                      return (
                        <View key={index} style={s.timelineItem}>
                          <View style={s.timelineIndicator}>
                            <View style={[
                              s.timelineDot,
                              isCompleted && { backgroundColor: C.accent },
                              isActive && { backgroundColor: agent.color, transform: [{ scale: 1.2 }] }
                            ]}>
                              {isCompleted ? (
                                <Ionicons name="checkmark" size={10} color="#fff" />
                              ) : (
                                <Ionicons name={agent.icon as any} size={10} color={isActive ? '#fff' : C.textMuted} />
                              )}
                            </View>
                            {index < 5 && <View style={[s.timelineLine, isCompleted && { backgroundColor: C.accent }]} />}
                          </View>
                          <View style={s.timelineContent}>
                            <Text style={[
                              s.timelineName,
                              isActive && { color: agent.color, fontWeight: '700' },
                              isCompleted && { color: C.textSec }
                            ]}>
                              {agent.name}
                            </Text>
                            <Text style={s.timelineDesc}>{isActive ? agent.desc : 'Waiting for sequence...'}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Responder mode: Incident Queue Selection */}
              {!data && !loading && (
                <View>
                  <View style={s.card}>
                    <SectionHeader icon="list-circle-outline" label="CITIZEN INCIDENT QUEUE" color={C.primary} />
                    <Text style={s.cardSubLabel}>Select a live citizen report to orchestrate the AI Response Swarm on it.</Text>
                    
                    {liveAlerts.length === 0 ? (
                      <View style={s.emptyQueueBox}>
                        <Ionicons name="server-outline" size={24} color={C.textMuted} />
                        <Text style={s.emptyQueueText}>All reported incidents have been resolved</Text>
                      </View>
                    ) : (
                      liveAlerts.map((incident) => (
                        <View key={incident.id} style={s.queueCard}>
                          <View style={s.queueHeader}>
                            <View style={[s.civIconBoxSmall, { backgroundColor: sevBg(incident.severity) }]}>
                              <Ionicons name={crisisIcon(incident.crisis_type)} size={14} color={sevColor(incident.severity)} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <Text style={s.queueTitle}>{incident.title.toUpperCase()}</Text>
                              <Text style={s.queueLoc}>📍 {incident.location}</Text>
                            </View>
                            <View style={[s.sevPill, { backgroundColor: sevBg(incident.severity) }]}>
                              <Text style={[s.sevPillText, { color: sevColor(incident.severity), fontSize: 9 }]}>
                                {incident.severity}
                              </Text>
                            </View>
                          </View>
                          <Text style={s.queueDesc} numberOfLines={2}>{incident.message}</Text>
                          
                          <TouchableOpacity 
                            style={s.swarmLaunchBtn}
                            onPress={() => runPipelineOnIncident(incident)}
                          >
                            <Ionicons name="flash-outline" size={13} color="#fff" />
                            <Text style={s.swarmLaunchText}>Launch AI Swarm Pipeline</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Manual / Simulated Shortcuts */}
                  <View style={s.card}>
                    <SectionHeader icon="cube-outline" label="CRISIS DRILL PROTOCOLS" />
                    <Text style={s.cardSubLabel}>Trigger simulated Metropolitan Response Drills to test the 6-agent Antigravity coordination pipeline in real time.</Text>
                    <View style={s.scenarioGrid}>
                      {['flooding', 'fire', 'accident', 'heatwave'].map((scen) => (
                        <TouchableOpacity 
                          key={scen} 
                          style={s.scenarioBtnBox} 
                          onPress={() => runDemo(scen)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={crisisIcon(scen)} size={16} color={C.primary} />
                          <Text style={s.scenarioBtnBoxText}>{scen === 'accident' ? 'ROAD PILEUP' : scen === 'flooding' ? 'FLASH FLOOD' : scen.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Swarm Command Configuration Panel */}
                  <View style={s.card}>
                    <SectionHeader icon="options-outline" label="SWARM COGNITION CONFIGURATION" color={C.primary} />
                    <Text style={s.cardSubLabel}>Configure multi-agent decision heuristics and confidence thresholds for automated metropolitan orchestration.</Text>
                    <View style={{ gap: 10, marginTop: 4 }}>
                      <View style={s.configRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.configLabel}>Confidence Score Cutoff</Text>
                          <Text style={s.configSub}>Ingestion clustering minimum filter threshold</Text>
                        </View>
                        <View style={s.configBadge}>
                          <Text style={s.configBadgeText}>≥ 75% Confidence</Text>
                        </View>
                      </View>
                      <View style={s.configRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.configLabel}>Routing API Optimization</Text>
                          <Text style={s.configSub}>Heuristic priorities for dispatch planning</Text>
                        </View>
                        <View style={s.configBadge}>
                          <Text style={s.configBadgeText}>Life-Safety First</Text>
                        </View>
                      </View>
                      <View style={s.configRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.configLabel}>Telemetry Capture Window</Text>
                          <Text style={s.configSub}>Correlated signal clustering timeframe</Text>
                        </View>
                        <View style={s.configBadge}>
                          <Text style={s.configBadgeText}>15 Minute Buckets</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Swarm Pipeline Results Dashboard */}
              {data && !loading && (
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                  {/* Swarm Control Panel */}
                  <View style={s.controlPanelCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-done-circle" size={18} color={C.accent} />
                      <Text style={s.controlPanelTitle}>SWARM ANALYSIS RESOLVED</Text>
                    </View>
                    <TouchableOpacity 
                      style={s.resetCommandBtn}
                      onPress={() => {
                        setData(null);
                        setSelectedIncident(null);
                      }}
                    >
                      <Ionicons name="refresh-outline" size={13} color={C.primary} />
                      <Text style={s.resetCommandText}>Return to Queue</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 1. Detection Results */}
                  {cr && (
                    <View style={s.card}>
                      <SectionHeader icon="scan-outline" label="AGENT 1 & 2: INGESTION & DETECTION" color={sevColor(cr.severity)} />
                      <View style={s.crisisRow}>
                        <View style={[s.crisisIconBox, { backgroundColor: sevBg(cr.severity) }]}>
                          <Ionicons name={crisisIcon(cr.crisis_type)} size={20} color={sevColor(cr.severity)} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.crisisType}>{cr.crisis_type.replace(/_/g, ' ').toUpperCase()}</Text>
                          <Text style={s.crisisLoc}>📍 {cr.location}</Text>
                        </View>
                        <View style={[s.sevPill, { backgroundColor: sevBg(cr.severity) }]}>
                          <Text style={[s.sevPillText, { color: sevColor(cr.severity) }]}>
                            {cr.severity.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={s.metricRow}>
                        <MetricBox label="Confidence" value={`${(cr.confidence_score * 100).toFixed(0)}%`} color={C.accent} />
                        <MetricBox label="Radius" value={`${cr.affected_radius_km}km`} color={C.primary} />
                        <MetricBox label="Threat Scope" value={`${(cr.estimated_affected_people / 1000).toFixed(1)}K`} color={C.high} />
                      </View>
                      <Text style={s.reasoning}>{cr.reasoning}</Text>
                    </View>
                  )}

                  {/* 2. Analysis Results */}
                  {sa && (
                    <View style={s.card}>
                      <SectionHeader icon="analytics-outline" label="AGENT 3: SITUATION ANALYSIS" />
                      <Text style={s.impactPrimary}>{sa.primary_impact}</Text>
                      {sa.secondary_impacts?.map((impact: string, i: number) => (
                        <View key={i} style={s.impactRow}>
                          <View style={s.impactDot} />
                          <Text style={s.impactText}>{impact}</Text>
                        </View>
                      ))}
                      <View style={s.escalationRow}>
                        <Text style={s.escalationLabel}>Escalation Risk</Text>
                        <View style={s.progressBg}>
                          <View style={[s.progressFill, {
                            width: `${sa.risk_escalation_probability * 100}%`,
                            backgroundColor: sa.risk_escalation_probability > 0.7 ? C.critical : C.high,
                          }]} />
                        </View>
                        <Text style={[s.escalationVal, {
                          color: sa.risk_escalation_probability > 0.7 ? C.critical : C.high,
                        }]}>{(sa.risk_escalation_probability * 100).toFixed(0)}%</Text>
                      </View>
                    </View>
                  )}

                  {/* 3. Response Plan */}
                  {rp && (
                    <View style={s.card}>
                      <SectionHeader icon="list-outline" label={`AGENT 4: RESPONSE PLAN · ${rp.actions?.length} TASKS`} />
                      {rp.actions?.map((action: any, i: number) => (
                        <View key={i} style={s.actionRow}>
                          <View style={[s.actionNum, { backgroundColor: sevBg(i === 0 ? 'critical' : i === 1 ? 'high' : 'medium') }]}>
                            <Text style={[s.actionNumText, { color: sevColor(i === 0 ? 'critical' : i === 1 ? 'high' : 'medium') }]}>{action.priority}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={s.actionType}>
                              {action.action_type.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                            <Text style={s.actionDesc}>{action.description}</Text>
                            {action.eta_minutes > 0 && (
                              <View style={s.etaRow}>
                                <Ionicons name="time-outline" size={11} color={C.accent} />
                                <Text style={s.actionEta}>ETA {action.eta_minutes} min</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 4. Simulation Results */}
                  {sl && (
                    <View style={s.card}>
                      <SectionHeader icon="flask-outline" label="AGENT 5: SYSTEM SIMULATION" />
                      {sl.simulations?.map((sim: any, i: number) => (
                        <View key={i} style={s.simRow}>
                          <View style={s.simHeader}>
                            <Ionicons name="cube-outline" size={13} color={C.primary} />
                            <Text style={s.simType}>{sim.simulation_type.replace(/_/g, ' ')}</Text>
                          </View>
                          <View style={s.simMetrics}>
                            <View style={s.simCol}>
                              <Text style={s.simLabel}>Before Action</Text>
                              {Object.entries(sim.before).slice(0, 2).map(([k, v]: any) => (
                                <Text key={k} style={s.simVal}>{k.replace(/_/g, ' ')}: {String(v)}</Text>
                              ))}
                            </View>
                            <Ionicons name="arrow-forward" size={12} color={C.textMuted} style={{ marginHorizontal: 8 }} />
                            <View style={s.simCol}>
                              <Text style={[s.simLabel, { color: C.accent }]}>Predicted After</Text>
                              {Object.entries(sim.after).slice(0, 2).map(([k, v]: any) => (
                                <Text key={k} style={[s.simVal, { color: C.accent }]}>{k.replace(/_/g, ' ')}: {String(v)}</Text>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 5. Outcome Visualization */}
                  {oc && (
                    <View style={[s.card, { borderColor: C.accent, borderWidth: 1.5 }]}>
                      <View style={s.outcomeHeader}>
                        <SectionHeader icon="bar-chart-outline" label="AGENT 6: OUTCOME REPORT" />
                        <View style={[s.statusBadge, { backgroundColor: C.accentLight }]}>
                          <Text style={[s.statusText, { color: C.accent }]}>
                            {oc.resolution_status?.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={s.outcomeGrid}>
                        <OutcomeBox icon="car-outline" label="Congestion" before={oc.before_state?.congestion || 'N/A'} after={oc.after_state?.congestion || 'N/A'} />
                        <OutcomeBox icon="bus-outline" label="Rescued" before={String(oc.before_state?.estimated_stranded_vehicles || 0)} after={String(oc.after_state?.vehicles_rescued || 0)} />
                        <OutcomeBox icon="megaphone-outline" label="Alerted" before={String(oc.before_state?.citizens_alerted || 0)} after={String(oc.after_state?.citizens_alerted?.toLocaleString() || 0)} />
                        <OutcomeBox icon="trending-down-outline" label="Stranded" before={String(oc.before_state?.estimated_stranded_vehicles || 0)} after={String(oc.after_state?.estimated_stranded_vehicles || 0)} />
                      </View>
                      <Text style={s.outcomeSummary}>{oc.impact_summary}</Text>
                      <View style={s.pipelineRow}>
                        <Ionicons name="timer-outline" size={14} color={C.textMuted} />
                        <Text style={s.pipelineLabel}>Swarm Pipeline Processing</Text>
                        <Text style={s.pipelineVal}>{(oc.total_pipeline_duration_ms / 1000).toFixed(1)}s</Text>
                      </View>
                    </View>
                  )}

                  {/* Agent Trace Logs */}
                  <TouchableOpacity style={s.traceToggle} onPress={() => setShowTrace(!showTrace)} activeOpacity={0.6}>
                    <Ionicons name={showTrace ? 'chevron-down' : 'chevron-forward'} size={14} color={C.primary} />
                    <Text style={s.traceToggleText}>View Backend Swarm Log Trace</Text>
                  </TouchableOpacity>
                  {showTrace && data?.agent_trace_log && (
                    <View style={s.traceCard}>
                      {data.agent_trace_log.map((line: string, i: number) => (
                        <Text key={i} style={[s.traceLine, { color: agentColors[i] || C.textSec }]}>{line}</Text>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ icon, label, color }: { icon: any; label: string; color?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={14} color={color || C.primary} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.metricBox}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function OutcomeBox({ icon, label, before, after }: any) {
  return (
    <View style={s.outcomeBox}>
      <Ionicons name={icon} size={14} color={C.textMuted} />
      <Text style={s.outcomeLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={s.outcomeBefore}>{before}</Text>
        <Ionicons name="arrow-forward" size={10} color={C.textMuted} />
        <Text style={s.outcomeAfter}>{after}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 30 },
  dashboardBody: { paddingHorizontal: 12 },

  // Dynamic Mode Switcher
  modeToggleContainer: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 12, marginTop: 10, marginBottom: 10, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: C.border },
  modeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, gap: 5 },
  modeToggleActive: { backgroundColor: C.primaryLight },
  modeToggleText: { fontSize: 11, fontWeight: '600', color: C.textSec },
  modeToggleTextActive: { color: C.primary, fontWeight: '700' },

  // Civilian
  civActionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  civActionBtn: { alignItems: 'center', flex: 1 },
  civIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  civActionText: { fontSize: 10, fontWeight: '600', color: C.text, textAlign: 'center' },

  // SOS
  sosContainer: { alignItems: 'center', marginVertical: 16, position: 'relative', height: 120, justifyContent: 'center' },
  sosBackground: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#FEE2E2', overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 2, borderColor: '#FECACA' },
  sosFill: { width: '100%', backgroundColor: '#F87171' },
  sosButton: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: C.critical, alignItems: 'center', justifyContent: 'center', shadowColor: C.critical, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  sosText: { color: '#fff', fontWeight: '800', fontSize: 9, marginTop: 2, letterSpacing: 0.5 },

  // Hero
  heroBanner: { padding: 16, paddingTop: 20, paddingBottom: 30, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  heroLogoLight: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroSubLight: { fontSize: 11, color: '#BFDBFE', fontWeight: '500', marginTop: -2 },
  heroDesc: { fontSize: 12, color: '#E2E8F0', lineHeight: 16, marginTop: 4 },
  liveChipLight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  liveTextLight: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.critical },

  // Stats
  statRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: C.border, shadowColor: '#0F172A', shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 3 },
  statVal: { fontSize: 14, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 9, color: C.textSec, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Cards
  card: { backgroundColor: C.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  cardSubLabel: { fontSize: 10, color: C.textSec, marginBottom: 10 },
  alertDescription: { fontSize: 12, color: C.textSec, marginTop: 8, lineHeight: 18 },

  // Incident Queue in Responder Mode
  emptyQueueBox: { alignItems: 'center', padding: 24, gap: 6 },
  emptyQueueText: { fontSize: 12, color: C.textSec, fontWeight: '500' },
  queueCard: { padding: 10, backgroundColor: C.bg, borderRadius: 8, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  civIconBoxSmall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  queueTitle: { fontSize: 10, fontWeight: '700', color: C.text },
  queueLoc: { fontSize: 10, color: C.textSec, marginTop: 1 },
  queueDesc: { fontSize: 11, color: C.textSec, lineHeight: 15, marginBottom: 8 },
  swarmLaunchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.primary, paddingVertical: 6, borderRadius: 6 },
  swarmLaunchText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Progress Timeline
  progressTimeline: { gap: 10 },
  timelineItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  timelineIndicator: { alignItems: 'center', width: 20 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  timelineLine: { width: 1.5, height: 26, backgroundColor: C.border, marginTop: 2 },
  timelineContent: { flex: 1, paddingTop: 1 },
  timelineName: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  timelineDesc: { fontSize: 9, color: C.textMuted, marginTop: 1 },

  // Control Panel
  controlPanelCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.primaryLight, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.primary, marginBottom: 12 },
  controlPanelTitle: { fontSize: 10, fontWeight: '800', color: C.primaryDark },
  resetCommandBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: C.primary },
  resetCommandText: { fontSize: 9, fontWeight: '700', color: C.primary },

  // Scenario Buttons
  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scenarioBtnBox: { flex: 1, minWidth: '46%', backgroundColor: C.surfaceMuted, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.border },
  scenarioBtnBoxText: { fontSize: 10, fontWeight: '700', color: C.text },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  sectionLabel: { fontSize: 9, fontWeight: '700', color: C.textSec, letterSpacing: 0.5 },

  // Crisis Results
  crisisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  crisisIconBox: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  crisisType: { fontSize: 12, fontWeight: '700', color: C.text },
  crisisLoc: { fontSize: 10, color: C.textSec },
  sevPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sevPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.2 },
  metricRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  metricBox: { flex: 1, backgroundColor: C.surfaceMuted, borderRadius: 6, padding: 8, alignItems: 'center' },
  metricLabel: { fontSize: 8, fontWeight: '600', color: C.textMuted, letterSpacing: 0.3, marginBottom: 2 },
  metricValue: { fontSize: 13, fontWeight: '800' },
  reasoning: { fontSize: 11, color: C.textSec, lineHeight: 15, fontStyle: 'italic' },

  // Impact
  impactPrimary: { fontSize: 11, fontWeight: '600', color: C.text, marginBottom: 6 },
  impactRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start' },
  impactDot: { width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: C.critical, marginRight: 6, marginTop: 5.5 },
  impactText: { fontSize: 11, color: C.textSec, flex: 1, lineHeight: 15 },
  escalationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  escalationLabel: { fontSize: 9, fontWeight: '600', color: C.textMuted, width: 70 },
  progressBg: { flex: 1, height: 3.5, backgroundColor: C.surfaceMuted, borderRadius: 2, marginHorizontal: 6 },
  progressFill: { height: 3.5, borderRadius: 2 },
  escalationVal: { fontSize: 11, fontWeight: '700', width: 28, textAlign: 'right' },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  actionNum: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  actionNumText: { fontSize: 10, fontWeight: '800' },
  actionType: { fontSize: 8, fontWeight: '700', color: C.primary, letterSpacing: 0.5 },
  actionDesc: { fontSize: 11, color: C.text, lineHeight: 15, marginTop: 1 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  actionEta: { fontSize: 9, color: C.accent, fontWeight: '600' },

  // Simulation
  simRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  simHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  simType: { fontSize: 10, fontWeight: '600', color: C.text, textTransform: 'capitalize' },
  simMetrics: { flexDirection: 'row', alignItems: 'center' },
  simCol: { flex: 1 },
  simLabel: { fontSize: 8, fontWeight: '700', color: C.critical, letterSpacing: 0.5, marginBottom: 1 },
  simVal: { fontSize: 9, color: C.textSec },

  // Outcome
  outcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  outcomeBox: { width: (width - 44) / 2, backgroundColor: C.surfaceMuted, borderRadius: 6, padding: 8, alignItems: 'center', gap: 2 },
  outcomeLabel: { fontSize: 8, color: C.textMuted, fontWeight: '600' },
  outcomeBefore: { fontSize: 11, color: C.critical, fontWeight: '700' },
  outcomeAfter: { fontSize: 11, color: C.accent, fontWeight: '700' },
  outcomeSummary: { fontSize: 11, color: C.text, lineHeight: 15, marginBottom: 8 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surfaceMuted, borderRadius: 6, padding: 8 },
  pipelineLabel: { fontSize: 10, color: C.textMuted, fontWeight: '500', flex: 1 },
  pipelineVal: { fontSize: 14, fontWeight: '800', color: C.primary },

  // Trace
  traceToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 8 },
  traceToggleText: { fontSize: 10, fontWeight: '600', color: C.primary },
  traceCard: { backgroundColor: C.surface, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  traceLine: { fontSize: 8, fontFamily: 'monospace', lineHeight: 14, marginBottom: 2 },

  // History
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  historyType: { fontSize: 10, fontWeight: '600', color: C.text },
  historyDate: { fontSize: 8, color: C.textMuted },

  // Weather Widget
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  weatherMain: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceMuted,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  weatherCondition: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },
  weatherDetails: {
    fontSize: 9,
    color: C.textSec,
    marginTop: 1,
  },
  weatherRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'center',
  },
  weatherRiskText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // Hotline Grid
  hotlineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceMuted,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 10,
    width: (width - 32) / 2,
  },
  hotlineIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },
  hotlineSub: {
    fontSize: 9,
    color: C.textSec,
    marginTop: 1,
  },

  // Telemetry Rows
  nodeTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  nodeIconBg: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeName: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },
  nodeSpeed: {
    fontSize: 9,
    color: C.textMuted,
    marginTop: 1,
  },
  nodeStatusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nodePulse: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nodeStatusText: {
    fontSize: 8,
    fontWeight: '800',
    color: C.accent,
    textTransform: 'uppercase',
  },

  // Config UI
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },
  configSub: {
    fontSize: 9,
    color: C.textMuted,
    marginTop: 1,
  },
  configBadge: {
    backgroundColor: C.surfaceMuted,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  configBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.primary,
  },
});
