
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, useWindowDimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, setDoc, increment, onSnapshot, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../../constants/firebaseConfig';
import StarRating from '../../components/StarRating';


const BookReadScreen: React.FC<any> = () => {
  const { bookId, preview, previewBody, position } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBack, setShowBack] = useState(false);
  const hideBackTimeout = useRef<number | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const { width, height } = useWindowDimensions();
  // Notation et vues
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  // Mode aperçu
  const isPreview = preview === 'true';


  // Incrémente le nombre de vues à chaque ouverture (sauf en mode aperçu)
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string' || isPreview) return;
    const bookRef = doc(db, 'books', bookId);
    updateDoc(bookRef, { reads: increment(1) }).catch(() => {});
  }, [bookId, isPreview]);

  // Charge le livre et découpe en pages
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
        
        // Utiliser le contenu d'aperçu si en mode preview, sinon le contenu complet
        let body: string;
        if (isPreview && previewBody) {
          body = Array.isArray(previewBody) ? previewBody[0] : previewBody;
          body = decodeURIComponent(body);
        } else {
          body = (data.body || '').toString();
        }
        
        const charsPerPage = 1200;
        const paged: string[] = [];
        for (let i = 0; i < body.length; i += charsPerPage) {
          paged.push(body.slice(i, i + charsPerPage));
        }
        setPages(paged.length ? paged : ['']);
        
        // Si une position de départ est spécifiée, calculer la page correspondante
        if (position && !isPreview) {
          const startPosition = parseInt(position.toString());
          const charsPerPage = 1200;
          const startPage = Math.floor(startPosition / charsPerPage);
          setCurrentPage(Math.min(startPage, paged.length - 1));
        }
      }
      setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [bookId]);

  // Gestion des notes Firestore (ratings)
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string') return;
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    // Ecoute la note de l'utilisateur
    const ratingRef = doc(db, 'books', bookId, 'ratings', user.uid);
    getDoc(ratingRef).then(snap => {
      if (snap.exists()) setUserRating(snap.data().rating || 0);
    });
    // Ecoute la moyenne et le nombre de votes
    const ratingsCol = collection(db, 'books', bookId, 'ratings');
    return onSnapshot(ratingsCol, snap => {
      let sum = 0, count = 0;
      snap.forEach(doc => {
        const r = doc.data().rating;
        if (typeof r === 'number') { sum += r; count++; }
      });
      setAvgRating(count ? sum / count : 0);
      setRatingCount(count);
    });
  }, [bookId]);

  // Fonction pour noter le livre
  const handleRate = async (rating: number) => {
    setUserRating(rating);
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !bookId || typeof bookId !== 'string') return;
    const ratingRef = doc(db, 'books', bookId, 'ratings', user.uid);
    await setDoc(ratingRef, { rating }, { merge: true });
  };

  // Sauvegarde automatique du progrès de lecture
  const saveReadingProgress = async (pageIndex: number) => {
    if (isPreview) return; // Ne pas sauvegarder en mode aperçu
    
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !bookId || typeof bookId !== 'string') return;
    
    try {
      // Calculer la position approximative dans le texte
      const charsPerPage = 1200;
      const position = pageIndex * charsPerPage;
      
      const progressRef = doc(db, 'users', user.uid, 'readingProgress', bookId);
      await setDoc(progressRef, {
        bookId,
        bookTitle: book?.title || 'Livre sans titre',
        position,
        currentPage: pageIndex,
        totalPages: pages.length,
        lastReadAt: new Date().toISOString(),
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du progrès:', error);
    }
  };

  // Sauvegarder le progrès quand la page change
  useEffect(() => {
    if (currentPage > 0 || pages.length > 0) {
      saveReadingProgress(currentPage);
    }
  }, [currentPage, pages.length, book]);

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
      {/* Affichage notation et stats */}
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={handleToggleBack}>
        {/* Titre en haut, gris, centré */}
        <View style={{ width: '100%', alignItems: 'center', marginTop: 32, marginBottom: 8, position: 'absolute', top: 0, left: 0, zIndex: 20 }} pointerEvents="none">
          <Text style={{ color: '#aaa', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
            {isPreview ? `Aperçu - ${book.title}` : book.title}
          </Text>
          {isPreview && (
            <View style={{ backgroundColor: '#4FC3F7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 }}>
              <Text style={{ color: '#181818', fontSize: 12, fontWeight: 'bold' }}>MODE APERÇU</Text>
            </View>
          )}
        </View>
        <PagerView
          style={{ flex: 1, width: width, height: height }}
          initialPage={currentPage}
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
