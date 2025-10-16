import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query as firestoreQuery, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function ChatsList() {
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    let unsub: any;
    async function load() {
      setLoading(true);
      try {
        const auth = getAuth(app);
        const current = auth.currentUser;
        if (!current) return;
        // listen to chats where current is a participant
        const q = firestoreQuery(collection(db, 'chats'));
        // simple approach: subscribe to all chats and filter client-side
        unsub = onSnapshot(q, snap => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          const mine = items.filter(i => Array.isArray(i.participants) && i.participants.includes(current.uid));
          // sort by lastMessageAt desc
          mine.sort((a, b) => (b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0) - (a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0));
          setChats(mine);
        });
      } catch (e) {
        console.warn('load chats failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { if (unsub) unsub(); };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      {loading ? <ActivityIndicator color="#FFA94D" /> : null}
      <FlatList
        data={chats}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => {
          const otherId = (item.participants || []).find((p: string) => p !== getAuth(app).currentUser?.uid);
          const other = item.participantsMeta?.[otherId] || { displayName: 'Utilisateur', photoURL: null };
          return (
            <TouchableOpacity style={styles.row} onPress={() => (router as any).push(`/chat/${item.id}`)}>
              <Image source={{ uri: other.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(other.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{other.displayName || 'Utilisateur'}</Text>
                <Text style={styles.subtitle}>{item.lastMessageText || ''}</Text>
              </View>
              <Text style={{ color: '#aaa' }}>{item.lastMessageAt ? new Date(item.lastMessageAt.toMillis()).toLocaleTimeString() : ''}</Text>
            </TouchableOpacity>
          );
        }}
        style={{ marginTop: 12, width: '100%' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#181818' },
  title: { color: '#FFA94D', fontSize: 28, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#333' },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 2 },
});
