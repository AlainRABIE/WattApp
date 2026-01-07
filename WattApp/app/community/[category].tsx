export const unstable_settings = { layout: null };
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Image, StatusBar, Vibration, Alert,
  Modal, Pressable, ActivityIndicator, Animated
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_LABELS: Record<string, string> = {
  "Roman d'amour": "💕 Roman d'amour",
  "Fanfiction": "✨ Fanfiction",
  "Fiction générale": "📚 Fiction générale",
  "Roman pour adolescents": "🎓 Roman pour adolescents",
  "Aléatoire": "🎲 Aléatoire",
  "Action": "⚡ Action",
  "Aventure": "🧭 Aventure",
  "Nouvelles": "📰 Nouvelles",
  "Fantasy": "🔮 Fantasy",
  "Non-Fiction": "📖 Non-Fiction",
  "Fantastique": "🚀 Fantastique",
  "Mystère": "🕵️ Mystère",
};

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

export default function CommunityChat() {
  const [members, setMembers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<any>(null);
  const lastTapRef = useRef<{ messageId: string; time: number } | null>(null);
  
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const auth = getAuth(app);
  const user = auth.currentUser;
  const { theme } = useTheme();

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Filtrer les messages système
  const filteredMessages = messages.filter((item: any) => {
    if (item.system && item.text && item.text.endsWith('a rejoint le groupe')) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snap = await getDocs(collection(db, 'communityChats', String(category), 'members'));
        const list = snap.docs.map(doc => doc.data());
        setMembers(list);
        
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (user) {
          const isUserMember = list.some((member: any) => member.uid === user.uid);
          setIsMember(isUserMember);
        }
      } catch (e) {
        console.error('Erreur chargement membres:', e);
      }
    };
    fetchMembers();
  }, [category]);

  useEffect(() => {
    if (!category) return;
    const q = query(collection(db, 'communityChats', String(category), 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [category]);

  // Écouter les utilisateurs en train de taper
  useEffect(() => {
    if (!category) return;
    const unsub = onSnapshot(doc(db, 'communityChats', String(category), 'typing', 'status'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const typing = Object.entries(data || {})
          .filter(([uid, status]) => status === true && uid !== user?.uid)
          .map(([uid]) => {
            const member = members.find(m => m.uid === uid);
            return member?.user || 'Quelqu\'un';
          });
        setTypingUsers(typing);
      }
    });
    return () => unsub();
  }, [category, members]);

  const setTypingStatus = async (isTyping: boolean) => {
    if (!user || !category) return;
    try {
      await setDoc(
        doc(db, 'communityChats', String(category), 'typing', 'status'),
        { [user.uid]: isTyping },
        { merge: true }
      );
    } catch (e) {
      console.error('Erreur typing status:', e);
    }
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (text.length > 0) {
      setTypingStatus(true);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(false);
      }, 3000);
    } else {
      setTypingStatus(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;
    
    setUploading(true);
    Vibration.vibrate(10);
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();
      const filename = `chat-images/${category}/${Date.now()}-${user.uid}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
        imageUrl: downloadURL,
        user: user.displayName || user.email || 'Utilisateur',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        uid: user.uid,
        type: 'image',
        replyTo: replyingTo,
        reactions: {},
      });
      
      setReplyingTo(null);
      setUploading(false);
    } catch (e) {
      console.error('Erreur upload image:', e);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'image.');
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!user) return;
    
    Vibration.vibrate(10);
    setTypingStatus(false);
    
    try {
      await addDoc(collection(db, 'communityChats', String(category), 'messages'), {
        text: input.trim(),
        user: user.displayName || user.email || 'Utilisateur',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        uid: user.uid,
        type: 'text',
        replyTo: replyingTo,
        reactions: {},
      });
      setInput('');
      setReplyingTo(null);
    } catch (e) {
      console.error('Erreur envoi message:', e);
    }
  };

  const joinGroup = async () => {
    if (!user) return;
    
    Vibration.vibrate(30);
    
    try {
      await setDoc(
        doc(db, 'communityChats', String(category), 'members', user.uid),
        {
          uid: user.uid,
          user: user.displayName || user.email || 'Utilisateur',
          photoURL: user.photoURL || '',
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      );
      
      setMembers(prev => [
        ...prev.filter(m => m.uid !== user.uid),
        {
          uid: user.uid,
          user: user.displayName || user.email || 'Utilisateur',
          photoURL: user.photoURL || '',
          joinedAt: new Date(),
        }
      ]);
      
      setIsMember(true);
      Alert.alert('✅ Succès', 'Vous avez rejoint le groupe !');
    } catch (e) {
      console.error('Erreur rejoindre groupe:', e);
      Alert.alert('Erreur', 'Impossible de rejoindre le groupe.');
    }
  };

  const handleLongPress = (message: any) => {
    // Appui long = afficher les réactions
    Vibration.vibrate(50);
    setShowReactions(message.id);
  };

  const deleteMessage = async (messageId: string) => {
    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'communityChats', String(category), 'messages', messageId));
              Vibration.vibrate(20);
              setSelectedMessage(null);
            } catch (e) {
              console.error('Erreur suppression:', e);
              Alert.alert('Erreur', 'Impossible de supprimer le message.');
            }
          },
        },
      ]
    );
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      const messageRef = doc(db, 'communityChats', String(category), 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      const reactions = message?.reactions || {};
      
      // Toggle la réaction
      if (reactions[emoji] && reactions[emoji].includes(user.uid)) {
        reactions[emoji] = reactions[emoji].filter((uid: string) => uid !== user.uid);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...(reactions[emoji] || []), user.uid];
      }
      
      await updateDoc(messageRef, { reactions });
      Vibration.vibrate(10);
      setShowReactions(null);
    } catch (e) {
      console.error('Erreur réaction:', e);
    }
  };

  const handleDoubleTap = (messageId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms pour détecter le double-tap
    
    if (lastTapRef.current && 
        lastTapRef.current.messageId === messageId && 
        now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
      // Double-tap détecté ! Ajouter un coeur
      addReaction(messageId, '❤️');
      Vibration.vibrate([0, 50, 100, 50]); // Vibration plus longue pour le like
      lastTapRef.current = null;
    } else {
      // Premier tap
      lastTapRef.current = { messageId, time: now };
    }
  };

  const renderLeftActions = (item: any) => {
    return (
      <View style={styles.swipeAction}>
        <Ionicons name="arrow-undo" size={24} color={theme.colors.primary} />
      </View>
    );
  };

  const handleSwipeOpen = (item: any) => {
    Vibration.vibrate(50);
    setReplyingTo(item);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.uid === user?.uid;
    const hasReactions = item.reactions && Object.keys(item.reactions).length > 0;
    
    return (
      <Swipeable
        renderLeftActions={() => renderLeftActions(item)}
        onSwipeableOpen={() => handleSwipeOpen(item)}
        overshootLeft={false}
        leftThreshold={40}
      >
        <TouchableOpacity
          onPress={() => handleDoubleTap(item.id)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.9}
          delayLongPress={500}
          style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
        >
        {!isMe && (
          <Image
            source={{
              uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128`,
            }}
            style={[styles.messageAvatar, { borderColor: theme.colors.primary }]}
          />
        )}
        <View style={{ maxWidth: '70%' }}>
          {/* Message répondu */}
          {item.replyTo && (
            <View style={[styles.replyPreview, isMe ? [styles.replyPreviewMe, { backgroundColor: `${theme.colors.primary}33` }] : [styles.replyPreviewOther, { backgroundColor: theme.colors.background }]]}>
              <View style={[styles.replyBar, { backgroundColor: theme.colors.primary }]} />
              <View style={styles.replyContent}>
                <Text style={[styles.replyUser, { color: theme.colors.primary }]}>{item.replyTo.user}</Text>
                <Text style={[styles.replyText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {item.replyTo.text || '📷 Image'}
                </Text>
              </View>
            </View>
          )}
          
          <View style={[styles.messageBubble, isMe ? [styles.messageBubbleMe, { backgroundColor: theme.colors.primary }] : [styles.messageBubbleOther, { backgroundColor: theme.colors.surface }]]}>
            {!isMe && <Text style={[styles.messageUser, { color: theme.colors.primary }]}>{item.user}</Text>}
            
            {item.type === 'image' && item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
            )}
            
            {item.type === 'text' && item.text && (
              <Text style={[styles.messageText, isMe && [styles.messageTextMe, { color: theme.colors.background }], !isMe && { color: theme.colors.text }]}>{item.text}</Text>
            )}
            
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMe ? [styles.messageTimeMe, { color: `${theme.colors.background}99` }] : { color: theme.colors.textSecondary }]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMe && (
                <Ionicons 
                  name="checkmark-done" 
                  size={14} 
                  color={`${theme.colors.background}99`} 
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
          
          {/* Réactions */}
          {hasReactions && (
            <View style={[styles.reactionsContainer, isMe && styles.reactionsContainerMe]}>
              {Object.entries(item.reactions).map(([emoji, uids]: [string, any]) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => addReaction(item.id, emoji)}
                  style={[
                    styles.reactionBubble,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    uids.includes(user?.uid) && [styles.reactionBubbleActive, { backgroundColor: `${theme.colors.primary}33`, borderColor: theme.colors.primary }]
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, { color: theme.colors.text }]}>{uids.length}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowReactions(item.id)}
                style={[styles.reactionBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Ionicons name="add" size={12} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Bouton réaction rapide */}
          {!hasReactions && showReactions !== item.id && (
            <TouchableOpacity
              onPress={() => setShowReactions(item.id)}
              style={[styles.quickReaction, isMe && styles.quickReactionMe]}
            >
              <Ionicons name="heart-outline" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          {/* Sélecteur de réaction */}
          {showReactions === item.id && (
            <View style={[styles.reactionPicker, [isMe && styles.reactionPickerMe, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]]}>
              {EMOJI_REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => addReaction(item.id, emoji)}
                  style={[styles.reactionOption, { backgroundColor: theme.colors.background }]}
                >
                  <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              {/* Bouton Plus pour plus d'options */}
              <TouchableOpacity
                onPress={() => {
                  setShowReactions(null);
                  setSelectedMessage(item);
                }}
                style={[styles.reactionOption, { backgroundColor: theme.colors.background }]}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {isMe && (
          <Image
            source={{
              uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128`,
            }}
            style={[styles.messageAvatar, { borderColor: theme.colors.primary }]}
          />
        )}
      </TouchableOpacity>
      </Swipeable>
    );
  };

  if (!isMember) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[theme.colors.background, theme.colors.surface]} style={StyleSheet.absoluteFillObject} />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{CATEGORY_LABELS[String(category)] || category}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Join Screen */}
        <View style={styles.joinContainer}>
          <View style={[styles.joinCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surface }]}>
            <View style={[styles.joinIconCircle, { backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }]}>
              <MaterialCommunityIcons name="shield-account" size={64} color={theme.colors.primary} />
            </View>
            <Text style={[styles.joinTitle, { color: theme.colors.text }]}>Rejoindre le groupe</Text>
            <Text style={[styles.joinSubtitle, { color: theme.colors.textSecondary }]}>{members.length} membre{members.length > 1 ? 's' : ''}</Text>
            
            {/* Preview membres */}
            <View style={styles.membersPreview}>
              {members.slice(0, 5).map((item, idx) => (
                <Image
                  key={idx}
                  source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                  style={[styles.memberAvatar, { marginLeft: idx > 0 ? -12 : 0 }]}
                />
              ))}
              {members.length > 5 && (
                <View style={[styles.memberAvatar, styles.memberMore, { marginLeft: -12 }]}>
                  <Text style={styles.memberMoreText}>+{members.length - 5}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={joinGroup} style={styles.joinButton} activeOpacity={0.85}>
              <LinearGradient colors={[theme.colors.primary, theme.colors.primary]} style={styles.joinButtonGradient}>
                <Ionicons name="enter" size={22} color={theme.colors.background} style={{ marginRight: 8 }} />
                <Text style={[styles.joinButtonText, { color: theme.colors.background }]}>Rejoindre</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[theme.colors.background, theme.colors.surface]} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{CATEGORY_LABELS[String(category)] || category}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>{members.length} membre{members.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowMembersSidebar(true)} style={[styles.membersBtn, { backgroundColor: `${theme.colors.primary}15` }]}>
          <Ionicons name="people" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <MaterialCommunityIcons name="chat-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>Aucun message pour le moment</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Soyez le premier à envoyer un message !</Text>
            </View>
          }
        />
      </GestureHandlerRootView>

      {/* Indicateur de frappe */}
      {typingUsers.length > 0 && (
        <View style={styles.typingIndicator}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.colors.primary }]} />
          </View>
          <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
            {typingUsers[0]} {typingUsers.length > 1 && `et ${typingUsers.length - 1} autre${typingUsers.length > 2 ? 's' : ''}`} en train d'écrire...
          </Text>
        </View>
      )}

      {/* Barre de réponse */}
      {replyingTo && (
        <View style={[styles.replyBarContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surface }]}>
          <View style={styles.replyBarContent}>
            <Ionicons name="return-down-forward" size={20} color={theme.colors.primary} />
            <View style={styles.replyBarText}>
              <Text style={[styles.replyBarUser, { color: theme.colors.primary }]}>Répondre à {replyingTo.user}</Text>
              <Text style={[styles.replyBarMessage, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {replyingTo.text || '📷 Image'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surface }]}>
          <TouchableOpacity onPress={pickImage} style={[styles.attachButton, { backgroundColor: `${theme.colors.primary}15` }]} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="image" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.surface }]}
              placeholder="Message..."
              placeholderTextColor={theme.colors.textSecondary}
              value={input}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim()}
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={input.trim() ? [theme.colors.primary, theme.colors.primary] : [theme.colors.surface, theme.colors.surface]}
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={20} color={input.trim() ? theme.colors.background : theme.colors.textSecondary} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sidebar Membres */}
      {showMembersSidebar && (
        <TouchableOpacity
          style={styles.sidebarOverlay}
          activeOpacity={1}
          onPress={() => setShowMembersSidebar(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={100} style={[styles.sidebar, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.sidebarHeader, { borderBottomColor: theme.colors.surface }]}>
                <Text style={[styles.sidebarTitle, { color: theme.colors.text }]}>Membres ({members.length})</Text>
                <TouchableOpacity onPress={() => setShowMembersSidebar(false)}>
                  <Ionicons name="close" size={28} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={members}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <View style={[styles.memberItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.surface }]}>
                    <Image
                      source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user || 'U')}&background=FFA94D&color=181818&size=128` }}
                      style={[styles.memberItemAvatar, { borderColor: theme.colors.primary }]}
                    />
                    <Text style={[styles.memberItemName, { color: theme.colors.text }]}>{item.user}</Text>
                  </View>
                )}
                contentContainerStyle={styles.membersList}
              />
            </BlurView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Modal actions */}
      {selectedMessage && (
        <Modal
          visible={!!selectedMessage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedMessage(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedMessage(null)}>
            <BlurView intensity={90} style={[styles.actionSheet, { backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity
                style={[styles.actionSheetButton, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  setReplyingTo(selectedMessage);
                  setSelectedMessage(null);
                }}
              >
                <Ionicons name="return-down-forward" size={24} color={theme.colors.primary} />
                <Text style={[styles.actionSheetText, { color: theme.colors.text }]}>Répondre</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionSheetButton, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  if (selectedMessage.text) {
                    // TODO: Copier le texte
                    Alert.alert('Copié', 'Message copié');
                  }
                  setSelectedMessage(null);
                }}
              >
                <Ionicons name="copy" size={24} color={theme.colors.primary} />
                <Text style={[styles.actionSheetText, { color: theme.colors.text }]}>Copier</Text>
              </TouchableOpacity>
              
              {selectedMessage.uid === user?.uid && (
                <TouchableOpacity
                  style={[styles.actionSheetButton, styles.actionSheetButtonDanger]}
                  onPress={() => deleteMessage(selectedMessage.id)}
                >
                  <Ionicons name="trash" size={24} color="#ff4444" />
                  <Text style={[styles.actionSheetText, styles.actionSheetTextDanger]}>Supprimer</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionSheetButton, { marginTop: 12, backgroundColor: theme.colors.background }]}
                onPress={() => setSelectedMessage(null)}
              >
                <Text style={[styles.actionSheetText, { color: theme.colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
            </BlurView>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  membersBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  messageRowOther: {
    flexDirection: 'row',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleMe: {
    backgroundColor: '#FFA94D',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
  },
  messageUser: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
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
    color: '#999',
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(24, 24, 24, 0.6)',
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  joinCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    width: '100%',
    maxWidth: 400,
  },
  joinIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 169, 77, 0.2)',
  },
  joinTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  joinSubtitle: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 24,
  },
  membersPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    borderWidth: 3,
    borderColor: '#1a1a1a',
  },
  memberMore: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberMoreText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '800',
  },
  joinButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  joinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  joinButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '800',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sidebar: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#2a2a2a',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  membersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  memberItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  memberItemName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
    maxWidth: '100%',
  },
  replyPreviewMe: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
  },
  replyPreviewOther: {
    backgroundColor: '#232323',
  },
  replyBar: {
    width: 3,
    backgroundColor: '#FFA94D',
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyUser: {
    color: '#FFA94D',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyText: {
    color: '#999',
    fontSize: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  reactionsContainerMe: {
    justifyContent: 'flex-end',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  reactionBubbleActive: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    borderColor: '#FFA94D',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  quickReaction: {
    marginTop: 6,
    padding: 4,
  },
  quickReactionMe: {
    alignSelf: 'flex-end',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    padding: 8,
    gap: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  reactionPickerMe: {
    alignSelf: 'flex-end',
  },
  reactionOption: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#333',
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFA94D',
  },
  typingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  replyBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  replyBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  replyBarText: {
    flex: 1,
  },
  replyBarUser: {
    color: '#FFA94D',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyBarMessage: {
    color: '#999',
    fontSize: 13,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 16,
  },
  actionSheetButtonDanger: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  actionSheetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionSheetTextDanger: {
    color: '#ff4444',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginBottom: 16,
  },
});
