import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  ScrollView,
  FlatList,
  PanResponder,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import MangaDrawingModal from '../../components/MangaDrawingModal';
import MangaCoverCreator from '../../components/MangaCoverCreator';
import { mangaProjectService, MangaProject, MangaPage, MangaPanel, DrawingPath } from '../../services/MangaProjectService';
import { getAuth } from 'firebase/auth';
import app from '../../../constants/firebaseConfig';

const { width, height } = Dimensions.get('window');

interface DrawingTool {
  type: 'pen' | 'brush' | 'eraser' | 'text' | 'shape';
  size: number;
  color: string;
  opacity: number;
}

const MangaEditorSimple: React.FC = () => {
  const router = useRouter();
  const { templateId, projectId } = useLocalSearchParams();
  
  // États principaux
  const [project, setProject] = useState<MangaProject | null>(null);
  const [currentPage, setCurrentPage] = useState<MangaPage | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<DrawingTool>({
    type: 'pen',
    size: 3,
    color: '#000000',
    opacity: 1,
  });
  
  // États de l'interface
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showCoverCreator, setShowCoverCreator] = useState(false);
  const [drawingPanelData, setDrawingPanelData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState('');
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Fonction pour obtenir l'utilisateur actuel
  const getCurrentUser = () => {
    const auth = getAuth(app);
    return auth.currentUser;
  };

  // Générer un titre par défaut
  const generateDefaultTitle = () => {
    return `Mon Manga ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
  };

  // Initialiser avec un template ou créer vide
  useEffect(() => {
    if (templateId) {
      createProjectWithTemplate(templateId as string);
    } else if (projectId && projectId !== 'new') {
      loadExistingProject(projectId as string);
    } else {
      createEmptyProject();
    }
  }, [templateId, projectId]);

  // Charger un projet existant
  const loadExistingProject = async (id: string) => {
    try {
      setLoading(true);
      const loadedProject = await mangaProjectService.getProject(id);
      if (loadedProject && loadedProject.pages) {
        setProject(loadedProject);
        setCurrentPage(loadedProject.pages[0] || null);
      }
    } catch (error) {
      console.error('Erreur chargement projet:', error);
      Alert.alert('Erreur', 'Impossible de charger le projet');
    } finally {
      setLoading(false);
    }
  };

  // Créer un projet vide
  const createEmptyProject = () => {
    setLoading(true);
    const templateType = 'classic-page';
    
    const templates = {
      'classic-page': {
        panels: [
          { id: '1', x: 10, y: 10, width: 80, height: 35, paths: [], textBubbles: [], order: 0 },
          { id: '2', x: 10, y: 49, width: 80, height: 20, paths: [], textBubbles: [], order: 1 },
          { id: '3', x: 10, y: 71, width: 80, height: 20, paths: [], textBubbles: [], order: 2 },
        ]
      }
    };
    
    const template = templates[templateType as keyof typeof templates] || templates['classic-page'];
    createProjectWithPanels(template.panels);
    setLoading(false);
  };

  const createProjectWithPanels = (panels: any[]) => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer un manga');
      return;
    }
    
    const page: MangaPage = {
      id: '1',
      pageNumber: 1,
      order: 0,
      title: 'Page 1',
      panels: panels,
    };
    
    const newProject: MangaProject = {
      id: 'new',
      title: generateDefaultTitle(),
      authorId: user.uid,
      authorUid: user.uid,
      author: user.displayName || user.email || 'Auteur',
      status: 'draft',
      type: 'manga',
      createdAt: new Date(),
      updatedAt: new Date(),
      pages: [page],
      currentPageId: page.id,
      isPublished: false,
      totalPages: 1,
      tags: [],
      genre: 'Manga',
      templateId: templateId as string,
      description: 'Nouveau manga',
    };

    setProject(newProject);
    setCurrentPage(page);
  };

  // Créer un projet avec template
  const createProjectWithTemplate = (templateType: string) => {
    createEmptyProject();
  };

  // Navigation entre pages
  const switchToPage = async (page: MangaPage) => {
    if (hasUnsavedChanges) {
      await saveProject();
    }
    setCurrentPage(page);
    setSelectedPanel(null);
  };

  const goToNextPage = () => {
    if (!project || !currentPage) return;
    const currentIndex = project.pages.findIndex(p => p.id === currentPage.id);
    const nextPage = project.pages[currentIndex + 1];
    if (nextPage) {
      switchToPage(nextPage);
    }
  };

  const goToPreviousPage = () => {
    if (!project || !currentPage) return;
    const currentIndex = project.pages.findIndex(p => p.id === currentPage.id);
    const previousPage = project.pages[currentIndex - 1];
    if (previousPage) {
      switchToPage(previousPage);
    }
  };

  // Gestion des gestes de swipe
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderMove: () => {},
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > 50) {
        goToPreviousPage();
      } else if (gestureState.dx < -50) {
        goToNextPage();
      }
    },
  });

  // Ouvrir modal de dessin
  const openDrawingModal = (panel: MangaPanel) => {
    const panelData = {
      id: panel.id,
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      existingPaths: panel.paths,
    };
    
    setDrawingPanelData(panelData);
    setShowDrawingModal(true);
  };

  // Sauvegarder les dessins
  const handleSaveDrawing = async (drawingData: any) => {
    if (!selectedPanel || !drawingData || !currentPage) return;
    
    try {
      setIsSaving(true);
      
      const newPaths = drawingData.paths.map((path: any) => ({
        id: path.id,
        d: path.d,
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
        tool: 'pen' as const,
        timestamp: Date.now(),
      }));
      
      // Mettre à jour la page courante
      const updatedPanels = currentPage.panels.map(panel =>
        panel.id === selectedPanel
          ? { ...panel, paths: newPaths }
          : panel
      );
      
      const updatedPage = { ...currentPage, panels: updatedPanels };
      setCurrentPage(updatedPage);
      
      // Mettre à jour le projet
      if (project) {
        const updatedPages = project.pages.map(page =>
          page.id === currentPage.id ? updatedPage : page
        );
        setProject({ ...project, pages: updatedPages });
      }
      
      // Sauvegarder dans la BDD si projet existant
      if (projectId && projectId !== 'new') {
        await mangaProjectService.savePanelDrawings(
          projectId as string,
          currentPage.id,
          selectedPanel,
          newPaths
        );
        console.log('✅ Dessins sauvegardés');
      } else {
        setHasUnsavedChanges(true);
      }
      
      setShowDrawingModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde dessins:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les dessins');
    } finally {
      setIsSaving(false);
    }
  };

  // Sauvegarder le projet complet
  const saveProject = async () => {
    if (!project) return;
    
    try {
      setIsSaving(true);
      
      if (projectId && projectId !== 'new') {
        // Projet existant - mettre à jour
        await mangaProjectService.updateProject(projectId as string, {
          pages: project.pages,
          totalPages: project.pages.length,
          updatedAt: new Date(),
          coverImage: project.coverImage,
        });
        
        Alert.alert(
          '✅ Succès', 
          'Manga sauvegardé ! Il est maintenant visible dans votre bibliothèque.',
          [
            {
              text: 'Voir dans la bibliothèque',
              onPress: () => {
                router.replace('/library/Library' as any);
              }
            },
            {
              text: 'Continuer l\'édition',
              style: 'cancel'
            }
          ]
        );
      } else {
        // Nouveau projet - créer
        const user = getCurrentUser();
        if (!user) {
          Alert.alert('Erreur', 'Vous devez être connecté pour sauvegarder un manga');
          return;
        }
        
        const newProjectId = await mangaProjectService.createProject({
          title: project.title,
          authorId: user.uid,
          authorUid: user.uid,
          author: user.displayName || user.email || 'Auteur',
          pages: project.pages,
          templateId: templateId as string,
          description: 'Nouveau manga',
          genre: 'Manga',
        });
        
        Alert.alert(
          '✅ Succès', 
          'Nouveau manga créé ! Il est maintenant visible dans votre bibliothèque.',
          [
            {
              text: 'Voir dans la bibliothèque',
              onPress: () => {
                router.replace('/library/Library' as any);
              }
            },
            {
              text: 'Continuer l\'édition',
              style: 'cancel'
            }
          ]
        );
      }
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder');
    } finally {
      setIsSaving(false);
    }
  };

  // Édition du titre
  const openTitleEditor = () => {
    setEditingTitle(project?.title || generateDefaultTitle());
    setShowTitleEditor(true);
  };

  const saveTitleEdit = () => {
    if (!project || !editingTitle.trim()) return;
    
    const newProject = { ...project, title: editingTitle.trim() };
    setProject(newProject);
    setHasUnsavedChanges(true);
    setShowTitleEditor(false);
  };

  // Gestion de la couverture
  const handleSaveCover = async (coverData: { type: 'drawn' | 'imported'; uri: string; title?: string }) => {
    if (!project) return;

    try {
      setIsSaving(true);
      
      // Mettre à jour le projet avec la couverture
      const updatedProject = {
        ...project,
        coverImage: coverData.uri,
        title: coverData.title || project.title
      };
      
      setProject(updatedProject);
      setHasUnsavedChanges(true);
      
      Alert.alert('✅ Succès', 'Couverture ajoutée au manga !');
    } catch (error) {
      console.error('Erreur sauvegarde couverture:', error);
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder la couverture');
    } finally {
      setIsSaving(false);
    }
  };

  // Rendu d'un panneau
  const renderPanel = (panel: MangaPanel) => (
    <View
      key={panel.id}
      style={[
        styles.panel,
        {
          left: `${panel.x}%`,
          top: `${panel.y}%`,
          width: `${panel.width}%`,
          height: `${panel.height}%`,
        },
        selectedPanel === panel.id && styles.selectedPanel,
      ]}
    >
      <TouchableOpacity
        style={styles.panelTouchArea}
        onPress={() => setSelectedPanel(panel.id)}
      >
        <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
          <Rect width="100%" height="100%" fill="#FFFFFF" />
          
          {/* Dessins */}
          {panel.paths.map((path) => (
            <Path
              key={path.id}
              d={path.d}
              stroke={path.stroke}
              strokeWidth={path.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        
        {/* Bouton d'édition si sélectionné */}
        {selectedPanel === panel.id && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openDrawingModal(panel)}
          >
            <Ionicons name="brush" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  // Rendu d'un élément de page
  const renderPageItem = ({ item }: { item: MangaPage }) => (
    <TouchableOpacity
      style={[
        styles.pageItem,
        currentPage?.id === item.id && styles.currentPageItem
      ]}
      onPress={() => switchToPage(item)}
    >
      <Text style={styles.pageText}>Page {item.pageNumber}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={openTitleEditor} style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {project?.title || 'Sans titre'}
          </Text>
          <Ionicons name="create-outline" size={16} color="#FFA94D" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowCoverCreator(true)}
          >
            <Ionicons name="image-outline" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={saveProject}
            disabled={isSaving}
          >
            <Ionicons name={isSaving ? "sync" : "save"} size={20} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.headerButton, styles.publishButton]}
            onPress={() => {
              if (project?.id && project.id !== 'new') {
                router.push(`/write/publish-manga?projectId=${project.id}`);
              } else {
                Alert.alert('Sauvegarde nécessaire', 'Veuillez d\'abord sauvegarder votre manga avant de le publier.');
              }
            }}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Zone de dessin principale */}
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <View style={styles.canvas}>
          {/* Affichage de la couverture si disponible */}
          {project?.coverImage && (
            <View style={styles.coverPreview}>
              <Image source={{ uri: project.coverImage }} style={styles.coverImage} />
              <Text style={styles.coverLabel}>Couverture</Text>
            </View>
          )}
          
          {/* Page courante */}
          {currentPage && (
            <View style={styles.page}>
              {currentPage.panels.map(renderPanel)}
            </View>
          )}
          
          {/* Indicateurs de swipe */}
          {project && project.pages.length > 1 && (
            <>
              {/* Bouton page précédente */}
              {project.pages.findIndex(p => p.id === currentPage?.id) > 0 && (
                <TouchableOpacity 
                  style={[styles.navigationButton, styles.prevButton]} 
                  onPress={goToPreviousPage}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              
              {/* Bouton page suivante */}
              {project.pages.findIndex(p => p.id === currentPage?.id) < project.pages.length - 1 && (
                <TouchableOpacity 
                  style={[styles.navigationButton, styles.nextButton]} 
                  onPress={goToNextPage}
                >
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Liste des pages */}
      {project && (
        <View style={styles.pagesContainer}>
          <FlatList
            data={project.pages}
            renderItem={renderPageItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pagesList}
          />
        </View>
      )}

      {/* Modal de dessin */}
      <MangaDrawingModal
        visible={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        panelData={drawingPanelData}
        onSaveDrawing={handleSaveDrawing}
      />

      {/* Modal de création de couverture */}
      <MangaCoverCreator
        visible={showCoverCreator}
        onClose={() => setShowCoverCreator(false)}
        onSaveCover={handleSaveCover}
        initialTitle={project?.title || generateDefaultTitle()}
      />

      {/* Modal d'édition du titre */}
      <Modal visible={showTitleEditor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.titleModal}>
            <Text style={styles.modalTitle}>Modifier le titre</Text>
            
            <TextInput
              style={styles.titleInput}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Titre du manga"
              placeholderTextColor="#888"
              autoFocus
            />
            
            <View style={styles.titleModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowTitleEditor(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveTitleEdit}
              >
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 18,
    backgroundColor: '#1a1a1f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: '#232329',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#232329',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  publishButton: {
    backgroundColor: '#FFA94D',
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },

  // Canvas
  canvasContainer: {
    flex: 1,
    margin: 24,
    marginTop: 16,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  
  // Couverture
  coverPreview: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 70,
    height: 95,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFA94D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 169, 77, 0.95)',
    color: '#181818',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 3,
  },
  
  // Page
  page: {
    flex: 1,
    position: 'relative',
  },
  
  // Panneau
  panel: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  selectedPanel: {
    borderColor: '#FFA94D',
    borderStyle: 'solid',
    borderWidth: 3,
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  panelTouchArea: {
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  // Navigation
  navigationButton: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },

  // Pages
  pagesContainer: {
    height: 70,
    backgroundColor: '#1a1a1f',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  pagesList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  pageItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 12,
    backgroundColor: '#232329',
    borderRadius: 12,
    justifyContent: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPageItem: {
    backgroundColor: '#FFA94D',
    transform: [{ scale: 1.05 }],
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  pageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Modal du titre
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleModal: {
    backgroundColor: '#1a1a1f',
    borderRadius: 20,
    padding: 28,
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: '#232329',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2a2a30',
  },
  titleModalActions: {
    flexDirection: 'row',
    gap: 14,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#232329',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default MangaEditorSimple;