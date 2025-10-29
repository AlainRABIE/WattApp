import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import BottomNav from '../components/BottomNav';
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, onSnapshot, query, where, doc, getDoc, collection, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
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
      const qDMs = query(collection(db, 'dmThreads'), where('participants', 'array-contains', user.uid));
      const unsubscribeDMs = onSnapshot(qDMs, async dmsSnap => {
        const dmPromises = dmsSnap.docs.map(async threadDoc => {
          const thread = threadDoc.data();
          const threadId = threadDoc.id;
          // Récupère le dernier message du thread en temps réel
          const messagesCol = collection(db, 'dmThreads', threadId, 'messages');
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

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.header}>Tous mes messages</Text>
        <FlatList
          data={chats}
          keyExtractor={(item, idx) => item.id + '-' + idx}
          ListEmptyComponent={<Text style={styles.empty}>Aucune conversation.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatRow}
              activeOpacity={0.85}
              onPress={() => {
                if (item.type === 'group') {
                  router.push({ pathname: `/community/[category]`, params: { category: item.id } });
                } else {
                  router.push({ pathname: `/chat/[chatId]`, params: { chatId: item.id } });
                }
              }}
            >
              <Image
                source={{ uri: item.avatar }}
                style={styles.avatar}
              />
              <View style={styles.chatContent}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatTime}>14:32</Text>
                </View>
                <View style={styles.chatFooterRow}>
                  <Text style={styles.chatLastMsg} numberOfLines={1}>{item.lastMsg}</Text>
                  {item.unread > 0 && (
                    <View style={styles.badgeUnread}><Text style={styles.badgeUnreadText}>{item.unread}</Text></View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          style={{ flexGrow: 0 }}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setShowFriendsModal(true);
            loadFriendsForModal();
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
        </TouchableOpacity>
      {/* Modal de sélection d'ami */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(24,24,24,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#23232a', borderRadius: 18, padding: 24, width: '85%', maxHeight: '70%' }}>
            <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 20, marginBottom: 16 }}>Choisis un ami</Text>
            {loadingFriends ? (
              <Text style={{ color: '#fff' }}>Chargement...</Text>
            ) : friends.length === 0 ? (
              <Text style={{ color: '#fff' }}>Aucun ami trouvé.</Text>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={item => item.otherUser.uid}
                renderItem={({ item }) => {
                  const user = item.otherUser;
                  return (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
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
                      <Image source={{ uri: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.pseudo || user.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 14, backgroundColor: '#FFA94D33' }} />
                      <View>
                        <Text style={{ color: '#fff', fontSize: 16 }}>{user.pseudo || user.displayName || 'Utilisateur'}</Text>
                        <Text style={{ color: '#aaa', fontSize: 13 }}>{user.mail || user.email || ''}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 300 }}
              />
            )}
            <TouchableOpacity onPress={() => setShowFriendsModal(false)} style={{ marginTop: 18, alignSelf: 'center' }}>
              <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    paddingTop: 24,
  },
  header: {
    color: '#FFA94D',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 18,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    backgroundColor: '#FFA94D33',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chatName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  chatTime: {
    color: '#aaa',
    fontSize: 12,
    marginLeft: 8,
  },
  chatFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatLastMsg: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badgeUnread: {
    backgroundColor: '#FFA94D',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  badgeUnreadText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#FFA94D',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    marginLeft: 18,
    marginBottom: 10,
  },
});
