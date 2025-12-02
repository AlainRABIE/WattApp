import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { LLamaAIService, WritingSuggestion } from '../../services/LLamaAIService';

interface AIWritingAssistantProps {
  visible: boolean;
  onClose: () => void;
  selectedText?: string;
  fullText?: string;
  onApplySuggestion: (suggestion: string) => void;
  genre?: string;
}

type AIFeature = 
  | 'complete' 
  | 'improve' 
  | 'dialogue' 
  | 'description' 
  | 'summarize' 
  | 'analyze'
  | 'titles'
  | 'brainstorm';

interface FeatureConfig {
  id: AIFeature;
  title: string;
  icon: string;
  description: string;
  color: string;
}

export const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  visible,
  onClose,
  selectedText = '',
  fullText = '',
  onApplySuggestion,
  genre = 'fiction',
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  // Options pour les différentes fonctionnalités
  const [improvementType, setImprovementType] = useState<'style' | 'grammar' | 'clarity'>('style');
  const [descriptionTone, setDescriptionTone] = useState<'poétique' | 'réaliste' | 'sombre'>('réaliste');
  const [character1, setCharacter1] = useState('');
  const [character2, setCharacter2] = useState('');
  const [dialogueContext, setDialogueContext] = useState('');

  const features: FeatureConfig[] = [
    {
      id: 'complete',
      title: 'Compléter',
      icon: 'arrow-forward',
      description: 'Continue ton texte',
      color: '#667eea',
    },
    {
      id: 'improve',
      title: 'Améliorer',
      icon: 'sparkles',
      description: 'Perfectionne le texte',
      color: '#f093fb',
    },
    {
      id: 'dialogue',
      title: 'Dialogue',
      icon: 'chatbubbles',
      description: 'Génère un dialogue',
      color: '#4facfe',
    },
    {
      id: 'description',
      title: 'Décrire',
      icon: 'eye',
      description: 'Crée une description',
      color: '#43e97b',
    },
    {
      id: 'summarize',
      title: 'Résumer',
      icon: 'document-text',
      description: 'Résume le texte',
      color: '#fa709a',
    },
    {
      id: 'analyze',
      title: 'Analyser',
      icon: 'analytics',
      description: 'Analyse ton style',
      color: '#f6d365',
    },
    {
      id: 'titles',
      title: 'Titres',
      icon: 'text',
      description: 'Suggère des titres',
      color: '#ffa62e',
    },
    {
      id: 'brainstorm',
      title: 'Brainstorm',
      icon: 'bulb',
      description: 'Idées créatives',
      color: '#ff6b6b',
    },
  ];

  const handleFeatureSelect = (feature: AIFeature) => {
    setSelectedFeature(feature);
    setSuggestion('');
  };

  const handleGenerate = async () => {
    if (!selectedFeature) return;

    setLoading(true);
    setSuggestion('');

    try {
      let result = '';

      switch (selectedFeature) {
        case 'complete':
          if (!selectedText && !fullText) {
            Alert.alert('Erreur', 'Aucun texte à compléter');
            return;
          }
          result = await LLamaAIService.completeText(
            selectedText || fullText.slice(-500),
            fullText.slice(-1000, -500)
          );
          break;

        case 'improve':
          if (!selectedText) {
            Alert.alert('Erreur', 'Sélectionnez du texte à améliorer');
            return;
          }
          const improvement = await LLamaAIService.improveText(
            selectedText,
            improvementType
          );
          result = improvement.suggestion;
          break;

        case 'dialogue':
          if (!character1 || !character2 || !dialogueContext) {
            Alert.alert('Erreur', 'Remplissez tous les champs du dialogue');
            return;
          }
          result = await LLamaAIService.generateDialogue(
            character1,
            character2,
            dialogueContext,
            'neutre'
          );
          break;

        case 'description':
          if (!customPrompt) {
            Alert.alert('Erreur', 'Entrez un sujet à décrire');
            return;
          }
          result = await LLamaAIService.generateDescription(
            customPrompt,
            descriptionTone,
            'moyen'
          );
          break;

        case 'summarize':
          if (!selectedText && !fullText) {
            Alert.alert('Erreur', 'Aucun texte à résumer');
            return;
          }
          result = await LLamaAIService.summarizeText(
            selectedText || fullText,
            'court'
          );
          break;

        case 'analyze':
          if (!selectedText && !fullText) {
            Alert.alert('Erreur', 'Aucun texte à analyser');
            return;
          }
          const analysis = await LLamaAIService.analyzeWritingStyle(
            selectedText || fullText
          );
          result = `📊 ANALYSE:\n${analysis.analysis}\n\n✨ FORCES:\n${analysis.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n💡 SUGGESTIONS:\n${analysis.improvements.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
          break;

        case 'titles':
          if (!fullText && !selectedText) {
            Alert.alert('Erreur', 'Aucun contenu pour générer des titres');
            return;
          }
          const titles = await LLamaAIService.generateTitles(
            selectedText || fullText,
            'chapter',
            5
          );
          result = titles.map((title, i) => `${i + 1}. ${title}`).join('\n');
          break;

        case 'brainstorm':
          if (!customPrompt) {
            Alert.alert('Erreur', 'Entrez un thème pour le brainstorming');
            return;
          }
          const ideas = await LLamaAIService.brainstorm(
            customPrompt,
            genre,
            5
          );
          result = ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n\n');
          break;

        default:
          result = 'Fonctionnalité non implémentée';
      }

      setSuggestion(result);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
      console.error('AI Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onApplySuggestion(suggestion);
      onClose();
    }
  };

  const renderFeatureForm = () => {
    if (!selectedFeature) return null;

    const dynamicStyles = getStyles(theme);

    switch (selectedFeature) {
      case 'improve':
        return (
          <View style={dynamicStyles.formContainer}>
            <Text style={[dynamicStyles.formLabel, { color: theme.colors.text }]}>
              Type d'amélioration
            </Text>
            <View style={dynamicStyles.optionsRow}>
              {['style', 'grammar', 'clarity', 'emotion'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    dynamicStyles.optionButton,
                    {
                      backgroundColor: improvementType === type 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setImprovementType(type as any)}
                >
                  <Text
                    style={[
                      dynamicStyles.optionText,
                      { color: improvementType === type ? '#fff' : theme.colors.text },
                    ]}
                  >
                    {type === 'style' ? 'Style' : 
                     type === 'grammar' ? 'Grammaire' :
                     type === 'clarity' ? 'Clarté' : 'Émotion'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'dialogue':
        return (
          <View style={dynamicStyles.formContainer}>
            <TextInput
              style={[dynamicStyles.input, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Nom du personnage 1"
              placeholderTextColor={theme.colors.textSecondary}
              value={character1}
              onChangeText={setCharacter1}
            />
            <TextInput
              style={[dynamicStyles.input, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Nom du personnage 2"
              placeholderTextColor={theme.colors.textSecondary}
              value={character2}
              onChangeText={setCharacter2}
            />
            <TextInput
              style={[dynamicStyles.inputMultiline, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Contexte de la scène..."
              placeholderTextColor={theme.colors.textSecondary}
              value={dialogueContext}
              onChangeText={setDialogueContext}
              multiline
              numberOfLines={3}
            />
          </View>
        );

      case 'description':
        return (
          <View style={dynamicStyles.formContainer}>
            <TextInput
              style={[dynamicStyles.input, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Sujet à décrire (lieu, personnage, objet...)"
              placeholderTextColor={theme.colors.textSecondary}
              value={customPrompt}
              onChangeText={setCustomPrompt}
            />
            <Text style={[dynamicStyles.formLabel, { color: theme.colors.text }]}>
              Ton de la description
            </Text>
            <View style={dynamicStyles.optionsRow}>
              {['poétique', 'réaliste', 'sombre', 'joyeux'].map((tone) => (
                <TouchableOpacity
                  key={tone}
                  style={[
                    dynamicStyles.optionButton,
                    {
                      backgroundColor: descriptionTone === tone 
                        ? theme.colors.primary 
                        : theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => setDescriptionTone(tone as any)}
                >
                  <Text
                    style={[
                      dynamicStyles.optionText,
                      { color: descriptionTone === tone ? '#fff' : theme.colors.text },
                    ]}
                  >
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'brainstorm':
        return (
          <View style={dynamicStyles.formContainer}>
            <TextInput
              style={[dynamicStyles.inputMultiline, { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              placeholder="Thème pour le brainstorming..."
              placeholderTextColor={theme.colors.textSecondary}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              multiline
              numberOfLines={3}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const dynamicStyles = getStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.modalOverlay}>
        <View style={[dynamicStyles.modalContent, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <View style={dynamicStyles.headerLeft}>
              <View style={[dynamicStyles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[dynamicStyles.title, { color: theme.colors.text }]}>
                Assistant IA
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Features Grid */}
            {!selectedFeature && (
              <View style={dynamicStyles.featuresGrid}>
                {features.map((feature) => (
                  <TouchableOpacity
                    key={feature.id}
                    style={[dynamicStyles.featureCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleFeatureSelect(feature.id)}
                  >
                    <View style={[dynamicStyles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                      <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                    </View>
                    <Text style={[dynamicStyles.featureTitle, { color: theme.colors.text }]}>
                      {feature.title}
                    </Text>
                    <Text style={[dynamicStyles.featureDesc, { color: theme.colors.textSecondary }]}>
                      {feature.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected Feature */}
            {selectedFeature && (
              <View style={dynamicStyles.selectedFeatureContainer}>
                <TouchableOpacity
                  style={dynamicStyles.backButton}
                  onPress={() => {
                    setSelectedFeature(null);
                    setSuggestion('');
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
                  <Text style={[dynamicStyles.backText, { color: theme.colors.primary }]}>
                    Retour
                  </Text>
                </TouchableOpacity>

                <Text style={[dynamicStyles.selectedTitle, { color: theme.colors.text }]}>
                  {features.find(f => f.id === selectedFeature)?.title}
                </Text>

                {renderFeatureForm()}

                <TouchableOpacity
                  style={[dynamicStyles.generateButton, { 
                    backgroundColor: theme.colors.primary,
                    opacity: loading ? 0.6 : 1,
                  }]}
                  onPress={handleGenerate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={20} color="#fff" />
                      <Text style={dynamicStyles.generateButtonText}>Générer</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Suggestion Result */}
                {suggestion && (
                  <View style={[dynamicStyles.suggestionContainer, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }]}>
                    <View style={dynamicStyles.suggestionHeader}>
                      <Ionicons name="checkmark-circle" size={20} color="#43e97b" />
                      <Text style={[dynamicStyles.suggestionTitle, { color: theme.colors.text }]}>
                        Suggestion
                      </Text>
                    </View>
                    <ScrollView 
                      style={dynamicStyles.suggestionScroll}
                      nestedScrollEnabled
                    >
                      <Text style={[dynamicStyles.suggestionText, { color: theme.colors.text }]}>
                        {suggestion}
                      </Text>
                    </ScrollView>
                    <TouchableOpacity
                      style={[dynamicStyles.applyButton, { backgroundColor: theme.colors.primary }]}
                      onPress={handleApply}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={dynamicStyles.applyButtonText}>Appliquer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  featureCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedFeatureContainer: {
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  formContainer: {
    gap: 12,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  inputMultiline: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionContainer: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionScroll: {
    maxHeight: 200,
  },
  suggestionText: {
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    margin: 12,
    borderRadius: 10,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AIWritingAssistant;
