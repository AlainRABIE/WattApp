import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Image,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc,
  serverTimestamp, 
  query, 
  where, 
  orderBy,
  limit 
} from 'firebase/firestore';

const { width } = Dimensions.get('window');

interface SmartTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  starter: string;
  prompt: string;
  variables: TemplateVariable[];
  suggestions: string[];
  tags: string[];
  usageCount: number;
  rating: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // en minutes
  genre: string[];
  tone: string[];
  structure: TemplateStructure;
  aiEnhanced: boolean;
  backgroundImage?: string;
  color: string;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  isPublic: boolean;
  featured: boolean;
}

interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

interface TemplateStructure {
  sections: TemplateSection[];
  totalSteps: number;
  canSkipSteps: boolean;
}

interface TemplateSection {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  required: boolean;
  aiPrompt?: string;
}

interface SmartTemplateManagerProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (template: SmartTemplate, variables?: Record<string, any>) => void;
  genre?: string;
  currentContent?: string;
  writingGoal?: string;
}

// Templates prédéfinis intelligents
const SMART_TEMPLATES: Omit<SmartTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'usageCount' | 'rating'>[] = [
  {
    title: "Assistant d'Histoire Personnalisée",
    description: "Créez une histoire unique avec l'aide de l'IA",
    category: "Roman",
    content: "",
    starter: "Il était une fois...",
    prompt: "Créez une histoire captivante avec les éléments suivants: {{genre}}, personnage principal: {{protagonist}}, setting: {{setting}}",
    variables: [
      {
        name: "genre",
        label: "Genre de l'histoire",
        type: "select",
        required: true,
        options: ["Fantasy", "Science-fiction", "Romance", "Thriller", "Drame", "Comédie"],
        defaultValue: "Fantasy"
      },
      {
        name: "protagonist",
        label: "Personnage principal",
        type: "text",
        required: true,
        placeholder: "Décrivez votre héros/héroïne"
      },
      {
        name: "setting",
        label: "Environnement/Époque",
        type: "text",
        required: true,
        placeholder: "Où et quand se déroule l'histoire?"
      },
      {
        name: "tone",
        label: "Ton de l'histoire",
        type: "select",
        required: false,
        options: ["Léger", "Sérieux", "Mystérieux", "Dramatique", "Humoristique"],
        defaultValue: "Sérieux"
      }
    ],
    suggestions: [
      "Commencez par décrire l'environnement",
      "Présentez votre personnage principal",
      "Créez un conflit initial",
      "Développez l'intrigue progressivement"
    ],
    tags: ["assistant", "personnalisé", "IA"],
    difficulty: "beginner",
    estimatedTime: 30,
    genre: ["Tous"],
    tone: ["Tous"],
    structure: {
      sections: [
        {
          id: "intro",
          title: "Introduction",
          description: "Présentez votre monde et vos personnages",
          content: "Décrivez le cadre de votre histoire...",
          order: 1,
          required: true,
          aiPrompt: "Créez une introduction captivante pour une histoire de {{genre}} avec {{protagonist}} dans {{setting}}"
        },
        {
          id: "conflict",
          title: "Conflit",
          description: "Introduisez le problème principal",
          content: "Quel défi votre héros doit-il surmonter?",
          order: 2,
          required: true
        },
        {
          id: "development",
          title: "Développement",
          description: "Développez l'intrigue",
          content: "Comment l'histoire évolue-t-elle?",
          order: 3,
          required: false
        }
      ],
      totalSteps: 3,
      canSkipSteps: true
    },
    aiEnhanced: true,
    color: "#FF6B6B",
    isPublic: true,
    featured: true
  },
  {
    title: "Guide de Worldbuilding",
    description: "Construisez un univers cohérent et détaillé",
    category: "Fantasy",
    content: "",
    starter: "Dans ce monde...",
    prompt: "Aidez-moi à créer un monde de {{worldType}} avec les caractéristiques suivantes: {{characteristics}}",
    variables: [
      {
        name: "worldType",
        label: "Type de monde",
        type: "select",
        required: true,
        options: ["Fantasy médiéval", "Science-fiction", "Steampunk", "Cyberpunk", "Post-apocalyptique", "Moderne alternatif"],
        defaultValue: "Fantasy médiéval"
      },
      {
        name: "characteristics",
        label: "Caractéristiques principales",
        type: "textarea",
        required: true,
        placeholder: "Décrivez les éléments uniques de votre monde (magie, technologie, société, etc.)"
      },
      {
        name: "scale",
        label: "Échelle du monde",
        type: "select",
        required: true,
        options: ["Village", "Ville", "Région", "Continent", "Planète", "Galaxie"],
        defaultValue: "Région"
      }
    ],
    suggestions: [
      "Définissez les règles de votre monde",
      "Créez une géographie cohérente",
      "Développez l'histoire et la culture",
      "Établissez les systèmes politiques et sociaux"
    ],
    tags: ["worldbuilding", "fantasy", "création"],
    difficulty: "intermediate",
    estimatedTime: 60,
    genre: ["Fantasy", "Science-fiction"],
    tone: ["Épique", "Mystérieux"],
    structure: {
      sections: [
        {
          id: "geography",
          title: "Géographie",
          description: "Décrivez la géographie de votre monde",
          content: "Continents, océans, montagnes, climat...",
          order: 1,
          required: true
        },
        {
          id: "history",
          title: "Histoire",
          description: "Créez l'histoire de votre monde",
          content: "Événements marquants, ères, civilisations...",
          order: 2,
          required: true
        },
        {
          id: "culture",
          title: "Cultures et Sociétés",
          description: "Développez les différentes cultures",
          content: "Peuples, langues, traditions, religions...",
          order: 3,
          required: false
        }
      ],
      totalSteps: 3,
      canSkipSteps: false
    },
    aiEnhanced: true,
    color: "#4ECDC4",
    isPublic: true,
    featured: true
  },
  {
    title: "Développement de Personnage",
    description: "Créez des personnages profonds et mémorables",
    category: "Personnage",
    content: "",
    starter: "Mon personnage...",
    prompt: "Aidez-moi à développer un personnage {{characterType}} avec les traits suivants: {{traits}}",
    variables: [
      {
        name: "characterType",
        label: "Type de personnage",
        type: "select",
        required: true,
        options: ["Protagoniste", "Antagoniste", "Personnage secondaire", "Mentor", "Allié"],
        defaultValue: "Protagoniste"
      },
      {
        name: "traits",
        label: "Traits de personnalité",
        type: "textarea",
        required: true,
        placeholder: "Décrivez la personnalité, les habitudes, les peurs, les désirs..."
      },
      {
        name: "background",
        label: "Contexte/Origine",
        type: "textarea",
        required: false,
        placeholder: "D'où vient ce personnage? Quelle est son histoire?"
      }
    ],
    suggestions: [
      "Donnez-lui des défauts intéressants",
      "Créez un arc de développement",
      "Définissez ses relations avec les autres",
      "Établissez ses motivations profondes"
    ],
    tags: ["personnage", "développement", "psychologie"],
    difficulty: "intermediate",
    estimatedTime: 45,
    genre: ["Tous"],
    tone: ["Tous"],
    structure: {
      sections: [
        {
          id: "basics",
          title: "Informations de base",
          description: "Nom, âge, apparence physique",
          content: "Décrivez l'aspect physique de votre personnage...",
          order: 1,
          required: true
        },
        {
          id: "personality",
          title: "Personnalité",
          description: "Traits, habitudes, manies",
          content: "Quels sont ses traits de caractère?",
          order: 2,
          required: true
        },
        {
          id: "backstory",
          title: "Histoire personnelle",
          description: "Passé, expériences formatrices",
          content: "Quelle est son histoire?",
          order: 3,
          required: false
        }
      ],
      totalSteps: 3,
      canSkipSteps: true
    },
    aiEnhanced: true,
    color: "#95E1D3",
    isPublic: true,
    featured: false
  }
];

