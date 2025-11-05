import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Import des nouveaux composants
import AdvancedWritingEditor from '../../components/AdvancedWritingEditor';
import SmartTemplateManager from '../../components/SmartTemplateManager';
import { VersioningService } from '../../../services/VersioningService';
import { WritingAnalyticsService } from '../../../services/WritingAnalyticsService';

const { width, height } = Dimensions.get('window');

interface Book {
  id: string;
  title: string;
  author?: string;
  authorUid?: string;
  coverImage?: string;
  chapters?: number;
  chaptersList?: any[];
  genre?: string;
  status?: string;
}

interface Chapter {
  id?: string;
  title: string;
  content: string;
  bookId: string;
  chapterNumber: number;
  createdAt?: any;
  updatedAt?: any;
  wordCount?: number;
  characterCount?: number;
}

interface WritingStats {
  words: number;
  characters: number;
  paragraphs: number;
  readingTime: number;
  sentences: number;
}

const EnhancedChapterEditor: React.FC = () => {
  const router = useRouter();
  const { bookId } = useLocalSearchParams();
  
  // États principaux
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  
  // États de l'interface avancée
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWritingMode, setShowWritingMode] = useState(false);
  
  // États des statistiques
  const [stats, setStats] = useState<WritingStats>({
    words: 0,
    characters: 0,
    paragraphs: 0,
    readingTime: 0,
    sentences: 0,
  });
  const [writingSession, setWritingSession] = useState<{
    startTime: Date;
    initialWordCount: number;
    isActive: boolean;
  } | null>(null);

  // États du système de versions
  const [versions, setVersions] = useState<any[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // États d'analyse
  const [analysis, setAnalysis] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Références
  const lastSaveRef = useRef<string>('');
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les données initiales
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string') {
      Alert.alert('Erreur', 'ID du livre invalide');
      router.back();
      return;
    }
    
    loadBookAndChapter();
  }, [bookId]);

  // Démarrer une session d'écriture
  useEffect(() => {
    if (!loading && book && !writingSession) {
      startWritingSession();
    }
  }, [loading, book]);

  // Nettoyer les timers
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      if (writingSession) {
        endWritingSession();
      }
    };
  }, []);

  const loadBookAndChapter = async () => {
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
      
      if (bookData.authorUid !== user.uid) {
        Alert.alert('Erreur', 'Vous n\'êtes pas autorisé à modifier ce livre');
        router.back();
        return;
      }

      setBook(bookData);
      
      // Créer un nouveau chapitre
      const nextChapterNumber = (bookData.chapters || 0) + 1;
      const newChapter: Chapter = {
        title: `Chapitre ${nextChapterNumber}`,
        content: '',
        bookId: bookData.id,
        chapterNumber: nextChapterNumber,
      };
      
      setChapter(newChapter);
      setTitle(newChapter.title);
      setContent(newChapter.content);
      
      // Charger les versions existantes si c'est un chapitre existant
      await loadVersionHistory();
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger le livre');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async () => {
    try {
      if (chapter?.id) {
        const versionHistory = await VersioningService.getVersionHistory(
          book!.id,
          chapter.id,
          20
        );
        setVersions(versionHistory);
      }
    } catch (error) {
      console.warn('Impossible de charger l\'historique des versions:', error);
    }
  };

  const startWritingSession = () => {
    const session = {
      startTime: new Date(),
      initialWordCount: stats.words,
      isActive: true,
    };
    setWritingSession(session);
    
    // Timer pour mettre à jour les statistiques de session
    sessionTimerRef.current = setInterval(() => {
      updateSessionStats();
    }, 30000); // Toutes les 30 secondes
  };

  const endWritingSession = async () => {
    if (!writingSession || !book) return;
    
    try {
      const endTime = new Date();
      const wordsWritten = Math.max(0, stats.words - writingSession.initialWordCount);
      const charactersWritten = content.length - (lastSaveRef.current?.length || 0);
      
      if (wordsWritten > 0) {
        await WritingAnalyticsService.recordWritingSession(
          book.id,
          chapter?.id,
          writingSession.startTime,
          endTime,
          wordsWritten,
          charactersWritten
        );
      }
      
      setWritingSession(null);
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la session:', error);
    }
  };

  const updateSessionStats = () => {
    // Mettre à jour les statistiques en temps réel
    if (writingSession) {
      const currentTime = new Date();
      const timeSpent = (currentTime.getTime() - writingSession.startTime.getTime()) / (1000 * 60);
      const wordsWritten = Math.max(0, stats.words - writingSession.initialWordCount);
      const wpm = timeSpent > 0 ? wordsWritten / timeSpent : 0;
      
      // Vous pouvez utiliser ces données pour afficher des statistiques en temps réel
    }
  };

  const handleContentChange = async (newContent: string) => {
    setContent(newContent);
    
    // Calculer les nouvelles statistiques
    const newStats = calculateStats(newContent);
    setStats(newStats);
    
    // Auto-sauvegarde si activée et contenu significativement différent
    if (autoSaveEnabled && newContent !== lastSaveRef.current) {
      await performAutoSave(newContent);
    }
  };

  const calculateStats = (text: string): WritingStats => {
    const characters = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const readingTime = Math.ceil(words / 200); // 200 mots/minute

    return {
      characters,
      words,
      paragraphs,
      sentences,
      readingTime,
    };
  };

  const performAutoSave = async (newContent: string) => {
    try {
      if (chapter?.id) {
        // Créer une version automatique
        await VersioningService.createVersion(book!.id, newContent, {
          chapterId: chapter.id,
          title,
          changeType: 'auto',
          changeDescription: 'Sauvegarde automatique',
        });
        
        lastSaveRef.current = newContent;
      }
    } catch (error) {
      console.warn('Erreur lors de l\'auto-sauvegarde:', error);
    }
  };

  const saveChapter = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour le chapitre');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le contenu du chapitre');
      return;
    }

    setSaving(true);
    try {
      // Terminer la session d'écriture actuelle
      await endWritingSession();
      
      // Sauvegarder le chapitre
      // ... logique de sauvegarde existante ...
      
      // Créer une version manuelle
      if (chapter?.id) {
        await VersioningService.createVersion(book!.id, content, {
          chapterId: chapter.id,
          title,
          changeType: 'manual',
          changeDescription: 'Sauvegarde manuelle du chapitre',
        });
      }
      
      // Analyser le contenu pour des suggestions
      const contentAnalysis = WritingAnalyticsService.analyzeContent(content);
      setAnalysis(contentAnalysis);
      setSuggestions(contentAnalysis.suggestions);
      
      Alert.alert('Succès', 'Chapitre sauvegardé avec succès!');
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le chapitre');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (template: any, variables?: Record<string, any>) => {
    let templateContent = template.content || template.starter || '';
    
    // Remplacer les variables dans le contenu
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        templateContent = templateContent.replace(regex, value);
      });
    }
    
    setContent(templateContent);
    setShowTemplates(false);
    
    // Créer une version pour marquer l'utilisation du template
    if (chapter?.id) {
      VersioningService.createVersion(book!.id, templateContent, {
        chapterId: chapter.id,
        title,
        changeType: 'manual',
        changeDescription: `Utilisation du template: ${template.title}`,
        tags: ['template', template.category],
      }).catch(console.warn);
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      Alert.alert(
        'Restaurer cette version',
        'Êtes-vous sûr de vouloir restaurer cette version? Les modifications non sauvegardées seront perdues.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Restaurer',
            style: 'destructive',
            onPress: async () => {
              await VersioningService.restoreVersion(versionId);
              // Recharger le contenu
              await loadBookAndChapter();
              setShowVersions(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de restaurer cette version');
    }
  };

  const createMilestone = () => {
    Alert.prompt(
      'Créer un jalon',
      'Donnez un nom à ce jalon important:',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Créer',
          onPress: async (name) => {
            if (name && chapter?.id) {
              try {
                await VersioningService.createMilestone(
                  book!.id,
                  chapter.id,
                  name,
                  `Jalon créé pour le chapitre: ${title}`,
                  ['milestone', 'important']
                );
                Alert.alert('Succès', 'Jalon créé avec succès!');
                await loadVersionHistory();
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de créer le jalon');
              }
            }
          }
        }
      ],
      'plain-text',
      `Jalon - ${title}`
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFA94D" />
          <Text style={styles.loadingText}>Chargement de l'éditeur...</Text>
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
      
      {/* Header amélioré */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Éditeur Avancé</Text>
          <Text style={styles.headerSubtitle}>{book.title}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowTemplates(true)} 
            style={styles.headerButton}
          >
            <Ionicons name="library-outline" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowVersions(true)} 
            style={styles.headerButton}
          >
            <Ionicons name="git-branch-outline" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowAnalytics(true)} 
            style={styles.headerButton}
          >
            <Ionicons name="analytics-outline" size={20} color="#FFA94D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Éditeur avancé */}
      <AdvancedWritingEditor
        bookId={book.id}
        chapterId={chapter?.id}
        initialContent={content}
        onContentChange={handleContentChange}
        autoSave={autoSaveEnabled}
        placeholder="Commencez à écrire votre chapitre..."
      />

      {/* Barre d'actions rapides */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={createMilestone}
        >
          <Ionicons name="flag-outline" size={18} color="#FFA94D" />
          <Text style={styles.quickActionText}>Jalon</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setAutoSaveEnabled(!autoSaveEnabled)}
        >
          <Ionicons 
            name={autoSaveEnabled ? "cloud-done" : "cloud-offline"} 
            size={18} 
            color={autoSaveEnabled ? "#4CAF50" : "#888"} 
          />
          <Text style={[
            styles.quickActionText,
            { color: autoSaveEnabled ? "#4CAF50" : "#888" }
          ]}>
            Auto-save
          </Text>
        </TouchableOpacity>
        
        <View style={styles.statsQuick}>
          <Text style={styles.statQuickText}>{stats.words} mots</Text>
          <Text style={styles.statQuickText}>{stats.readingTime} min</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveChapter}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#181818" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#181818" />
              <Text style={styles.saveButtonText}>Publier</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Templates Intelligents */}
      <SmartTemplateManager
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
        genre={book.genre}
        currentContent={content}
      />

      {/* Modal Versions */}
      <Modal
        visible={showVersions}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historique des Versions</Text>
            <TouchableOpacity onPress={() => setShowVersions(false)}>
              <Ionicons name="close" size={24} color="#FFA94D" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.versionsList}>
            {versions.map((version, index) => (
              <TouchableOpacity
                key={version.id}
                style={styles.versionItem}
                onPress={() => restoreVersion(version.id)}
              >
                <View style={styles.versionInfo}>
                  <Text style={styles.versionTitle}>
                    Version {version.versionNumber}
                  </Text>
                  <Text style={styles.versionDescription}>
                    {version.changeDescription || 'Pas de description'}
                  </Text>
                  <Text style={styles.versionMeta}>
                    {version.createdAt?.toDate?.()?.toLocaleString() || 'Date inconnue'} • {version.wordCount} mots
                  </Text>
                </View>
                <View style={[
                  styles.versionBadge,
                  { backgroundColor: 
                    version.changeType === 'milestone' ? '#FFD700' :
                    version.changeType === 'manual' ? '#4CAF50' : '#888'
                  }
                ]}>
                  <Text style={styles.versionBadgeText}>
                    {version.changeType === 'milestone' ? 'JALON' :
                     version.changeType === 'manual' ? 'MANUEL' : 'AUTO'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Analytics */}
      <Modal
        visible={showAnalytics}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Analyse du Contenu</Text>
            <TouchableOpacity onPress={() => setShowAnalytics(false)}>
              <Ionicons name="close" size={24} color="#FFA94D" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.analyticsContent}>
            {analysis && (
              <>
                {/* Statistiques détaillées */}
                <View style={styles.analyticsSection}>
                  <Text style={styles.analyticsSectionTitle}>Statistiques</Text>
                  <View style={styles.analyticsGrid}>
                    <View style={styles.analyticsItem}>
                      <Text style={styles.analyticsValue}>{analysis.uniqueWords}</Text>
                      <Text style={styles.analyticsLabel}>Mots uniques</Text>
                    </View>
                    <View style={styles.analyticsItem}>
                      <Text style={styles.analyticsValue}>
                        {Object.keys(analysis.wordFrequency).length}
                      </Text>
                      <Text style={styles.analyticsLabel}>Vocabulaire</Text>
                    </View>
                  </View>
                </View>

                {/* Suggestions d'amélioration */}
                {suggestions.length > 0 && (
                  <View style={styles.analyticsSection}>
                    <Text style={styles.analyticsSectionTitle}>Suggestions</Text>
                    {suggestions.map((suggestion, index) => (
                      <View key={index} style={styles.suggestionItem}>
                        <View style={[
                          styles.suggestionSeverity,
                          { backgroundColor: 
                            suggestion.severity === 'high' ? '#F44336' :
                            suggestion.severity === 'medium' ? '#FF9800' : '#4CAF50'
                          }
                        ]} />
                        <View style={styles.suggestionContent}>
                          <Text style={styles.suggestionMessage}>
                            {suggestion.message}
                          </Text>
                          <Text style={styles.suggestionText}>
                            {suggestion.suggestion}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  headerButton: {
    padding: 8,
    marginHorizontal: 4,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#23232a',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 16,
  },
  quickActionText: {
    color: '#FFA94D',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  statsQuick: {
    flex: 1,
    alignItems: 'center',
  },
  statQuickText: {
    color: '#888',
    fontSize: 11,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  versionsList: {
    flex: 1,
    padding: 20,
  },
  versionItem: {
    flexDirection: 'row',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  versionInfo: {
    flex: 1,
  },
  versionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  versionDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  versionMeta: {
    color: '#888',
    fontSize: 12,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  versionBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  analyticsContent: {
    flex: 1,
    padding: 20,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  analyticsSectionTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  analyticsItem: {
    flex: 1,
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  analyticsValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  analyticsLabel: {
    color: '#888',
    fontSize: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    backgroundColor: '#23232a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionSeverity: {
    width: 4,
  },
  suggestionContent: {
    flex: 1,
    padding: 16,
  },
  suggestionMessage: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default EnhancedChapterEditor;