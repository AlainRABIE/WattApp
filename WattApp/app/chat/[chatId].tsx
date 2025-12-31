import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  StatusBar,
  Modal,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  setDoc,
  deleteField,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

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
  
  // Nouvelles fonctionnalités
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

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
    
    // Écoute l'indicateur "en train d'écrire"
    const typingRef = doc(db, 'chats', chatId, 'typingStatus', otherUid || 'unknown');
    const unsubTyping = onSnapshot(typingRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setOtherUserTyping(data.isTyping || false);
      }
    });
    
    return () => {
      unsub();
      unsubTyping();
    };
  }, [chatId]);

  // Animation header on scroll
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Gestion de l'indicateur "en train d'écrire"
  const handleTyping = useCallback((textValue: string) => {
    setText(textValue);
    
    if (!chatId || !myUid) return;
    
    if (textValue.trim() && !isTyping) {
      setIsTyping(true);
      const typingRef = doc(db, 'chats', chatId, 'typingStatus', myUid);
      setDoc(typingRef, { isTyping: true, timestamp: serverTimestamp() });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      const typingRef = doc(db, 'chats', chatId, 'typingStatus', myUid);
      setDoc(typingRef, { isTyping: false, timestamp: serverTimestamp() });
    }, 1500);
  }, [chatId, myUid, isTyping]);

  // Envoi d'un message
  const sendMessage = async () => {
    if (!text.trim()) return;
    const auth = getAuth(app);
    const current = auth.currentUser;
    if (!current) return;
    
    Vibration.vibrate(10); // Petite vibration tactile
    
    try {
      const messageData: any = {
        sender: current.uid,
        text: text.trim(),
        createdAt: serverTimestamp(),
        read: false,
      };
      
      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          sender: replyingTo.sender,
        };
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      // update last message in chat doc
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessageText: text.trim(),
        lastMessageAt: serverTimestamp(),
      });
      
      // Arrêter l'indicateur "en train d'écrire"
      if (isTyping) {
        const typingRef = doc(db, 'chats', chatId, 'typingStatus', current.uid);
        setDoc(typingRef, { isTyping: false, timestamp: serverTimestamp() });
        setIsTyping(false);
      }
      
      setText('');
      setReplyingTo(null);
    } catch (err) {
      console.warn('Erreur envoi message', err);
    }
  };
  
  // Ajouter une réaction emoji à un message
  const addReaction = async (messageId: string, emoji: string) => {
    const auth = getAuth(app);
    const current = auth.currentUser;
    if (!current) return;
    
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) return;
      
      const data = messageDoc.data();
      const reactions = data.reactions || {};
      
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      
      const userIndex = reactions[emoji].indexOf(current.uid);
      if (userIndex > -1) {
        reactions[emoji].splice(userIndex, 1);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      } else {
        reactions[emoji].push(current.uid);
      }
      
      await updateDoc(messageRef, { reactions });
      Vibration.vibrate(20);
    } catch (err) {
      console.warn('Erreur ajout réaction', err);
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

  // Fonction pour formater l'heure
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

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
      <LinearGradient
        colors={['#232323', '#1a1a1a']}
        style={styles.headerUltraModernWrap}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.headerContent}>
          <Pressable style={styles.headerUltraBack} onPress={() => router.back()}>
            <View style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#FFA94D" />
            </View>
          </Pressable>
          
          <View style={styles.headerUserInfo}>
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
                <ActivityIndicator size="small" color="#FFA94D" />
              ) : (
                <>
                  <Image source={{ uri: photoURL }} style={styles.headerUltraAvatar} />
                  <View style={styles.onlineIndicator} />
                </>
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerUltraName} numberOfLines={1}>
                {displayName}
              </Text>
              {otherUserTyping ? (
                <View style={styles.typingContainer}>
                  <Text style={styles.typingText}>En train d'écrire</Text>
                  <View style={styles.typingDots}>
                    <Animated.View style={[styles.typingDot, { opacity: scrollY }]} />
                    <Animated.View style={[styles.typingDot, { opacity: scrollY }]} />
                    <Animated.View style={[styles.typingDot, { opacity: scrollY }]} />
                  </View>
                </View>
              ) : (
                <Text style={styles.headerStatus}>En ligne</Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.headerActionButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#FFA94D" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }
  
  // Rendu d'un message avec swipe pour répondre et réactions
  const renderMessage = ({ item, index }: any) => {
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
    
    // Affiche la date si c'est le premier message ou si la date a changé
    const showDateSeparator = index === 0 || (messages[index - 1] && 
      new Date(item.createdAt?.toDate?.() || item.createdAt).toDateString() !== 
      new Date(messages[index - 1].createdAt?.toDate?.() || messages[index - 1].createdAt).toDateString()
    );
    
    const renderRightActions = () => {
      if (isMe) return null;
      return (
        <View style={styles.swipeActions}>
          <TouchableOpacity 
            style={styles.swipeActionButton}
            onPress={() => {
              setReplyingTo(item);
              Vibration.vibrate(30);
            }}
          >
            <Ionicons name="arrow-undo" size={20} color="#FFA94D" />
            <Text style={styles.swipeActionText}>Répondre</Text>
          </TouchableOpacity>
        </View>
      );
    };
    
    const renderLeftActions = () => {
      if (!isMe) return null;
      return (
        <View style={styles.swipeActions}>
          <TouchableOpacity 
            style={styles.swipeActionButton}
            onPress={() => {
              setReplyingTo(item);
              Vibration.vibrate(30);
            }}
          >
            <Ionicons name="arrow-undo" size={20} color="#FFA94D" />
            <Text style={styles.swipeActionText}>Répondre</Text>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
        <Swipeable
          renderRightActions={renderRightActions}
          renderLeftActions={renderLeftActions}
          overshootRight={false}
          overshootLeft={false}
        >
          <Pressable 
            onLongPress={() => {
              setSelectedMessage(item.id);
              setShowEmojiPicker(true);
              Vibration.vibrate(50);
            }}
          >
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
              <View style={styles.messageContainer}>
                {item.replyTo && (
                  <View style={styles.replyPreview}>
                    <View style={styles.replyLine} />
                    <View style={styles.replyContent}>
                      <Text style={styles.replyName}>
                        {item.replyTo.sender === myUid ? 'Vous' : 'Réponse à'}
                      </Text>
                      <Text style={styles.replyText} numberOfLines={1}>
                        {item.replyTo.text}
                      </Text>
                    </View>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                  ]}
                >
                  <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {item.text}
                  </Text>
                </View>
                
                {/* Réactions emoji */}
                {item.reactions && Object.keys(item.reactions).length > 0 && (
                  <View style={[styles.reactionsContainer, isMe && styles.reactionsContainerMe]}>
                    {Object.entries(item.reactions).map(([emoji, users]: any) => (
                      <TouchableOpacity 
                        key={emoji}
                        style={styles.reactionBubble}
                        onPress={() => addReaction(item.id, emoji)}
                      >
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                        <Text style={styles.reactionCount}>{users.length}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <View style={styles.messageFooter}>
                  <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                    {formatTime(item.createdAt)}
                  </Text>
                  {isMe && (
                    <Ionicons 
                      name={item.read ? "checkmark-done" : "checkmark"} 
                      size={14} 
                      color={item.read ? "#4CAF50" : "#666"}
                      style={styles.readIcon}
                    />
                  )}
                </View>
              </View>
              {isMe && (
                <Image
                  source={{ uri: userPhoto }}
                  style={styles.messageAvatar}
                  resizeMode="cover"
                />
              )}
            </View>
          </Pressable>
        </Swipeable>
      </View>
    );
  };

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
          renderItem={renderMessage}
          contentContainerStyle={{ paddingTop: 130, paddingBottom: 100, paddingHorizontal: 4 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />

        {/* Zone de saisie */}
        <BlurView intensity={95} tint="dark" style={styles.composerBlur}>
          {replyingTo && (
            <View style={styles.replyingBanner}>
              <View style={styles.replyingBannerContent}>
                <Ionicons name="arrow-undo" size={16} color="#FFA94D" />
                <View style={styles.replyingBannerText}>
                  <Text style={styles.replyingBannerTitle}>Répondre à</Text>
                  <Text style={styles.replyingBannerMessage} numberOfLines={1}>
                    {replyingTo.text}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          <View
            style={[
              styles.composerWrap,
              composerFocused && styles.composerWrapFocused,
            ]}
          >
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add-circle" size={28} color="#FFA94D" />
            </TouchableOpacity>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.composerInput}
                placeholder="Écris ton message..."
                placeholderTextColor="#666"
                value={text}
                onChangeText={handleTyping}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                multiline
                maxLength={1000}
              />
            </View>
            
            {text.trim() ? (
              <TouchableOpacity
                style={styles.sendButtonContainer}
                onPress={sendMessage}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFA94D', '#FF8C42']}
                  style={styles.sendButtonUltra}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color="#181818"
                    style={{ marginLeft: 2 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.voiceButton}>
                <Ionicons name="mic" size={24} color="#FFA94D" />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
        
        {/* Modal de sélection d'emoji */}
        <Modal
          visible={showEmojiPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEmojiPicker(false)}
        >
          <Pressable 
            style={styles.emojiModalOverlay}
            onPress={() => setShowEmojiPicker(false)}
          >
            <BlurView intensity={90} tint="dark" style={styles.emojiModalOverlay}>
              <View style={styles.emojiPickerContainer}>
                <Text style={styles.emojiPickerTitle}>Réagir au message</Text>
                <View style={styles.emojiGrid}>
                  {['❤️', '😂', '😮', '😢', '👍', '👎', '🔥', '🎉', '💯', '⭐', '✨', '💪'].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.emojiButton}
                      onPress={() => {
                        if (selectedMessage) {
                          addReaction(selectedMessage, emoji);
                        }
                        setShowEmojiPicker(false);
                        setSelectedMessage(null);
                      }}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </BlurView>
          </Pressable>
        </Modal>
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
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerUltraBack: {
    padding: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerUltraAvatarWrap: {
    position: 'relative',
  },
  headerUltraAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#232323',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerUltraName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 2,
  },
  headerStatus: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    color: '#FFA94D',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 6,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFA94D',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 6,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#333',
  },
  messageContainer: {
    maxWidth: '70%',
  },
  messageBubble: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  messageBubbleMe: {
    backgroundColor: '#FFA94D',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#181818',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
  },
  messageTimeMe: {
    textAlign: 'right',
    marginRight: 8,
    marginLeft: 0,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  readIcon: {
    marginLeft: 4,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dateSeparatorText: {
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 12,
    textTransform: 'capitalize',
  },
  swipeActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  swipeActionText: {
    color: '#FFA94D',
    fontSize: 11,
    fontWeight: '600',
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA94D',
  },
  replyLine: {
    width: 3,
    backgroundColor: '#FFA94D',
    marginRight: 8,
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    color: '#999',
    fontSize: 13,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  reactionsContainerMe: {
    justifyContent: 'flex-end',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    color: '#FFA94D',
    fontSize: 11,
    fontWeight: '600',
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 169, 77, 0.2)',
  },
  replyingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  replyingBannerText: {
    flex: 1,
  },
  replyingBannerTitle: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  replyingBannerMessage: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  emojiModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  emojiPickerContainer: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#333',
  },
  emojiPickerTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  emojiButton: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  emojiText: {
    fontSize: 28,
  },
  composerBlur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  composerWrapFocused: {
    paddingBottom: 16,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#333',
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 120,
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sendButtonContainer: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonUltra: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});