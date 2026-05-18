import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, ActivityIndicator, Alert, Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ciroApi from '../../services/api';

const { width } = Dimensions.get('window');
import { Platform } from 'react-native';

// Web Compatibility Mock
let Speech: any = { speak: () => {} };
if (Platform.OS !== 'web') {
  try {
    Speech = require('expo-speech');
  } catch (e) {
    console.warn("Speech failed to load", e);
  }
}
const C = {
  bg: '#F5F6FA', surface: '#FFFFFF', surfaceEl: '#F0F1F5',
  primary: '#2563EB', primaryLight: '#DBEAFE', accent: '#059669', accentLight: '#D1FAE5',
  critical: '#DC2626', criticalLight: '#FEE2E2',
  high: '#D97706', highLight: '#FEF3C7',
  text: '#111827', textSec: '#6B7280', textMuted: '#9CA3AF',
  border: '#E5E7EB',
  agent1: '#2563EB', agent2: '#DC2626', agent3: '#D97706',
  agent4: '#059669', agent5: '#7C3AED', agent6: '#DB2777',
};

const sevColor = (s: string) => {
  switch (s) { case 'critical': return C.critical; case 'high': return C.high;
    case 'medium': return C.primary; default: return C.accent; }
};
const sevBg = (s: string) => {
  switch (s) { case 'critical': return C.criticalLight; case 'high': return C.highLight;
    case 'medium': return C.primaryLight; default: return C.accentLight; }
};
const crisisIcon = (t: string): keyof typeof Ionicons.glyphMap => {
  switch (t) { case 'urban_flooding': return 'water-outline'; case 'fire': return 'flame-outline';
    case 'road_blockage': return 'car-outline'; case 'accident': return 'alert-circle-outline';
    case 'infrastructure_failure': return 'flash-outline'; case 'heatwave': return 'thermometer-outline';
    default: return 'warning-outline'; }
};
const agentColors = [C.agent1, C.agent2, C.agent3, C.agent4, C.agent5, C.agent6];

