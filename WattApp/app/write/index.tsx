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
  
  // Animations
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

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

  // Actions rapides
  const quickActions: QuickAction[] = [
    {
      id: 'new-project',
      title: 'Nouveau Projet',
      description: 'Commencer un nouveau livre',
      icon: 'add-circle',
      color: '#4CAF50',
      action: () => router.push('/write/new-project')
    },
    {
      id: 'continue-writing',
      title: 'Continuer à Écrire',
      description: 'Reprendre votre projet actuel',
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
      title: 'Templates',
      description: 'Utiliser un modèle prédéfini',
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
        {/* Section Héro */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Donnez vie à vos histoires</Text>
          <Text style={styles.heroSubtitle}>
            Créez, collaborez et publiez avec les outils d'écriture les plus avancés
          </Text>
          
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => setShowModeSelector(true)}
          >
            <LinearGradient colors={['#FFA94D', '#FF6B6B']} style={styles.heroButtonGradient}>
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={styles.heroButtonText}>Commencer à écrire</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
          <Text style={styles.sectionTitle}>Mes Projets</Text>
          
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
              <Text style={styles.modalTitle}>Actions Rapides</Text>
              <TouchableOpacity onPress={() => setShowQuickActions(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
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
});

export default WritingDashboard;