const SmartTemplateManager: React.FC<SmartTemplateManagerProps> = ({
  visible,
  onClose,
  onSelectTemplate,
  genre,
  currentContent,
  writingGoal,
}) => {
  // États principaux
  const [templates, setTemplates] = useState<SmartTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<SmartTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<SmartTemplate | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});

  // États de filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Tous');
  const [showFeatured, setShowFeatured] = useState(false);

  // Catégories disponibles
  const categories = ['Tous', 'Roman', 'Nouvelle', 'Poésie', 'Fantasy', 'Science-fiction', 'Personnage', 'Worldbuilding'];
  const difficulties = ['Tous', 'beginner', 'intermediate', 'advanced'];

  // Charger les templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Filtrer les templates
  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedDifficulty, showFeatured, genre]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Charger les templates depuis Firestore
      const templatesQuery = query(
        collection(db, 'smartTemplates'),
        where('isPublic', '==', true),
        orderBy('featured', 'desc'),
        orderBy('rating', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(templatesQuery);
      const firestoreTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SmartTemplate[];

      // Combiner avec les templates prédéfinis
      const allTemplates = [
        ...SMART_TEMPLATES.map((template, index) => ({
          ...template,
          id: `preset_${index}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          usageCount: Math.floor(Math.random() * 1000),
          rating: 4 + Math.random()
        })),
        ...firestoreTemplates
      ];

      setTemplates(allTemplates);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      // Utiliser seulement les templates prédéfinis en cas d'erreur
      setTemplates(SMART_TEMPLATES.map((template, index) => ({
        ...template,
        id: `preset_${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        usageCount: Math.floor(Math.random() * 1000),
        rating: 4 + Math.random()
      })));
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Filtrer par recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filtrer par catégorie
    if (selectedCategory !== 'Tous') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filtrer par difficulté
    if (selectedDifficulty !== 'Tous') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    // Filtrer par genre (si fourni)
    if (genre && genre !== 'Tous') {
      filtered = filtered.filter(template =>
        template.genre.includes('Tous') || template.genre.includes(genre)
      );
    }

    // Filtrer par featured
    if (showFeatured) {
      filtered = filtered.filter(template => template.featured);
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: SmartTemplate) => {
    if (template.variables.length > 0) {
      setSelectedTemplate(template);
      // Initialiser les variables avec les valeurs par défaut
      const defaultVars: Record<string, any> = {};
      template.variables.forEach(variable => {
        defaultVars[variable.name] = variable.defaultValue || '';
      });
      setVariables(defaultVars);
      setShowVariables(true);
    } else {
      onSelectTemplate(template);
      onClose();
    }
  };

  const handleVariableSubmit = () => {
    if (!selectedTemplate) return;

    // Vérifier que toutes les variables requises sont remplies
    const missingRequired = selectedTemplate.variables
      .filter(variable => variable.required && !variables[variable.name])
      .map(variable => variable.label);

    if (missingRequired.length > 0) {
      Alert.alert(
        'Champs requis',
        `Veuillez remplir: ${missingRequired.join(', ')}`
      );
      return;
    }

    onSelectTemplate(selectedTemplate, variables);
    setShowVariables(false);
    setSelectedTemplate(null);
    setVariables({});
    onClose();
  };

  const renderTemplateCard = ({ item }: { item: SmartTemplate }) => (
    <TouchableOpacity
      style={[styles.templateCard, { borderLeftColor: item.color }]}
      onPress={() => handleTemplateSelect(item)}
      activeOpacity={0.8}
    >
      {item.featured && (
        <View style={styles.featuredBadge}>
          <Ionicons name="star" size={12} color="#FFD700" />
          <Text style={styles.featuredText}>Populaire</Text>
        </View>
      )}

      <View style={styles.templateHeader}>
        <Text style={styles.templateTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.templateMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.difficultyContainer}>
            <View style={[
              styles.difficultyDot,
              { backgroundColor: 
                item.difficulty === 'beginner' ? '#4CAF50' :
                item.difficulty === 'intermediate' ? '#FF9800' : '#F44336'
              }
            ]} />
            <Text style={styles.difficultyText}>
              {item.difficulty === 'beginner' ? 'Débutant' :
               item.difficulty === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.templateDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.templateDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color="#888" />
          <Text style={styles.detailText}>{item.estimatedTime} min</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={14} color="#888" />
          <Text style={styles.detailText}>{item.usageCount}</Text>
        </View>
        {item.aiEnhanced && (
          <View style={styles.detailItem}>
            <Ionicons name="sparkles" size={14} color="#FFA94D" />
            <Text style={[styles.detailText, { color: '#FFA94D' }]}>IA</Text>
          </View>
        )}
      </View>

      <View style={styles.tagsContainer}>
        {item.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderVariableInput = (variable: TemplateVariable) => {
    switch (variable.type) {
      case 'select':
        return (
          <View key={variable.name} style={styles.variableContainer}>
            <Text style={styles.variableLabel}>
              {variable.label}
              {variable.required && <Text style={styles.required}> *</Text>}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {variable.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    variables[variable.name] === option && styles.optionButtonSelected
                  ]}
                  onPress={() => setVariables(prev => ({ ...prev, [variable.name]: option }))}
                >
                  <Text style={[
                    styles.optionText,
                    variables[variable.name] === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'textarea':
        return (
          <View key={variable.name} style={styles.variableContainer}>
            <Text style={styles.variableLabel}>
              {variable.label}
              {variable.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={variables[variable.name] || ''}
              onChangeText={(text) => setVariables(prev => ({ ...prev, [variable.name]: text }))}
              placeholder={variable.placeholder}
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          </View>
        );

      default: // text, number
        return (
          <View key={variable.name} style={styles.variableContainer}>
            <Text style={styles.variableLabel}>
              {variable.label}
              {variable.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.textInput}
              value={variables[variable.name] || ''}
              onChangeText={(text) => setVariables(prev => ({ ...prev, [variable.name]: text }))}
              placeholder={variable.placeholder}
              placeholderTextColor="#666"
              keyboardType={variable.type === 'number' ? 'numeric' : 'default'}
            />
          </View>
        );
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Templates Intelligents</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Recherche et filtres */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher un template..."
              placeholderTextColor="#666"
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {/* Filtres par catégorie */}
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  selectedCategory === category && styles.filterButtonSelected
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.filterText,
                  selectedCategory === category && styles.filterTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Filtre Featured */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                showFeatured && styles.filterButtonSelected
              ]}
              onPress={() => setShowFeatured(!showFeatured)}
            >
              <Ionicons 
                name="star" 
                size={16} 
                color={showFeatured ? "#181818" : "#FFA94D"} 
              />
              <Text style={[
                styles.filterText,
                showFeatured && styles.filterTextSelected
              ]}>
                Populaires
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Liste des templates */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFA94D" />
            <Text style={styles.loadingText}>Chargement des templates...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTemplates}
            renderItem={renderTemplateCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.templatesList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Modal des variables */}
        <Modal
          visible={showVariables}
          animationType="slide"
          transparent
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <View style={styles.variablesModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Personnaliser: {selectedTemplate?.title}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowVariables(false);
                    setSelectedTemplate(null);
                    setVariables({});
                  }}
                >
                  <Ionicons name="close" size={24} color="#FFA94D" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.variablesContent}>
                {selectedTemplate?.variables.map(renderVariableInput)}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowVariables(false);
                    setSelectedTemplate(null);
                    setVariables({});
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleVariableSubmit}
                >
                  <Text style={styles.submitButtonText}>Utiliser ce template</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonSelected: {
    backgroundColor: '#FFA94D',
  },
  filterText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  filterTextSelected: {
    color: '#181818',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  templatesList: {
    padding: 20,
  },
  templateCard: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  templateHeader: {
    marginBottom: 8,
  },
  templateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  difficultyText: {
    color: '#888',
    fontSize: 12,
  },
  templateDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  templateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#FFA94D',
    fontSize: 10,
    fontWeight: '600',
  },

  // Modal des variables
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  variablesModal: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  variablesContent: {
    padding: 20,
  },
  variableContainer: {
    marginBottom: 24,
  },
  variableLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  textInput: {
    backgroundColor: '#23232a',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionButton: {
    backgroundColor: '#23232a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  optionButtonSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#181818',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#FFA94D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SmartTemplateManager;