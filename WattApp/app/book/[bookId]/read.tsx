
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, useWindowDimensions, Modal, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
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
  const pagerRef = useRef<any>(null);
  
  // Notation et vues
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  
  // Mode aperçu
  const isPreview = preview === 'true';
  
  // Thèmes et paramètres de lecture
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(18);
  const [lineSpacing, setLineSpacing] = useState(1.6);
  const [fontFamily, setFontFamily] = useState('System');
  const [brightness, setBrightness] = useState(1.0);

  // Définition des thèmes
  const themes = {
    dark: {
      name: 'Sombre',
      background: '#181818',
      textColor: '#ffffff',
      titleColor: '#aaa',
      modalBg: 'rgba(24,24,24,0.98)',
      icon: '🌙'
    },
    light: {
      name: 'Clair',
      background: '#ffffff',
      textColor: '#000000',
      titleColor: '#666666',
      modalBg: 'rgba(255,255,255,0.98)',
      icon: '☀️'
    },
    sepia: {
      name: 'Sépia',
      background: '#f4f1ea',
      textColor: '#5c4b37',
      titleColor: '#8b7355',
      modalBg: 'rgba(244,241,234,0.98)',
      icon: '📜'
    },
    night: {
      name: 'Nuit',
      background: '#0f0f0f',
      textColor: '#e0e0e0',
      titleColor: '#888888',
      modalBg: 'rgba(15,15,15,0.98)',
      icon: '🌚'
    },
    green: {
      name: 'Naturel',
      background: '#1a2e1a',
      textColor: '#d4e6d4',
      titleColor: '#a0c4a0',
      modalBg: 'rgba(26,46,26,0.98)',
      icon: '🌿'
    },
    ocean: {
      name: 'Océan',
      background: '#1a2837',
      textColor: '#e3f2fd',
      titleColor: '#90caf9',
      modalBg: 'rgba(26,40,55,0.98)',
      icon: '🌊'
    }
  };

  // Familles de polices disponibles
  const fontFamilies = [
    { name: 'Système', value: 'System' },
    { name: 'Serif', value: 'serif' },
    { name: 'Sans Serif', value: 'sans-serif' },
    { name: 'Monospace', value: 'monospace' }
  ];


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
      
      // Vérifier si c'est la première fois que l'utilisateur lit ce livre
      const progressDoc = await getDoc(progressRef);
      const isFirstRead = !progressDoc.exists();
      
      await setDoc(progressRef, {
        bookId,
        bookTitle: book?.title || 'Livre sans titre',
        position,
        currentPage: pageIndex,
        totalPages: pages.length,
        lastReadAt: new Date().toISOString(),
        updatedAt: new Date()
      }, { merge: true });
      
      // Si c'est la première lecture, ajouter le livre à la bibliothèque
      if (isFirstRead && book) {
        const userBookRef = doc(db, 'users', user.uid, 'library', bookId);
        await setDoc(userBookRef, {
          bookId,
          title: book.title,
          author: book.author || book.authorName || 'Auteur inconnu',
          coverImageUrl: book.coverImageUrl || book.coverImage || '',
          addedAt: new Date().toISOString(),
          lastReadAt: new Date().toISOString(),
          status: 'reading' // en cours de lecture
        }, { merge: true });
      }
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
    
    // Sauvegarder le thème dans les préférences utilisateur
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      try {
        const userPrefsRef = doc(db, 'users', user.uid, 'preferences', 'reading');
        await setDoc(userPrefsRef, { 
          theme: themeKey,
          fontSize,
          lineSpacing,
          fontFamily,
          brightness
        }, { merge: true });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du thème:', error);
      }
    }
  };

  // Sauvegarder les paramètres de lecture
  const saveReadingSettings = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      try {
        const userPrefsRef = doc(db, 'users', user.uid, 'preferences', 'reading');
        await setDoc(userPrefsRef, {
          theme: currentTheme,
          fontSize,
          lineSpacing,
          fontFamily,
          brightness
        }, { merge: true });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
      }
    }
  };

  // Charger le thème et les paramètres préférés de l'utilisateur
  useEffect(() => {
    const loadUserSettings = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        try {
          const userPrefsRef = doc(db, 'users', user.uid, 'preferences', 'reading');
          const prefsSnap = await getDoc(userPrefsRef);
          if (prefsSnap.exists()) {
            const prefs = prefsSnap.data();
            if (prefs.theme) setCurrentTheme(prefs.theme);
            if (prefs.fontSize) setFontSize(prefs.fontSize);
            if (prefs.lineSpacing) setLineSpacing(prefs.lineSpacing);
            if (prefs.fontFamily) setFontFamily(prefs.fontFamily);
            if (prefs.brightness) setBrightness(prefs.brightness);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des paramètres:', error);
        }
      }
    };
    loadUserSettings();
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
    <View style={{ flex: 1, backgroundColor: themes[currentTheme as keyof typeof themes].background, opacity: brightness }}>
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
        
        {/* Numéro de page en bas à droite */}
        {pages.length > 0 && (
          <View style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 30, backgroundColor: 'rgba(30,30,30,0.7)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              {currentPage + 1} / {pages.length}
            </Text>
          </View>
        )}
        
        <PagerView
          ref={pagerRef}
          style={{ flex: 1, width: width, height: height }}
          initialPage={currentPage}
          onPageSelected={e => setCurrentPage(e.nativeEvent.position)}
        >
          {pages.map((page, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 70, paddingBottom: 80, paddingHorizontal: 20 }}>
              {showBack && (
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={{ position: 'absolute', top: 36, left: 16, zIndex: 10, backgroundColor: 'rgba(30,30,30,0.8)', borderRadius: 20, padding: 8 }}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {showBack && (
                <TouchableOpacity
                  onPress={() => setShowSettingsModal(true)}
                  style={{ position: 'absolute', top: 36, right: 16, zIndex: 10, backgroundColor: 'rgba(255,169,77,0.9)', borderRadius: 20, padding: 8 }}
                >
                  <Ionicons name="settings-sharp" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {book.author && idx === 0 && (
                <Text style={{ color: themes[currentTheme as keyof typeof themes].titleColor, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 18 }}>
                  par {book.author}
                </Text>
              )}
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <Text style={{ 
                  color: themes[currentTheme as keyof typeof themes].textColor, 
                  fontSize: fontSize, 
                  lineHeight: fontSize * lineSpacing, 
                  textAlign: 'justify', 
                  fontFamily: fontFamily === 'System' ? undefined : fontFamily,
                  width: '100%',
                  paddingHorizontal: 8
                }}>
                  {page}
                </Text>
              </ScrollView>
            </View>
          ))}
        </PagerView>
      </TouchableOpacity>

      {/* Modal des paramètres de lecture */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsModal, { backgroundColor: themes[currentTheme as keyof typeof themes].modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themes[currentTheme as keyof typeof themes].textColor }]}>
                Paramètres de lecture
              </Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close-circle" size={28} color={themes[currentTheme as keyof typeof themes].textColor} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
              
              {/* Section Thèmes */}
              <Text style={[styles.sectionTitle, { color: themes[currentTheme as keyof typeof themes].textColor }]}>
                🎨 Thème
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {Object.entries(themes).map(([key, theme]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.themeCard,
                      { backgroundColor: theme.background, borderColor: currentTheme === key ? '#FFA94D' : 'transparent' }
                    ]}
                    onPress={() => changeTheme(key)}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>{theme.icon}</Text>
                    <Text style={[styles.themeCardName, { color: theme.textColor }]}>
                      {theme.name}
                    </Text>
                    {currentTheme === key && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Section Taille de police */}
              <Text style={[styles.sectionTitle, { color: themes[currentTheme as keyof typeof themes].textColor }]}>
                📏 Taille de police
              </Text>
              <View style={styles.sliderContainer}>
                <Text style={{ color: themes[currentTheme as keyof typeof themes].textColor, fontSize: 14 }}>
                  A
                </Text>
                <Slider
                  style={{ flex: 1, marginHorizontal: 15 }}
                  minimumValue={14}
                  maximumValue={28}
                  step={2}
                  value={fontSize}
                  onValueChange={setFontSize}
                  onSlidingComplete={saveReadingSettings}
                  minimumTrackTintColor="#FFA94D"
                  maximumTrackTintColor="#666"
                  thumbTintColor="#FFA94D"
                />
                <Text style={{ color: themes[currentTheme as keyof typeof themes].textColor, fontSize: 24, fontWeight: 'bold' }}>
                  A
                </Text>
              </View>
              <Text style={[styles.settingValue, { color: themes[currentTheme as keyof typeof themes].titleColor }]}>
                {fontSize}px
              </Text>

              {/* Section Espacement des lignes */}
              <Text style={[styles.sectionTitle, { color: themes[currentTheme as keyof typeof themes].textColor, marginTop: 20 }]}>
                📐 Espacement des lignes
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={1.2}
                  maximumValue={2.2}
                  step={0.1}
                  value={lineSpacing}
                  onValueChange={setLineSpacing}
                  onSlidingComplete={saveReadingSettings}
                  minimumTrackTintColor="#FFA94D"
                  maximumTrackTintColor="#666"
                  thumbTintColor="#FFA94D"
                />
              </View>
              <Text style={[styles.settingValue, { color: themes[currentTheme as keyof typeof themes].titleColor }]}>
                {lineSpacing.toFixed(1)}
              </Text>

              {/* Section Police */}
              <Text style={[styles.sectionTitle, { color: themes[currentTheme as keyof typeof themes].textColor, marginTop: 20 }]}>
                ✍️ Famille de police
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {fontFamilies.map((font) => (
                  <TouchableOpacity
                    key={font.value}
                    style={[
                      styles.fontButton,
                      { 
                        backgroundColor: fontFamily === font.value ? '#FFA94D' : 'rgba(255,169,77,0.2)',
                        borderColor: fontFamily === font.value ? '#FFA94D' : 'transparent'
                      }
                    ]}
                    onPress={() => {
                      setFontFamily(font.value);
                      saveReadingSettings();
                    }}
                  >
                    <Text style={{ 
                      color: fontFamily === font.value ? '#181818' : themes[currentTheme as keyof typeof themes].textColor,
                      fontWeight: fontFamily === font.value ? 'bold' : 'normal'
                    }}>
                      {font.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Section Luminosité */}
              <Text style={[styles.sectionTitle, { color: themes[currentTheme as keyof typeof themes].textColor, marginTop: 20 }]}>
                💡 Luminosité
              </Text>
              <View style={styles.sliderContainer}>
                <Ionicons name="sunny-outline" size={20} color={themes[currentTheme as keyof typeof themes].textColor} />
                <Slider
                  style={{ flex: 1, marginHorizontal: 15 }}
                  minimumValue={0.5}
                  maximumValue={1.0}
                  step={0.05}
                  value={brightness}
                  onValueChange={setBrightness}
                  onSlidingComplete={saveReadingSettings}
                  minimumTrackTintColor="#FFA94D"
                  maximumTrackTintColor="#666"
                  thumbTintColor="#FFA94D"
                />
                <Ionicons name="sunny" size={24} color={themes[currentTheme as keyof typeof themes].textColor} />
              </View>
              <Text style={[styles.settingValue, { color: themes[currentTheme as keyof typeof themes].titleColor }]}>
                {Math.round(brightness * 100)}%
              </Text>

              {/* Aperçu du texte */}
              <View style={[styles.previewContainer, { backgroundColor: themes[currentTheme as keyof typeof themes].background, marginTop: 24, padding: 20, borderRadius: 12 }]}>
                <Text style={[styles.sectionTitle, { color: themes[currentTheme as keyof typeof themes].textColor, marginBottom: 12 }]}>
                  👁️ Aperçu
                </Text>
                <Text style={{
                  color: themes[currentTheme as keyof typeof themes].textColor,
                  fontSize: fontSize,
                  lineHeight: fontSize * lineSpacing,
                  textAlign: 'justify',
                  fontFamily: fontFamily === 'System' ? undefined : fontFamily
                }}>
                  Ceci est un exemple de texte pour visualiser vos paramètres de lecture. La typographie et l'espacement ont été ajustés selon vos préférences.
                </Text>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.closeButtonText}>✓ Terminé</Text>
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
  // Styles pour le modal des paramètres de lecture
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,169,77,0.2)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  themeCard: {
    width: 100,
    height: 110,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    position: 'relative',
  },
  themeCardName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fontButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  previewContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255,169,77,0.3)',
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
