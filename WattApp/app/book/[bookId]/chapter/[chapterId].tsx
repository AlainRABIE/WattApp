import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

interface Chapter {
  id: string;
  title: string;
  content: string;
  bookId: string;
  chapterNumber: number;
  createdAt?: any;
  updatedAt?: any;
}

interface Book {
  id: string;
  title: string;
  author?: string;
  authorUid?: string;
  coverImage?: string;
}

const ChapterReader: React.FC = () => {
  const router = useRouter();
  const { bookId, chapterId } = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(17);
  const [showControls, setShowControls] = useState(false);

  // Thèmes de lecture
  const themes = {
    dark: {
      name: 'Sombre',
      background: '#181818',
      textColor: '#ffffff',
      titleColor: '#aaa',
    },
    light: {
      name: 'Clair',
      background: '#f5f5f5',
      textColor: '#333333',
      titleColor: '#666',
    },
    sepia: {
      name: 'Sépia',
      background: '#f4f1e8',
      textColor: '#5c4a37',
      titleColor: '#8b7355',
    },
  };

  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>('dark');
  const theme = themes[currentTheme];

  useEffect(() => {
    loadChapterAndBook();
  }, [bookId, chapterId]);

  const loadChapterAndBook = async () => {
    if (!bookId || !chapterId || typeof bookId !== 'string' || typeof chapterId !== 'string') {
      Alert.alert('Erreur', 'IDs invalides');
      router.back();
      return;
    }

    try {
      setLoading(true);

      // Charger le chapitre
      const chapterRef = doc(db, 'books', bookId, 'chapters', chapterId);
      const chapterSnap = await getDoc(chapterRef);

      if (!chapterSnap.exists()) {
        Alert.alert('Erreur', 'Chapitre introuvable');
        router.back();
        return;
      }

      const chapterData = { id: chapterSnap.id, ...chapterSnap.data() } as Chapter;
      setChapter(chapterData);

      // Charger les informations du livre
      const bookRef = doc(db, 'books', bookId);
      const bookSnap = await getDoc(bookRef);

      if (bookSnap.exists()) {
        const bookData = { id: bookSnap.id, ...bookSnap.data() } as Book;
        setBook(bookData);
      }

      // Incrémenter les vues du livre
      try {
        await updateDoc(doc(db, 'books', bookId), {
          reads: increment(1)
        });
      } catch (error) {
        console.warn('Impossible d\'incrémenter les vues:', error);
      }

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger le chapitre');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const adjustFontSize = (increment: number) => {
    setFontSize(prev => Math.max(12, Math.min(24, prev + increment)));
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={currentTheme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA94D" />
          <Text style={[styles.loadingText, { color: theme.textColor }]}>
            Chargement du chapitre...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!chapter || !book) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={currentTheme === 'light' ? 'dark-content' : 'light-content'} />
      
      {/* Header avec contrôles */}
      {showControls && (
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.titleColor + '30' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.textColor} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.textColor }]} numberOfLines={1}>
              {chapter.title}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.titleColor }]} numberOfLines={1}>
              {book.title} • Chapitre {chapter.chapterNumber}
            </Text>
          </View>

          <View style={styles.headerControls}>
            <TouchableOpacity onPress={() => adjustFontSize(-1)} style={styles.controlButton}>
              <Ionicons name="remove" size={20} color={theme.textColor} />
            </TouchableOpacity>
            <Text style={[styles.fontSizeIndicator, { color: theme.textColor }]}>
              {fontSize}
            </Text>
            <TouchableOpacity onPress={() => adjustFontSize(1)} style={styles.controlButton}>
              <Ionicons name="add" size={20} color={theme.textColor} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Contenu du chapitre */}
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={toggleControls}>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Titre du chapitre */}
          <Text style={[styles.chapterTitle, { color: theme.textColor, fontSize: fontSize + 8 }]}>
            {chapter.title}
          </Text>
          
          {/* Numéro du chapitre */}
          <Text style={[styles.chapterNumber, { color: theme.titleColor }]}>
            Chapitre {chapter.chapterNumber}
          </Text>

          {/* Contenu */}
          <Text style={[styles.chapterContent, { color: theme.textColor, fontSize }]}>
            {chapter.content}
          </Text>

          {/* Navigation vers le chapitre suivant */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[styles.navButton, { borderColor: theme.titleColor + '50' }]}
              onPress={() => router.push(`/book/${bookId}`)}
            >
              <Ionicons name="book-outline" size={20} color="#FFA94D" />
              <Text style={[styles.navButtonText, { color: '#FFA94D' }]}>
                Retour au livre
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableOpacity>

      {/* Sélecteur de thème flottant */}
      {showControls && (
        <View style={[styles.themeSelector, { backgroundColor: theme.background, borderColor: theme.titleColor + '30' }]}>
          {Object.entries(themes).map(([key, themeOption]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.themeButton,
                { backgroundColor: themeOption.background },
                currentTheme === key && { borderColor: '#FFA94D', borderWidth: 2 }
              ]}
              onPress={() => setCurrentTheme(key as keyof typeof themes)}
            >
              <Text style={[styles.themeButtonText, { color: themeOption.textColor }]}>
                A
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 8,
  },
  fontSizeIndicator: {
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 30,
    paddingTop: 50,
    paddingBottom: 100,
  },
  chapterTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 32,
  },
  chapterNumber: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 30,
    fontStyle: 'italic',
  },
  chapterContent: {
    lineHeight: 26,
    textAlign: 'justify',
  },
  navigationContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeSelector: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    borderRadius: 25,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChapterReader;