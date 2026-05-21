import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { 
  Platform, View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, StatusBar, ScrollView, Alert, DeviceEventEmitter 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ciroApi from '../../services/api';

const C = {
  bg: '#F8FAFC',        // Soft Slate bg
  surface: '#FFFFFF',   // Pure White card
  surfaceEl: '#F1F5F9', // Slate 100
  border: '#E2E8F0',    // Slate 200
  primary: '#3B82F6',   // Premium blue
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  accent: '#10B981',    // Success green
  accentLight: '#ECFDF5',
  critical: '#EF4444',  // Error red
  criticalLight: '#FEF2F2',
  text: '#0F172A',      // Slate 900
  textSec: '#475569',   // Slate 600
  textMuted: '#94A3B8', // Slate 400
};

export default function TabLayout() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Authentication Form States
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Login Form States
  const [loginCnic, setLoginCnic] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    checkUser();
    
    // Subscribe to auth state changes across other tabs (like Logout in Settings)
    const subscription = DeviceEventEmitter.addListener('auth-state-change', () => {
      checkUser();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('ciro_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        ciroApi.setCurrentUser(parsed);
      } else {
        setUser(null);
        ciroApi.setCurrentUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCNIC = (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 13);
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.substring(0, 5);
    }
    if (clean.length > 5) {
      formatted += '-' + clean.substring(5, 12);
    }
    if (clean.length > 12) {
      formatted += '-' + clean.substring(12, 13);
    }
    return formatted;
  };

  const handleSignUp = async () => {
    if (!fullName.trim() || !cnic.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in all the details.');
      return;
    }

    const cleanCnic = cnic.replace(/\D/g, '');
    if (cleanCnic.length !== 13) {
      Alert.alert('Invalid CNIC', 'Pakistani CNIC must contain exactly 13 digits.');
      return;
    }

    setAuthSubmitting(true);
    try {
      // Fetch existing registered users
      const existingStr = await AsyncStorage.getItem('ciro_registered_users');
      const registered = existingStr ? JSON.parse(existingStr) : [];

      // Check if CNIC already registered
      if (registered.some((u: any) => u.cnic === cnic)) {
        Alert.alert('CNIC Registered', 'This CNIC is already registered. Please log in.');
        setAuthMode('login');
        setAuthSubmitting(false);
        return;
      }

      const newUser = { name: fullName.trim(), cnic, phone: phone.trim(), password };
      registered.push(newUser);
      
      await AsyncStorage.setItem('ciro_registered_users', JSON.stringify(registered));
      await AsyncStorage.setItem('ciro_user', JSON.stringify({ name: newUser.name, cnic: newUser.cnic, phone: newUser.phone }));
      
      Alert.alert('Success', 'Verified Citizen Account created successfully!');
      DeviceEventEmitter.emit('auth-state-change');
    } catch {
      Alert.alert('Error', 'Could not create account.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async () => {
    if (!loginCnic.trim() || !loginPassword.trim()) {
      Alert.alert('Required Fields', 'Please enter your CNIC and password.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const existingStr = await AsyncStorage.getItem('ciro_registered_users');
      const registered = existingStr ? JSON.parse(existingStr) : [];

      const found = registered.find((u: any) => u.cnic === loginCnic && u.password === loginPassword);
      if (found) {
        await AsyncStorage.setItem('ciro_user', JSON.stringify({ name: found.name, cnic: found.cnic, phone: found.phone }));
        Alert.alert('Welcome Back', `Logged in as ${found.name}`);
        DeviceEventEmitter.emit('auth-state-change');
      } else {
        Alert.alert('Auth Failed', 'Invalid CNIC or password.');
      }
    } catch {
      Alert.alert('Error', 'Could not log in.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  // Render Login/Signup flow if user is not authenticated
  if (!user) {
    return (
      <View style={s.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.authScroll} showsVerticalScrollIndicator={false}>
          
          {/* Logo Brand */}
          <View style={s.brandBox}>
            <View style={s.brandLogo}>
              <Ionicons name="shield-checkmark" size={28} color="#fff" />
            </View>
            <Text style={s.brandTitle}>CIRO</Text>
            <Text style={s.brandSub}>Crisis Intelligence & Response</Text>
          </View>

          {/* Card Form */}
          <View style={s.authCard}>
            <Text style={s.authCardTitle}>
              {authMode === 'login' ? 'Verified Citizen Login' : 'Register Citizen Account'}
            </Text>
            <Text style={s.authCardSub}>
              {authMode === 'login' 
                ? 'Enter your CNIC credentials to access crisis services.'
                : 'CNIC registration is mandatory to authenticate verified, non-fake civilian reports.'}
            </Text>

            {authMode === 'signup' ? (
              <View>
                <Text style={s.inputLabel}>Full Name</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Amaan Ali"
                  placeholderTextColor={C.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />

                <Text style={s.inputLabel}>CNIC Number (Mandatory)</Text>
                <TextInput
                  style={s.input}
                  placeholder="XXXXX-XXXXXXX-X"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={cnic}
                  onChangeText={(val) => setCnic(formatCNIC(val))}
                />

                <Text style={s.inputLabel}>Phone Number</Text>
                <TextInput
                  style={s.input}
                  placeholder="03XXXXXXXXX"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <Text style={s.inputLabel}>Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity 
                  style={s.submitBtn} 
                  onPress={handleSignUp}
                  disabled={authSubmitting}
                >
                  {authSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.submitBtnText}>Create Verified Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={s.inputLabel}>CNIC Number</Text>
                <TextInput
                  style={s.input}
                  placeholder="XXXXX-XXXXXXX-X"
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={loginCnic}
                  onChangeText={(val) => setLoginCnic(formatCNIC(val))}
                />

                <Text style={s.inputLabel}>Password</Text>
                <TextInput
                  style={s.input}
                  placeholder="Password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={loginPassword => setLoginPassword(loginPassword)}
                />

                <TouchableOpacity 
                  style={s.submitBtn} 
                  onPress={handleLogin}
                  disabled={authSubmitting}
                >
                  {authSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.submitBtnText}>Verify & Log In</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Toggle Flow Mode */}
          <View style={s.toggleBox}>
            <Text style={s.toggleText}>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity 
              onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            >
              <Text style={s.toggleLink}>
                {authMode === 'login' ? 'Register Now' : 'Log In'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    );
  }

  // Render normal React Native Tabs if logged in
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
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

const s = StyleSheet.create({
  centerContainer: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  
  // Auth Screen Container
  authContainer: { flex: 1, backgroundColor: C.bg },
  authScroll: { padding: 20, paddingTop: 40, paddingBottom: 60, alignItems: 'center' },
  
  // Brand Header
  brandBox: { alignItems: 'center', marginBottom: 24 },
  brandLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  brandTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 10, letterSpacing: 0.5 },
  brandSub: { fontSize: 11, color: C.textSec, marginTop: 2, fontWeight: '500' },
  
  // Card Design
  authCard: { width: '100%', backgroundColor: C.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: C.border, shadowColor: C.text, shadowOpacity: 0.02, shadowRadius: 12, elevation: 1 },
  authCardTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  authCardSub: { fontSize: 11, color: C.textSec, lineHeight: 16, marginTop: 4, marginBottom: 16 },
  
  // Form Controls
  inputLabel: { fontSize: 10, fontWeight: '600', color: C.text, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { backgroundColor: C.surfaceEl, borderRadius: 8, padding: 12, color: C.text, fontSize: 13, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  submitBtn: { backgroundColor: C.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 6, shadowColor: C.primary, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  submitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  
  // Toggles
  toggleBox: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  toggleText: { fontSize: 12, color: C.textSec },
  toggleLink: { fontSize: 12, color: C.primary, fontWeight: '700' },
});
