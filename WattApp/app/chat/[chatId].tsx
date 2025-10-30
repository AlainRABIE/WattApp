import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image, Animated, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import app, { db } from '../../constants/firebaseConfig';
import { collection, addDoc, serverTimestamp, query as firestoreQuery, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLocalSearchParams } from 'expo-router';

export default function ChatThread() {
  const window = Dimensions.get('window');
  const params = useLocalSearchParams();
  const chatId = params.chatId as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState<any>({});
  const [headerOpacity] = useState(new Animated.Value(0));
  const [composerFocused, setComposerFocused] = useState(false);
  const flatRef = useRef<any>(null);

  useEffect(() => {
    if (!chatId) return;
    const chatRef = doc(db, 'chats', chatId);
    (async () => {
      const chatSnap = await getDoc(chatRef);
      if (chatSnap.exists()) {
        const data = chatSnap.data();
        const meta = data.participantsMeta || {};
        setParticipants(meta);
      }
    })();
    const q = firestoreQuery(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setMessages(items);
      setTimeout(() => flatRef.current?.scrollToEnd?.({ animated: true }), 200);
    });
    return () => unsub();
  }, [chatId]);

  // Animation header on scroll
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: headerOpacity } } }],
    { useNativeDriver: false }
  );

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

  // Trouver l'autre participant (DM)
  const myUid = getAuth(app).currentUser?.uid;
  const otherUid = Object.keys(participants).find(uid => uid !== myUid);
  const other = otherUid ? participants[otherUid] : {};

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: '#181818' }}>
        {/* Header ultra-moderne */}
        <View style={styles.headerUltraModernWrap}>
          <Pressable style={styles.headerUltraBack} onPress={() => history.back()}>
            <Ionicons name="chevron-back" size={32} color="#fff" style={{ textShadowColor: '#0008', textShadowRadius: 8, textShadowOffset: {width: 0, height: 2} }} />
          </Pressable>
          <View style={styles.headerUltraAvatarWrap}>
            <Image
              source={{ uri: other.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.displayName || other.email || 'U')}&background=6C63FF&color=fff&size=128` }}
              style={styles.headerUltraAvatar}
            />
          </View>
          <Text style={styles.headerUltraName} numberOfLines={1}>{other.displayName || other.email || 'Utilisateur'}</Text>
        </View>
        {/* Liste des messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const isMe = item.sender === myUid;
            const senderMeta = participants[item.sender] || {};
            return (
              <View style={[styles.messageRow, isMe ? styles.meRow : styles.themRow]}>
                {!isMe && (
                  <Image
                    source={{ uri: senderMeta.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderMeta.displayName || senderMeta.email || 'U')}&background=FFA94D&color=181818&size=128` }}
                    style={styles.avatar}
                  />
                )}
                <Animated.View style={[styles.message, isMe ? styles.meUltra : styles.themUltra]}>
                  {!isMe && (
                    <Text style={styles.senderName}>{senderMeta.displayName || senderMeta.email || 'Utilisateur'}</Text>
                  )}
                  <LinearGradient
                    colors={isMe ? ["#6C63FF", "#48C6EF"] : ["#fff", "#e3e3e3"]}
                    style={styles.bubbleUltra}
                  >
                    <Text style={{ color: isMe ? '#fff' : '#181818', fontSize: 16 }}>{item.text}</Text>
                  </LinearGradient>
                </Animated.View>
                {isMe && (
                  <Image
                    source={{ uri: senderMeta.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderMeta.displayName || senderMeta.email || 'U')}&background=FFA94D&color=181818&size=128` }}
                    style={styles.avatar}
                  />
                )}
              </View>
            );
          }}
          contentContainerStyle={{ padding: 16, paddingTop: 110, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
        />
        {/* Composer ultra-moderne : arrondi, glass, ombre, icônes colorées */}
        <View style={styles.composerWrapUltra} pointerEvents="box-none">
          <BlurView intensity={40} tint="light" style={styles.composerUltraBlur}>
            <View style={[styles.composerUltra, composerFocused && { borderColor: '#6C63FF', borderWidth: 2 }]}>
              <TouchableOpacity style={styles.composerIconUltra} activeOpacity={0.7}>
                <Ionicons name="happy-outline" size={26} color="#6C63FF" />
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Écrire un message..."
                placeholderTextColor="#888"
                style={styles.inputUltra}
                multiline
                maxLength={1000}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
              />
              <TouchableOpacity style={styles.composerIconUltra} activeOpacity={0.7}>
                <Ionicons name="mic-outline" size={26} color="#6C63FF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButtonUltra, { backgroundColor: text.trim() ? '#6C63FF' : '#bbb' }]}
                onPress={sendMessage}
                disabled={!text.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={24} color={text.trim() ? '#fff' : '#888'} />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerUltraModernWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 130,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  headerUltraBack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 28,
    left: 16,
    zIndex: 99,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 999,
    padding: 4,
  },
  headerUltraAvatarWrap: {
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 40,
    elevation: 10,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  headerUltraAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#6C63FF33',
  },
  headerUltraName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    marginTop: 6,
    textAlign: 'center',
    textShadowColor: '#0008',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
    zIndex: 3,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    maxWidth: 240,
  },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 9 },
  meRow: { justifyContent: 'flex-end' },
  themRow: { justifyContent: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 19, marginHorizontal: 7, backgroundColor: '#FFA94D33', borderWidth: 1, borderColor: '#FFA94D22' },
  message: {
    borderRadius: 22,
    maxWidth: '75%',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  meUltra: {
    marginLeft: 32,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 8,
    backgroundColor: 'transparent',
  },
  themUltra: {
    marginRight: 32,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 8,
    backgroundColor: 'transparent',
  },
  bubbleUltra: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 22,
    minWidth: 36,
    minHeight: 36,
  },
  senderName: { color: '#FFA94D', fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  composerWrapUltra: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'transparent',
    zIndex: 30,
  },
  composerUltraBlur: {
    borderRadius: 32,
    marginHorizontal: 10,
    marginBottom: 4,
    overflow: 'hidden',
    elevation: 8,
  },
  composerUltra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 8,
  },
  composerIconUltra: {
    padding: 7,
    marginHorizontal: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(108,99,255,0.08)',
  },
  inputUltra: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#181818',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    borderRadius: 12,
    minHeight: 36,
    maxHeight: 90,
    marginHorizontal: 2,
  },
  sendButtonUltra: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});