
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, useWindowDimensions, Modal, ScrollView } from 'react-native';
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
  // Thèmes de lecture
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');

  // Définition des thèmes
  const themes = {
    dark: {
      name: 'Sombre',
      background: '#181818',
      textColor: '#ffffff',
      titleColor: '#aaa',
      modalBg: 'rgba(24,24,24,0.95)',
      icon: '🌙'
    },
    light: {
      name: 'Clair',
      background: '#ffffff',
      textColor: '#000000',
      titleColor: '#666666',
      modalBg: 'rgba(255,255,255,0.95)',
      icon: '☀️'
    },
    sepia: {
      name: 'Sépia',
      background: '#f4f1ea',
      textColor: '#5c4b37',
      titleColor: '#8b7355',
      modalBg: 'rgba(244,241,234,0.95)',
      icon: '📜'
    },
    night: {
      name: 'Nuit',
      background: '#0f0f0f',
      textColor: '#e0e0e0',
      titleColor: '#888888',
      modalBg: 'rgba(15,15,15,0.95)',
      icon: '🌚'
    },
    green: {
      name: 'Naturel',
      background: '#1a2e1a',
      textColor: '#d4e6d4',
      titleColor: '#a0c4a0',
      modalBg: 'rgba(26,46,26,0.95)',
      icon: '🌿'
    }
  };


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

  // Fonction pour changer de thème
  const changeTheme = async (themeKey: string) => {
    setCurrentTheme(themeKey);
    setShowThemeModal(false);
    
    // Sauvegarder le thème dans les préférences utilisateur
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      try {
        const userPrefsRef = doc(db, 'users', user.uid, 'preferences', 'reading');
        await setDoc(userPrefsRef, { theme: themeKey }, { merge: true });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du thème:', error);
      }
    }
  };

  // Charger le thème préféré de l'utilisateur
  useEffect(() => {
    const loadUserTheme = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        try {
          const userPrefsRef = doc(db, 'users', user.uid, 'preferences', 'reading');
          const prefsSnap = await getDoc(userPrefsRef);
          if (prefsSnap.exists() && prefsSnap.data().theme) {
            setCurrentTheme(prefsSnap.data().theme);
          }
        } catch (error) {
          console.error('Erreur lors du chargement du thème:', error);
        }
      }
    };
    loadUserTheme();
  }, []);

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
    <View style={{ flex: 1, backgroundColor: themes[currentTheme as keyof typeof themes].background }}>
      <StatusBar barStyle={currentTheme === 'light' ? "dark-content" : "light-content"} />
      {/* Affichage notation et stats */}
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={handleToggleBack}>
        {/* Titre en haut, gris, centré */}
        <View style={{ width: '100%', alignItems: 'center', marginTop: 32, marginBottom: 8, position: 'absolute', top: 0, left: 0, zIndex: 20 }} pointerEvents="none">
          <Text style={{ color: themes[currentTheme as keyof typeof themes].titleColor, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
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
              {showBack && (
                <TouchableOpacity
                  onPress={() => setShowThemeModal(true)}
                  style={{ position: 'absolute', top: 36, right: 16, zIndex: 10, backgroundColor: 'rgba(255,169,77,0.8)', borderRadius: 20, padding: 6 }}
                >
                  <Ionicons name="color-palette" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {book.author && idx === 0 && (
                <Text style={{ color: themes[currentTheme as keyof typeof themes].titleColor, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 18 }}>par {book.author}</Text>
              )}
              <Text style={{ color: themes[currentTheme as keyof typeof themes].textColor, fontSize: 20, lineHeight: 34, textAlign: 'left', fontFamily: 'serif', marginTop: 16, marginBottom: 32, width: '92%' }}>{page}</Text>
              <Text style={{ color: themes[currentTheme as keyof typeof themes].titleColor, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>Page {idx + 1} / {pages.length}</Text>
            </View>
          ))}
        </PagerView>
      </TouchableOpacity>

      {/* Modal des thèmes */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.themeModal, { backgroundColor: themes[currentTheme as keyof typeof themes].modalBg }]}>
            <Text style={[styles.modalTitle, { color: themes[currentTheme as keyof typeof themes].textColor }]}>
              Choisir un thème de lecture
            </Text>
            
            <ScrollView style={styles.themesContainer}>
              {Object.entries(themes).map(([key, theme]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.themeOption,
                    { backgroundColor: theme.background },
                    currentTheme === key && styles.selectedTheme
                  ]}
                  onPress={() => changeTheme(key)}
                >
                  <View style={styles.themePreview}>
                    <Text style={styles.themeIcon}>{theme.icon}</Text>
                    <View style={styles.themeInfo}>
                      <Text style={[styles.themeName, { color: theme.textColor }]}>
                        {theme.name}
                      </Text>
                      <Text style={[styles.themeExample, { color: theme.textColor }]}>
                        Exemple de texte dans ce thème
                      </Text>
                    </View>
                    {currentTheme === key && (
                      <Ionicons name="checkmark-circle" size={24} color="#FFA94D" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Styles pour le modal des thèmes
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  themesContainer: {
    maxHeight: 400,
  },
  themeOption: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTheme: {
    borderColor: '#FFA94D',
  },
  themePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  themeIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeExample: {
    fontSize: 14,
    opacity: 0.8,
  },
  closeButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookReadScreen;
