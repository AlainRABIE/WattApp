import React, { useEffect, useState } from 'react';
import { Modal, StatusBar, ActivityIndicator } from 'react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { onSnapshot, query, where, collection, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type ChatItem = {
  id: string;
  type: 'group' | 'dm';
  name: string;
  avatar: string;
  lastMsg: string;
  lastMsgAt: Date;
};

export default function MessengerList() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const router = useRouter();

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#1a1a1a', '#0F0F0F']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>{chats.length} conversation{chats.length > 1 ? 's' : ''}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Liste des conversations */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="chat-outline" size={60} color="#FFA94D" />
            </View>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyText}>Commencez à discuter avec vos amis</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFriendsModal(true);
                loadFriendsForModal();
              }}
              style={styles.emptyButton}
            >
              <LinearGradient colors={['#FFA94D', '#FF8C42']} style={styles.emptyButtonGradient}>
                <Ionicons name="add-circle-outline" size={20} color="#181818" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>Nouveau message</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push({ pathname: `/chat/[chatId]`, params: { chatId: item.id } })}
          >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatTime}>{formatTime(item.lastMsgAt)}</Text>
              </View>
              <Text style={styles.chatMessage} numberOfLines={1}>{item.lastMsg}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Bouton flottant */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setShowFriendsModal(true);
          loadFriendsForModal();
        }}
      >
        <LinearGradient colors={['#FFA94D', '#FF8C42']} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#181818" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal sélection ami */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau message</Text>
              <TouchableOpacity onPress={() => setShowFriendsModal(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={28} color="#FFA94D" />
              </TouchableOpacity>
            </View>

            {loadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFA94D" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyFriendsContainer}>
                <MaterialCommunityIcons name="account-search" size={60} color="#666" />
                <Text style={styles.emptyFriendsText}>Aucun ami trouvé</Text>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.friendsListContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.friendItem}
                    onPress={() => handleCreateChat(item.uid, item)}
                  >
                    <Image
                      source={{ 
                        uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.pseudo || 'User')}&background=FFA94D&color=181818&size=128` 
                      }}
                      style={styles.friendAvatar}
                    />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.pseudo || item.displayName || 'Utilisateur'}</Text>
                      <Text style={styles.friendEmail}>{item.mail || ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#FFA94D" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  chatTime: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  chatMessage: {
    color: '#999',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    borderRadius: 30,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#181818',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyFriendsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyFriendsText: {
    color: '#666',
    fontSize: 15,
  },
  friendsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  friendEmail: {
    color: '#666',
    fontSize: 13,
  },
});
