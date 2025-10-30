import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import app, { db } from '../../constants/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  query as firestoreQuery,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ChatThread() {
  const window = Dimensions.get('window');
  const params = useLocalSearchParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState<any>({});
  const [headerOpacity] = useState(new Animated.Value(0));
  const [composerFocused, setComposerFocused] = useState(false);
  const [myPhotoURL, setMyPhotoURL] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [otherUserInfo, setOtherUserInfo] = useState<any>(null);
  const flatRef = useRef<any>(null);

  // Récupère les participants du chat
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
    const q = firestoreQuery(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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

  // Envoi d'un message
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
      await updateDoc(chatRef, {
        lastMessageText: text.trim(),
        lastMessageAt: serverTimestamp(),
      });
      setText('');
    } catch (err) {
      console.warn('Erreur envoi message', err);
    }
  };

  // Détermine l'UID de l'autre participant
  const auth = getAuth(app);
  const currentUser = auth.currentUser;
  const myUid = currentUser?.uid;
  const otherUid = Object.keys(participants).find((uid) => uid !== myUid);

  // Récupère les infos du destinataire si besoin
  useEffect(() => {
    let cancelled = false;
    async function fetchInfo() {
      if (!otherUid) return;
      // Si déjà dans participants, pas besoin
      if (participants[otherUid]?.displayName) return;
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../constants/firebaseConfig');
        const q = query(collection(db, 'users'), where('uid', '==', otherUid));
        const snap = await getDocs(q);
        if (!snap.empty && !cancelled) {
          setOtherUserInfo(snap.docs[0].data());
        }
      } catch (err) {
        // ignore
      }
    }
    fetchInfo();
    // Retry après 1s en cas de propagation lente
    const retry = setTimeout(fetchInfo, 1000);
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [otherUid, participants]);

  // Récupère la photo de l'utilisateur courant (Auth, fallback Firestore)
  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) return;
        setMyDisplayName(user.displayName || null);
        setMyEmail(user.email || null);
        if (user.photoURL) {
          setMyPhotoURL(user.photoURL);
          return;
        }
        // Fallback: Firestore
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../constants/firebaseConfig');
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data && data.photoURL) setMyPhotoURL(data.photoURL);
        }
      } catch (err) {
        console.warn('Failed to fetch my photoURL', err);
      }
    };
    fetchMyProfile();
  }, []);

  // HEADER ULTRA-MODERNE
  function renderHeader() {
    // Fallbacks robustes
    const displayName =
      (otherUid &&
        (participants[otherUid]?.pseudo ||
          participants[otherUid]?.displayName ||
          participants[otherUid]?.mail ||
          participants[otherUid]?.email ||
          otherUserInfo?.pseudo ||
          otherUserInfo?.displayName ||
          otherUserInfo?.mail ||
          otherUserInfo?.email)) ||
      otherUid ||
      'Utilisateur inconnu';

    let photoURL =
      (otherUid && (participants[otherUid]?.photoURL || otherUserInfo?.photoURL)) || null;
    if (!photoURL || typeof photoURL !== 'string' || photoURL.trim() === '') {
      photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        displayName
      )}&background=FFA94D&color=181818&size=128`;
    }

    return (
      <View style={styles.headerUltraModernWrap}>
        <Pressable style={styles.headerUltraBack} onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={32}
            color="#fff"
            style={{
              textShadowColor: '#0008',
              textShadowRadius: 8,
              textShadowOffset: { width: 0, height: 2 },
            }}
          />
        </Pressable>
        <View style={styles.headerUltraAvatarWrap}>
          {!otherUid ||
          !(
            participants[otherUid]?.pseudo ||
            participants[otherUid]?.displayName ||
            participants[otherUid]?.mail ||
            participants[otherUid]?.email ||
            otherUserInfo?.pseudo ||
            otherUserInfo?.displayName ||
            otherUserInfo?.mail ||
            otherUserInfo?.email
          ) ? (
            <ActivityIndicator size="small" color="#FFA94D" style={{ margin: 10 }} />
          ) : (
            <Image source={{ uri: photoURL }} style={styles.headerUltraAvatar} />
          )}
        </View>
        <Text style={styles.headerUltraName} numberOfLines={1}>
          {displayName}
        </Text>
      </View>
    );
  }

  // Rendu principal
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, backgroundColor: '#181818' }}>
        {/* Header */}
        {renderHeader()}

        {/* Liste des messages */}
        <Animated.FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isMe = item.sender === myUid;
            const userPhoto =
              isMe && myPhotoURL
                ? myPhotoURL
                : !isMe && otherUid
                ? (participants[otherUid]?.photoURL || otherUserInfo?.photoURL) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    (participants[otherUid]?.displayName ||
                      participants[otherUid]?.pseudo ||
                      otherUserInfo?.displayName ||
                      otherUserInfo?.pseudo ||
                      'User') as string
                  )}&background=FFA94D&color=181818&size=128`
                : undefined;
            return (
              <View
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowMe : styles.messageRowOther,
                ]}
              >
                {!isMe && (
                  <Image
                    source={{ uri: userPhoto }}
                    style={styles.messageAvatar}
                    resizeMode="cover"
                  />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                  ]}
                >
                  <Text style={styles.messageText}>{item.text}</Text>
                </View>
                {isMe && (
                  <Image
                    source={{ uri: userPhoto }}
                    style={styles.messageAvatar}
                    resizeMode="cover"
                  />
                )}
              </View>
            );
          }}
          contentContainerStyle={{ paddingTop: 120, paddingBottom: 80 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />

        {/* Zone de saisie */}
        <View
          style={[
            styles.composerWrap,
            composerFocused && styles.composerWrapFocused,
          ]}
        >
          <TextInput
            style={styles.composerInput}
            placeholder="Écris ton message..."
            placeholderTextColor="#aaa"
            value={text}
            onChangeText={setText}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButtonUltra}
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <LinearGradient
              colors={['#FFA94D', '#FF6F00']}
              style={styles.sendButtonUltra}
              start={[0, 0]}
              end={[1, 1]}
            >
              <Ionicons
                name="send"
                size={24}
                color="#fff"
                style={{ marginLeft: 2 }}
              />
            </LinearGradient>
          </TouchableOpacity>
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
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 110,
    paddingTop: 40,
    paddingBottom: 10,
    backgroundColor: 'rgba(24,24,24,0.85)',
    overflow: 'visible',
    flexDirection: 'row',
    gap: 10,
  },
  headerUltraBack: {
    position: 'absolute',
    left: 10,
    top: 40,
    zIndex: 20,
    padding: 4,
    borderRadius: 20,
  },
  headerUltraAvatarWrap: {
    marginLeft: 60,
    marginRight: 10,
    borderRadius: 32,
    overflow: 'hidden',
    width: 48,
    height: 48,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUltraAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
  },
  headerUltraName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    flex: 1,
    marginLeft: 4,
    marginRight: 10,
    textShadowColor: '#0008',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#222',
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 2,
  },
  messageBubbleMe: {
    backgroundColor: '#FFA94D',
    alignSelf: 'flex-end',
  },
  messageBubbleOther: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#181818',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
    zIndex: 20,
  },
  composerWrapFocused: {
    backgroundColor: '#222',
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    color: '#fff',
    fontSize: 16,
    backgroundColor: '#222',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButtonUltra: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA94D',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});