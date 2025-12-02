import React, { useEffect, useState } from 'react';
import { Modal, ActivityIndicator, ScrollView, Platform, StatusBar } from 'react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import BottomNav from '../components/BottomNav';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, onSnapshot, query, where, doc, getDoc, collection, orderBy, limit, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'dms' | 'groups'>('all');
  const router = useRouter();

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

  // Filtre les chats selon l'onglet actif
  const filteredChats = chats.filter(chat => {
    if (activeTab === 'all') return true;
    if (activeTab === 'dms') return chat.type === 'dm';
    if (activeTab === 'groups') return chat.type === 'group';
    return true;
  });

  // Formatte le temps de manière intelligente
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header épuré */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Messages</Text>
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setShowFriendsModal(true);
                loadFriendsForModal();
              }}
            >
              <Ionicons name="add" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Onglets épurés */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              Tous
            </Text>
            {activeTab === 'all' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('dms')}
          >
            <Text style={[styles.tabText, activeTab === 'dms' && styles.tabTextActive]}>
              Directs
            </Text>
            {activeTab === 'dms' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              Groupes
            </Text>
            {activeTab === 'groups' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Liste des conversations */}
        <FlatList
          data={filteredChats}
          keyExtractor={(item, idx) => item.id + '-' + idx}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'all' && 'Commence une conversation avec tes amis'}
                {activeTab === 'dms' && 'Aucun message direct pour le moment'}
                {activeTab === 'groups' && 'Rejoins ou crée un groupe pour commencer'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => {
                  setShowFriendsModal(true);
                  loadFriendsForModal();
                }}
              >
                <Ionicons name="add-circle" size={20} color="#000" />
                <Text style={styles.emptyButtonText}>Nouveau message</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) =>
            item.type === 'dm' ? (
              <Swipeable
                renderRightActions={(_, dragX) => (
                  <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDeleteDM(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={24} color="#fff" />
                    <Text style={styles.deleteText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={styles.chatCard}
                  activeOpacity={0.6}
                  onPress={() => router.push({ pathname: `/chat/[chatId]`, params: { chatId: item.id } })}
                >
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={styles.chatContent}>
                    <View style={styles.chatHeaderRow}>
                      <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.chatTime}>{formatTime(item.lastMsgAt)}</Text>
                    </View>
                    <Text style={styles.chatLastMsg} numberOfLines={2}>{item.lastMsg}</Text>
                  </View>
                  {item.unread > 0 && (
                    <View style={styles.badgeUnread}>
                      <Text style={styles.badgeUnreadText}>{item.unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Swipeable>
            ) : (
              <TouchableOpacity
                style={styles.chatCard}
                activeOpacity={0.6}
                onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.id } })}
              >
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  <View style={styles.groupBadge}>
                    <Ionicons name="people" size={10} color="#fff" />
                  </View>
                </View>
                <View style={styles.chatContent}>
                  <View style={styles.chatHeaderRow}>
                    <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.chatTime}>{formatTime(item.lastMsgAt)}</Text>
                  </View>
                  <Text style={styles.chatLastMsg} numberOfLines={2}>{item.lastMsg}</Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badgeUnread}>
                    <Text style={styles.badgeUnreadText}>{item.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          }
          style={{ flexGrow: 0 }}
        />

        {/* Bouton flottant pour nouveau message */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => {
            setShowFriendsModal(true);
            loadFriendsForModal();
          }}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Modal de sélection d'ami - Redesigné */}
        <Modal
          visible={showFriendsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFriendsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header du modal */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Nouveau message</Text>
                  <Text style={styles.modalSubtitle}>
                    {friends.length} ami{friends.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowFriendsModal(false)}
                >
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Liste des amis */}
              <View style={styles.modalContent}>
                {loadingFriends ? (
                  <View style={styles.modalLoading}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.modalLoadingText}>Chargement de tes amis...</Text>
                  </View>
                ) : friends.length === 0 ? (
                  <View style={styles.modalEmpty}>
                    <Ionicons name="people-outline" size={48} color={theme.colors.textSecondary} />
                    <Text style={styles.modalEmptyText}>Aucun ami trouvé</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Ajoute des amis pour commencer à discuter
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    keyExtractor={item => item.otherUser.uid}
                    contentContainerStyle={styles.friendsList}
                    renderItem={({ item }) => {
                      const user = item.otherUser;
                      return (
                        <TouchableOpacity
                          style={styles.friendCard}
                          onPress={async () => {
                            setShowFriendsModal(false);
                            const auth = getAuth();
                            const current = auth.currentUser;
                            if (!current) return;
                            const fromUid = current.uid;
                            const toUid = user.uid;
                            if (fromUid === toUid) return;
                            
                            // Cherche un thread DM existant
                            const q = query(collection(db, 'chats'), where('participants', 'array-contains', fromUid));
                            const snap = await getDocs(q);
                            let existing = null;
                            for (const d of snap.docs) {
                              const data = d.data();
                              const parts = data.participants || [];
                              if (parts.includes(toUid) && parts.length === 2) { 
                                existing = { id: d.id, ...data }; 
                                break; 
                              }
                            }
                            if (existing) {
                              router.push({ pathname: `/chat/[chatId]`, params: { chatId: existing.id } });
                              return;
                            }
                            
                            // Crée un nouveau thread DM
                            const threadRef = await addDoc(collection(db, 'chats'), {
                              participants: [fromUid, toUid],
                              createdAt: new Date(),
                              participantsMeta: {
                                [fromUid]: {
                                  displayName: current.displayName || '',
                                  photoURL: current.photoURL || '',
                                },
                                [toUid]: {
                                  displayName: user.displayName || user.pseudo || '',
                                  photoURL: user.photoURL || '',
                                }
                              }
                            });
                            router.push({ pathname: `/chat/[chatId]`, params: { chatId: threadRef.id } });
                          }}
                        >
                          <View style={styles.friendAvatarContainer}>
                            <Image 
                              source={{ uri: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.pseudo || user.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} 
                              style={styles.friendAvatar} 
                            />
                            <View style={styles.friendOnline} />
                          </View>
                          <View style={styles.friendInfo}>
                            <Text style={styles.friendName}>
                              {user.pseudo || user.displayName || 'Utilisateur'}
                            </Text>
                            <Text style={styles.friendEmail}>
                              {user.mail || user.email || ''}
                            </Text>
                          </View>
                          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <BottomNav />
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Header épuré
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Onglets minimalistes
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 32,
    backgroundColor: theme.colors.background,
  },
  tab: {
    paddingVertical: 8,
    position: 'relative',
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 1,
  },

  // Liste
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Carte de chat épurée
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  
  // Avatar minimaliste
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00C853',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },

  // Contenu du chat
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  chatTime: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  chatLastMsg: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  badgeUnread: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 12,
  },
  badgeUnreadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },

  // État vide minimaliste
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Bouton flottant minimaliste
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Action de suppression
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 16,
  },
  deleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  // Modal épuré
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 22,
    marginBottom: 4,
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },

  // Chargement du modal
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalLoadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 16,
  },

  // Modal vide
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  modalEmptyText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modalEmptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },

  // Liste d'amis épurée
  friendsList: {
    paddingVertical: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  friendAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
  },
  friendOnline: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00C853',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendEmail: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
});