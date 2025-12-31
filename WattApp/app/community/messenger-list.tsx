import React, { useEffect, useState } from 'react';
import { Modal, StatusBar, TextInput, Animated } from 'react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import BottomNav from '../components/BottomNav';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, onSnapshot, query, where, doc, getDoc, collection, orderBy, limit, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

// Type pour un chat (DM ou groupe)
type ChatItem = {
  id: string;
  type: 'group' | 'dm';
  name: string;
  avatar: string;
  lastMsg: string;
  lastMsgAt: Date;
  unread: number;
};

export default function MessengerList() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const scrollY = new Animated.Value(0);
  const router = useRouter();

  // Formater le temps relatif
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };
  
  // Filtrer les chats en fonction de la recherche
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMsg.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  // Charge la liste des amis pour le modal
  async function loadFriendsForModal() {
    setLoadingFriends(true);
    try {
      const auth = getAuth();
      const current = auth.currentUser;
      if (!current) return;
      const snap = await getDocs(collection(db, 'friends'));
      const myFriendDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter((f: any) => Array.isArray(f.uids) && f.uids.includes(current.uid));
      const enriched = await Promise.all(myFriendDocs.map(async (fd: any) => {
        const otherUid = (fd.uids || []).find((u: string) => u !== current.uid);
        if (!otherUid) return null;
        // Utilise la même logique que friends.tsx : where('uid', '==', otherUid)
        const uQuery = query(collection(db, 'users'), where('uid', '==', otherUid));
        const uSnap = await getDocs(uQuery);
        if (!uSnap.empty) {
          const user = uSnap.docs[0].data();
          return {
            ...fd,
            otherUser: {
              id: uSnap.docs[0].id,
              uid: otherUid,
              pseudo: user.pseudo || user.displayName || '',
              displayName: user.displayName || '',
              mail: user.mail || user.email || '',
              email: user.email || '',
              photoURL: user.photoURL || '',
            }
          };
        }
        return null;
      }));
      setFriends(enriched.filter(Boolean));
    } catch (e) {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    // --- GROUPES ---
    const qGroups = collectionGroup(db, 'members');
    const unsubscribeGroups = onSnapshot(query(qGroups, where('uid', '==', user.uid)), async snap => {
      const groupPromises = snap.docs.map(async docSnap => {
        const parent = docSnap.ref.parent.parent;
        const groupId = parent?.id;
        if (!groupId) return null;
        const groupDoc = await getDoc(doc(db, 'communityChats', groupId));
        const groupData = groupDoc.exists() ? groupDoc.data() : {};
        const messagesCol = collection(db, 'communityChats', groupId, 'messages');
        const lastMsgSnap = await getDocs(query(messagesCol, orderBy('createdAt', 'desc'), limit(1)));
        let lastMsg = '';
        let lastMsgAt = null;
        if (!lastMsgSnap.empty) {
          const msg = lastMsgSnap.docs[0].data();
          lastMsg = msg.text || '';
          lastMsgAt = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
        }
        return {
          id: groupId,
          type: 'group',
          name: groupData.name || groupId,
          avatar: groupData.avatar || 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80',
          lastMsg: lastMsg || 'Aucun message',
          lastMsgAt: lastMsgAt || new Date(),
          unread: 0,
        } as ChatItem;
      });
      const groups = (await Promise.all(groupPromises)).filter(Boolean) as ChatItem[];

      // --- DMs TEMPS RÉEL ---
      const qDMs = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
      const unsubscribeDMs = onSnapshot(qDMs, async dmsSnap => {
        const dmPromises = dmsSnap.docs
          .filter(threadDoc => {
            const data = threadDoc.data();
            // On ne garde que les DMs (2 participants)
            return Array.isArray(data.participants) && data.participants.length === 2;
          })
          .map(async threadDoc => {
            const thread = threadDoc.data();
            const threadId = threadDoc.id;
            // Récupère le dernier message du thread en temps réel
            const messagesCol = collection(db, 'chats', threadId, 'messages');
            const lastMsgSnap = await getDocs(query(messagesCol, orderBy('createdAt', 'desc'), limit(1)));
            let lastMsg = '';
            let lastMsgAt = null;
            let senderUid = '';
            if (!lastMsgSnap.empty) {
              const msg = lastMsgSnap.docs[0].data();
              lastMsg = msg.text || '';
              lastMsgAt = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
              senderUid = msg.senderUid || '';
            }
            // Trouve l'autre participant
            const otherUid = (thread.participants || []).find((uid: string) => uid !== user.uid);
            // Récupère les infos de l'autre utilisateur (comme dans le modal)
            let otherUser = { pseudo: 'Utilisateur', displayName: '', mail: '', email: '', photoURL: '' };
            if (otherUid) {
              const uQuery = query(collection(db, 'users'), where('uid', '==', otherUid));
              const uSnap = await getDocs(uQuery);
              if (!uSnap.empty) {
                const d = uSnap.docs[0].data();
                otherUser = {
                  pseudo: d.pseudo || d.displayName || 'Utilisateur',
                  displayName: d.displayName || '',
                  mail: d.mail || d.email || '',
                  email: d.email || '',
                  photoURL: d.photoURL || '',
                };
              }
            }
            return {
              id: threadId,
              type: 'dm',
              name: otherUser.pseudo || otherUser.displayName || 'Utilisateur',
              avatar: otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.pseudo || otherUser.displayName || 'User')}&background=FFA94D&color=181818&size=128`,
              lastMsg: lastMsg || 'Aucun message',
              lastMsgAt: lastMsgAt || new Date(),
              unread: 0,
            } as ChatItem;
          });
        const dms = (await Promise.all(dmPromises)).filter(Boolean) as ChatItem[];
        // Fusionne et trie par date du dernier message
        const allChats = [...groups, ...dms].sort((a, b) => b.lastMsgAt.getTime() - a.lastMsgAt.getTime());
        setChats(allChats);
      });
    });
    // Pas besoin de clean unsubscribeDMs car il est dans le callback de unsubscribeGroups
    return () => unsubscribeGroups();
  }, []);

  // Suppression d'un DM (local, à adapter pour Firestore si besoin)
  // Supprime le chat DM et tous ses messages dans Firestore (collection 'chats')
  const handleDeleteDM = async (chatId: string) => {
    setChats((prev) => prev.filter((c) => !(c.id === chatId && c.type === 'dm')));
    try {
      // Supprime tous les messages du chat
      const messagesCol = collection(db, 'chats', chatId, 'messages');
      const messagesSnap = await getDocs(messagesCol);
      const batchDeletes: Promise<void>[] = [];
      messagesSnap.forEach((docSnap) => {
        batchDeletes.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(batchDeletes);
      // Supprime le chat lui-même
      await deleteDoc(doc(db, 'chats', chatId));
    } catch (e) {
      // Optionnel: afficher une erreur ou logger
      console.error('Erreur lors de la suppression du DM:', e);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          {/* Header moderne avec recherche */}
          <LinearGradient
            colors={['#232323', '#1a1a1a']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              {showSearch ? (
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#FFA94D" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher une conversation..."
                    placeholderTextColor="#666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <Text style={styles.headerSubtitle}>{chats.length} conversation{chats.length > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity 
                      style={styles.searchButton}
                      onPress={() => setShowSearch(true)}
                    >
                      <Ionicons name="search" size={24} color="#FFA94D" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.searchButton}>
                      <Ionicons name="filter" size={22} color="#FFA94D" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
          
          <Animated.FlatList
            data={filteredChats}
            keyExtractor={(item, idx) => item.id + '-' + idx}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#FFA94D" />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Essaie une autre recherche' : 'Commence à discuter avec tes amis'}
                </Text>
              </View>
            }
            renderItem={({ item }) =>
            item.type === 'dm' ? (
              <Swipeable
                renderRightActions={(_, dragX) => (
                  <View style={styles.deleteActionContainer}>
                    <TouchableOpacity
                      style={styles.deleteAction}
                      onPress={() => handleDeleteDM(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={24} color="#fff" />
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                )}
                overshootRight={false}
              >
                <TouchableOpacity
                  style={styles.chatRow}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: `/chat/[chatId]`, params: { chatId: item.id } })}
                >
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <View style={styles.onlineDot} />
                  </View>
                  <View style={styles.chatContent}>
                    <View style={styles.chatHeaderRow}>
                      <Text style={styles.chatName}>{item.name}</Text>
                      <Text style={styles.chatTime}>{formatTime(item.lastMsgAt)}</Text>
                    </View>
                    <View style={styles.chatFooterRow}>
                      <Ionicons name="chatbubble-ellipses" size={14} color="#666" style={{ marginRight: 6 }} />
                      <Text style={styles.chatLastMsg} numberOfLines={2}>{item.lastMsg}</Text>
                      {item.unread > 0 && (
                        <View style={styles.badgeUnread}>
                          <Text style={styles.badgeUnreadText}>{item.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </Swipeable>
            ) : (
              <TouchableOpacity
                style={[styles.chatRow, styles.groupChat]}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.id } })}
              >
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  <View style={styles.groupBadge}>
                    <Ionicons name="people" size={12} color="#181818" />
                  </View>
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatHeaderRow}>
                    <View style={styles.groupNameContainer}>
                      <MaterialCommunityIcons name="shield-account" size={16} color="#FFA94D" style={{ marginRight: 6 }} />
                      <Text style={styles.chatName}>{item.name}</Text>
                    </View>
                    <Text style={styles.chatTime}>{formatTime(item.lastMsgAt)}</Text>
                  </View>
                  <View style={styles.chatFooterRow}>
                    <Ionicons name="chatbubbles" size={14} color="#666" style={{ marginRight: 6 }} />
                    <Text style={styles.chatLastMsg} numberOfLines={2}>{item.lastMsg}</Text>
                    {item.unread > 0 && (
                      <View style={styles.badgeUnread}>
                        <Text style={styles.badgeUnreadText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            )
          }
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
        
        {/* Bouton FAB moderne avec animation */}
        <Animated.View
          style={[
            styles.fabContainer,
            {
              transform: [{
                scale: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [1, 0.9],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              setShowFriendsModal(true);
              loadFriendsForModal();
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFA94D', '#FF8C42']}
              style={styles.fab}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={32} color="#181818" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Modal de sélection d'ami modernisé */}
        <Modal
          visible={showFriendsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFriendsModal(false)}
        >
          <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouveau message</Text>
                <TouchableOpacity onPress={() => setShowFriendsModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={28} color="#FFA94D" />
                </TouchableOpacity>
              </View>
              {loadingFriends ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyFriendsContainer}>
                  <Ionicons name="people-outline" size={48} color="#666" />
                  <Text style={styles.emptyFriendsText}>Aucun ami trouvé</Text>
                </View>
              ) : (
                <FlatList
                  data={friends}
                  keyExtractor={item => item.otherUser.uid}
                  renderItem={({ item }) => {
                    const user = item.otherUser;
                    return (
                      <TouchableOpacity
                        style={styles.friendItem}
                        activeOpacity={0.8}
                        onPress={async () => {
                          setShowFriendsModal(false);
                          // Ouvre ou crée le chat DM
                          const auth = getAuth();
                          const current = auth.currentUser;
                          if (!current) return;
                          const fromUid = current.uid;
                          const toUid = user.uid;
                          if (fromUid === toUid) return;
                          // Cherche un thread DM existant
                          const q = query(collection(db, 'dmThreads'), where('participants', 'array-contains', fromUid));
                          const snap = await getDocs(q);
                          let existing = null;
                          for (const d of snap.docs) {
                            const data = d.data();
                            const parts = data.participants || [];
                            if (parts.includes(toUid)) { existing = { id: d.id, ...data }; break; }
                          }
                          if (existing) {
                            router.push({ pathname: `/chat/[chatId]`, params: { chatId: existing.id } });
                            return;
                          }
                          // Crée un nouveau thread DM
                          const threadRef = await addDoc(collection(db, 'dmThreads'), {
                            participants: [fromUid, toUid],
                            createdAt: new Date(),
                          });
                          router.push({ pathname: `/chat/[chatId]`, params: { chatId: threadRef.id } });
                        }}
                      >
                        <View style={styles.friendAvatarContainer}>
                          <Image source={{ uri: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.pseudo || user.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={styles.friendAvatar} />
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{user.pseudo || user.displayName || 'Utilisateur'}</Text>
                          <Text style={styles.friendEmail}>{user.mail || user.email || ''}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                      </TouchableOpacity>
                    );
                  }}
                  style={styles.friendsList}
                  contentContainerStyle={styles.friendsListContent}
                />
              )}
            </View>
          </BlurView>
        </Modal>
        </View>
      </View>
      <BottomNav />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  headerTitle: {
    color: '#FFA94D',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  groupChat: {
    backgroundColor: 'rgba(255, 169, 77, 0.08)',
    borderColor: 'rgba(255, 169, 77, 0.2)',
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#232323',
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#232323',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chatName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    flex: 1,
    letterSpacing: 0.2,
  },
  chatTime: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  chatLastMsg: {
    color: '#999',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  badgeUnread: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeUnreadText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
  },
  deleteActionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  deleteAction: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    height: '100%',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#232323',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#FFA94D',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 15,
  },
  emptyFriendsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyFriendsText: {
    color: '#666',
    fontSize: 15,
    marginTop: 16,
  },
  friendsList: {
    maxHeight: 400,
  },
  friendsListContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  friendAvatarContainer: {
    marginRight: 14,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendEmail: {
    color: '#999',
    fontSize: 13,
  },
});