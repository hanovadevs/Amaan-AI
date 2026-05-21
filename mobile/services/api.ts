/**
 * CIRO API Service — Communicates with the FastAPI backend
 * Production version: No mock data. Real error handling.
 */

import Constants from 'expo-constants';

const getApiBase = () => {
  if (__DEV__) {
    // Attempt to get the local IP address dynamically from Expo dev server
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:8000`;
    }
    // Fallback if hostUri is not available (user's current local machine IP)
    return 'http://192.168.10.15:8000';
  }
  return 'https://ciro-api.your-domain.com';
};

export const API_BASE = getApiBase();

// ── Type Definitions ──

export interface PipelineResponse {
  signals: any[];
  crisis_report: any;
  situation_assessment: any;
  response_plan: any;
  simulation_log: any;
  outcome_report: any;
  agent_trace_log: string[];
  pipeline_success: boolean;
  error?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: string;
  location: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  source: string;
  crisis_type: string;
  reporter_name?: string;
  reporter_cnic?: string;
  photos?: string[];
}

export interface SafeZone {
  id: string;
  title: string;
  description: string;
  city: string;
  latitude: number;
  longitude: number;
  type: string;
}

export interface ReportPayload {
  category: string;
  location: string;
  description: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  town?: string;
  reporter_name?: string;
  reporter_cnic?: string;
  photos?: string[];
}

// ── API Client ──

class CiroAPI {
  public baseUrl: string;
  public currentUser: { name: string; cnic: string; phone: string } | null = null;

  constructor() {
    this.baseUrl = API_BASE;
  }

  setCurrentUser(user: { name: string; cnic: string; phone: string } | null) {
    this.currentUser = user;
  }

  // ── Health / Status ──

  async getStatus(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/status`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  async getHistory(): Promise<{ history: any[] }> {
    const res = await fetch(`${this.baseUrl}/api/history`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Pipeline ──

  async runDemo(scenario: string = 'flooding'): Promise<PipelineResponse> {
    const res = await fetch(`${this.baseUrl}/api/demo?scenario=${scenario}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  async quickReport(text: string, city?: string): Promise<PipelineResponse> {
    const url = city 
      ? `${this.baseUrl}/api/quick-report?text=${encodeURIComponent(text)}&city=${encodeURIComponent(city)}`
      : `${this.baseUrl}/api/quick-report?text=${encodeURIComponent(text)}`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Structured Report ──

  async submitReport(payload: ReportPayload): Promise<{
    success: boolean;
    report_id: string;
    message: string;
    pipeline_result: PipelineResponse | null;
  }> {
    const res = await fetch(`${this.baseUrl}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Live Alerts ──

  async getLiveAlerts(): Promise<{ total: number; alerts: AlertItem[] }> {
    const res = await fetch(`${this.baseUrl}/api/live-alerts`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Safe Zones ──

  async getSafeZones(city?: string): Promise<{ total: number; zones: SafeZone[] }> {
    const url = city
      ? `${this.baseUrl}/api/safe-zones?city=${encodeURIComponent(city)}`
      : `${this.baseUrl}/api/safe-zones`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── SOS ──

  async sendSOS(latitude: number, longitude: number, message?: string): Promise<{
    success: boolean;
    sos_id: string;
    message: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, message: message || 'Emergency SOS' }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Mark Safe ──

  async markSafe(alertId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/api/mark-safe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_id: alertId }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Chat ──

  async chatWithCiro(message: string): Promise<{ response: string }> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Weather ──

  async getWeather(city: string = 'islamabad'): Promise<{ success: boolean; weather: any }> {
    const res = await fetch(`${this.baseUrl}/api/weather?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Emergency Contacts ──

  async getEmergencyContacts(): Promise<{ contacts: any[] }> {
    const res = await fetch(`${this.baseUrl}/api/emergency-contacts`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }

  // ── Preparedness Tips ──

  async getPreparedness(category?: string): Promise<any> {
    const url = category
      ? `${this.baseUrl}/api/preparedness-tips?category=${encodeURIComponent(category)}`
      : `${this.baseUrl}/api/preparedness-tips`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  }
}

export const ciroApi = new CiroAPI();
export default ciroApi;
