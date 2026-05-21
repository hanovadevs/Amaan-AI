import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, FlatList, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ciroApi from '../../services/api';

const C = {
  bg: '#F5F6FA', surface: '#FFFFFF',
  primary: '#2563EB', primaryLight: '#DBEAFE', accent: '#059669',
  text: '#111827', textSec: '#6B7280', textMuted: '#9CA3AF',
  border: '#E5E7EB', userMsg: '#2563EB', ciroMsg: '#FFFFFF'
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm ZAVIA, your local Crisis Intelligence Assistant. 🛡️ How can I help you stay safe today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await ciroApi.chatWithCiro(userText);
      const ciroMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: res.response,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, ciroMsg]);
    } catch (e: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "⚠️ I can't reach the ZAVIA server right now. Please check that the backend is running and try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.isUser;
    return (
      <View style={[s.msgWrapper, isUser ? s.msgWrapperUser : s.msgWrapperCiro]}>
        {!isUser && (
          <View style={s.avatarBox}>
            <Ionicons name="shield-checkmark" size={16} color={C.primary} />
          </View>
        )}
        <View style={[s.msgBubble, isUser ? s.userBubble : s.ciroBubble]}>
          <Text style={[s.msgText, isUser ? s.userText : s.ciroText]}>{item.text}</Text>
          <Text style={[s.timeText, isUser ? s.userTimeText : s.ciroTimeText]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.safeArea}>
      <KeyboardAvoidingView 
        style={s.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Ask ZAVIA</Text>
            <Text style={s.headerSub}>Live AI Assistant</Text>
          </View>
          <View style={s.onlineBadge}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>ONLINE</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={s.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={s.typingIndicator}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={s.typingText}>ZAVIA is thinking...</Text>
          </View>
        )}

        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="E.g. Is highway 9 flooded right now?"
            placeholderTextColor={C.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={200}
          />
          <TouchableOpacity 
            style={[s.sendBtn, !input.trim() && s.sendBtnDisabled]} 
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.surface },
  container: { flex: 1, backgroundColor: C.bg },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 12, color: C.textSec, marginTop: 2 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
  onlineText: { fontSize: 9, fontWeight: '700', color: '#10B981' },
  
  chatList: { padding: 16, paddingBottom: 20 },
  msgWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  msgWrapperUser: { justifyContent: 'flex-end' },
  msgWrapperCiro: { justifyContent: 'flex-start' },
  
  avatarBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  userBubble: { backgroundColor: C.userMsg, borderBottomRightRadius: 4 },
  ciroBubble: { backgroundColor: C.ciroMsg, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  
  msgText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  ciroText: { color: C.text },
  
  timeText: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  userTimeText: { color: 'rgba(255,255,255,0.7)' },
  ciroTimeText: { color: C.textMuted },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  typingText: { fontSize: 11, color: C.textSec, fontStyle: 'italic' },

  inputContainer: { 
    flexDirection: 'row', alignItems: 'flex-end', padding: 12, 
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border 
  },
  input: {
    flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 12, minHeight: 40, maxHeight: 100,
    fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginBottom: 2
  },
  sendBtnDisabled: { backgroundColor: C.textMuted },
});
