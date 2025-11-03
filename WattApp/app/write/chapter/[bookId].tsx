import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../../constants/firebaseConfig';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, arrayUnion, getDocs, query, where } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const WRITING_CATEGORIES = [
  'Chapitre Standard', 'Épilogue', 'Prologue', 'Interlude', 'Flashback', 'Point de Vue', 'Bonus'
];

interface Chapter {
  id?: string;
  title: string;
  content: string;
  bookId: string;
  chapterNumber: number;
  category?: string;
  createdAt?: any;
  updatedAt?: any;
  templateUsed?: string | null;
  templateName?: string | null;
}

interface Book {
  id: string;
  title: string;
  author?: string;
  authorUid?: string;
  coverImage?: string;
  chapters?: number;
  chaptersList?: Chapter[];
}

interface Template {
  id: string;
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  type: string;
  starter?: string;
}

const ChapterEditor: React.FC = () => {
  const router = useRouter();
  const { bookId } = useLocalSearchParams();
  
  const [book, setBook] = useState<Book | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [category, setCategory] = useState(WRITING_CATEGORIES[0]);
  
  // Templates et interface moderne
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Charger les informations du livre et les templates
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string') {
      Alert.alert('Erreur', 'ID du livre invalide');
      router.back();
      return;
    }
    
    loadBook();
    loadTemplates();
  }, [bookId]);

  // Charger les templates pour l'écriture
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const templatesQuery = query(
        collection(db, 'templates'),
        where('type', 'in', ['Roman', 'Nouvelle', 'Note', 'Autre'])
      );
      const snapshot = await getDocs(templatesQuery);
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[];
      
      setTemplates(templatesData);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadBook = async () => {
    try {
      setLoading(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        router.back();
        return;
      }

      const bookRef = doc(db, 'books', bookId as string);
      const bookSnap = await getDoc(bookRef);

      if (!bookSnap.exists()) {
        Alert.alert('Erreur', 'Livre introuvable');
        router.back();
        return;
      }

      const bookData = { id: bookSnap.id, ...bookSnap.data() } as Book;
      
      // Vérifier que l'utilisateur est l'auteur du livre
      if (bookData.authorUid !== user.uid) {
        Alert.alert('Erreur', 'Vous n\'êtes pas autorisé à modifier ce livre');
        router.back();
        return;
      }

      setBook(bookData);
      
      // Calculer le numéro du prochain chapitre
      const nextChapterNumber = (bookData.chapters || 0) + 1;
      setChapterNumber(nextChapterNumber);
      setChapterTitle(`Chapitre ${nextChapterNumber}`);
      
    } catch (error) {
      console.error('Erreur lors du chargement du livre:', error);
      Alert.alert('Erreur', 'Impossible de charger le livre');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const saveChapter = async () => {
    if (!chapterTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour le chapitre');
      return;
    }

    if (!chapterContent.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le contenu du chapitre');
      return;
    }

    setSaving(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user || !book) {
        Alert.alert('Erreur', 'Données manquantes');
        return;
      }

      // Créer le nouveau chapitre
      const newChapter: Chapter = {
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
        bookId: book.id,
        chapterNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        templateUsed: selectedTemplate?.id || null,
        templateName: selectedTemplate?.title || null,
      };

      // Ajouter le chapitre à la collection des chapitres
      const chaptersRef = collection(db, 'books', book.id, 'chapters');
      const chapterDoc = await addDoc(chaptersRef, newChapter);

      // Mettre à jour le livre avec le nouveau nombre de chapitres
      const bookRef = doc(db, 'books', book.id);
      await updateDoc(bookRef, {
        chapters: (book.chapters || 0) + 1,
        chaptersList: arrayUnion({
          id: chapterDoc.id,
          title: chapterTitle.trim(),
          chapterNumber,
        }),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Chapitre sauvegardé !',
        `Le chapitre "${chapterTitle}" a été ajouté au livre "${book.title}".`,
        [
          {
            text: 'Créer un autre chapitre',
            onPress: () => {
              setChapterTitle(`Chapitre ${chapterNumber + 1}`);
              setChapterContent('');
              setChapterNumber(chapterNumber + 1);
            }
          },
          {
            text: 'Retour au livre',
            onPress: () => router.push(`/book/${book.id}`),
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le chapitre');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!chapterTitle.trim() && !chapterContent.trim()) {
      Alert.alert('Erreur', 'Rien à sauvegarder');
      return;
    }

    setSaving(true);
    try {
      // Vous pouvez implémenter une sauvegarde en tant que brouillon ici
      // Par exemple dans une collection séparée "drafts"
      Alert.alert('Brouillon sauvegardé', 'Votre chapitre a été sauvegardé en tant que brouillon');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du brouillon:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le brouillon');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA94D" />
          <Text style={styles.loadingText}>Chargement du livre...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Nouveau chapitre</Text>
          <Text style={styles.headerSubtitle}>{book.title}</Text>
        </View>
        <TouchableOpacity onPress={saveDraft} style={styles.draftButton} disabled={saving}>
          <Ionicons name="cloud-outline" size={20} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setShowTemplates(!showTemplates)} 
          style={styles.templateButton}
        >
          <Ionicons name="library-outline" size={20} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Template selection */}
      {showTemplates && (
        <View style={styles.templatesContainer}>
          <Text style={styles.templatesTitle}>Choisir un modèle</Text>
          {loadingTemplates ? (
            <View style={styles.templatesLoading}>
              <ActivityIndicator color="#FFA94D" />
              <Text style={styles.templatesLoadingText}>Chargement des modèles...</Text>
            </View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.templateCard,
                    selectedTemplate?.id === item.id && styles.templateCardSelected
                  ]}
                  onPress={() => {
                    setSelectedTemplate(item);
                    if (item.starter) {
                      setChapterContent(item.starter);
                    }
                    setShowTemplates(false);
                  }}
                >
                  <View style={styles.templateCover}>
                    {item.backgroundImage ? (
                      <Image
                        source={{ uri: item.backgroundImage }}
                        style={styles.templateImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.templateEmoji}>📝</Text>
                    )}
                  </View>
                  <Text style={styles.templateTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.templateSubtitle} numberOfLines={2}>{item.subtitle || ''}</Text>
                </TouchableOpacity>
              )}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )}
          <TouchableOpacity
            style={styles.skipTemplateButton}
            onPress={() => setShowTemplates(false)}
          >
            <Text style={styles.skipTemplateText}>Écrire sans modèle</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showTemplates && (
        <>
      {/* Informations du livre */}
      <View style={styles.bookInfo}>
        <Image
          source={{
            uri: book.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&background=23232a&color=FFA94D&size=128`
          }}
          style={styles.bookCover}
        />
        <View style={styles.bookDetails}>
          <Text style={styles.bookTitle}>{book.title}</Text>
          <Text style={styles.bookStats}>
            {book.chapters || 0} chapitres • Chapitre {chapterNumber}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Titre du chapitre */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Titre du chapitre</Text>
          {selectedTemplate && (
            <View style={styles.selectedTemplateInfo}>
              <Text style={styles.selectedTemplateLabel}>Modèle: {selectedTemplate.title}</Text>
              <TouchableOpacity
                onPress={() => setSelectedTemplate(null)}
                style={styles.removeTemplateButton}
              >
                <Ionicons name="close-circle" size={16} color="#FFA94D" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.titleInput}
            placeholder="Saisissez le titre du chapitre..."
            placeholderTextColor="#666"
            value={chapterTitle}
            onChangeText={setChapterTitle}
            maxLength={100}
          />
        </View>

        {/* Contenu du chapitre */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Contenu</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Écrivez votre chapitre ici..."
            placeholderTextColor="#666"
            value={chapterContent}
            onChangeText={setChapterContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="text-outline" size={16} color="#888" />
            <Text style={styles.statText}>
              {chapterContent.length} caractères
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={16} color="#888" />
            <Text style={styles.statText}>
              {chapterContent.split(/\s+/).filter(word => word.length > 0).length} mots
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Boutons d'action */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={() => {
            if (chapterTitle.trim() || chapterContent.trim()) {
              Alert.alert(
                'Annuler les modifications',
                'Êtes-vous sûr de vouloir annuler ? Toutes les modifications seront perdues.',
                [
                  { text: 'Non', style: 'cancel' },
                  { text: 'Oui', onPress: () => router.back() }
                ]
              );
            } else {
              router.back();
            }
          }}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={saveChapter}
          disabled={saving || !chapterTitle.trim() || !chapterContent.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#181818" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#181818" />
              <Text style={styles.saveButtonText}>Publier le chapitre</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 15,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  headerTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  draftButton: {
    padding: 8,
  },
  templateButton: {
    padding: 8,
    marginLeft: 8,
  },
  templatesContainer: {
    flex: 1,
    backgroundColor: '#181818',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  templatesTitle: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  templatesLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  templatesLoadingText: {
    color: '#888',
    marginTop: 10,
  },
  templateCard: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  templateCardSelected: {
    backgroundColor: '#FFA94D',
  },
  templateCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  templateImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  templateEmoji: {
    fontSize: 30,
    color: '#FFA94D',
  },
  templateTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  templateSubtitle: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  skipTemplateButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFA94D',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  skipTemplateText: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedTemplateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFA94D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  selectedTemplateLabel: {
    color: '#181818',
    fontSize: 14,
    fontWeight: '600',
  },
  removeTemplateButton: {
    padding: 2,
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#23232a',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  bookCover: {
    width: 50,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  bookDetails: {
    flex: 1,
    marginLeft: 15,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookStats: {
    color: '#888',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginTop: 20,
  },
  inputLabel: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  titleInput: {
    backgroundColor: '#23232a',
    color: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  contentInput: {
    backgroundColor: '#23232a',
    color: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#23232a',
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#888',
    marginLeft: 6,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#FFA94D',
  },
  saveButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChapterEditor;