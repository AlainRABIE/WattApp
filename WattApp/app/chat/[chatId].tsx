import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import app, { db } from '../../constants/firebaseConfig';
import { collection, addDoc, serverTimestamp, query as firestoreQuery, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLocalSearchParams } from 'expo-router';

export default function ChatThread() {
  const params = useLocalSearchParams();
  const chatId = params.chatId as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const flatRef = useRef<any>(null);

  useEffect(() => {
    if (!chatId) return;
    const q = firestoreQuery(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setMessages(items);
      // scroll to bottom
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    });
    return () => unsub();
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const auth = getAuth(app);
    const current = auth.currentUser;
    if (!current) return;
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        sender: current.uid,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      // update last message in chat doc
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, { lastMessageText: text.trim(), lastMessageAt: serverTimestamp() });
      setText('');
    } catch (e) {
      console.warn('sendMessage failed', e);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={[styles.message, item.sender === getAuth(app).currentUser?.uid ? styles.me : styles.them]}>
              <Text style={{ color: item.sender === getAuth(app).currentUser?.uid ? '#181818' : '#fff' }}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 12 }}
        />
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Écrire un message..." placeholderTextColor="#888" style={styles.input} />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: '#FFA94D' }]} onPress={sendMessage}>
            <Text style={{ color: '#181818', fontWeight: '700' }}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818' },
  composer: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#222', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#232323', color: '#fff', padding: 10, borderRadius: 8, marginRight: 8 },
  sendButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  message: { padding: 10, borderRadius: 10, marginVertical: 6, maxWidth: '80%' },
  me: { alignSelf: 'flex-end', backgroundColor: '#FFA94D' },
  them: { alignSelf: 'flex-start', backgroundColor: '#232323' },
});
