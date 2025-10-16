import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import app, { db } from '../constants/firebaseConfig';
import { collection, getDocs, query as firestoreQuery, where, deleteDoc } from 'firebase/firestore';
import { addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function FriendsScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [incomingCount, setIncomingCount] = useState<number>(0);
  const [pendingOutgoing, setPendingOutgoing] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<'search' | 'incoming' | 'friends'>('search');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!q || q.trim() === '') {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // @ts-ignore
    debounceRef.current = setTimeout(() => doSearch(q.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // load pending outgoing on mount so UI shows 'En attente' when returning to the screen
  useEffect(() => {
    loadPendingOutgoing();
    loadIncomingRequests();
  }, []);

  async function doSearch(term: string) {
    setLoading(true);
    try {
      // Fetch a limited list of users then filter client-side (ok for small userbase)
      const qRef = firestoreQuery(collection(db, 'users'));
      const snap = await getDocs(qRef);
      const lower = term.toLowerCase();
      const filtered = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => {
        const pseudo = (u.pseudo || u.displayName || '').toString().toLowerCase();
        const mail = (u.mail || u.email || '').toString().toLowerCase();
        return pseudo.includes(lower) || mail.includes(lower);
      });
      // after we have search results, also refresh pending outgoing requests to mark UI
      await loadPendingOutgoing();
      setResults(filtered);
    } catch (err) {
      console.warn('Friends search failed', err);
      Alert.alert('Erreur', "Impossible d'effectuer la recherche");
    } finally {
      setLoading(false);
    }
  }

  // Load pending outgoing friend requests (from current user)
  async function loadPendingOutgoing() {
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) return;
      const q = firestoreQuery(collection(db, 'friendRequests'), where('fromUid', '==', current.uid), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      const map: Record<string, boolean> = {};
      snap.docs.forEach(d => {
        const data = d.data() as any;
        const toUid = data.toUid;
        if (toUid) map[toUid] = true;
      });
      setPendingOutgoing(map);
    } catch (e) {
      console.warn('loadPendingOutgoing failed', e);
    }
  }

  // Load incoming friend requests where toUid == current user
  async function loadIncomingRequests() {
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) return;
      const frQuery = firestoreQuery(collection(db, 'friendRequests'), where('toUid', '==', current.uid), where('status', '==', 'pending'));
      const snap = await getDocs(frQuery);
      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as any));
      // update count badge
      setIncomingCount(snap.size || 0);
      // For better UI, fetch sender profile for each
      const enriched = await Promise.all(items.map(async (it: any) => {
        try {
          const uQuery = firestoreQuery(collection(db, 'users'), where('uid', '==', (it as any).fromUid));
          const uSnap = await getDocs(uQuery);
          if (!uSnap.empty) return { ...it, fromUser: { id: uSnap.docs[0].id, ...uSnap.docs[0].data() } };
        } catch (e) { /* ignore */ }
        return it;
      }));
      setIncoming(enriched);
    } catch (e) {
      console.warn('loadIncomingRequests failed', e);
    }
  }

  // Load friends: find docs in 'friends' collection where current uid is included, then fetch the other user's profile
  async function loadFriends() {
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) return;
      // simple query: fetch all friends docs and filter locally (small scale); for production use a structured schema or composite index
      const snap = await getDocs(firestoreQuery(collection(db, 'friends')));
      const myFriendDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter((f: any) => Array.isArray(f.uids) && f.uids.includes(current.uid));
      // for each friend doc, determine the other uid and fetch their profile
      const enriched = await Promise.all(myFriendDocs.map(async (fd: any) => {
        const otherUid = (fd.uids || []).find((u: string) => u !== current.uid);
        if (!otherUid) return { ...fd, otherUser: null };
        try {
          const uQuery = firestoreQuery(collection(db, 'users'), where('uid', '==', otherUid));
          const uSnap = await getDocs(uQuery);
          if (!uSnap.empty) return { ...fd, otherUser: { id: uSnap.docs[0].id, ...(uSnap.docs[0].data() as any) } };
        } catch (e) { console.warn('loadFriends: fetch profile failed', e); }
        return { ...fd, otherUser: null };
      }));
      setFriendsList(enriched);
    } catch (e) {
      console.warn('loadFriends failed', e);
    }
  }

  // Remove a friend relationship (delete the friends doc)
  async function removeFriend(friendDoc: any) {
    try {
      if (!friendDoc || !friendDoc.id) return;
      await deleteDoc(doc(db, 'friends', friendDoc.id));
      Alert.alert('Info', 'Ami retiré.');
      await loadFriends();
    } catch (e) {
      console.warn('removeFriend failed', e);
      Alert.alert('Erreur', 'Impossible de retirer cet ami.');
    }
  }

  // Create or open a chat between current user and the given user
  async function createOrOpenChat(user: any) {
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) return Alert.alert('Erreur', 'Tu dois être connecté.');
      const fromUid = current.uid;
      const toUid = user.uid || user.id;
      if (fromUid === toUid) return Alert.alert('Erreur', 'Impossible d\'ouvrir un chat avec toi-même.');

      // search for existing chat where both participants are present
      const q = firestoreQuery(collection(db, 'chats'), where('participants', 'array-contains', fromUid));
      const snap = await getDocs(q);
      let existing: any = null;
      for (const d of snap.docs) {
        const data = d.data() as any;
        const parts = data.participants || [];
        if (parts.includes(toUid)) { existing = { id: d.id, ...data }; break; }
      }
      if (existing) {
        (router as any).push(`/chat/${existing.id}`);
        return;
      }

      // create new chat
      const participantsMeta: Record<string, any> = {};
      participantsMeta[fromUid] = { displayName: current.displayName || current.email || 'Moi', photoURL: current.photoURL || null };
      participantsMeta[toUid] = { displayName: user.pseudo || user.displayName || user.mail || 'Utilisateur', photoURL: user.photoURL || null };
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [fromUid, toUid],
        participantsMeta,
        createdAt: serverTimestamp(),
      });
      (router as any).push(`/chat/${chatRef.id}`);
    } catch (e) {
      console.warn('createOrOpenChat failed', e);
      Alert.alert('Erreur', 'Impossible d\'ouvrir le chat.');
    }
  }

  const sendFriendRequest = async (toUser: any) => {
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) return Alert.alert('Erreur', 'Tu dois être connecté pour envoyer une demande.');

      const fromUid = current.uid;
      const toUid = toUser.uid || toUser.id;
      if (fromUid === toUid) return Alert.alert('Erreur', 'Tu ne peux pas t\'envoyer une demande à toi-même.');

      // check duplicates with targeted query: any request between the two users
      const q1 = firestoreQuery(collection(db, 'friendRequests'), where('fromUid', '==', fromUid), where('toUid', '==', toUid));
      const q2 = firestoreQuery(collection(db, 'friendRequests'), where('fromUid', '==', toUid), where('toUid', '==', fromUid));
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      if (!s1.empty || !s2.empty) return Alert.alert('Info', 'Une demande existe déjà entre vous.');

      // create request
      await addDoc(collection(db, 'friendRequests'), {
        fromUid,
        toUid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      // mark as pending locally so the button updates immediately
      setPendingOutgoing(prev => ({ ...(prev || {}), [toUid]: true }));
      Alert.alert('Succès', 'Demande d\'ami envoyée.');
    } catch (err) {
      console.warn('sendFriendRequest failed', err);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande.');
    }
  };

  // Accept a friend request: create friends doc and update request status
  const acceptRequest = async (request: any) => {
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) return Alert.alert('Erreur', 'Tu dois être connecté.');
      // create friends doc (simple structure)
      const uids = [request.fromUid, request.toUid];
      await addDoc(collection(db, 'friends'), { uids, createdAt: serverTimestamp() });
      // update request
      const reqRef = doc(db, 'friendRequests', request.id);
      await updateDoc(reqRef, { status: 'accepted', respondedAt: serverTimestamp() });
      Alert.alert('Succès', 'Demande acceptée.');
      await loadIncomingRequests();
    } catch (e) {
      console.warn('acceptRequest failed', e);
      Alert.alert('Erreur', 'Impossible d\'accepter la demande.');
    }
  };

  const declineRequest = async (request: any) => {
    try {
      const reqRef = doc(db, 'friendRequests', request.id);
      await updateDoc(reqRef, { status: 'declined', respondedAt: serverTimestamp() });
      Alert.alert('Info', 'Demande refusée.');
      await loadIncomingRequests();
    } catch (e) {
      console.warn('declineRequest failed', e);
      Alert.alert('Erreur', 'Impossible de refuser la demande.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.row} onPress={() => Alert.alert(item.pseudo || item.displayName || 'Utilisateur', item.mail || item.email || '')}>
      <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.pseudo || item.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.pseudo || item.displayName || 'Utilisateur'}</Text>
        <Text style={styles.email}>{item.mail || item.email || ''}</Text>
      </View>
      {
        // determine id/key for this user
        (() => {
          const toUid = item.uid || item.id;
          const isPending = !!(pendingOutgoing && toUid && pendingOutgoing[toUid]);
          return (
            <TouchableOpacity
              style={[styles.addButton, isPending ? { backgroundColor: '#ccc' } : {}]}
              onPress={() => { if (!isPending) sendFriendRequest(item); }}
              disabled={isPending}
            >
              <Text style={{ color: isPending ? '#666' : '#181818', fontWeight: '700' }}>{isPending ? 'En attente' : 'Ajouter'}</Text>
            </TouchableOpacity>
          );
        })()
      }
    </TouchableOpacity>
  );

  const renderIncoming = ({ item }: { item: any }) => {
    const from = item.fromUser || { displayName: item.fromUid };
    return (
      <View style={styles.row}>
        <Image source={{ uri: from.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(from.pseudo || from.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{from.pseudo || from.displayName || 'Utilisateur'}</Text>
          <Text style={styles.email}>{from.mail || from.email || ''}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#3ddc84', marginRight: 8 }]} onPress={() => acceptRequest(item)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Accepter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#ff6b6b' }]} onPress={() => declineRequest(item)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Refuser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>Amis</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => { setView('search'); loadPendingOutgoing(); }} style={{ marginRight: 8 }}>
            <Text style={{ color: view === 'search' ? '#FFA94D' : '#fff' }}>Rechercher</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setView('friends'); loadFriends(); }} style={{ marginRight: 8 }}>
            <Text style={{ color: view === 'friends' ? '#FFA94D' : '#fff' }}>Mes amis</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setView('incoming'); loadIncomingRequests(); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: view === 'incoming' ? '#FFA94D' : '#fff' }}>Demandes</Text>
              {incomingCount > 0 ? (
                <View style={{ backgroundColor: '#ff6b6b', minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{incomingCount}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {view === 'search' ? (
        <>
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher par pseudo ou email" placeholderTextColor="#888" style={styles.input} />
          {loading ? <ActivityIndicator color="#FFA94D" style={{ marginTop: 12 }} /> : null}
          <FlatList data={results} keyExtractor={(i) => i.id} renderItem={renderItem} style={{ width: '100%', marginTop: 12 }} />
          {(!q || results.length === 0) && !loading ? <Text style={styles.subtitle}>Ta liste d'amis apparaîtra ici.</Text> : null}
        </>
      ) : view === 'friends' ? (
        <>
          {friendsList.length === 0 ? <Text style={{ color: '#fff', marginTop: 12 }}>Tu n'as pas encore d'amis.</Text> : (
            <FlatList
              data={friendsList}
              keyExtractor={(i) => i.id}
              renderItem={({ item }: { item: any }) => {
                const user = item.otherUser;
                if (!user) return null;
                return (
                  <View style={styles.row}>
                    <Image source={{ uri: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.pseudo || user.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{user.pseudo || user.displayName || 'Utilisateur'}</Text>
                      <Text style={styles.email}>{user.mail || user.email || ''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity style={[styles.addButton, { backgroundColor: '#3b82f6', marginRight: 8 }]} onPress={() => createOrOpenChat(user)}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Tchat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.addButton, { backgroundColor: '#ff6b6b' }]} onPress={() => removeFriend(item)}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Retirer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              style={{ width: '100%', marginTop: 12 }}
            />
          )}
        </>
      ) : (
        <>
          {incoming.length === 0 ? <Text style={{ color: '#fff', marginTop: 12 }}>Aucune demande entrante.</Text> : (
            <FlatList data={incoming} keyExtractor={(i) => i.id} renderItem={renderIncoming} style={{ width: '100%', marginTop: 12 }} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#181818' },
  title: { color: '#FFA94D', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#fff', marginTop: 12 },
  input: { backgroundColor: '#232323', color: '#fff', padding: 12, borderRadius: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#333' },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  email: { color: '#aaa', fontSize: 13, marginTop: 2 },
  addButton: { backgroundColor: '#FFA94D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
});
