import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdvancedWritingEditorProps {
  bookId: string;
  chapterId?: string;
  initialContent?: string;
  onContentChange?: (content: string) => void;
  autoSave?: boolean;
  placeholder?: string;
}

interface WritingStats {
  words: number;
  characters: number;
  paragraphs: number;
  readingTime: number;
  sentences: number;
}

interface AutoSaveState {
  lastSaved: Date | null;
  saving: boolean;
  isDirty: boolean;
}

const AdvancedWritingEditor: React.FC<AdvancedWritingEditorProps> = ({
  bookId,
  chapterId,
  initialContent = '',
  onContentChange,
  autoSave = true,
  placeholder = 'Commencez à écrire votre histoire...',
}) => {
  // États principaux
  const [content, setContent] = useState(initialContent);
  const [stats, setStats] = useState<WritingStats>({
    words: 0,
    characters: 0,
    paragraphs: 0,
    readingTime: 0,
    sentences: 0,
  });
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    lastSaved: null,
    saving: false,
    isDirty: false,
  });

  // États de l'interface
  const [showStats, setShowStats] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [writingMode, setWritingMode] = useState<'normal' | 'zen' | 'typewriter'>('normal');
  const [fontSize, setFontSize] = useState(16);

  // Références
  const textInputRef = useRef<TextInput>(null);
  const autoSaveTimeoutRef = useRef<any>(null);
  const statsAnimationRef = useRef(new Animated.Value(1)).current;
  const toolbarAnimationRef = useRef(new Animated.Value(1)).current;

  // Configuration de l'auto-sauvegarde
  const AUTO_SAVE_DELAY = 2000; // 2 secondes

  // Calcul des statistiques en temps réel
  const calculateStats = useCallback((text: string): WritingStats => {
    const characters = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const readingTime = Math.ceil(words / 200); // Moyenne 200 mots/minute

    return {
      characters,
      words,
      paragraphs,
      sentences,
      readingTime,
    };
  }, []);

  // Auto-sauvegarde intelligente
  const performAutoSave = useCallback(async (textContent: string) => {
    if (!autoSave || !chapterId) return;

    try {
      setAutoSaveState((prev: any) => ({ ...prev, saving: true }));

      // Simuler la sauvegarde (à connecter avec Firebase plus tard)
      await new Promise(resolve => setTimeout(resolve, 500));

      setAutoSaveState((prev: any) => ({
        ...prev,
        saving: false,
        isDirty: false,
        lastSaved: new Date(),
      }));
    } catch (error) {
      console.error('Erreur auto-sauvegarde:', error);
      setAutoSaveState((prev: any) => ({ ...prev, saving: false }));
    }
  }, [autoSave, chapterId]);

  // Gestion du changement de contenu
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setStats(calculateStats(newContent));
    setAutoSaveState((prev: any) => ({ ...prev, isDirty: true }));

    // Déclencher l'auto-sauvegarde avec délai
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(newContent);
    }, AUTO_SAVE_DELAY);

    // Callback externe
    onContentChange?.(newContent);
  }, [calculateStats, performAutoSave, onContentChange]);

  // Gestion des modes d'écriture
  const toggleWritingMode = useCallback(() => {
    const modes: ('normal' | 'zen' | 'typewriter')[] = ['normal', 'zen', 'typewriter'];
    const currentIndex = modes.indexOf(writingMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setWritingMode(modes[nextIndex]);

    if (modes[nextIndex] === 'zen') {
      setFocusMode(true);
      setShowToolbar(false);
      setShowStats(false);
    } else {
      setFocusMode(false);
      setShowToolbar(true);
      setShowStats(true);
    }
  }, [writingMode]);

  // Animation des éléments UI
  const animateUI = useCallback((visible: boolean) => {
    Animated.parallel([
      Animated.timing(statsAnimationRef, {
        toValue: visible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toolbarAnimationRef, {
        toValue: visible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Effets
  useEffect(() => {
    setContent(initialContent);
    setStats(calculateStats(initialContent));
  }, [initialContent, calculateStats]);

  useEffect(() => {
    animateUI(showStats && showToolbar);
  }, [showStats, showToolbar, animateUI]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Rendu de la barre d'outils
  const renderToolbar = () => (
    <Animated.View 
      style={[
        styles.toolbar,
        {
          opacity: toolbarAnimationRef,
          transform: [{
            translateY: toolbarAnimationRef.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0],
            }),
          }],
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={toggleWritingMode}
        >
          <Ionicons 
            name={writingMode === 'zen' ? 'eye-off' : writingMode === 'typewriter' ? 'create' : 'eye'} 
            size={18} 
            color="#FFA94D" 
          />
          <Text style={styles.toolbarButtonText}>
            {writingMode === 'zen' ? 'Zen' : writingMode === 'typewriter' ? 'Machine' : 'Normal'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={() => setFontSize((prev: any) => Math.min(24, prev + 1))}
        >
          <Ionicons name="add" size={18} color="#FFA94D" />
          <Text style={styles.toolbarButtonText}>A+</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.toolbarButton}
          onPress={() => setFontSize((prev: any) => Math.max(12, prev - 1))}
        >
          <Ionicons name="remove" size={18} color="#FFA94D" />
          <Text style={styles.toolbarButtonText}>A-</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // Rendu des statistiques
  const renderStats = () => (
    <Animated.View 
      style={[
        styles.statsContainer,
        {
          opacity: statsAnimationRef,
          transform: [{
            translateY: statsAnimationRef.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        },
      ]}
    >
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="text-outline" size={16} color="#FFA94D" />
          <Text style={styles.statText}>{stats.words} mots</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="document-text-outline" size={16} color="#888" />
          <Text style={styles.statText}>{stats.characters} caractères</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#888" />
          <Text style={styles.statText}>{stats.readingTime} min</Text>
        </View>

        {autoSaveState.saving && (
          <View style={styles.statItem}>
            <ActivityIndicator size="small" color="#FFA94D" />
            <Text style={styles.statText}>Sauvegarde...</Text>
          </View>
        )}

        {autoSaveState.lastSaved && !autoSaveState.saving && (
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.statText}>
              Sauvé {autoSaveState.lastSaved.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {showToolbar && renderToolbar()}

      <View style={[styles.editorContainer, focusMode && styles.focusModeContainer]}>
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            {
              fontSize,
              lineHeight: fontSize * 1.6,
            },
            writingMode === 'typewriter' && styles.typewriterMode,
          ]}
          value={content}
          onChangeText={handleContentChange}
          placeholder={placeholder}
          placeholderTextColor="#666"
          multiline
          textAlignVertical="top"
          autoCapitalize="sentences"
          autoCorrect
          spellCheck
          blurOnSubmit={false}
          scrollEnabled
        />
      </View>

      {showStats && renderStats()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  toolbar: {
    backgroundColor: '#23232a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#181818',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  toolbarButtonText: {
    color: '#FFA94D',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  focusModeContainer: {
    padding: 24,
    backgroundColor: '#0a0a0a',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    backgroundColor: 'transparent',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlign: 'left',
  },
  typewriterMode: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statsContainer: {
    backgroundColor: '#23232a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default AdvancedWritingEditor;