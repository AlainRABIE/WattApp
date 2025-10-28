import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

export default function ShortScreen() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'books'));
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (direction === 'left') {
      // Ajouter à Mes envies (wishlist)
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user && books[current]) {
          await addDoc(collection(db, 'wishlist'), {
            uid: user.uid,
            bookId: books[current].id,
            addedAt: serverTimestamp(),
          });
        }
      } catch (e) {
        // Optionally: afficher une erreur ou toast
      }
    }
    // Passer au livre suivant
    setCurrent(c => Math.min(c + 1, books.length - 1));
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#FFA94D" /></View>
  );
  if (!books.length) return (
    <View style={styles.center}><Text>Aucun synopsis à afficher.</Text></View>
  );

  const book = books[current];

  return (
    <View style={styles.container}>
      <PanGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END) {
            if (nativeEvent.translationX < -60) handleSwipe('right');
            else if (nativeEvent.translationX > 60) handleSwipe('left');
          }
        }}
      >
        <View style={styles.card}>
          <Image source={{ uri: book.coverImage || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }} style={styles.cover} />
          <Text style={styles.title}>{book.title || 'Sans titre'}</Text>
          <Text style={styles.synopsis} numberOfLines={6}>{book.synopsis || book.content?.slice(0, 200) || 'Pas de synopsis.'}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleSwipe('left')}>
              <Ionicons name="heart-outline" size={32} color="#FFA94D" />
              <Text style={styles.actionText}>Envie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleSwipe('right')}>
              <Ionicons name="close-outline" size={32} color="#888" />
              <Text style={styles.actionText}>Passer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#181818', justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: width * 0.9, backgroundColor: '#232323', borderRadius: 18, padding: 20, alignItems: 'center', elevation: 4 },
  cover: { width: 120, height: 180, borderRadius: 10, marginBottom: 18, backgroundColor: '#333' },
  title: { color: '#FFA94D', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  synopsis: { color: '#fff', fontSize: 15, marginBottom: 18, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionText: { color: '#FFA94D', marginTop: 4 },
});
