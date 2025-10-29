export const unstable_settings = { layout: null };
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';

const CATEGORY_LABELS: Record<string, string> = {
  'Roman d\'amour': 'Roman d\'amour',
  'Fanfiction': 'Fanfiction',
  'Fiction générale': 'Fiction générale',
  'Roman pour adolescents': 'Roman pour adolescents',
  'Aléatoire': 'Aléatoire',
  'Action': 'Action',
  'Aventure': 'Aventure',
  'Nouvelles': 'Nouvelles',
  'Fantasy': 'Fantasy',
  'Non-Fiction': 'Non-Fiction',
  'Fantastique': 'Fantastique',
  'Mystère': 'Mystère',
};

export default function CommunityChat() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  // Extraire les membres actifs (ayant envoyé un message récemment)
  const members = useMemo(() => {
    const map = new Map();
    messages.forEach(m => {
      if (m.uid) map.set(m.uid, { user: m.user, photoURL: m.photoURL });
    });
    return Array.from(map.values());
  }, [messages]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!category) return;
    const q = query(collection(db, 'communityChats', String(category), 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [category]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
      text: input.trim(),
      user: user.displayName || user.email || 'Utilisateur',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      uid: user.uid,
    });
    setInput('');
  };

  return (
    <LinearGradient
      colors={["#fff7ef", "#ffe0c2"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bg}
    >
      <View style={styles.headerFloating}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnRound}>
          <Ionicons name="arrow-back" size={22} color="#FFA94D" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="chatbubbles" size={22} color="#FFA94D" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>{CATEGORY_LABELS[String(category)] || category}</Text>
        </View>
      </View>
      {/* Liste horizontale des membres actifs */}
      {members.length > 0 && (
        <View style={styles.membersBar}>
          <FlatList
            data={members}
            keyExtractor={(item, idx) => item.user + idx}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
            renderItem={({ item }) => (
              <View style={styles.memberAvatarWrap}>
                <Image
                  source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                  style={styles.memberAvatar}
                />
              </View>
            )}
            ListFooterComponent={<Text style={styles.membersCount}>+{members.length}</Text>}
          />
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          const isEven = index % 2 === 0;
          return (
            <View style={styles.messageRowPremium}>
              <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }} style={styles.avatarPremium} />
              <View style={styles.bubbleWrapPremium}>
                <Text style={styles.userPremium}>{item.user}</Text>
                <LinearGradient
                  colors={isEven ? ["#FFA94D", "#FFCC80"] : ["#fff", "#ffe0c2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bubblePremium}
                >
                  <Text style={[styles.textPremium, { color: isEven ? '#23232a' : '#FFA94D' }]}>{item.text}</Text>
                </LinearGradient>
                {item.createdAt?.seconds ? (
                  <Text style={styles.timePremium}>{new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                ) : null}
              </View>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80} style={styles.inputBarWrapPremium}>
        <View style={styles.inputBarPremium}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Écrire un message..."
            placeholderTextColor="#FFA94D"
            style={styles.inputPremium}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtnPremium}>
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  headerFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 38,
    marginBottom: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 22,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  backBtnRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: '#fff7',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Membres actifs
  membersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: -8,
    minHeight: 54,
    paddingBottom: 2,
  },
  memberAvatarWrap: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FFA94D',
    backgroundColor: '#fff',
  },
  membersCount: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
    marginRight: 2,
  },
  // ...existing code...
  messageRowPremium: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 26,
  },
  avatarPremium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FFA94D',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleWrapPremium: {
    flex: 1,
    minWidth: 0,
  },
  userPremium: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
    marginLeft: 2,
  },
  bubblePremium: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 2,
  },
  textPremium: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  timePremium: {
    color: '#FFA94D',
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
    marginRight: 2,
    opacity: 0.7,
  },
  inputBarWrapPremium: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  inputBarPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    margin: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inputPremium: {
    flex: 1,
    color: '#FFA94D',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sendBtnPremium: {
    marginLeft: 8,
    padding: 10,
    backgroundColor: '#FFA94D',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.13,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
