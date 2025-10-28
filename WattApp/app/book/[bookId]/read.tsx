import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import app, { db } from '../../../constants/firebaseConfig';

const BookReadScreen: React.FC = () => {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  // TOUS les hooks doivent être appelés à chaque render, AVANT tout return
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);
  const hideBackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!bookId || typeof bookId !== 'string') {
        setBook(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const docRef = doc(db, 'books', bookId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setBook(null);
          setLoading(false);
          return;
        }
        setBook({ id: docSnap.id, ...docSnap.data() });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookId]);

  // On affiche le loader ou rien, mais TOUS les hooks sont toujours appelés
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFA94D" />
        <Text style={styles.loadingText}>Chargement du livre...</Text>
      </View>
    );
  }
  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Livre introuvable.</Text>
      </View>
    );
  }

  // Affichage/masquage de la flèche retour
  const handleToggleBack = () => {
    setShowBack((v) => {
      if (!v) {
        // Si on affiche, cacher auto après 3s
        if (hideBackTimeout.current) clearTimeout(hideBackTimeout.current);
        hideBackTimeout.current = setTimeout(() => setShowBack(false), 3000);
      }
      return !v;
    });
  };

  // Nettoyage du timeout au démontage
  useEffect(() => () => { if (hideBackTimeout.current) clearTimeout(hideBackTimeout.current); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1 }}
        onPress={handleToggleBack}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'center', padding: 0, paddingBottom: 48 }}
          scrollEnabled={true}
        >
          {/* Bouton retour */}
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ position: 'absolute', top: 36, left: 16, zIndex: 10, backgroundColor: 'rgba(30,30,30,0.7)', borderRadius: 20, padding: 6 }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {/* Titre */}
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 48, marginBottom: 8 }}>{book.title}</Text>
          {/* Auteur */}
          {book.author && (
            <Text style={{ color: '#aaa', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 18 }}>par {book.author}</Text>
          )}
          {/* Texte du livre, centré, police serif, blanc */}
          <Text style={{ color: '#fff', fontSize: 20, lineHeight: 34, textAlign: 'left', fontFamily: 'serif', marginTop: 16, marginBottom: 32, width: '92%' }}>{book.body}</Text>
          {/* Pagination simple (exemple) */}
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>Page 1</Text>
        </ScrollView>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    color: '#FFA94D',
    marginTop: 16,
    fontSize: 16,
  },
  title: {
    color: '#FFA94D',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  author: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  body: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 26,
    marginTop: 8,
  },
});

export default BookReadScreen;
