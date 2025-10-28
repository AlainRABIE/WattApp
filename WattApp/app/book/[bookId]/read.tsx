
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, useWindowDimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';


const BookReadScreen: React.FC<any> = () => {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);
  const hideBackTimeout = useRef<number | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setBook(null);
    setPages([]);
    setCurrentPage(0);
    if (!bookId || typeof bookId !== 'string') {
      setLoading(false);
      return;
    }
    getDoc(doc(db, 'books', bookId)).then(docSnap => {
      if (!isMounted) return;
      if (!docSnap.exists()) {
        setBook(null);
      } else {
        const data = { id: docSnap.id, ...(docSnap.data() as any) };
        setBook(data);
        const body: string = (data.body || '').toString();
        const charsPerPage = 1200;
        const paged: string[] = [];
        for (let i = 0; i < body.length; i += charsPerPage) {
          paged.push(body.slice(i, i + charsPerPage));
        }
        setPages(paged.length ? paged : ['']);
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [bookId]);

  useEffect(() => {
    return () => {
      if (hideBackTimeout.current) clearTimeout(hideBackTimeout.current);
    };
  }, []);

  const handleToggleBack = () => {
    setShowBack((v) => {
      if (!v) {
        if (hideBackTimeout.current) clearTimeout(hideBackTimeout.current);
        hideBackTimeout.current = setTimeout(() => setShowBack(false), 3000);
      }
      return !v;
    });
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={handleToggleBack}>
        {/* Titre en haut, gris, centré */}
        <View style={{ width: '100%', alignItems: 'center', marginTop: 32, marginBottom: 8, position: 'absolute', top: 0, left: 0, zIndex: 20 }} pointerEvents="none">
          <Text style={{ color: '#aaa', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>{book.title}</Text>
        </View>
        <PagerView
          style={{ flex: 1, width: width, height: height }}
          initialPage={0}
          onPageSelected={e => setCurrentPage(e.nativeEvent.position)}
        >
          {pages.map((page, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 48, paddingBottom: 48 }}>
              {showBack && (
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{ position: 'absolute', top: 36, left: 16, zIndex: 10, backgroundColor: 'rgba(30,30,30,0.7)', borderRadius: 20, padding: 6 }}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {book.author && idx === 0 && (
                <Text style={{ color: '#aaa', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 18 }}>par {book.author}</Text>
              )}
              <Text style={{ color: '#fff', fontSize: 20, lineHeight: 34, textAlign: 'left', fontFamily: 'serif', marginTop: 16, marginBottom: 32, width: '92%' }}>{page}</Text>
              <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>Page {idx + 1} / {pages.length}</Text>
            </View>
          ))}
        </PagerView>
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
