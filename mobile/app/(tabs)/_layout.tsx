import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F5F6FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  primary: '#2563EB',
  muted: '#9CA3AF',
  text: '#111827',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 58,
          paddingBottom: Platform.OS === 'ios' ? 24 : 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
        headerStyle: {
          backgroundColor: C.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        },
        headerTitleStyle: { color: C.text, fontSize: 15, fontWeight: '600' },
        headerTintColor: C.text,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size - 4} color={color} />
          ),
          headerTitle: 'CIRO Dashboard',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ask CIRO',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size - 4} color={color} />
          ),
          headerTitle: 'CIRO AI Assistant',
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle-outline" size={size - 4} color={color} />
          ),
          headerTitle: 'Report Crisis',
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size - 4} color={color} />
          ),
          headerTitle: 'Alert Feed',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size - 4} color={color} />
          ),
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
