import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Image,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  status: 'planning' | 'writing' | 'editing' | 'reviewing' | 'published' | 'paused';
  progress: number;
  wordCount: number;
  targetWordCount: number;
  chaptersCount: number;
  targetChaptersCount: number;
  createdAt: Date;
  lastModified: Date;
  deadline?: Date;
  cover?: string;
  tags: string[];
  collaborators: string[];
  isPublic: boolean;
  publishedUrl?: string;
  analytics: ProjectAnalytics;
  notes: string;
  outline: ChapterOutline[];
}

interface ProjectAnalytics {
  dailyWordCount: { date: string; words: number }[];
  totalWritingTime: number; // en minutes
  averageSessionLength: number; // en minutes
  mostProductiveTime: string;
  weeklyGoalProgress: number;
  streakDays: number;
  readingTime: number; // en minutes
  readability: number; // score sur 100
}

interface ChapterOutline {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'writing' | 'completed';
  wordCount: number;
  targetWordCount: number;
  notes: string;
  keyEvents: string[];
  order: number;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  totalWords: number;
  publishedBooks: number;
  averageProgress: number;
  writingStreak: number;
}

const ProjectsManager: React.FC = () => {
  const router = useRouter();
  
  // États principaux
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalWords: 0,
    publishedBooks: 0,
    averageProgress: 0,
    writingStreak: 0,
  });
  
  // États de l'interface
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'kanban'>('cards');
  
  // États de filtrage et tri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'progress' | 'deadline'>('recent');
  const [showFilters, setShowFilters] = useState(false);

  // Création de nouveau projet
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    genre: '',
    targetWordCount: 50000,
    targetChaptersCount: 20,
    deadline: null as Date | null,
    isPublic: false,
  });

  // Statuts disponibles
  const statusOptions = [
    { key: 'all', label: 'Tous', color: '#888', icon: 'library-outline' },
    { key: 'planning', label: 'Planification', color: '#9C27B0', icon: 'create-outline' },
    { key: 'writing', label: 'Rédaction', color: '#2196F3', icon: 'pencil-outline' },
    { key: 'editing', label: 'Révision', color: '#FF9800', icon: 'build-outline' },
    { key: 'reviewing', label: 'Relecture', color: '#795548', icon: 'eye-outline' },
    { key: 'published', label: 'Publié', color: '#4CAF50', icon: 'checkmark-circle-outline' },
    { key: 'paused', label: 'En pause', color: '#F44336', icon: 'pause-circle-outline' },
  ];

  // Genres disponibles
  const genreOptions = [
    'Romance', 'Fantasy', 'Science-fiction', 'Thriller', 'Mystère', 'Drame',
    'Comédie', 'Horreur', 'Aventure', 'Historique', 'Biographie', 'Autre'
  ];

  // Chargement des données
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchQuery, selectedStatus, selectedGenre, sortBy]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Simuler le chargement des projets
      const mockProjects: Project[] = [
        {
          id: '1',
          title: 'Les Chroniques d\'Aetheria',
          description: 'Une épopée fantasy dans un monde magique où les éléments sont vivants',
          genre: 'Fantasy',
          status: 'writing',
          progress: 65,
          wordCount: 45000,
          targetWordCount: 80000,
          chaptersCount: 12,
          targetChaptersCount: 20,
          createdAt: new Date(2024, 0, 15),
          lastModified: new Date(),
          deadline: new Date(2024, 11, 31),
          cover: 'https://picsum.photos/300/400?random=1',
          tags: ['fantasy', 'magie', 'aventure'],
          collaborators: [],
          isPublic: true,
          analytics: {
            dailyWordCount: [
              { date: '2024-11-01', words: 1200 },
              { date: '2024-11-02', words: 800 },
              { date: '2024-11-03', words: 1500 },
            ],
            totalWritingTime: 4800, // 80 heures
            averageSessionLength: 45,
            mostProductiveTime: '09:00-11:00',
            weeklyGoalProgress: 78,
            streakDays: 12,
            readingTime: 180,
            readability: 82
          },
          notes: 'Explorer davantage la relation entre Aria et les esprits élémentaires',
          outline: [
            {
              id: '1',
              title: 'Le Réveil des Éléments',
              description: 'Introduction du monde et découverte des pouvoirs d\'Aria',
              status: 'completed',
              wordCount: 3500,
              targetWordCount: 4000,
              notes: 'Bien développé, peut-être ajouter plus de descriptions du village',
              keyEvents: ['Découverte des pouvoirs', 'Rencontre avec Zeph'],
              order: 1
            },
            {
              id: '2',
              title: 'La Prophétie Ancienne',
              description: 'Révélation de la prophétie et départ vers la capitale',
              status: 'writing',
              wordCount: 2800,
              targetWordCount: 4000,
              notes: 'Développer la mythologie du monde',
              keyEvents: ['Révélation prophétie', 'Départ du village'],
              order: 2
            }
          ]
        },
        {
          id: '2',
          title: 'Néon & Circuits',
          description: 'Thriller cyberpunk dans une mégalopole futuriste',
          genre: 'Science-fiction',
          status: 'editing',
          progress: 85,
          wordCount: 72000,
          targetWordCount: 75000,
          chaptersCount: 18,
          targetChaptersCount: 20,
          createdAt: new Date(2024, 1, 10),
          lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          cover: 'https://picsum.photos/300/400?random=2',
          tags: ['cyberpunk', 'technologie', 'dystopie'],
          collaborators: ['Alex Chen'],
          isPublic: false,
          analytics: {
            dailyWordCount: [],
            totalWritingTime: 6000,
            averageSessionLength: 60,
            mostProductiveTime: '20:00-22:00',
            weeklyGoalProgress: 45,
            streakDays: 5,
            readingTime: 240,
            readability: 76
          },
          notes: 'Réviser les scènes d\'action au chapitre 15',
          outline: []
        },
        {
          id: '3',
          title: 'Lettres à Luna',
          description: 'Romance épistolaire entre deux âmes perdues qui se retrouvent',
          genre: 'Romance',
          status: 'published',
          progress: 100,
          wordCount: 58000,
          targetWordCount: 60000,
          chaptersCount: 24,
          targetChaptersCount: 24,
          createdAt: new Date(2023, 8, 5),
          lastModified: new Date(2024, 2, 20),
          cover: 'https://picsum.photos/300/400?random=3',
          tags: ['romance', 'lettres', 'émotions'],
          collaborators: [],
          isPublic: true,
          publishedUrl: 'https://wattapp.com/books/lettres-a-luna',
          analytics: {
            dailyWordCount: [],
            totalWritingTime: 5400,
            averageSessionLength: 50,
            mostProductiveTime: '14:00-16:00',
            weeklyGoalProgress: 100,
            streakDays: 0,
            readingTime: 193,
            readability: 88
          },
          notes: 'Livre terminé et publié avec succès!',
          outline: []
        }
      ];

      setProjects(mockProjects);
      
      // Calculer les statistiques
      const totalProjects = mockProjects.length;
      const activeProjects = mockProjects.filter(p => 
        ['planning', 'writing', 'editing', 'reviewing'].includes(p.status)
      ).length;
      const totalWords = mockProjects.reduce((sum, p) => sum + p.wordCount, 0);
      const publishedBooks = mockProjects.filter(p => p.status === 'published').length;
      const averageProgress = Math.round(
        mockProjects.reduce((sum, p) => sum + p.progress, 0) / totalProjects
      );
      const writingStreak = Math.max(...mockProjects.map(p => p.analytics.streakDays));

      setStats({
        totalProjects,
        activeProjects,
        totalWords,
        publishedBooks,
        averageProgress,
        writingStreak,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProjects = () => {
    let filtered = [...projects];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.genre.toLowerCase().includes(query) ||
        project.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filtrage par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(project => project.status === selectedStatus);
    }

    // Filtrage par genre
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(project => project.genre === selectedGenre);
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'progress':
          return b.progress - a.progress;
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.getTime() - b.deadline.getTime();
        case 'recent':
        default:
          return b.lastModified.getTime() - a.lastModified.getTime();
      }
    });

    setFilteredProjects(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects().finally(() => setRefreshing(false));
  }, []);

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour votre projet');
      return;
    }

    try {
      // Simuler la création du projet
      const project: Project = {
        id: Date.now().toString(),
        title: newProject.title,
        description: newProject.description,
        genre: newProject.genre || 'Autre',
        status: 'planning',
        progress: 0,
        wordCount: 0,
        targetWordCount: newProject.targetWordCount,
        chaptersCount: 0,
        targetChaptersCount: newProject.targetChaptersCount,
        createdAt: new Date(),
        lastModified: new Date(),
        deadline: newProject.deadline,
        tags: [],
        collaborators: [],
        isPublic: newProject.isPublic,
        analytics: {
          dailyWordCount: [],
          totalWritingTime: 0,
          averageSessionLength: 0,
          mostProductiveTime: '',
          weeklyGoalProgress: 0,
          streakDays: 0,
          readingTime: 0,
          readability: 0
        },
        notes: '',
        outline: []
      };

      setProjects(prev => [project, ...prev]);
      setNewProject({
        title: '',
        description: '',
        genre: '',
        targetWordCount: 50000,
        targetChaptersCount: 20,
        deadline: null,
        isPublic: false,
      });
      setShowCreateProject(false);
      
      Alert.alert('Succès', 'Projet créé avec succès!');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le projet');
    }
  };

  // Rendu des statistiques
  const renderStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>Aperçu</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
          <Ionicons name="library-outline" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.totalProjects}</Text>
          <Text style={styles.statLabel}>Projets</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
          <Ionicons name="create-outline" size={24} color="#2196F3" />
          <Text style={styles.statValue}>{stats.activeProjects}</Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
          <Ionicons name="text-outline" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{Math.round(stats.totalWords / 1000)}k</Text>
          <Text style={styles.statLabel}>Mots</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: '#9C27B0' }]}>
          <Ionicons name="flame-outline" size={24} color="#9C27B0" />
          <Text style={styles.statValue}>{stats.writingStreak}</Text>
          <Text style={styles.statLabel}>Série</Text>
        </View>
      </View>
    </View>
  );

  // Rendu d'une carte de projet
  const renderProjectCard = ({ item }: { item: Project }) => {
    const statusConfig = statusOptions.find(s => s.key === item.status);
    const isOverdue = item.deadline && item.deadline < new Date() && item.status !== 'published';
    
    return (
      <TouchableOpacity
        style={[styles.projectCard, isOverdue && styles.projectCardOverdue]}
        onPress={() => {
          setSelectedProject(item);
          setShowProjectDetails(true);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.projectCardHeader}>
          {item.cover ? (
            <Image source={{ uri: item.cover }} style={styles.projectCover} />
          ) : (
            <LinearGradient
              colors={[statusConfig?.color || '#666', (statusConfig?.color || '#666') + '80']}
              style={styles.projectCoverPlaceholder}
            >
              <Ionicons name="book-outline" size={24} color="#fff" />
            </LinearGradient>
          )}
          
          <View style={styles.projectInfo}>
            <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.projectGenre}>{item.genre}</Text>
            
            <View style={styles.projectMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig?.color }]}>
                <Ionicons name={statusConfig?.icon as any} size={12} color="#fff" />
                <Text style={styles.statusText}>{statusConfig?.label}</Text>
              </View>
              
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <Ionicons name="warning" size={12} color="#F44336" />
                  <Text style={styles.overdueText}>Retard</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.projectDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Progression: {item.progress}%</Text>
            <Text style={styles.wordCountText}>
              {item.wordCount.toLocaleString()} / {item.targetWordCount.toLocaleString()} mots
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
          </View>
        </View>

        <View style={styles.projectFooter}>
          <Text style={styles.lastModified}>
            Modifié {item.lastModified.toLocaleDateString()}
          </Text>
          
          <View style={styles.projectActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/write/editor/${item.id}`)}
            >
              <Ionicons name="create-outline" size={16} color="#FFA94D" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedProject(item);
                setShowProjectDetails(true);
              }}
            >
              <Ionicons name="settings-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu des détails du projet
  const renderProjectDetails = () => (
    <Modal visible={showProjectDetails} animationType="slide" statusBarTranslucent>
      <View style={styles.detailsContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#181818" />
        
        {/* Header */}
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={() => setShowProjectDetails(false)}>
            <Ionicons name="close" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.detailsHeaderTitle}>Détails du Projet</Text>
          <TouchableOpacity
            onPress={() => selectedProject && router.push(`/write/editor/${selectedProject.id}`)}
          >
            <Ionicons name="create-outline" size={24} color="#FFA94D" />
          </TouchableOpacity>
        </View>

        {selectedProject && (
          <ScrollView style={styles.detailsContent}>
            {/* Informations principales */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>{selectedProject.title}</Text>
              <Text style={styles.detailsDescription}>{selectedProject.description}</Text>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsItemLabel}>Genre</Text>
                  <Text style={styles.detailsItemValue}>{selectedProject.genre}</Text>
                </View>
                
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsItemLabel}>Statut</Text>
                  <Text style={styles.detailsItemValue}>
                    {statusOptions.find(s => s.key === selectedProject.status)?.label}
                  </Text>
                </View>
                
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsItemLabel}>Progression</Text>
                  <Text style={styles.detailsItemValue}>{selectedProject.progress}%</Text>
                </View>
                
                <View style={styles.detailsItem}>
                  <Text style={styles.detailsItemLabel}>Mots</Text>
                  <Text style={styles.detailsItemValue}>
                    {selectedProject.wordCount.toLocaleString()} / {selectedProject.targetWordCount.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Analytiques */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Analytiques</Text>
              
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Ionicons name="time-outline" size={20} color="#4CAF50" />
                  <Text style={styles.analyticsValue}>
                    {Math.round(selectedProject.analytics.totalWritingTime / 60)}h
                  </Text>
                  <Text style={styles.analyticsLabel}>Temps d'écriture</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Ionicons name="flame-outline" size={20} color="#FF9800" />
                  <Text style={styles.analyticsValue}>{selectedProject.analytics.streakDays}</Text>
                  <Text style={styles.analyticsLabel}>Série actuelle</Text>
                </View>
                
                <View style={styles.analyticsCard}>
                  <Ionicons name="speedometer-outline" size={20} color="#2196F3" />
                  <Text style={styles.analyticsValue}>{selectedProject.analytics.readability}%</Text>
                  <Text style={styles.analyticsLabel}>Lisibilité</Text>
                </View>
              </View>
            </View>

            {/* Plan du livre */}
            {selectedProject.outline.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Plan du Livre</Text>
                
                {selectedProject.outline.map((chapter, index) => (
                  <View key={chapter.id} style={styles.chapterCard}>
                    <View style={styles.chapterHeader}>
                      <Text style={styles.chapterTitle}>
                        Chapitre {index + 1}: {chapter.title}
                      </Text>
                      <View style={[
                        styles.chapterStatus,
                        { backgroundColor: 
                          chapter.status === 'completed' ? '#4CAF50' :
                          chapter.status === 'writing' ? '#FF9800' : '#666'
                        }
                      ]}>
                        <Text style={styles.chapterStatusText}>
                          {chapter.status === 'completed' ? 'Terminé' :
                           chapter.status === 'writing' ? 'En cours' : 'Planifié'}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.chapterDescription}>{chapter.description}</Text>
                    
                    <View style={styles.chapterProgress}>
                      <Text style={styles.chapterWordCount}>
                        {chapter.wordCount} / {chapter.targetWordCount} mots
                      </Text>
                      <View style={styles.chapterProgressBar}>
                        <View style={[
                          styles.chapterProgressFill,
                          { width: `${Math.min(100, (chapter.wordCount / chapter.targetWordCount) * 100)}%` }
                        ]} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Notes */}
            {selectedProject.notes && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Notes</Text>
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{selectedProject.notes}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Projets</Text>
        <TouchableOpacity onPress={() => setShowCreateProject(true)}>
          <Ionicons name="add" size={24} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Recherche et filtres */}
      <View style={styles.searchSection}>
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
        
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Ionicons name="filter-outline" size={20} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {renderStats()}

      {/* Liste des projets */}
      <FlatList
        data={filteredProjects}
        renderItem={renderProjectCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.projectsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFA94D']}
            tintColor="#FFA94D"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>Aucun projet trouvé</Text>
            <Text style={styles.emptyStateSubtext}>
              Créez votre premier projet pour commencer à écrire
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowCreateProject(true)}
            >
              <Text style={styles.emptyStateButtonText}>Créer un projet</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal de création de projet */}
      <Modal visible={showCreateProject} animationType="slide" transparent statusBarTranslucent>
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.createProjectModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Projet</Text>
              <TouchableOpacity onPress={() => setShowCreateProject(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.createProjectContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Titre *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newProject.title}
                  onChangeText={(text) => setNewProject(prev => ({ ...prev, title: text }))}
                  placeholder="Le titre de votre livre"
                  placeholderTextColor="#666"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newProject.description}
                  onChangeText={(text) => setNewProject(prev => ({ ...prev, description: text }))}
                  placeholder="Une brève description de votre histoire"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Genre</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {genreOptions.map((genre) => (
                    <TouchableOpacity
                      key={genre}
                      style={[
                        styles.genreOption,
                        newProject.genre === genre && styles.genreOptionSelected
                      ]}
                      onPress={() => setNewProject(prev => ({ ...prev, genre }))}
                    >
                      <Text style={[
                        styles.genreOptionText,
                        newProject.genre === genre && styles.genreOptionTextSelected
                      ]}>
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Objectif mots</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newProject.targetWordCount.toString()}
                    onChangeText={(text) => setNewProject(prev => ({ 
                      ...prev, 
                      targetWordCount: parseInt(text) || 0 
                    }))}
                    keyboardType="numeric"
                    placeholder="50000"
                    placeholderTextColor="#666"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Chapitres</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newProject.targetChaptersCount.toString()}
                    onChangeText={(text) => setNewProject(prev => ({ 
                      ...prev, 
                      targetChaptersCount: parseInt(text) || 0 
                    }))}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateProject(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateProject}
              >
                <Text style={styles.createButtonText}>Créer le projet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Détails du projet */}
      {renderProjectDetails()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Recherche
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Statistiques
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Projets
  projectsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  projectCard: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  projectCardOverdue: {
    borderWidth: 1,
    borderColor: '#F44336',
  },
  projectCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  projectCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  projectCoverPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  projectTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectGenre: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  projectMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  overdueText: {
    color: '#F44336',
    fontSize: 10,
    fontWeight: '600',
  },
  projectDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  wordCountText: {
    color: '#888',
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 3,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastModified: {
    color: '#666',
    fontSize: 12,
  },
  projectActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createProjectModal: {
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
  createProjectContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
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
    height: 80,
    textAlignVertical: 'top',
  },
  genreOption: {
    backgroundColor: '#23232a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  genreOptionSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  genreOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  genreOptionTextSelected: {
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
  createButton: {
    flex: 2,
    backgroundColor: '#FFA94D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Détails
  detailsContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailsHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsContent: {
    padding: 20,
  },
  detailsSection: {
    marginBottom: 32,
  },
  detailsSectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  detailsDescription: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailsItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#23232a',
    padding: 16,
    borderRadius: 12,
  },
  detailsItemLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  detailsItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#23232a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyticsValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  analyticsLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  chapterCard: {
    backgroundColor: '#23232a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  chapterStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chapterStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  chapterDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  chapterProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chapterWordCount: {
    color: '#888',
    fontSize: 12,
  },
  chapterProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  chapterProgressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 2,
  },
  notesContainer: {
    backgroundColor: '#23232a',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA94D',
  },
  notesText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default ProjectsManager;