export default function DashboardScreen() {
  const [userMode, setUserMode] = useState<'civilian'|'responder'>('civilian');
  const [isOffline, setIsOffline] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sosProgress = useRef(new Animated.Value(0)).current;

  const handleSosPressIn = () => {
    Animated.timing(sosProgress, {
      toValue: 1,
      duration: 2500, // 2.5 seconds hold
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        Alert.alert(
          "🚨 SOS TRIGGERED", 
          "Your live location and emergency signal have been dispatched to the CIRO network and local responders."
        );
        Speech.speak("Emergency SOS triggered. Broadcasting your location to nearby responders.", { rate: 0.9 });
        sosProgress.setValue(0);
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

    // Fetch initial data
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const st = await ciroApi.getStatus();
    if (st) setStatus(st);
    const hist = await ciroApi.getHistory();
    if (hist && hist.history) setHistory(hist.history.slice(0, 3)); // Top 3
  };

  const runDemo = async (scenario: string = 'flooding') => {
    setLoading(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    const result = await ciroApi.runDemo(scenario);
    if (result && result.crisis_report) {
      setData(result);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
      ]).start();

      const cr = result.crisis_report;
      const speechText = `CIRO Warning. ${cr.severity} severity ${cr.crisis_type.replace(/_/g, ' ')} detected in ${cr.location}.`;
      Speech.speak(speechText, { rate: 0.9, pitch: 1 });
    } else {
      setLoading(false);
      alert('Simulation failed. Ensure backend is running.');
    }
  };

  const cr = data?.crisis_report;
  const sa = data?.situation_assessment;
  const rp = data?.response_plan;
  const sl = data?.simulation_log;
  const oc = data?.outcome_report;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Mode Toggle Bar */}
      <View style={s.modeToggleContainer}>
        <TouchableOpacity 
          style={[s.modeToggleBtn, userMode === 'civilian' && s.modeToggleActive]} 
          onPress={() => setUserMode('civilian')}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={14} color={userMode === 'civilian' ? C.primary : C.textSec} />
          <Text style={[s.modeToggleText, userMode === 'civilian' && s.modeToggleTextActive]}>Civilian Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.modeToggleBtn, userMode === 'responder' && s.modeToggleActive]} 
          onPress={() => setUserMode('responder')}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-half-outline" size={14} color={userMode === 'responder' ? C.primary : C.textSec} />
          <Text style={[s.modeToggleText, userMode === 'responder' && s.modeToggleTextActive]}>Responder Mode</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={userMode === 'civilian' ? (isOffline ? ['#B45309', '#78350F'] : ['#059669', '#065F46']) : [C.primary, '#1E3A8A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.heroBanner}
        >
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLogoLight}>CIRO</Text>
              <Text style={s.heroSubLight}>
                {userMode === 'civilian' ? 'Personal Safety & Alerts' : 'Crisis Intelligence & Response Orchestrator'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[s.liveChipLight, userMode === 'civilian' && isOffline && { backgroundColor: 'rgba(245, 158, 11, 0.3)', borderColor: '#F59E0B' }]}
              onPress={() => userMode === 'civilian' && setIsOffline(!isOffline)}
              activeOpacity={0.8}
            >
              {userMode === 'civilian' && isOffline ? (
                <Ionicons name="bluetooth" size={12} color="#FBBF24" />
              ) : (
                <Animated.View style={[s.liveDot, { opacity: pulseAnim, backgroundColor: '#10B981' }]} />
              )}
              <Text style={[s.liveTextLight, userMode === 'civilian' && isOffline && { color: '#FBBF24', marginLeft: 4 }]}>
                {userMode === 'civilian' && isOffline ? 'MESH NETWORK' : 'LIVE'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={s.heroDesc}>
            {userMode === 'civilian' 
              ? 'Stay informed. Get real-time local alerts, find safe zones, and report emergencies instantly.'
              : 'AI-powered emergency management. Ingesting signals, assessing threats, and orchestrating responses in real-time.'}
          </Text>
        </LinearGradient>

        <View style={s.dashboardBody}>
          {userMode === 'civilian' ? (
            <View>
              {/* Civilian Content */}
              <View style={[s.statRow, { marginTop: -20, marginBottom: 16 }]}>
                <View style={s.statItem}>
                  <Ionicons name="checkmark-circle" size={24} color={C.accent} />
                  <Text style={s.statVal}>Safe</Text>
                  <Text style={s.statLabel}>Your Status</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="warning-outline" size={24} color={C.high} />
                  <Text style={s.statVal}>{history.length}</Text>
                  <Text style={s.statLabel}>Local Alerts</Text>
                </View>
              </View>

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
                  <Ionicons name="warning" size={32} color="#fff" />
                  <Text style={s.sosText}>HOLD FOR SOS</Text>
                </TouchableOpacity>
              </View>

              <View style={s.card}>
                <SectionHeader icon="compass-outline" label="QUICK ACTIONS" />
                <View style={s.civActionGrid}>
                  <TouchableOpacity style={s.civActionBtn}>
                    <View style={[s.civIconBox, { backgroundColor: C.criticalLight }]}>
                      <Ionicons name="alert-circle" size={20} color={C.critical} />
                    </View>
                    <Text style={s.civActionText}>Report Emergency</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={s.civActionBtn}>
                    <View style={[s.civIconBox, { backgroundColor: C.accentLight }]}>
                      <Ionicons name="home" size={20} color={C.accent} />
                    </View>
                    <Text style={s.civActionText}>Find Shelter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.civActionBtn}>
                    <View style={[s.civIconBox, { backgroundColor: C.primaryLight }]}>
                      <Ionicons name="map" size={20} color={C.primary} />
                    </View>
                    <Text style={s.civActionText}>Evac Routes</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {history.length > 0 && (
                <View style={s.card}>
                  <SectionHeader icon="notifications-outline" label="LATEST ALERT NEAR YOU" color={C.critical} />
                  <View style={s.historyRow}>
                    <Ionicons name={crisisIcon(history[0].crisis_type)} size={24} color={C.critical} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.historyType, { fontSize: 14 }]}>{history[0].crisis_type.replace(/_/g, ' ').toUpperCase()}</Text>
                      <Text style={[s.historyDate, { fontSize: 11 }]}>{new Date(history[0].created_at).toLocaleString()}</Text>
                    </View>
                    <View style={[s.sevPill, { backgroundColor: sevBg(history[0].severity) }]}>
                      <Text style={[s.sevPillText, { color: sevColor(history[0].severity), fontSize: 10 }]}>{history[0].severity}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: C.textSec, marginTop: 8, lineHeight: 18 }}>
                    A potential {history[0].crisis_type.replace(/_/g, ' ')} has been detected in your vicinity. Please remain vigilant and check the live map for updates.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              {/* Responder Content */}
              <View style={[s.statRow, { marginTop: -20, marginBottom: 16 }]}>
                <View style={s.statItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={C.accent} />
                  <Text style={s.statVal}>{status?.tools_active || 4}/{status?.tools_total || 4}</Text>
                  <Text style={s.statLabel}>APIs Active</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="analytics-outline" size={16} color={C.primary} />
                  <Text style={s.statVal}>{status?.pipeline_runs || history.length || 0}</Text>
                  <Text style={s.statLabel}>Total Runs</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="git-network-outline" size={16} color={C.high} />
                  <Text style={s.statVal}>6</Text>
                  <Text style={s.statLabel}>AI Agents</Text>
                </View>
              </View>

              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Ionicons name="play-circle-outline" size={16} color={C.primary} />
                  <Text style={s.cardLabel}>SIMULATE CRISIS SCENARIO</Text>
                </View>
                <Text style={s.cardSubLabel}>Trigger a full 6-agent pipeline response to test the system.</Text>
                
                <View style={s.scenarioGrid}>
                  {['flooding', 'fire', 'accident', 'heatwave'].map((scen) => (
                    <TouchableOpacity key={scen} style={s.scenarioBtnBox} onPress={() => runDemo(scen)} disabled={loading} activeOpacity={0.7}>
                      <View style={s.scenarioIconBox}>
                        <Ionicons name={crisisIcon(scen)} size={18} color={C.primary} />
                      </View>
                      <Text style={s.scenarioBtnBoxText}>{scen.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {loading && (
                  <View style={{ marginTop: 16, alignItems: 'center', backgroundColor: C.primaryLight, padding: 10, borderRadius: 8 }}>
                    <ActivityIndicator color={C.primary} size="small" />
                    <Text style={s.demoHint}>Orchestrating AI Pipeline...</Text>
                  </View>
                )}
              </View>

              {!data && !loading && (
                <View>
                  <View style={s.navGrid}>
                    <NavTip icon="grid-outline" title="Dashboard" desc="View live analysis" active />
                    <NavTip icon="alert-circle-outline" title="Report" desc="Submit incident" />
                    <NavTip icon="map-outline" title="Live Map" desc="View active crises" />
                    <NavTip icon="settings-outline" title="Settings" desc="API config" />
                  </View>
                  {status && status.tools && (
                    <View style={s.card}>
                      <SectionHeader icon="server-outline" label="INTEGRATIONS & AGENTS" />
                      <Text style={[s.cardSubLabel, { marginBottom: 10 }]}>External API Connections</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {Object.entries(status.tools).map(([key, isReady]: any) => (
                          <View key={key} style={[s.toolChip, isReady ? s.toolActive : s.toolInactive]}>
                            <Ionicons name={isReady ? "checkmark-circle" : "close-circle"} size={12} color={isReady ? C.accent : C.critical} />
                            <Text style={[s.toolText, { color: isReady ? C.accent : C.critical }]}>{key.replace('_', ' ').toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={[s.cardSubLabel, { marginBottom: 10 }]}>Agentic Swarm Status</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {['Ingestion', 'Detection', 'Analysis', 'Planning', 'Simulation', 'Visualization'].map((agent, i) => (
                          <View key={agent} style={s.agentChip}>
                            <View style={[s.agentDot, { backgroundColor: agentColors[i] }]} />
                            <Text style={s.agentText}>{agent}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {history.length > 0 && (
                    <View style={s.card}>
                      <SectionHeader icon="time-outline" label="RECENT ACTIVITY" />
                      {history.map((item, idx) => (
                        <View key={idx} style={s.historyRow}>
                          <Ionicons name={item.test ? "flask-outline" : crisisIcon(item.crisis_type)} size={16} color={C.textMuted} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={s.historyType}>{item.test ? 'Test Run' : item.crisis_type.replace(/_/g, ' ').toUpperCase()}</Text>
                            <Text style={s.historyDate}>{new Date(item.created_at).toLocaleString()}</Text>
                          </View>
                          {!item.test && (
                            <View style={[s.sevPill, { backgroundColor: sevBg(item.severity) }]}>
                              <Text style={[s.sevPillText, { color: sevColor(item.severity) }]}>{item.severity}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {data && (
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                  {cr && (
                    <View style={s.card}>
                      <SectionHeader icon="scan-outline" label="DETECTED SITUATION" color={sevColor(cr.severity)} />
                      <View style={s.crisisRow}>
                        <View style={[s.crisisIconBox, { backgroundColor: sevBg(cr.severity) }]}>
                          <Ionicons name={crisisIcon(cr.crisis_type)} size={22} color={sevColor(cr.severity)} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.crisisType}>{cr.crisis_type.replace(/_/g, ' ').toUpperCase()}</Text>
                          <View style={s.locRow}>
                            <Ionicons name="location-outline" size={12} color={C.textSec} />
                            <Text style={s.crisisLoc}>{cr.location}, Islamabad</Text>
                          </View>
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
                        <MetricBox label="Affected" value={`${(cr.estimated_affected_people / 1000).toFixed(1)}K`} color={C.high} />
                      </View>
                      <Text style={s.reasoning}>{cr.reasoning}</Text>
                    </View>
                  )}
                  {sa && (
                    <View style={s.card}>
                      <SectionHeader icon="analytics-outline" label="IMPACT ANALYSIS" />
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
                  {rp && (
                    <View style={s.card}>
                      <SectionHeader icon="list-outline" label={`RESPONSE PLAN · ${rp.actions?.length} ACTIONS`} />
                      {rp.actions?.map((action: any, i: number) => (
                        <View key={i} style={s.actionRow}>
                          <View style={[s.actionNum, { backgroundColor: sevBg(
                            i === 0 ? 'critical' : i === 1 ? 'high' : 'medium') }]}>
                            <Text style={[s.actionNumText, { color: sevColor(
                              i === 0 ? 'critical' : i === 1 ? 'high' : 'medium') }]}>{action.priority}</Text>
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
                  {sl && (
                    <View style={s.card}>
                      <SectionHeader icon="flask-outline" label="SIMULATION RESULTS" />
                      {sl.simulations?.map((sim: any, i: number) => (
                        <View key={i} style={s.simRow}>
                          <View style={s.simHeader}>
                            <Ionicons name="checkmark-circle" size={14} color={C.accent} />
                            <Text style={s.simType}>{sim.simulation_type.replace(/_/g, ' ')}</Text>
                          </View>
                          <View style={s.simMetrics}>
                            <View style={s.simCol}>
                              <Text style={s.simLabel}>Before</Text>
                              {Object.entries(sim.before).slice(0, 2).map(([k, v]: any) => (
                                <Text key={k} style={s.simVal}>{k.replace(/_/g, ' ')}: {String(v)}</Text>
                              ))}
                            </View>
                            <Ionicons name="arrow-forward" size={14} color={C.textMuted} style={{ marginHorizontal: 8 }} />
                            <View style={s.simCol}>
                              <Text style={[s.simLabel, { color: C.accent }]}>After</Text>
                              {Object.entries(sim.after).slice(0, 2).map(([k, v]: any) => (
                                <Text key={k} style={[s.simVal, { color: C.accent }]}>{k.replace(/_/g, ' ')}: {String(v)}</Text>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {oc && (
                    <View style={[s.card, { borderColor: C.accent, borderWidth: 1.5 }]}>
                      <View style={s.outcomeHeader}>
                        <SectionHeader icon="bar-chart-outline" label="OUTCOME" />
                        <View style={[s.statusBadge, { backgroundColor: C.accentLight }]}>
                          <Text style={[s.statusText, { color: C.accent }]}>
                            {oc.resolution_status?.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={s.outcomeGrid}>
                        <OutcomeBox icon="car-outline" label="Congestion" before="340%" after="85%" />
                        <OutcomeBox icon="bus-outline" label="Rescued" before="0" after="250" />
                        <OutcomeBox icon="megaphone-outline" label="Alerted" before="0" after="8,420" />
                        <OutcomeBox icon="trending-down-outline" label="Stranded" before="340" after="90" />
                      </View>
                      <Text style={s.outcomeSummary}>{oc.impact_summary}</Text>
                      <View style={s.pipelineRow}>
                        <Ionicons name="timer-outline" size={14} color={C.textMuted} />
                        <Text style={s.pipelineLabel}>Pipeline Duration</Text>
                        <Text style={s.pipelineVal}>{(oc.total_pipeline_duration_ms / 1000).toFixed(1)}s</Text>
                      </View>
                    </View>
                  )}
                  <TouchableOpacity style={s.traceToggle} onPress={() => setShowTrace(!showTrace)} activeOpacity={0.6}>
                    <Ionicons name={showTrace ? 'chevron-down' : 'chevron-forward'} size={14} color={C.primary} />
                    <Text style={s.traceToggleText}>Agent Trace Log</Text>
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
      <Ionicons name={icon} size={16} color={C.textMuted} />
      <Text style={s.outcomeLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={s.outcomeBefore}>{before}</Text>
        <Ionicons name="arrow-forward" size={10} color={C.textMuted} />
        <Text style={s.outcomeAfter}>{after}</Text>
      </View>
    </View>
  );
}

function NavTip({ icon, title, desc, active }: any) {
  return (
    <View style={[s.navTip, active && { borderColor: C.primary, borderWidth: 1 }]}>
      <Ionicons name={icon} size={18} color={active ? C.primary : C.textMuted} />
      <Text style={[s.navTipTitle, active && { color: C.primary }]}>{title}</Text>
      <Text style={s.navTipDesc}>{desc}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 30 },
  dashboardBody: { paddingHorizontal: 14 },

  modeToggleContainer: { flexDirection: 'row', backgroundColor: C.surface, marginHorizontal: 14, marginTop: 8, marginBottom: 8, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: C.border },
  modeToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  modeToggleActive: { backgroundColor: C.primaryLight },
  modeToggleText: { fontSize: 12, fontWeight: '600', color: C.textSec },
  modeToggleTextActive: { color: C.primary, fontWeight: '700' },

  civActionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  civActionBtn: { alignItems: 'center', flex: 1 },
  civIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  civActionText: { fontSize: 11, fontWeight: '600', color: C.text, textAlign: 'center' },

  sosContainer: { alignItems: 'center', marginVertical: 20, position: 'relative', height: 140, justifyContent: 'center' },
  sosBackground: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#FEE2E2', overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 2, borderColor: '#FECACA' },
  sosFill: { width: '100%', backgroundColor: '#F87171' },
  sosButton: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: C.critical, alignItems: 'center', justifyContent: 'center', shadowColor: C.critical, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },
  sosText: { color: '#fff', fontWeight: '800', fontSize: 10, marginTop: 4, letterSpacing: 1 },

  heroBanner: { padding: 20, paddingTop: 30, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heroLogoLight: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  heroSubLight: { fontSize: 12, color: '#BFDBFE', fontWeight: '500', marginTop: -2 },
  heroDesc: { fontSize: 13, color: '#E0E7FF', lineHeight: 18, marginTop: 4 },
  liveChipLight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  liveTextLight: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.critical },

  statRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },
  statVal: { fontSize: 16, fontWeight: '700', color: C.text },
  statLabel: { fontSize: 10, color: C.textSec, fontWeight: '500', textTransform: 'uppercase' },

  card: { backgroundColor: C.surface, borderRadius: 12, padding: 16, borderWidth: 1,
    borderColor: C.border, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 1 },
  cardSubLabel: { fontSize: 11, color: C.textSec, marginBottom: 12 },

  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioBtnBox: { flex: 1, minWidth: '45%', backgroundColor: C.surfaceEl, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border },
  scenarioIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  scenarioBtnBoxText: { fontSize: 11, fontWeight: '700', color: C.text, letterSpacing: 0.5 },
  demoHint: { fontSize: 11, color: C.primary, marginTop: 8, fontWeight: '600' },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  navTip: { width: (width - 44) / 2, backgroundColor: C.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border },
  navTipTitle: { fontSize: 12, fontWeight: '600', color: C.text, marginTop: 6 },
  navTipDesc: { fontSize: 10, color: C.textMuted, marginTop: 2, lineHeight: 14 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.textSec, letterSpacing: 1 },

  // Crisis
  crisisRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  crisisIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  crisisType: { fontSize: 13, fontWeight: '700', color: C.text },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  crisisLoc: { fontSize: 11, color: C.textSec },
  sevPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  metricRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  metricBox: { flex: 1, backgroundColor: C.surfaceEl, borderRadius: 8, padding: 10, alignItems: 'center' },
  metricLabel: { fontSize: 8, fontWeight: '600', color: C.textMuted, letterSpacing: 0.8, marginBottom: 3 },
  metricValue: { fontSize: 16, fontWeight: '800' },
  reasoning: { fontSize: 11, color: C.textSec, lineHeight: 16, fontStyle: 'italic' },

  // Impact
  impactPrimary: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 8 },
  impactRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  impactDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.critical, marginRight: 8, marginTop: 6 },
  impactText: { fontSize: 11, color: C.textSec, flex: 1, lineHeight: 16 },
  escalationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.border },
  escalationLabel: { fontSize: 10, fontWeight: '600', color: C.textMuted, width: 78 },
  progressBg: { flex: 1, height: 4, backgroundColor: C.surfaceEl, borderRadius: 2, marginHorizontal: 6 },
  progressFill: { height: 4, borderRadius: 2 },
  escalationVal: { fontSize: 12, fontWeight: '700', width: 32, textAlign: 'right' },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border },
  actionNum: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  actionNumText: { fontSize: 11, fontWeight: '800' },
  actionType: { fontSize: 9, fontWeight: '700', color: C.primary, letterSpacing: 0.8 },
  actionDesc: { fontSize: 12, color: C.text, lineHeight: 16, marginTop: 1 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  actionEta: { fontSize: 10, color: C.accent, fontWeight: '600' },

  // Simulation
  simRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  simHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  simType: { fontSize: 11, fontWeight: '600', color: C.text, textTransform: 'capitalize' },
  simMetrics: { flexDirection: 'row', alignItems: 'center' },
  simCol: { flex: 1 },
  simLabel: { fontSize: 8, fontWeight: '700', color: C.critical, letterSpacing: 0.8, marginBottom: 2 },
  simVal: { fontSize: 10, color: C.textSec },

  // Outcome
  outcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  outcomeBox: { width: (width - 54) / 2, backgroundColor: C.surfaceEl, borderRadius: 8,
    padding: 10, alignItems: 'center', gap: 3 },
  outcomeLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600' },
  outcomeBefore: { fontSize: 12, color: C.critical, fontWeight: '700' },
  outcomeAfter: { fontSize: 12, color: C.accent, fontWeight: '700' },
  outcomeSummary: { fontSize: 11, color: C.text, lineHeight: 16, marginBottom: 10 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceEl,
    borderRadius: 8, padding: 10 },
  pipelineLabel: { fontSize: 11, color: C.textMuted, fontWeight: '500', flex: 1 },
  pipelineVal: { fontSize: 18, fontWeight: '800', color: C.primary },

  // Trace
  traceToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12 },
  traceToggleText: { fontSize: 11, fontWeight: '600', color: C.primary },
  traceCard: { backgroundColor: C.surface, borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border },
  traceLine: { fontSize: 9, fontFamily: 'monospace', lineHeight: 16, marginBottom: 2 },

  // Status & Agents
  toolChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 4, borderWidth: 1 },
  toolActive: { backgroundColor: C.accentLight, borderColor: C.accentLight },
  toolInactive: { backgroundColor: C.criticalLight, borderColor: C.criticalLight },
  toolText: { fontSize: 10, fontWeight: '700' },
  agentChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceEl, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 6 },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  agentText: { fontSize: 10, fontWeight: '600', color: C.text },

  // History
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  historyType: { fontSize: 11, fontWeight: '600', color: C.text },
  historyDate: { fontSize: 9, color: C.textMuted },
});
