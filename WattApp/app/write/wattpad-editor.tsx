import React, { useState, useEffect, useRef } from 'react';
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

const WattpadEditor: React.FC = () => {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  const autoSaveTimer = useRef<any>(null);

  // États principaux
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  
  // États IA
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);

  // Charger le projet
  useEffect(() => {
    if (projectId && projectId !== 'new') {
      loadProject();
    }
  }, [projectId]);

  // Auto-save
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      if (chapterTitle || content) {
        saveProject();
      }
    }, 2000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [chapterTitle, content]);

  // Calculer le nombre de mots
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
  }, [content]);

  const loadProject = async () => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) return;

      const projectRef = doc(db, 'users', auth.currentUser.uid, 'books', projectId as string);
      const projectDoc = await getDoc(projectRef);

      if (projectDoc.exists()) {
        const data = projectDoc.data();
        setChapterTitle(data.chapterTitle || '');
        setContent(data.content || '');
        setCurrentChapter(data.currentChapter || 1);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  };

  const saveProject = async () => {
    try {
      setIsSaving(true);
      const auth = getAuth();
      if (!auth.currentUser) return;

      const projectData = {
        chapterTitle: chapterTitle || 'Titre du Chapitre',
        content,
        wordCount,
        currentChapter,
        updatedAt: serverTimestamp(),
        userId: auth.currentUser.uid,
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

      setLastSaved(new Date());
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    Alert.alert(
      'Publier',
      'Voulez-vous publier ce chapitre ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Publier', 
          onPress: async () => {
            await saveProject();
            Alert.alert('Succès', 'Votre chapitre a été publié !');
          }
        }
      ]
    );
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      Alert.alert('Image sélectionnée', 'Fonctionnalité à venir');
    }
  };

  const handleVideoPicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
    });

    if (!result.canceled) {
      Alert.alert('Vidéo sélectionnée', 'Fonctionnalité à venir');
    }
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header Wattpad Dark */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.chapterSelector}
          onPress={() => setShowChapterMenu(!showChapterMenu)}
        >
          <Text style={styles.chapterText}>Chapitre {currentChapter}</Text>
          <Ionicons name="chevron-down" size={16} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.publishButton}
          onPress={handlePublish}
        >
          <Text style={styles.publishText}>Publier</Text>
        </TouchableOpacity>
      </View>

      {/* Zone de contenu */}
      <ScrollView 
        style={styles.editorContainer}
        contentContainerStyle={styles.editorContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Boutons Image et Vidéo */}
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={handleImagePicker}
          >
            <Ionicons name="image-outline" size={32} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mediaButton}
            onPress={handleVideoPicker}
          >
            <Ionicons name="videocam-outline" size={32} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Titre du Chapitre */}
        <TextInput
          style={styles.chapterTitleInput}
          placeholder="Titre du Chapitre"
          placeholderTextColor="#4a4a4a"
          value={chapterTitle}
          onChangeText={setChapterTitle}
          textAlign="center"
        />

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* Zone d'écriture */}
        <TextInput
          style={styles.contentInput}
          placeholder="Commence à écrire ton histoire"
          placeholderTextColor="#4a4a4a"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {/* Bouton Ajouter un sondage */}
        <TouchableOpacity style={styles.pollButton}>
          <MaterialCommunityIcons name="poll" size={20} color="#666" />
          <Text style={styles.pollButtonText}>Ajouter un sondage</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barre d'outils flottante */}
      <View style={styles.floatingToolbar}>
        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={() => setShowAIModal(true)}
        >
          <MaterialCommunityIcons name="robot" size={24} color="#FF6800" />
          <Text style={styles.toolbarButtonText}>IA</Text>
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
              <Text style={styles.aiModalTitle}>Assistant IA</Text>
              <TouchableOpacity onPress={() => setShowAIModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.aiModalSubtitle}>
              Demandez à l'IA de vous aider à écrire
            </Text>

            <TextInput
              style={styles.aiInput}
              placeholder="Ex: Écris une scène d'action dans une forêt..."
              placeholderTextColor="#666"
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
                  <MaterialCommunityIcons name="robot" size={20} color="#FFF" />
                  <Text style={styles.aiGenerateButtonText}>Générer</Text>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    height: 56,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  chapterSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chapterText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  publishText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  editorContent: {
    padding: 20,
    paddingBottom: 120,
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  mediaButton: {
    width: 160,
    height: 80,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterTitleInput: {
    fontSize: 18,
    color: '#4a4a4a',
    textAlign: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  separator: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginBottom: 30,
  },
  contentInput: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
    minHeight: 400,
  },
  pollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#252525',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 20,
  },
  pollButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#252525',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6800',
  },
  toolbarButtonText: {
    color: '#FF6800',
    fontSize: 14,
    fontWeight: '700',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  savingText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  aiModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  aiModalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  aiInput: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  aiGenerateButton: {
    backgroundColor: '#FF6800',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
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
    color: '#888',
    marginBottom: 8,
  },
  aiSuggestionChip: {
    backgroundColor: '#252525',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#333',
  },
  aiSuggestionText: {
    color: '#FFF',
    fontSize: 14,
  },
});

export default WattpadEditor;
