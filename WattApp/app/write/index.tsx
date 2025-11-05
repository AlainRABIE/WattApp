import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
  TextInput,
  Modal,
  Animated,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  cover?: string;
  progress: number;
  lastEdited: Date;
  wordCount: number;
  chaptersCount: number;
  status: 'draft' | 'writing' | 'editing' | 'published';
  collaborators?: string[];
  tags: string[];
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

interface WritingMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string[];
  features: string[];
}

const WritingDashboard: React.FC = () => {
  const router = useRouter();
  
  // États principaux
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'drafts' | 'published'>('all');
  
  // États de l'interface
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedMode, setSelectedMode] = useState<WritingMode | null>(null);
  const [selectedWritingType, setSelectedWritingType] = useState<'book' | 'manga' | null>(null);
  
  // Animations
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // Types de création
  const creationTypes = [
    {
      id: 'book' as const,
      title: 'Écrire un Livre',
      description: 'Romans, nouvelles, poésie et essais',
      icon: 'book-outline',
      gradient: ['#667eea', '#764ba2'],
      features: ['Éditeur de texte avancé', 'Gestion des chapitres', 'Formats multiples', 'Publication numérique']
    },
    {
      id: 'manga' as const,
      title: 'Créer un Manga',
      description: 'Mangas, webtoons, bandes dessinées digitales',
      icon: 'brush-outline',
      gradient: ['#f093fb', '#f5576c'],
      features: ['Outils de dessin avancés', 'Templates layouts manga', 'Storyboard intégré', 'Bulles de dialogue', 'Gestion personnages', 'Publication marketplace']
    }
  ];

  // Modes d'écriture disponibles
  const writingModes: WritingMode[] = [
    {
      id: 'focused',
      name: 'Écriture Focalisée',
      description: 'Interface minimaliste pour une concentration maximale',
      icon: 'eye-off-outline',
      gradient: ['#667eea', '#764ba2'],
      features: ['Mode zen', 'Distractions minimales', 'Auto-sauvegarde', 'Statistiques discrètes']
    },
    {
      id: 'collaboration',
      name: 'Collaboration',
      description: 'Écriture en équipe avec commentaires et révisions',
      icon: 'people-outline',
      gradient: ['#f093fb', '#f5576c'],
      features: ['Commentaires en temps réel', 'Suggestions', 'Chat intégré', 'Historique des versions']
    },
    {
      id: 'structured',
      name: 'Écriture Structurée',
      description: 'Organisation par chapitres avec planification avancée',
      icon: 'library-outline',
      gradient: ['#4facfe', '#00f2fe'],
      features: ['Plan détaillé', 'Gestion des personnages', 'Timeline', 'Notes de recherche']
    },
    {
      id: 'creative',
      name: 'Créativité Libre',
      description: 'Outils créatifs pour libérer votre imagination',
      icon: 'color-palette-outline',
      gradient: ['#fa709a', '#fee140'],
      features: ['Templates dynamiques', 'Générateur d\'idées', 'Inspiration visuelle', 'Mindmapping']
    }
  ];

  // Actions rapides pour les livres
  const bookActions: QuickAction[] = [
    {
      id: 'new-book',
      title: 'Nouveau Livre',
      description: 'Commencer un nouveau projet d\'écriture',
      icon: 'add-circle',
      color: '#4CAF50',
      action: () => router.push('/write/new-project')
    },
    {
      id: 'continue-writing',
      title: 'Continuer à Écrire',
      description: 'Reprendre votre dernier projet',
      icon: 'play-circle',
      color: '#2196F3',
      action: () => {
        if (recentProjects.length > 0) {
          router.push(`/write/editor/${recentProjects[0].id}`);
        }
      }
    },
    {
      id: 'templates',
      title: 'Templates Livre',
      description: 'Modèles prédéfinis pour commencer',
      icon: 'document-text',
      color: '#FF9800',
      action: () => router.push('/write/templates')
    },
    {
      id: 'import',
      title: 'Importer',
      description: 'Importer un document existant',
      icon: 'cloud-upload',
      color: '#9C27B0',
      action: () => router.push('/write/import')
    }
  ];

  // Actions rapides pour les mangas
  const mangaActions: QuickAction[] = [
    {
      id: 'new-manga',
      title: 'Nouveau Manga',
      description: 'Créer un nouveau manga avec outils de dessin',
      icon: 'brush-outline',
      color: '#FF6B6B',
      action: () => router.push('/write/manga-editor/simple?projectId=new')
    },
    {
      id: 'manga-templates',
      title: 'Templates Manga',
      description: 'Layouts 4-koma, webtoon, traditionnel',
      icon: 'apps-outline',
      color: '#FF9800',
      action: () => router.push('/write/manga-templates')
    },
    {
      id: 'storyboard',
      title: 'Storyboard',
      description: 'Planifier votre manga case par case',
      icon: 'film-outline',
      color: '#9C27B0',
      action: () => router.push('/write/manga-storyboard/new')
    },
    {
      id: 'character-design',
      title: 'Design Personnages',
      description: 'Créer et gérer vos personnages',
      icon: 'person-outline',
      color: '#2196F3',
      action: () => router.push('/write/manga-characters')
    },
    {
      id: 'drawing-tools',
      title: 'Outils de Dessin',
      description: 'Pinceaux, plumes, effets manga',
      icon: 'color-palette-outline',
      color: '#FF5722',
      action: () => router.push('/write/manga-tools')
    },
    {
      id: 'panel-layouts',
      title: 'Mise en Page',
      description: 'Créer des layouts de cases uniques',
      icon: 'grid-outline',
      color: '#4CAF50',
      action: () => router.push('/write/manga-layouts')
    },
    {
      id: 'speech-bubbles',
      title: 'Bulles de Dialogue',
      description: 'Outils pour dialogue et narration',
      icon: 'chatbubble-outline',
      color: '#00BCD4',
      action: () => router.push('/write/manga-bubbles')
    },
    {
      id: 'publish-manga',
      title: 'Publier Manga',
      description: 'Publier sur marketplace manga',
      icon: 'rocket-outline',
      color: '#673AB7',
      action: () => router.push('/write/publish-manga')
    }
  ];

  // Actions rapides actuelles (pour compatibilité)
  const quickActions = selectedWritingType === 'manga' ? mangaActions : bookActions;

  // Filtres de projets
  const filters = [
    { key: 'all', label: 'Tous', icon: 'library-outline' },
    { key: 'recent', label: 'Récents', icon: 'time-outline' },
    { key: 'drafts', label: 'Brouillons', icon: 'create-outline' },
    { key: 'published', label: 'Publiés', icon: 'checkmark-circle-outline' }
  ];

  // Chargement des données
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Simuler le chargement des projets depuis Firebase
      const mockProjects: Project[] = [
        {
          id: '1',
          title: 'Les Chroniques d\'Aetheria',
          description: 'Une épopée fantasy dans un monde magique peuplé de créatures mystiques',
          genre: 'Fantasy',
          progress: 65,
          lastEdited: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          wordCount: 45000,
          chaptersCount: 12,
          status: 'writing',
          tags: ['fantasy', 'magie', 'aventure'],
          cover: 'https://picsum.photos/300/400?random=1'
        },
        {
          id: '2',
          title: 'Néon & Circuits',
          description: 'Thriller cyberpunk dans une mégalopole futuriste',
          genre: 'Science-fiction',
          progress: 30,
          lastEdited: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          wordCount: 22000,
          chaptersCount: 8,
          status: 'writing',
          tags: ['cyberpunk', 'technologie', 'dystopie'],
          cover: 'https://picsum.photos/300/400?random=2'
        },
        {
          id: '3',
          title: 'Lettres à Luna',
          description: 'Romance épistolaire entre deux âmes perdues',
          genre: 'Romance',
          progress: 85,
          lastEdited: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          wordCount: 67000,
          chaptersCount: 20,
          status: 'editing',
          tags: ['romance', 'lettres', 'émotions'],
          cover: 'https://picsum.photos/300/400?random=3'
        }
      ];

      setProjects(mockProjects);
      setRecentProjects(mockProjects.slice(0, 2));
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects().finally(() => setRefreshing(false));
  }, []);

  // Filtrage des projets
  const filteredProjects = projects.filter(project => {
    if (searchQuery && !project.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    switch (selectedFilter) {
      case 'recent':
        return recentProjects.some(rp => rp.id === project.id);
      case 'drafts':
        return project.status === 'draft' || project.status === 'writing';
      case 'published':
        return project.status === 'published';
      default:
        return true;
    }
  });

  // Rendu d'une carte de projet
  const renderProjectCard = ({ item, index }: { item: Project; index: number }) => (
    <TouchableOpacity
      style={[styles.projectCard, { marginLeft: index === 0 ? 20 : 0 }]}
      onPress={() => router.push(`/write/editor/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.projectImageContainer}>
        {item.cover ? (
          <Image source={{ uri: item.cover }} style={styles.projectImage} />
        ) : (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.projectImagePlaceholder}
          >
            <Ionicons name="book-outline" size={32} color="#fff" />
          </LinearGradient>
        )}
        
        <View style={styles.projectStatus}>
          <View style={[
            styles.statusDot,
            { backgroundColor: 
              item.status === 'published' ? '#4CAF50' :
              item.status === 'editing' ? '#FF9800' :
              item.status === 'writing' ? '#2196F3' : '#757575'
            }
          ]} />
        </View>
      </View>

      <View style={styles.projectInfo}>
        <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.projectGenre}>{item.genre}</Text>
        
        <View style={styles.projectStats}>
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={14} color="#888" />
            <Text style={styles.statText}>{item.wordCount.toLocaleString()} mots</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="library-outline" size={14} color="#888" />
            <Text style={styles.statText}>{item.chaptersCount} chapitres</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Rendu d'une action rapide
  const renderQuickAction = ({ item }: { item: QuickAction }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { borderLeftColor: item.color }]}
      onPress={item.action}
      activeOpacity={0.8}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color="#fff" />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{item.title}</Text>
        <Text style={styles.quickActionDescription}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  // Rendu d'un mode d'écriture
  const renderWritingMode = ({ item }: { item: WritingMode }) => (
    <TouchableOpacity
      style={styles.writingModeCard}
      onPress={() => {
        setSelectedMode(item);
        setShowModeSelector(false);
        router.push(`/write/editor/new?mode=${item.id}`);
      }}
      activeOpacity={0.8}
    >
      <LinearGradient colors={item.gradient as any} style={styles.writingModeGradient}>
        <View style={styles.writingModeHeader}>
          <Ionicons name={item.icon as any} size={32} color="#fff" />
          <Text style={styles.writingModeTitle}>{item.name}</Text>
        </View>
        <Text style={styles.writingModeDescription}>{item.description}</Text>
        
        <View style={styles.writingModeFeatures}>
          {item.features.slice(0, 2).map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Rendu du sélecteur de type de création
  const renderCreationTypeSelector = () => (
    <View style={styles.creationTypeSelector}>
      <Text style={styles.sectionTitle}>Que souhaitez-vous créer ?</Text>
      <Text style={styles.sectionSubtitle}>Choisissez votre mode de création</Text>
      
      <View style={styles.creationTypesContainer}>
        {creationTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.creationTypeCard,
              selectedWritingType === type.id && styles.creationTypeCardSelected
            ]}
            onPress={() => setSelectedWritingType(type.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={type.gradient as [string, string]}
              style={styles.creationTypeGradient}
            >
              <View style={styles.creationTypeIcon}>
                <Ionicons name={type.icon as any} size={32} color="#fff" />
              </View>
              
              <Text style={styles.creationTypeTitle}>{type.title}</Text>
              <Text style={styles.creationTypeDescription}>{type.description}</Text>
              
              <View style={styles.creationTypeFeatures}>
                {type.features.slice(0, 2).map((feature, index) => (
                  <View key={index} style={styles.creationTypeFeature}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.creationTypeFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              {selectedWritingType === type.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
      
      {selectedWritingType && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => setShowQuickActions(true)}
        >
          <LinearGradient
            colors={['#FFA94D', '#FF8A65']}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header avec effet de parallaxe */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['#181818', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Bonsoir</Text>
              <Text style={styles.userName}>Créateur</Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setShowQuickActions(true)}
              >
                <Ionicons name="add" size={24} color="#FFA94D" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFA94D']}
            tintColor="#FFA94D"
          />
        }
      >
        {/* Sélecteur de type de création */}
        {!selectedWritingType ? (
          renderCreationTypeSelector()
        ) : (
          <>
            {/* Section retour */}
            <View style={styles.heroSection}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedWritingType(null)}
              >
                <Ionicons name="arrow-back" size={20} color="#FFA94D" />
                <Text style={styles.backButtonText}>Changer de type</Text>
              </TouchableOpacity>
              
              <Text style={styles.heroTitle}>
                {selectedWritingType === 'manga' ? 'Créer un Manga' : 'Écrire un Livre'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {selectedWritingType === 'manga' 
                  ? 'Dessinez et publiez vos histoires visuelles'
                  : 'Créez, collaborez et publiez avec les outils d\'écriture les plus avancés'
                }
              </Text>
            </View>

            {/* Section spéciale Manga */}
            {selectedWritingType === 'manga' && (
              <View style={styles.mangaSpecialSection}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.mangaInfoCard}
                >
                  <View style={styles.mangaInfoHeader}>
                    <Ionicons name="brush-outline" size={28} color="#fff" />
                    <Text style={styles.mangaInfoTitle}>Studio Manga</Text>
                  </View>
                  
                  <View style={styles.mangaStatsRow}>
                    <View style={styles.mangaStat}>
                      <Text style={styles.mangaStatNumber}>12</Text>
                      <Text style={styles.mangaStatLabel}>Pages</Text>
                    </View>
                    <View style={styles.mangaStat}>
                      <Text style={styles.mangaStatNumber}>3</Text>
                      <Text style={styles.mangaStatLabel}>Chapitres</Text>
                    </View>
                    <View style={styles.mangaStat}>
                      <Text style={styles.mangaStatNumber}>45</Text>
                      <Text style={styles.mangaStatLabel}>Followers</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.mangaTip}>
                    💡 Conseil du jour : Utilisez le format 4-koma pour les histoires comiques courtes
                  </Text>
                </LinearGradient>

                {/* Outils Manga Rapides */}
                <View style={styles.mangaToolsGrid}>
                  <TouchableOpacity 
                    style={styles.mangaTool}
                    onPress={() => router.push('/write/manga-tools')}
                  >
                    <LinearGradient
                      colors={['#FF5722', '#FF8A65']}
                      style={styles.mangaToolGradient}
                    >
                      <Ionicons name="brush" size={24} color="#fff" />
                      <Text style={styles.mangaToolText}>Pinceaux</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.mangaTool}
                    onPress={() => router.push('/write/manga-layouts')}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#81C784']}
                      style={styles.mangaToolGradient}
                    >
                      <Ionicons name="grid" size={24} color="#fff" />
                      <Text style={styles.mangaToolText}>Layouts</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.mangaTool}
                    onPress={() => router.push('/write/manga-bubbles')}
                  >
                    <LinearGradient
                      colors={['#00BCD4', '#4DD0E1']}
                      style={styles.mangaToolGradient}
                    >
                      <Ionicons name="chatbubble" size={24} color="#fff" />
                      <Text style={styles.mangaToolText}>Bulles</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.mangaTool}
                    onPress={() => router.push('/write/manga-characters')}
                  >
                    <LinearGradient
                      colors={['#9C27B0', '#BA68C8']}
                      style={styles.mangaToolGradient}
                    >
                      <Ionicons name="person" size={24} color="#fff" />
                      <Text style={styles.mangaToolText}>Persos</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Actions Rapides Manga */}
                <View style={styles.mangaQuickActions}>
                  <Text style={styles.mangaQuickActionsTitle}>Actions Rapides</Text>
                  <View style={styles.mangaQuickActionsGrid}>
                    {mangaActions.slice(0, 4).map((action) => (
                      <TouchableOpacity
                        key={action.id}
                        style={styles.mangaQuickActionItem}
                        onPress={action.action}
                      >
                        <View style={[styles.mangaQuickActionIcon, { backgroundColor: action.color }]}>
                          <Ionicons name={action.icon as any} size={20} color="#fff" />
                        </View>
                        <Text style={styles.mangaQuickActionTitle}>{action.title}</Text>
                        <Text style={styles.mangaQuickActionDesc}>{action.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Contenu conditionnel selon le type sélectionné */}
        {selectedWritingType && (
          <>
            {/* Projets récents */}
            {recentProjects.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Continuer l'écriture</Text>
                  <TouchableOpacity onPress={() => router.push('/write/projects')}>
                    <Text style={styles.sectionAction}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={recentProjects}
                  renderItem={renderProjectCard}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.projectsList}
                />
              </View>
            )}
          </>
        )}

        {selectedWritingType && (
          <>
            {/* Recherche et filtres */}
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un projet..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter.key && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedFilter(filter.key as any)}
                  >
                    <Ionicons 
                      name={filter.icon as any} 
                      size={16} 
                      color={selectedFilter === filter.key ? '#181818' : '#FFA94D'} 
                    />
                    <Text style={[
                      styles.filterText,
                      selectedFilter === filter.key && styles.filterTextActive
                    ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Liste des projets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {selectedWritingType === 'manga' ? 'Mes Mangas' : 'Mes Projets'}
              </Text>
          
          {filteredProjects.map((project, index) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectListItem}
              onPress={() => router.push(`/write/editor/${project.id}`)}
            >
              <View style={styles.projectListImage}>
                {project.cover ? (
                  <Image source={{ uri: project.cover }} style={styles.listImage} />
                ) : (
                  <LinearGradient colors={['#667eea', '#764ba2']} style={styles.listImagePlaceholder}>
                    <Ionicons name="book-outline" size={20} color="#fff" />
                  </LinearGradient>
                )}
              </View>
              
              <View style={styles.projectListContent}>
                <Text style={styles.projectListTitle}>{project.title}</Text>
                <Text style={styles.projectListDescription} numberOfLines={1}>
                  {project.description}
                </Text>
                <View style={styles.projectListMeta}>
                  <Text style={styles.projectListGenre}>{project.genre}</Text>
                  <Text style={styles.projectListDot}>•</Text>
                  <Text style={styles.projectListWords}>
                    {project.wordCount.toLocaleString()} mots
                  </Text>
                </View>
              </View>
              
              <View style={styles.projectListActions}>
                <View style={styles.projectListProgress}>
                  <Text style={styles.projectListProgressText}>{project.progress}%</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>

      {/* Modal Actions Rapides */}
      <Modal
        visible={showQuickActions}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.quickActionsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedWritingType === 'manga' ? 'Outils Manga' : 'Actions Rapides'}
              </Text>
              <TouchableOpacity onPress={() => setShowQuickActions(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
            {/* Header spécial pour Manga */}
            {selectedWritingType === 'manga' && (
              <View style={styles.mangaModalHeader}>
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={styles.mangaModalBanner}
                >
                  <Ionicons name="brush-outline" size={24} color="#fff" />
                  <Text style={styles.mangaModalText}>
                    Créez des mangas professionnels avec nos outils avancés
                  </Text>
                </LinearGradient>
              </View>
            )}
            
            <FlatList
              data={quickActions}
              renderItem={renderQuickAction}
              keyExtractor={(item) => item.id}
              style={styles.quickActionsList}
            />
          </View>
        </BlurView>
      </Modal>

      {/* Modal Sélecteur de Mode */}
      <Modal
        visible={showModeSelector}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.writingModeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un Mode d'Écriture</Text>
              <TouchableOpacity onPress={() => setShowModeSelector(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={writingModes}
              renderItem={renderWritingMode}
              keyExtractor={(item) => item.id}
              style={styles.writingModesList}
              numColumns={2}
              columnWrapperStyle={styles.writingModesRow}
            />
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 100,
  },
  headerGradient: {
    flex: 1,
    paddingTop: 45,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  greeting: {
    color: '#888',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll View
  scrollView: {
    flex: 1,
    paddingTop: 100,
  },

  // Hero Section
  heroSection: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  heroButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  heroButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionAction: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },

  // Projets en carte
  projectsList: {
    paddingRight: 20,
  },
  projectCard: {
    width: 200,
    backgroundColor: '#23232a',
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  projectImageContainer: {
    position: 'relative',
    height: 120,
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  projectImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectStatus: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectInfo: {
    padding: 16,
  },
  projectTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectGenre: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  projectStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#888',
    fontSize: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 2,
  },
  progressText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },

  // Recherche et filtres
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#FFA94D',
  },
  filterText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#181818',
  },

  // Liste des projets
  projectListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  projectListImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectListContent: {
    flex: 1,
  },
  projectListTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectListDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  projectListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectListGenre: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  projectListDot: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 8,
  },
  projectListWords: {
    color: '#666',
    fontSize: 12,
  },
  projectListActions: {
    alignItems: 'center',
    gap: 8,
  },
  projectListProgress: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  projectListProgressText: {
    color: '#FFA94D',
    fontSize: 10,
    fontWeight: '600',
  },

  // Modales
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  quickActionsModal: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  writingModeModal: {
    backgroundColor: '#181818',
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
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Actions rapides
  quickActionsList: {
    padding: 20,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickActionDescription: {
    color: '#888',
    fontSize: 14,
  },

  // Modes d'écriture
  writingModesList: {
    padding: 20,
  },
  writingModesRow: {
    justifyContent: 'space-between',
  },
  writingModeCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  writingModeGradient: {
    padding: 20,
    minHeight: 180,
  },
  writingModeHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  writingModeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  writingModeDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  writingModeFeatures: {
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10,
    flex: 1,
  },

  // Espacement
  bottomSpacing: {
    height: 100,
  },

  // Sélecteur de type de création
  creationTypeSelector: {
    padding: 20,
    marginTop: 20,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  creationTypesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  creationTypeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  creationTypeCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  creationTypeGradient: {
    padding: 20,
    position: 'relative',
  },
  creationTypeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  creationTypeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  creationTypeDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  creationTypeFeatures: {
    gap: 8,
  },
  creationTypeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creationTypeFeatureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 8,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Bouton de retour
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },

  // Styles spéciaux pour Manga
  mangaSpecialSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  mangaInfoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  mangaInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mangaInfoTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  mangaStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  mangaStat: {
    alignItems: 'center',
  },
  mangaStatNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mangaStatLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  mangaTip: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  mangaToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  mangaTool: {
    width: (width - 64) / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mangaToolGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  mangaToolText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  // Styles pour modal manga
  mangaModalHeader: {
    marginBottom: 16,
  },
  mangaModalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  mangaModalText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Actions rapides manga
  mangaQuickActions: {
    marginTop: 16,
  },
  mangaQuickActionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mangaQuickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  mangaQuickActionItem: {
    width: (width - 64) / 2,
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  mangaQuickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mangaQuickActionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  mangaQuickActionDesc: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default WritingDashboard;