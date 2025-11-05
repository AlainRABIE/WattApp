import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Animated,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface EditorSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  theme: 'dark' | 'light' | 'sepia' | 'zen';
  autoSave: boolean;
  wordWrap: boolean;
  showStats: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
}

interface WritingStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  sentences: number;
  readingTime: number;
  pages: number;
  targetProgress: number;
}

interface AutoCompleteItem {
  text: string;
  type: 'word' | 'phrase' | 'template';
  usage: number;
}

interface FormatAction {
  id: string;
  name: string;
  icon: string;
  action: () => void;
  isActive?: boolean;
}

const ModernTextEditor: React.FC = () => {
  const router = useRouter();
  const { projectId, mode } = useLocalSearchParams();
  
  // Références
  const textInputRef = useRef<TextInput>(null);
  const autoSaveTimeoutRef = useRef<any>(null);
  const cursorPositionRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // États principaux
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Nouveau Chapitre');
  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: 'Georgia',
    theme: 'dark',
    autoSave: true,
    wordWrap: true,
    showStats: true,
    focusMode: false,
    typewriterMode: false,
  });
  
  // États de l'interface
  const [isLoading, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  
  // États des statistiques
  const [stats, setStats] = useState<WritingStats>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    sentences: 0,
    readingTime: 0,
    pages: 0,
    targetProgress: 0,
  });
  
  // États de la saisie
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autoCompleteItems, setAutoCompleteItems] = useState<AutoCompleteItem[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  
  // Animations
  const toolbarAnimation = useRef(new Animated.Value(1)).current;
  const statsAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  // Thèmes
  const themes = {
    dark: {
      background: '#181818',
      surface: '#23232a',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#FFA94D',
      border: '#333333',
    },
    light: {
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#333333',
      textSecondary: '#666666',
      accent: '#FF6B6B',
      border: '#e0e0e0',
    },
    sepia: {
      background: '#f4f1e8',
      surface: '#ede6d3',
      text: '#5a4a3a',
      textSecondary: '#8a7a6a',
      accent: '#8B4513',
      border: '#d4c4a8',
    },
    zen: {
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#e0e0e0',
      textSecondary: '#606060',
      accent: '#4CAF50',
      border: '#2a2a2a',
    },
  };

  const currentTheme = themes[settings.theme];

  // Palette de couleurs pour le texte
  const colorPalette = [
    '#FF6B6B', // Rouge
    '#4ECDC4', // Turquoise
    '#45B7D1', // Bleu
    '#96CEB4', // Vert
    '#FFEAA7', // Jaune
    '#DDA0DD', // Violet
    '#FFB347', // Orange
    '#FF69B4', // Rose
    '#98D8C8', // Menthe
    '#F7DC6F', // Or
    '#BB8FCE', // Lavande
    '#85C1E9', // Bleu clair
    '#82E0AA', // Vert clair
    '#F8C471', // Pêche
    '#D2B4DE', // Mauve
    '#A9DFBF', // Vert pastel
  ];

  // Calcul des statistiques
  const calculateStats = useCallback((text: string): WritingStats => {
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const readingTime = Math.ceil(words / 200);
    const pages = Math.ceil(words / 250);
    const targetProgress = Math.min(100, (words / 1000) * 100); // Objectif: 1000 mots

    return {
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      sentences,
      readingTime,
      pages,
      targetProgress,
    };
  }, []);

  // Auto-sauvegarde
  const performAutoSave = useCallback(async () => {
    if (!settings.autoSave) return;
    
    setSaving(true);
    try {
      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Erreur auto-sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  }, [settings.autoSave]);

  // Gestion du changement de contenu
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setStats(calculateStats(newContent));
    
    // Auto-sauvegarde avec délai
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(performAutoSave, 2000);
    
    // Analyser le mot actuel pour l'auto-complétion
    const words = newContent.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord && lastWord.length > 2) {
      setCurrentWord(lastWord);
      // Ici on peut charger les suggestions d'auto-complétion
    } else {
      setCurrentWord('');
      setShowAutoComplete(false);
    }
  }, [calculateStats, performAutoSave]);

  // Actions de formatage
  const formatActions: FormatAction[] = [
    {
      id: 'bold',
      name: 'Gras',
      icon: 'text',
      action: () => insertFormat('**', '**'),
    },
    {
      id: 'italic',
      name: 'Italique',
      icon: 'text-outline',
      action: () => insertFormat('*', '*'),
    },
    {
      id: 'quote',
      name: 'Citation',
      icon: 'chatbox-outline',
      action: () => insertFormat('> ', ''),
    },
    {
      id: 'list',
      name: 'Liste',
      icon: 'list-outline',
      action: () => insertFormat('- ', ''),
    },
    {
      id: 'heading',
      name: 'Titre',
      icon: 'document-text-outline',
      action: () => insertFormat('# ', ''),
    },
    {
      id: 'color',
      name: 'Couleur',
      icon: 'color-palette-outline',
      action: () => setShowColorPicker(true),
    },
    {
      id: 'highlight',
      name: 'Surligner',
      icon: 'brush-outline',
      action: () => insertFormat('<mark style="background-color: #FFEAA7;">', '</mark>'),
    },
    {
      id: 'underline',
      name: 'Souligner',
      icon: 'text',
      action: () => insertFormat('<u>', '</u>'),
    },
  ];

  // Insertion de formatage
  const insertFormat = (before: string, after: string) => {
    const input = textInputRef.current;
    if (!input) return;

    // Obtenir la position actuelle
    const start = cursorPosition;
    const end = cursorPosition;
    
    const newText = content.slice(0, start) + before + selectedText + after + content.slice(end);
    setContent(newText);
    
    // Repositionner le curseur
    setTimeout(() => {
      const newPosition = start + before.length + selectedText.length;
      setCursorPosition(newPosition);
    }, 10);
  };

  // Application de couleur au texte sélectionné
  const applyColor = (color: string) => {
    if (selectedText.trim() === '') {
      // Si aucun texte n'est sélectionné, insérer un placeholder
      insertFormat(`<span style="color: ${color};">`, '</span>');
    } else {
      // Appliquer la couleur au texte sélectionné
      insertFormat(`<span style="color: ${color};">`, '</span>');
    }
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  // Gestion des paramètres
  const updateSettings = (key: keyof EditorSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Animation du mode focus
  const toggleFocusMode = () => {
    const newFocusMode = !settings.focusMode;
    updateSettings('focusMode', newFocusMode);
    
    Animated.parallel([
      Animated.timing(toolbarAnimation, {
        toValue: newFocusMode ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: newFocusMode ? 0.3 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Toggle des statistiques
  const toggleStats = () => {
    const newShowStats = !showStats;
    setShowStats(newShowStats);
    
    Animated.timing(statsAnimation, {
      toValue: newShowStats ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Effets
  useEffect(() => {
    if (content) {
      setStats(calculateStats(content));
    }
  }, [content, calculateStats]);

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
          backgroundColor: currentTheme.surface,
          opacity: toolbarAnimation,
          transform: [{
            translateY: toolbarAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          }],
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.toolbarContent}>
          {/* Actions de formatage */}
          {formatActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.toolbarButton, { borderColor: currentTheme.border }]}
              onPress={action.action}
            >
              <Ionicons name={action.icon as any} size={18} color={currentTheme.accent} />
            </TouchableOpacity>
          ))}
          
          <View style={[styles.toolbarSeparator, { backgroundColor: currentTheme.border }]} />
          
          {/* Contrôles de police */}
          <TouchableOpacity
            style={[styles.toolbarButton, { borderColor: currentTheme.border }]}
            onPress={() => updateSettings('fontSize', Math.min(24, settings.fontSize + 1))}
          >
            <Ionicons name="add" size={18} color={currentTheme.accent} />
            <Text style={[styles.toolbarButtonText, { color: currentTheme.accent }]}>A</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolbarButton, { borderColor: currentTheme.border }]}
            onPress={() => updateSettings('fontSize', Math.max(12, settings.fontSize - 1))}
          >
            <Ionicons name="remove" size={18} color={currentTheme.accent} />
            <Text style={[styles.toolbarButtonText, { color: currentTheme.accent }]}>A</Text>
          </TouchableOpacity>
          
          <View style={[styles.toolbarSeparator, { backgroundColor: currentTheme.border }]} />
          
          {/* Modes spéciaux */}
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { borderColor: currentTheme.border },
              settings.focusMode && { backgroundColor: currentTheme.accent },
            ]}
            onPress={toggleFocusMode}
          >
            <Ionicons 
              name="eye-off-outline" 
              size={18} 
              color={settings.focusMode ? currentTheme.background : currentTheme.accent} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { borderColor: currentTheme.border },
              settings.typewriterMode && { backgroundColor: currentTheme.accent },
            ]}
            onPress={() => updateSettings('typewriterMode', !settings.typewriterMode)}
          >
            <Ionicons 
              name="terminal-outline" 
              size={18} 
              color={settings.typewriterMode ? currentTheme.background : currentTheme.accent} 
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Rendu des statistiques
  const renderStats = () => (
    <Animated.View 
      style={[
        styles.statsContainer,
        { 
          backgroundColor: currentTheme.surface,
          borderTopColor: currentTheme.border,
          opacity: statsAnimation,
          transform: [{
            translateY: statsAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0],
            }),
          }],
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Ionicons name="text-outline" size={16} color={currentTheme.accent} />
            <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Mots</Text>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{stats.words}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={16} color={currentTheme.textSecondary} />
            <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Caractères</Text>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{stats.characters}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="library-outline" size={16} color={currentTheme.textSecondary} />
            <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Paragraphes</Text>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{stats.paragraphs}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color={currentTheme.textSecondary} />
            <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Lecture</Text>
            <Text style={[styles.statValue, { color: currentTheme.text }]}>{stats.readingTime} min</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="bar-chart-outline" size={16} color={currentTheme.accent} />
            <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Objectif</Text>
            <Text style={[styles.statValue, { color: currentTheme.accent }]}>{Math.round(stats.targetProgress)}%</Text>
          </View>
          
          {lastSaved && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Sauvé</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                {lastSaved.toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Rendu des paramètres
  const renderSettings = () => (
    <Modal visible={showSettings} animationType="slide" transparent statusBarTranslucent>
      <BlurView intensity={50} style={styles.modalOverlay}>
        <View style={[styles.settingsModal, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Paramètres d'écriture</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={24} color={currentTheme.accent} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.settingsContent}>
            {/* Thème */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Apparence</Text>
              
              <View style={styles.themeSelector}>
                {Object.entries(themes).map(([key, theme]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.themeOption,
                      { backgroundColor: theme.background, borderColor: theme.border },
                      settings.theme === key && { borderColor: currentTheme.accent, borderWidth: 2 },
                    ]}
                    onPress={() => updateSettings('theme', key)}
                  >
                    <View style={[styles.themePreview, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.themeText, { color: theme.text }]}>Aa</Text>
                    </View>
                    <Text style={[styles.themeLabel, { color: currentTheme.textSecondary }]}>
                      {key === 'dark' ? 'Sombre' : 
                       key === 'light' ? 'Clair' :
                       key === 'sepia' ? 'Sépia' : 'Zen'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Police */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Police</Text>
              
              <View style={styles.fontControls}>
                <View style={styles.fontControl}>
                  <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
                    Taille: {settings.fontSize}px
                  </Text>
                  <View style={styles.fontButtons}>
                    <TouchableOpacity
                      style={[styles.fontButton, { backgroundColor: currentTheme.surface }]}
                      onPress={() => updateSettings('fontSize', Math.max(12, settings.fontSize - 1))}
                    >
                      <Ionicons name="remove" size={16} color={currentTheme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.fontButton, { backgroundColor: currentTheme.surface }]}
                      onPress={() => updateSettings('fontSize', Math.min(24, settings.fontSize + 1))}
                    >
                      <Ionicons name="add" size={16} color={currentTheme.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.fontControl}>
                  <Text style={[styles.settingLabel, { color: currentTheme.textSecondary }]}>
                    Interligne: {settings.lineHeight}
                  </Text>
                  <View style={styles.fontButtons}>
                    <TouchableOpacity
                      style={[styles.fontButton, { backgroundColor: currentTheme.surface }]}
                      onPress={() => updateSettings('lineHeight', Math.max(1.2, settings.lineHeight - 0.1))}
                    >
                      <Ionicons name="remove" size={16} color={currentTheme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.fontButton, { backgroundColor: currentTheme.surface }]}
                      onPress={() => updateSettings('lineHeight', Math.min(2.0, settings.lineHeight + 0.1))}
                    >
                      <Ionicons name="add" size={16} color={currentTheme.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Options */}
            <View style={styles.settingSection}>
              <Text style={[styles.settingTitle, { color: currentTheme.text }]}>Options</Text>
              
              {[
                { key: 'autoSave', label: 'Auto-sauvegarde', icon: 'save-outline' },
                { key: 'wordWrap', label: 'Retour à la ligne automatique', icon: 'wrap-outline' },
                { key: 'showStats', label: 'Afficher les statistiques', icon: 'analytics-outline' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.settingOption, { backgroundColor: currentTheme.surface }]}
                  onPress={() => updateSettings(option.key as keyof EditorSettings, !settings[option.key as keyof EditorSettings])}
                >
                  <View style={styles.settingOptionLeft}>
                    <Ionicons name={option.icon as any} size={20} color={currentTheme.accent} />
                    <Text style={[styles.settingOptionLabel, { color: currentTheme.text }]}>
                      {option.label}
                    </Text>
                  </View>
                  <View style={[
                    styles.settingToggle,
                    { backgroundColor: settings[option.key as keyof EditorSettings] ? currentTheme.accent : currentTheme.border }
                  ]}>
                    <View style={[
                      styles.settingToggleThumb,
                      { 
                        backgroundColor: currentTheme.background,
                        transform: [{ translateX: settings[option.key as keyof EditorSettings] ? 20 : 2 }]
                      }
                    ]} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar 
        barStyle={settings.theme === 'light' ? 'dark-content' : 'light-content'} 
        backgroundColor={currentTheme.background} 
      />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: currentTheme.surface,
            borderBottomColor: currentTheme.border,
            opacity: fadeAnimation,
          }
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.accent} />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.titleInput, { color: currentTheme.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre du chapitre"
            placeholderTextColor={currentTheme.textSecondary}
          />
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleStats} style={styles.headerButton}>
            <Ionicons 
              name="analytics-outline" 
              size={24} 
              color={showStats ? currentTheme.accent : currentTheme.textSecondary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color={currentTheme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={performAutoSave} style={styles.headerButton}>
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <Ionicons name="sync-outline" size={24} color={currentTheme.accent} />
              </View>
            ) : (
              <Ionicons name="save-outline" size={24} color={currentTheme.accent} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Barre d'outils */}
      {showToolbar && renderToolbar()}

      {/* Zone d'écriture */}
      <View style={styles.editorContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, settings.focusMode && styles.focusedScrollView]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              {
                color: currentTheme.text,
                fontSize: settings.fontSize,
                lineHeight: settings.fontSize * settings.lineHeight,
                fontFamily: settings.fontFamily,
              },
              settings.typewriterMode && [styles.typewriterMode, { backgroundColor: currentTheme.surface }],
              settings.focusMode && styles.focusedTextInput,
            ]}
            value={content}
            onChangeText={handleContentChange}
            onSelectionChange={(event) => {
              setCursorPosition(event.nativeEvent.selection.start);
            }}
            placeholder={
              settings.focusMode 
                ? "Laissez vos pensées s'écouler..."
                : "Commencez à écrire votre histoire..."
            }
            placeholderTextColor={currentTheme.textSecondary}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect
            spellCheck
            scrollEnabled={false}
            textContentType="none"
            maxLength={settings.typewriterMode ? undefined : 100000}
          />
        </ScrollView>
      </View>

      {/* Statistiques */}
      {showStats && renderStats()}

      {/* Sélecteur de couleurs */}
      {showColorPicker && (
        <Modal visible={showColorPicker} animationType="fade" transparent statusBarTranslucent>
          <BlurView intensity={50} style={styles.modalOverlay}>
            <View style={[styles.colorPickerModal, { backgroundColor: currentTheme.background }]}>
              <View style={[styles.colorPickerHeader, { borderBottomColor: currentTheme.border }]}>
                <Text style={[styles.colorPickerTitle, { color: currentTheme.text }]}>
                  Choisir une couleur
                </Text>
                <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                  <Ionicons name="close" size={24} color={currentTheme.accent} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.colorPickerContent}>
                <Text style={[styles.colorPickerSubtitle, { color: currentTheme.textSecondary }]}>
                  Couleurs prédéfinies
                </Text>
                
                <View style={styles.colorGrid}>
                  {colorPalette.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && { 
                          borderColor: currentTheme.accent, 
                          borderWidth: 3,
                          transform: [{ scale: 1.1 }] 
                        }
                      ]}
                      onPress={() => applyColor(color)}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.colorPickerActions}>
                  <TouchableOpacity
                    style={[styles.colorPickerButton, { backgroundColor: currentTheme.surface }]}
                    onPress={() => setShowColorPicker(false)}
                  >
                    <Text style={[styles.colorPickerButtonText, { color: currentTheme.textSecondary }]}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.colorPickerButton, { backgroundColor: currentTheme.accent }]}
                    onPress={() => applyColor(selectedColor)}
                  >
                    <Text style={[styles.colorPickerButtonText, { color: currentTheme.background }]}>
                      Appliquer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </BlurView>
        </Modal>
      )}

      {/* Bouton flottant pour sortir du mode focus */}
      {settings.focusMode && (
        <Animated.View 
          style={[
            styles.focusExitButton,
            { backgroundColor: currentTheme.accent },
            {
              opacity: fadeAnimation.interpolate({
                inputRange: [0.3, 1],
                outputRange: [1, 0],
              }),
            },
          ]}
        >
          <TouchableOpacity onPress={toggleFocusMode} style={styles.focusExitButtonTouch}>
            <Ionicons name="eye-outline" size={24} color={currentTheme.background} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Paramètres */}
      {renderSettings()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  loadingIndicator: {
    transform: [{ rotate: '360deg' }],
  },
  
  // Toolbar
  toolbar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 44,
    height: 36,
  },
  toolbarButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  toolbarSeparator: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  
  // Editor
  editorContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  focusedScrollView: {
    marginHorizontal: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  textInput: {
    flex: 1,
    textAlign: 'left',
    textAlignVertical: 'top',
    minHeight: height - 200,
  },
  typewriterMode: {
    padding: 20,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  focusedTextInput: {
    paddingHorizontal: 40,
  },
  
  // Stats
  statsContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    marginRight: 24,
    minWidth: 60,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Settings
  settingsContent: {
    padding: 20,
  },
  settingSection: {
    marginBottom: 32,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  
  // Theme Selector
  themeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    flex: 1,
  },
  themePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  themeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  themeLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Font Controls
  fontControls: {
    gap: 16,
  },
  fontControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
  },
  fontButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fontButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Setting Options
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingOptionLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  settingToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  
  // Focus Exit Button
  focusExitButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  focusExitButtonTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Color Picker Styles
  colorPickerModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  colorPickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  colorPickerContent: {
    padding: 20,
  },
  colorPickerSubtitle: {
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  colorPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  colorPickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModernTextEditor;