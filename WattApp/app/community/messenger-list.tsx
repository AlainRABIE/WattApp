import React, { useEffect, useState, useRef } from 'react';
import { Modal, StatusBar, ActivityIndicator, Platform, Animated, Dimensions } from 'react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import BottomNav from '../components/BottomNav';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { onSnapshot, query, where, collection, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

type ChatItem = {
  id: string;
  type: 'group' | 'dm';
  name: string;
  avatar: string;
  lastMsg: string;
  lastMsgAt: Date;
  unreadCount?: number;
  isOnline?: boolean;
};

const { width } = Dimensions.get('window');

export default function MessengerList() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'maintenant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  async function loadFriendsForModal() {
    setLoadingFriends(true);
    try {
      const auth = getAuth();
      const current = auth.currentUser;
      if (!current) return;
      const snap = await getDocs(collection(db, 'friends'));
      const myFriendDocs = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter((f: any) => Array.isArray(f.uids) && f.uids.includes(current.uid));
      
      const enriched = await Promise.all(myFriendDocs.map(async (fd: any) => {
        const otherUid = (fd.uids || []).find((u: string) => u !== current.uid);
        if (!otherUid) return null;
        const uQuery = query(collection(db, 'users'), where('uid', '==', otherUid));
        const uSnap = await getDocs(uQuery);
        if (!uSnap.empty) {
          const user = uSnap.docs[0].data();
          return {
            uid: otherUid,
            pseudo: user.pseudo || user.displayName || '',
            displayName: user.displayName || '',
            mail: user.mail || user.email || '',
            photoURL: user.photoURL || '',
          };
        }
        return null;
      }));
      setFriends(enriched.filter(Boolean));
    } catch (e) {
      console.error('Erreur chargement amis:', e);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const qDMs = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(qDMs, async dmsSnap => {
      const dmPromises = dmsSnap.docs
        .filter(threadDoc => {
          const data = threadDoc.data();
          return Array.isArray(data.participants) && data.participants.length === 2;
        })
        .map(async threadDoc => {
          const thread = threadDoc.data();
          const threadId = threadDoc.id;
          
          const messagesCol = collection(db, 'chats', threadId, 'messages');
          const lastMsgSnap = await getDocs(query(messagesCol, orderBy('createdAt', 'desc'), limit(1)));
          let lastMsg = 'Aucun message';
          let lastMsgAt = new Date();
          
          if (!lastMsgSnap.empty) {
            const msg = lastMsgSnap.docs[0].data();
            lastMsg = msg.text || 'Message';
            lastMsgAt = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
          }
          
          const otherUid = (thread.participants || []).find((uid: string) => uid !== user.uid);
          let otherUser = { pseudo: 'Utilisateur', photoURL: '' };
          
          if (otherUid) {
            const uQuery = query(collection(db, 'users'), where('uid', '==', otherUid));
            const uSnap = await getDocs(uQuery);
            if (!uSnap.empty) {
              const d = uSnap.docs[0].data();
              otherUser = {
                pseudo: d.pseudo || d.displayName || 'Utilisateur',
                photoURL: d.photoURL || '',
              };
            }
          }
          
          return {
            id: threadId,
            type: 'dm' as const,
            name: otherUser.pseudo,
            avatar: otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.pseudo)}&background=FFA94D&color=181818&size=128`,
            lastMsg,
            lastMsgAt,
          };
        });
      
      const dms = (await Promise.all(dmPromises)).filter(Boolean) as ChatItem[];
      dms.sort((a, b) => b.lastMsgAt.getTime() - a.lastMsgAt.getTime());
      setChats(dms);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateChat = async (friendUid: string, friendData: any) => {
    setShowFriendsModal(false);
    try {
      const auth = getAuth();
      const current = auth.currentUser;
      if (!current) return;

      // Cherche un chat existant
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', current.uid));
      const snap = await getDocs(q);
      let existing = null;
      
      for (const d of snap.docs) {
        const data = d.data();
        const parts = data.participants || [];
        if (parts.includes(friendUid)) {
          existing = { id: d.id };
          break;
        }
      }
      
      if (existing) {
        router.push({ pathname: `/chat/[chatId]`, params: { chatId: existing.id } });
        return;
      }

      // Crée un nouveau chat
      const participantsMeta: Record<string, any> = {};
      participantsMeta[current.uid] = {
        displayName: current.displayName || current.email || 'Moi',
        photoURL: current.photoURL || null
      };
      participantsMeta[friendUid] = {
        displayName: friendData.pseudo || friendData.displayName || 'Utilisateur',
        photoURL: friendData.photoURL || null
      };

      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [current.uid, friendUid],
        participantsMeta,
        createdAt: new Date(),
      });

      router.push({ pathname: `/chat/[chatId]`, params: { chatId: chatRef.id } });
    } catch (e) {
      console.error('Erreur création chat:', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header glassmorphism avec blur */}
      <Animated.View style={{ opacity: headerOpacity }}>
        <BlurView intensity={95} tint="default" style={styles.headerBlur}>
          <LinearGradient 
            colors={[
              `${theme.colors.primary}15`,
              `${theme.colors.primary}08`,
              'transparent'
            ]} 
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.titleContainer}>
                  <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Messages</Text>
                  <View style={[styles.liveDot, { backgroundColor: '#00E676' }]} />
                </View>
                <View style={styles.headerBadgeRow}>
                  <View style={[styles.headerBadge, { 
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6
                  }]}>
                    <Ionicons name="chatbubbles" size={12} color={theme.colors.background} />
                    <Text style={[styles.headerBadgeText, { color: theme.colors.background }]}>
                      {chats.length}
                    </Text>
                  </View>
                  <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                    {chats.length === 0 ? 'Aucune conversation' : `${chats.length} conversation${chats.length > 1 ? 's' : ''}`}
                  </Text>
                </View>
              </View>
              
              {/* Boutons d'action */}
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}12` }]}
                  onPress={() => {/* TODO: Recherche */}}
                  activeOpacity={0.75}
                >
                  <Ionicons name="search" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}12` }]}
                  onPress={() => {/* TODO: Filtres */}}
                  activeOpacity={0.75}
                >
                  <Ionicons name="options" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      {/* Liste des conversations ultra-moderne */}
      <Animated.FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient
                colors={[
                  `${theme.colors.primary}25`,
                  `${theme.colors.primary}15`,
                  `${theme.colors.primary}05`
                ]}
                style={styles.emptyIconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.innerCircle, { backgroundColor: `${theme.colors.primary}10` }]}>
                  <MaterialCommunityIcons name="chat-processing" size={64} color={theme.colors.primary} />
                </View>
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Commencez une conversation</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Discutez en temps réel avec vos amis{'\n'}Partagez, réagissez et restez connectés
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowFriendsModal(true);
                  loadFriendsForModal();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={[theme.colors.primary, `${theme.colors.primary}DD`]} 
                  style={styles.emptyButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.background} />
                  <Text style={[styles.emptyButtonText, { color: theme.colors.background }]}>Nouveau message</Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.background} style={{ marginLeft: 4 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const hasUnread = item.unreadCount && item.unreadCount > 0;
          
          return (
            <TouchableOpacity
                style={[
                  styles.chatItem,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => router.push({ pathname: `/chat/[chatId]`, params: { chatId: item.id } })}
                activeOpacity={0.65}
              >
                {/* Accent bar pour messages non lus */}
                {hasUnread && (
                  <View style={[styles.unreadBar, { backgroundColor: theme.colors.primary }]} />
                )}
                
                {/* Avatar avec effet de profondeur */}
                <View style={[
                  styles.avatarContainer,
                  hasUnread && { 
                    shadowColor: theme.colors.primary,
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                  }
                ]}>
                  <View style={[
                    styles.avatarWrapper,
                    hasUnread && { 
                      borderColor: theme.colors.primary,
                      borderWidth: 2.5,
                    }
                  ]}>
                    <Image 
                      source={{ uri: item.avatar }} 
                      style={styles.avatar} 
                    />
                  </View>
                  {item.isOnline && (
                    <LinearGradient
                      colors={['#00E676', '#00C853']}
                      style={[styles.onlineIndicator, { borderColor: theme.colors.surface }]}
                    />
                  )}
                </View>
                
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <View style={styles.nameContainer}>
                      <Text 
                        style={[
                          styles.chatName, 
                          { color: theme.colors.text },
                          hasUnread && { fontWeight: '800' }
                        ]} 
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.type === 'dm' && (
                        <View style={[styles.typeBadge, { backgroundColor: `${theme.colors.primary}12` }]}>
                          <Ionicons name="person" size={10} color={theme.colors.primary} />
                        </View>
                      )}
                    </View>
                    <View style={styles.timeContainer}>
                      <Text style={[styles.chatTime, { color: hasUnread ? theme.colors.primary : theme.colors.textSecondary }]}>
                        {formatTime(item.lastMsgAt)}
                      </Text>
                      {hasUnread && (
                        <View style={[styles.newIndicator, { backgroundColor: theme.colors.primary }]} />
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.messageRow}>
                    <View style={styles.messageContent}>
                      <MaterialCommunityIcons 
                        name="message-text" 
                        size={14} 
                        color={theme.colors.textSecondary} 
                        style={{ marginRight: 6 }}
                      />
                      <Text 
                        style={[
                          styles.chatMessage,
                          { color: hasUnread ? theme.colors.text : theme.colors.textSecondary },
                          hasUnread && { fontWeight: '600' }
                        ]} 
                        numberOfLines={1}
                      >
                        {item.lastMsg}
                      </Text>
                    </View>
                    {hasUnread && (
                      <LinearGradient
                        colors={[theme.colors.primary, `${theme.colors.primary}DD`]}
                        style={styles.unreadBadge}
                      >
                        <Text style={[styles.unreadText, { color: theme.colors.background }]}>
                          {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                </View>
                
                <View style={[styles.chevronContainer, { backgroundColor: `${theme.colors.primary}08` }]}>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>
          );
        }}
      />

      {/* FAB ultra-moderne */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setShowFriendsModal(true);
          loadFriendsForModal();
        }}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={[theme.colors.primary, `${theme.colors.primary}CC`]} 
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <BlurView intensity={20} tint="light" style={styles.fabBlur}>
            <View style={styles.fabContent}>
              <Ionicons name="add" size={28} color={theme.colors.background} style={{ fontWeight: '900' }} />
              <Text style={[styles.fabText, { color: theme.colors.background }]}>Nouveau</Text>
            </View>
          </BlurView>
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal sélection ami redesigné */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={styles.modalBlur}>
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Header modal amélioré */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.background }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Nouveau message</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                    Sélectionnez un ami
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowFriendsModal(false)} 
                  style={[styles.modalCloseButton, { backgroundColor: `${theme.colors.primary}15` }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {loadingFriends ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    Chargement de vos amis...
                  </Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyFriendsContainer}>
                  <View style={[styles.emptyFriendsIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                    <MaterialCommunityIcons name="account-search" size={60} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.emptyFriendsTitle, { color: theme.colors.text }]}>
                    Aucun ami trouvé
                  </Text>
                  <Text style={[styles.emptyFriendsText, { color: theme.colors.textSecondary }]}>
                    Ajoutez des amis pour commencer{'\n'}à discuter avec eux
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={friends}
                  keyExtractor={(item) => item.uid}
                  contentContainerStyle={styles.friendsListContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.friendItem, { backgroundColor: theme.colors.background }]}
                      onPress={() => handleCreateChat(item.uid, item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.friendAvatarContainer}>
                        <Image
                          source={{ 
                            uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.pseudo || 'User')}&background=random&size=128` 
                          }}
                          style={[styles.friendAvatar, { borderColor: theme.colors.primary }]}
                        />
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={[styles.friendName, { color: theme.colors.text }]} numberOfLines={1}>
                          {item.pseudo || item.displayName || 'Utilisateur'}
                        </Text>
                        <Text style={[styles.friendEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {item.mail || ''}
                        </Text>
                      </View>
                      <View style={[styles.friendAction, { backgroundColor: `${theme.colors.primary}15` }]}>
                        <Ionicons name="chatbubble" size={18} color={theme.colors.primary} />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </BlurView>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlur: {
    overflow: 'hidden',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginRight: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  typeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatTime: {
    fontSize: 12,
    fontWeight: '700',
  },
  newIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatMessage: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
    overflow: 'hidden',
  },
  fabGradient: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  fabBlur: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyIconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
    opacity: 0.8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    opacity: 0.7,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyFriendsContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyFriendsIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyFriendsTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  emptyFriendsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },
  friendsListContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  friendAvatarContainer: {
    marginRight: 16,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  friendEmail: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  friendAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
