import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';

const WattpadEditor: React.FC = () => {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  const autoSaveTimer = useRef<any>(null);
  const { theme } = useTheme();

  // États principaux
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chapters, setChapters] = useState<any[]>([]);
  const [totalChapters, setTotalChapters] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // États IA
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Charger le projet
  useEffect(() => {
    if (projectId && projectId !== 'new') {
      loadProject();
    }
  }, [projectId]);

  // Auto-save avec délai plus long pour éviter freeze
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (chapterTitle || content) {
        saveProject();
      }
    }, 5000); // Augmenté à 5 secondes

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [chapterTitle, content]);

  // Calculer le nombre de mots avec useMemo pour optimisation
  const calculatedWordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, [content]);

  useEffect(() => {
    setWordCount(calculatedWordCount);
  }, [calculatedWordCount]);

  const loadProject = useCallback(async () => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;

      const projectRef = doc(db, 'users', auth.currentUser.uid, 'books', projectId as string);
      const projectDoc = await getDoc(projectRef);

      if (projectDoc.exists()) {
        const data = projectDoc.data();
        
        const loadedChapters = data.chapters || [{ 
          number: 1, 
          title: '', 
          content: '',
          wordCount: 0 
        }];
        
        setChapters(loadedChapters);
        setTotalChapters(loadedChapters.length);
        
        // Charger le chapitre actuel
        const currentChapterData = loadedChapters.find((ch: any) => ch.number === currentChapter) || loadedChapters[0];
        setChapterTitle(currentChapterData.title || '');
        setContent(currentChapterData.content || '');
        setCurrentChapter(currentChapterData.number || 1);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  }, [projectId, currentChapter]);

  const saveProject = useCallback(async () => {
    try {
      setIsSaving(true);
      const auth = getAuth();
      if (!auth.currentUser) return;

      // Mettre à jour le chapitre actuel dans la liste
      const updatedChapters = chapters.map(ch => 
        ch.number === currentChapter 
          ? { ...ch, title: chapterTitle, content, wordCount }
          : ch
      );
      
      // Si le chapitre n'existe pas encore, l'ajouter
      if (!updatedChapters.find(ch => ch.number === currentChapter)) {
        updatedChapters.push({
          number: currentChapter,
          title: chapterTitle,
          content,
          wordCount
        });
      }

      const projectData = {
        chapters: updatedChapters,
        totalChapters: updatedChapters.length,
        updatedAt: serverTimestamp(),
      };

      if (projectId && projectId !== 'new') {
        const projectRef = doc(db, 'users', auth.currentUser.uid, 'books', projectId as string);
        await setDoc(projectRef, projectData, { merge: true });
      } else {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'books'), {
          ...projectData,
          createdAt: serverTimestamp(),
        });
      }

      setChapters(updatedChapters);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  }, [chapters, currentChapter, chapterTitle, content, wordCount, projectId]);

  const handlePublish = async () => {
    if (chapters.length === 0 || !chapters.some(ch => ch.content && ch.content.trim())) {
      Alert.alert('Erreur', 'Veuillez écrire au moins un chapitre');
      return;
    }

    // Charger les infos du livre pour vérification
    const auth = getAuth();
    if (!auth.currentUser) return;

    const projectRef = doc(db, 'users', auth.currentUser.uid, 'books', projectId as string);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      Alert.alert('Erreur', 'Livre introuvable');
      return;
    }

    const bookData = projectDoc.data();
    const bookTitle = bookData.bookTitle || '';
    const bookDescription = bookData.bookDescription || '';
    const coverImage = bookData.coverImage || null;
    const hashtags = bookData.hashtags || [];

    if (!bookTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter un titre à votre livre');
      return;
    }

    if (!coverImage) {
      Alert.alert('Erreur', 'Veuillez ajouter une image de couverture');
      return;
    }

    Alert.alert(
      'Publier le livre',
      'Voulez-vous publier votre livre ? Il sera visible par tous les utilisateurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Publier', 
          onPress: async () => {
            try {
              setIsPublishing(true);

              // Sauvegarder d'abord
              await saveProject();

              // Publier dans la collection publique des livres
              const publishData = {
                bookTitle,
                bookDescription,
                coverImage,
                hashtags,
                chapters: chapters.filter(ch => ch.content && ch.content.trim()),
                totalChapters: chapters.length,
                authorId: auth.currentUser.uid,
                authorName: auth.currentUser.displayName || 'Auteur anonyme',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'published',
                views: 0,
                likes: 0,
                comments: 0,
              };

              if (projectId && projectId !== 'new') {
                // Mettre à jour dans la collection privée
                const privateRef = doc(db, 'users', auth.currentUser.uid, 'books', projectId as string);
                await setDoc(privateRef, { status: 'published', publishedAt: serverTimestamp() }, { merge: true });

                // Publier dans la collection publique
                const publicRef = doc(db, 'books', projectId as string);
                await setDoc(publicRef, publishData);
              } else {
                // Créer un nouveau livre publié
                const newBookRef = await addDoc(collection(db, 'books'), publishData);
                
                // Sauvegarder aussi dans la collection privée
                const privateRef = doc(db, 'users', auth.currentUser.uid, 'books', newBookRef.id);
                await setDoc(privateRef, {
                  ...publishData,
                  createdAt: serverTimestamp(),
                });
              }

              Alert.alert(
                'Succès ! 🎉',
                'Votre livre a été publié avec succès !',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]
              );
            } catch (error) {
              console.error('Erreur publication:', error);
              Alert.alert('Erreur', 'Impossible de publier le livre');
            } finally {
              setIsPublishing(false);
            }
          }
        }
      ]
    );
  };

  const switchChapter = async (chapterNumber: number) => {
    // Sauvegarder le chapitre actuel avant de changer
    await saveProject();
    
    // Charger le nouveau chapitre
    const chapter = chapters.find(ch => ch.number === chapterNumber);
    if (chapter) {
      setChapterTitle(chapter.title || '');
      setContent(chapter.content || '');
      setCurrentChapter(chapterNumber);
    } else {
      // Nouveau chapitre vide
      setChapterTitle('');
      setContent('');
      setCurrentChapter(chapterNumber);
    }
    setShowChapterMenu(false);
  };

  const createNewChapter = () => {
    setShowNewChapterModal(true);
  };

  const confirmNewChapter = async () => {
    // Vérifier que tous les chapitres précédents ont du contenu
    const emptyChapters = chapters.filter(ch => !ch.content || !ch.content.trim());
    
    if (emptyChapters.length > 0 || (!content.trim() && currentChapter === totalChapters)) {
      setShowNewChapterModal(false);
      Alert.alert(
        'Chapitre vide',
        `Veuillez écrire le contenu du chapitre ${emptyChapters.length > 0 ? emptyChapters[0].number : currentChapter} avant de créer un nouveau chapitre.`
      );
      return;
    }

    const newChapterNumber = totalChapters + 1;
    setTotalChapters(newChapterNumber);
    await switchChapter(newChapterNumber);
    setShowNewChapterModal(false);
    Alert.alert('Nouveau chapitre', `Chapitre ${newChapterNumber} créé !`);
  };

  const deleteChapter = async (chapterNumber: number) => {
    if (chapters.length <= 1) {
      Alert.alert('Erreur', 'Vous devez avoir au moins un chapitre');
      return;
    }

    Alert.alert(
      'Supprimer le chapitre',
      `Voulez-vous vraiment supprimer le chapitre ${chapterNumber} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const updatedChapters = chapters.filter(ch => ch.number !== chapterNumber);
            setChapters(updatedChapters);
            setTotalChapters(updatedChapters.length);
            
            if (currentChapter === chapterNumber) {
              await switchChapter(1);
            }
            
            await saveProject();
          }
        }
      ]
    );
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une instruction pour l\'IA');
      return;
    }

    setIsGenerating(true);
    try {
      // Simuler la génération IA (à remplacer par votre API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedText = `[Texte généré par IA basé sur: "${aiPrompt}"]\n\n` +
        `Il était une fois, dans un monde lointain...\n\n` +
        `[Continuez votre histoire ici]`;
      
      setContent(content + '\n\n' + generatedText);
      setShowAIModal(false);
      setAiPrompt('');
      Alert.alert('Succès', 'Le texte a été généré et ajouté à votre histoire !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le texte');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handlers optimisés avec useCallback pour éviter re-renders
  const handleChapterTitleChange = useCallback((text: string) => {
    setChapterTitle(text);
  }, []);

  const handleContentChange = useCallback((text: string) => {
    setContent(text);
  }, []);

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      
      {/* Header Wattpad Dark */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.chapterSelector}
          onPress={() => setShowChapterMenu(!showChapterMenu)}
        >
          <Text style={styles.chapterText}>Chapitre {currentChapter}</Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.previewButton}
          onPress={() => setShowPreview(true)}
        >
          <Ionicons name="eye-outline" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.publishButton, isPublishing && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.publishText}>Publier</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Zone de contenu */}
      <ScrollView 
        style={styles.editorContainer}
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Titre du Chapitre */}
        <TextInput
          style={styles.chapterTitleInput}
          placeholder="Titre du Chapitre"
          placeholderTextColor={theme.colors.textSecondary}
          value={chapterTitle}
          onChangeText={handleChapterTitleChange}
          textAlign="center"
          maxLength={100}
        />

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* Zone d'écriture */}
        <TextInput
          style={styles.contentInput}
          placeholder="Commence à écrire ton histoire"
          placeholderTextColor={theme.colors.textSecondary}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />

        {/* Bouton Ajouter un sondage */}
        <TouchableOpacity style={styles.pollButton}>
          <MaterialCommunityIcons name="poll" size={22} color={theme.colors.accent} />
          <Text style={styles.pollButtonText}>Ajouter un sondage</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barre d'outils flottante */}
      <View style={styles.floatingToolbar}>
        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={() => setShowAIModal(true)}
        >
          <MaterialCommunityIcons name="robot-outline" size={26} color="#FFF" />
          <Text style={styles.toolbarButtonText}>Assistant IA</Text>
        </TouchableOpacity>
        
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{wordCount} mots</Text>
          {isSaving && <Text style={styles.savingText}>Sauvegarde...</Text>}
        </View>
      </View>

      {/* Modal IA */}
      <Modal
        visible={showAIModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aiModal}>
            <View style={styles.aiModalHeader}>
              <Text style={styles.aiModalTitle}>Assistant IA ✨</Text>
              <TouchableOpacity onPress={() => setShowAIModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.aiModalSubtitle}>
              Demandez à l'IA de continuer votre histoire ou d'ajouter des éléments
            </Text>

            <TextInput
              style={styles.aiInput}
              placeholder="Ex: Écris une scène d'action dans une forêt..."
              placeholderTextColor={theme.colors.textSecondary}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.aiGenerateButton, isGenerating && styles.aiGenerateButtonDisabled]}
              onPress={generateWithAI}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="auto-fix" size={22} color="#FFF" />
                  <Text style={styles.aiGenerateButtonText}>Générer avec l'IA</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.aiSuggestions}>
              <Text style={styles.aiSuggestionsTitle}>Suggestions rapides:</Text>
              <TouchableOpacity 
                style={styles.aiSuggestionChip}
                onPress={() => setAiPrompt('Continue l\'histoire')}
              >
                <Text style={styles.aiSuggestionText}>Continue l'histoire</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.aiSuggestionChip}
                onPress={() => setAiPrompt('Ajoute un dialogue entre les personnages')}
              >
                <Text style={styles.aiSuggestionText}>Ajouter un dialogue</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.aiSuggestionChip}
                onPress={() => setAiPrompt('Décris une scène d\'action')}
              >
                <Text style={styles.aiSuggestionText}>Scène d'action</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Menu Chapitres */}
      <Modal
        visible={showChapterMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChapterMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChapterMenu(false)}
        >
          <View style={styles.chapterModal}>
            <View style={styles.chapterModalHeader}>
              <Text style={styles.chapterModalTitle}>Mes Chapitres 📚</Text>
              <TouchableOpacity onPress={() => setShowChapterMenu(false)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chaptersList}>
              {Array.from({ length: totalChapters }, (_, i) => i + 1).map((num) => {
                const chapter = chapters.find(ch => ch.number === num);
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.chapterItem,
                      currentChapter === num && styles.chapterItemActive
                    ]}
                    onPress={() => switchChapter(num)}
                    onLongPress={() => deleteChapter(num)}
                  >
                    <View style={styles.chapterItemLeft}>
                      <Text style={[
                        styles.chapterItemNumber,
                        currentChapter === num && styles.chapterItemNumberActive
                      ]}>
                        {num}
                      </Text>
                      <View>
                        <Text style={[
                          styles.chapterItemTitle,
                          currentChapter === num && styles.chapterItemTitleActive
                        ]}>
                          {chapter?.title || `Chapitre ${num}`}
                        </Text>
                        <Text style={styles.chapterItemMeta}>
                          {chapter?.wordCount || 0} mots
                        </Text>
                      </View>
                    </View>
                    {currentChapter === num && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.newChapterButton}
              onPress={createNewChapter}
            >
              <Ionicons name="add-circle" size={28} color={theme.colors.primary} />
              <Text style={styles.newChapterButtonText}>Créer un nouveau chapitre</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Confirmation Nouveau Chapitre */}
      <Modal
        visible={showNewChapterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewChapterModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModal}>
            <MaterialCommunityIcons name="book-plus" size={56} color={theme.colors.primary} style={{ marginBottom: 20 }} />
            <Text style={styles.confirmModalTitle}>Nouveau Chapitre</Text>
            <Text style={styles.confirmModalText}>
              Créer le chapitre {totalChapters + 1} ?
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalButtonCancel}
                onPress={() => setShowNewChapterModal(false)}
              >
                <Text style={styles.confirmModalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalButtonConfirm}
                onPress={confirmNewChapter}
              >
                <Text style={styles.confirmModalButtonConfirmText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Aperçu */}
      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModal}>
            {/* Header Aperçu */}
            <View style={styles.previewHeader}>
              <Text style={styles.previewHeaderTitle}>Aperçu du Chapitre</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Ionicons name="close-circle" size={32} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Contenu Aperçu */}
            <ScrollView 
              style={styles.previewContent}
              contentContainerStyle={styles.previewScrollContent}
            >
              {chapterTitle ? (
                <Text style={styles.previewChapterTitle}>{chapterTitle}</Text>
              ) : (
                <Text style={styles.previewChapterTitle}>Chapitre {currentChapter}</Text>
              )}
              
              <View style={styles.previewDivider} />
              
              {content.trim() ? (
                <Text style={styles.previewText}>{content}</Text>
              ) : (
                <Text style={styles.previewPlaceholder}>
                  Aucun contenu pour le moment.\nCommencez à écrire pour voir l'aperçu.
                </Text>
              )}

              <View style={styles.previewFooter}>
                <Text style={styles.previewFooterText}>{wordCount} mots</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 70,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.colors.border}40`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: `${theme.colors.primary}08`,
  },
  chapterSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.background,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 16,
  },
  chapterText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  previewButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: `${theme.colors.primary}08`,
    marginRight: 12,
  },
  publishButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 90,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  editorContent: {
    padding: 32,
    paddingBottom: 140,
  },
  chapterTitleInput: {
    fontSize: 26,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 32,
    paddingVertical: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    backgroundColor: `${theme.colors.surface}60`,
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 40,
    marginHorizontal: 40,
    borderRadius: 2,
    opacity: 0.5,
  },
  contentInput: {
    fontSize: 17,
    color: theme.colors.text,
    lineHeight: 30,
    minHeight: 500,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  pollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: `${theme.colors.accent}12`,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: `${theme.colors.accent}30`,
  },
  pollButtonText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: `${theme.colors.border}40`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  toolbarButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statsContainer: {
    alignItems: 'flex-end',
    backgroundColor: `${theme.colors.background}80`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  savingText: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  aiModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiModalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  aiModalSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  aiInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 20,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiGenerateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  aiGenerateButtonDisabled: {
    opacity: 0.6,
  },
  aiGenerateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  aiSuggestions: {
    gap: 12,
  },
  aiSuggestionsTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  aiSuggestionChip: {
    backgroundColor: `${theme.colors.accent}15`,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: `${theme.colors.accent}40`,
  },
  aiSuggestionText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  chapterModal: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 0,
    maxHeight: '70%',
    marginTop: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  chapterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.colors.border}30`,
  },
  chapterModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  chaptersList: {
    maxHeight: 400,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.colors.border}15`,
  },
  chapterItemActive: {
    backgroundColor: `${theme.colors.primary}10`,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  chapterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  chapterItemNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    width: 35,
  },
  chapterItemNumberActive: {
    color: theme.colors.primary,
  },
  chapterItemTitle: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 6,
  },
  chapterItemTitleActive: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  chapterItemMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  newChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 22,
    borderTopWidth: 2,
    borderTopColor: `${theme.colors.primary}30`,
    backgroundColor: `${theme.colors.primary}08`,
  },
  newChapterButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  confirmModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  confirmModalText: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalButtonCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: `${theme.colors.primary}30`,
  },
  confirmModalButtonCancelText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalButtonConfirm: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmModalButtonConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModal: {
    width: '92%',
    height: '88%',
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: `${theme.colors.border}30`,
    backgroundColor: theme.colors.surface,
  },
  previewHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  previewContent: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 32,
    paddingBottom: 60,
  },
  previewChapterTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  previewDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 32,
    marginHorizontal: 20,
    opacity: 0.4,
  },
  previewText: {
    fontSize: 18,
    color: theme.colors.text,
    lineHeight: 32,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'justify',
  },
  previewPlaceholder: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
  },
  previewFooter: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: `${theme.colors.border}30`,
    alignItems: 'center',
  },
  previewFooterText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});

export default WattpadEditor;
