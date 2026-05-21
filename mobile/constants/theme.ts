/**
 * CIRO Design System — Shared design tokens
 */
export const T = {
  // Colors
  bg: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceEl: '#F1F3F9',
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',
  accent: '#10B981',
  accentLight: '#ECFDF5',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  warn: '#F59E0B',
  warnLight: '#FFFBEB',
  text: '#0F172A',
  textSec: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Shadows
  shadow: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  shadowLg: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },

  // Radius
  r: { sm: 8, md: 12, lg: 16, xl: 20, full: 100 },

  // Spacing
  sp: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 },
};

export const sevColor = (s: string) => {
  switch (s) { case 'critical': return T.danger; case 'high': return T.warn; case 'medium': return T.primary; default: return T.accent; }
};
export const sevBg = (s: string) => {
  switch (s) { case 'critical': return T.dangerLight; case 'high': return T.warnLight; case 'medium': return T.primaryLight; default: return T.accentLight; }
};

export const crisisIcon = (t: string): string => {
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

export const timeAgo = (dateStr: string): string => {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return 'Recent'; }
};
