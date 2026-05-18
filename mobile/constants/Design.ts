/**
 * CIRO Design System — Light Theme
 * Clean, professional palette with gray/white foundation
 */

export const Colors = {
  // Core — Light, clean foundation
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F1F5',
  surfaceGlass: 'rgba(255, 255, 255, 0.92)',

  // Brand
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDim: '#1D4ED8',
  accent: '#059669',
  accentLight: '#D1FAE5',

  // Severity
  critical: '#DC2626',
  criticalLight: '#FEE2E2',
  high: '#D97706',
  highLight: '#FEF3C7',
  medium: '#2563EB',
  mediumLight: '#DBEAFE',
  low: '#059669',
  lowLight: '#D1FAE5',

  // Crisis type accent
  flooding: '#2563EB',
  fire: '#DC2626',
  traffic: '#D97706',
  accident: '#EA580C',
  infrastructure: '#7C3AED',
  heatwave: '#DC2626',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Status
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // UI
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.08)',
  shadow: '#000',

  // Agent trace
  agent1: '#2563EB',
  agent2: '#DC2626',
  agent3: '#D97706',
  agent4: '#059669',
  agent5: '#7C3AED',
  agent6: '#DB2777',
};

export const Typography = {
  h1: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 14, fontWeight: '600' as const },
  body: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  bodyBold: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '500' as const },
  label: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 1.0, textTransform: 'uppercase' as const },
  mono: { fontSize: 11, fontFamily: 'monospace' as const },
};

export const Spacing = {
  xs: 3,
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 36,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
};

export const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return Colors.critical;
    case 'high': return Colors.high;
    case 'medium': return Colors.medium;
    case 'low': return Colors.low;
    default: return Colors.textMuted;
  }
};

export const getSeverityBg = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return Colors.criticalLight;
    case 'high': return Colors.highLight;
    case 'medium': return Colors.mediumLight;
    case 'low': return Colors.lowLight;
    default: return Colors.surfaceElevated;
  }
};

// Ionicons icon name mapping for crisis types
export const getCrisisIconName = (type: string): string => {
  switch (type) {
    case 'urban_flooding': return 'water-outline';
    case 'fire': return 'flame-outline';
    case 'road_blockage': return 'car-outline';
    case 'accident': return 'alert-circle-outline';
    case 'infrastructure_failure': return 'flash-outline';
    case 'heatwave': return 'thermometer-outline';
    default: return 'warning-outline';
  }
};
