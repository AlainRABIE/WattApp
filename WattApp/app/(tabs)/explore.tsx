import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { collection, getDocs, query, limit as queryLimit } from 'firebase/firestore';
import app, { db } from '../../constants/firebaseConfig';
import { useRouter } from 'expo-router';

export default function ExploreScreen() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const router = useRouter();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!q || q.trim() === '') {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(q.trim());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  async function doSearch(term: string) {
    setLoading(true);
    try {
      // Get a limited set of users and filter client-side (sufficient for small apps/testing)
      const qRef = query(collection(db, 'users'), queryLimit(100));
      const snap = await getDocs(qRef);
      const lower = term.toLowerCase();
      const filtered = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => {
          const pseudo = (u.pseudo || u.displayName || '').toString().toLowerCase();
          const mail = (u.mail || u.email || '').toString().toLowerCase();
          return pseudo.includes(lower) || mail.includes(lower);
        });
      setResults(filtered);
    } catch (err) {
      console.warn('Search users failed', err);
      Alert.alert('Erreur', 'Recherche impossible pour le moment.');
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.row} onPress={() => Alert.alert(item.pseudo || item.displayName || 'Utilisateur', item.mail || item.email || '')}>
      <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.pseudo || item.displayName || 'User')}&background=FFA94D&color=181818&size=128` }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.pseudo || item.displayName || 'Utilisateur'}</Text>
        <Text style={styles.email}>{item.mail || item.email || ''}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rechercher des utilisateurs</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Rechercher par pseudo ou email"
        placeholderTextColor="#888"
        style={styles.input}
      />
      {loading ? <ActivityIndicator color="#FFA94D" style={{ marginTop: 12 }} /> : null}
      <FlatList data={results} keyExtractor={(i) => i.id} renderItem={renderItem} style={{ width: '100%', marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#181818' },
  title: { color: '#FFA94D', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#232323', color: '#fff', padding: 12, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#333' },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  email: { color: '#aaa', fontSize: 13, marginTop: 2 },
});
