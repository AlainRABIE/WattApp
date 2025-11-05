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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import MangaDrawingModal from '../../components/MangaDrawingModal';
import { mangaProjectService, MangaProject, MangaPage, MangaPanel, DrawingPath } from '../../services/MangaProjectService';

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
  const [drawingPanelData, setDrawingPanelData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

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
      setIsSaving(true);
      const loadedProject = await mangaProjectService.getProject(id);
      if (loadedProject && loadedProject.pages) {
        setProject(loadedProject);
        const firstPage = loadedProject.pages[0];
        setCurrentPage(firstPage);
        setSelectedPanel(firstPage?.panels[0]?.id || null);
        console.log('Projet chargé:', loadedProject.pages.length, 'pages');
      } else {
        createEmptyProject();
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger le projet');
      createEmptyProject();
    } finally {
      setIsSaving(false);
    }
  };

  const createProjectWithTemplate = (templateType: string) => {
    const templates = {
      'classic-page': {
        panels: [
          { id: '1', x: 5, y: 5, width: 90, height: 25, paths: [], textBubbles: [], order: 0 },
          { id: '2', x: 5, y: 32, width: 43, height: 30, paths: [], textBubbles: [], order: 1 },
          { id: '3', x: 52, y: 32, width: 43, height: 30, paths: [], textBubbles: [], order: 2 },
        ]
      },
      'yonkoma': {
        panels: [
          { id: '1', x: 10, y: 5, width: 80, height: 20, paths: [], textBubbles: [], order: 0 },
          { id: '2', x: 10, y: 27, width: 80, height: 20, paths: [], textBubbles: [], order: 1 },
          { id: '3', x: 10, y: 49, width: 80, height: 20, paths: [], textBubbles: [], order: 2 },
          { id: '4', x: 10, y: 71, width: 80, height: 20, paths: [], textBubbles: [], order: 3 },
        ]
      }
    };
    
    const template = templates[templateType as keyof typeof templates] || templates['classic-page'];
    createProjectWithPanels(template.panels);
  };

  const createProjectWithPanels = (panels: any[]) => {
    const page: MangaPage = {
      id: '1',
      pageNumber: 1,
      order: 0,
      title: 'Page 1',
      panels: panels,
    };
    
    const newProject: MangaProject = {
      id: 'new',
      title: `Mon Manga ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
      authorId: 'current-user',
      authorUid: 'current-user-uid',
      author: 'Auteur',
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
    };
    
    setProject(newProject);
    setCurrentPage(page);
    setSelectedPanel(panels[0]?.id || null);
  };

  const createEmptyProject = () => {
    createProjectWithPanels([
      {
        id: '1',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
        paths: [],
        textBubbles: [],
        order: 0,
      }
    ]);
  };

  // Ajouter une nouvelle page
  const addNewPage = async () => {
    if (!project) return;
    
    try {
      if (projectId && projectId !== 'new') {
        // Projet existant - utiliser le service
        const newPage = await mangaProjectService.addPage(projectId as string);
        const updatedProject = await mangaProjectService.getProject(projectId as string);
        if (updatedProject) {
          setProject(updatedProject);
          setCurrentPage(newPage);
          setSelectedPanel(newPage.panels[0]?.id || null);
        }
      } else {
        // Nouveau projet - ajouter localement
        const newPageNumber = project.pages.length + 1;
        const newPage: MangaPage = {
          id: newPageNumber.toString(),
          pageNumber: newPageNumber,
          order: newPageNumber - 1,
          title: `Page ${newPageNumber}`,
          panels: [
            {
              id: '1',
              x: 5,
              y: 5,
              width: 90,
              height: 90,
              paths: [],
              textBubbles: [],
              order: 0,
            }
          ],
        };
        
        const updatedProject = {
          ...project,
          pages: [...project.pages, newPage],
          totalPages: project.pages.length + 1,
          currentPageId: newPage.id,
        };
        
        setProject(updatedProject);
        setCurrentPage(newPage);
        setSelectedPanel('1');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Erreur ajout page:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter une nouvelle page');
    }
  };

  // Changer de page
  const switchToPage = async (page: MangaPage) => {
    setCurrentPage(page);
    setSelectedPanel(page.panels[0]?.id || null);
    
    if (projectId && projectId !== 'new') {
      try {
        await mangaProjectService.setCurrentPage(projectId as string, page.id);
      } catch (error) {
        console.error('Erreur changement page:', error);
      }
    }
  };

  // Navigation par swipe
  const goToNextPage = () => {
    if (!project || !currentPage) return;
    
    const currentIndex = project.pages.findIndex(p => p.id === currentPage.id);
    if (currentIndex < project.pages.length - 1) {
      const nextPage = project.pages[currentIndex + 1];
      switchToPage(nextPage);
    }
  };

  const goToPreviousPage = () => {
    if (!project || !currentPage) return;
    
    const currentIndex = project.pages.findIndex(p => p.id === currentPage.id);
    if (currentIndex > 0) {
      const previousPage = project.pages[currentIndex - 1];
      switchToPage(previousPage);
    }
  };

  // PanResponder pour le swipe horizontal
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Détecter le swipe horizontal (plus de mouvement horizontal que vertical)
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
    },
    onPanResponderMove: () => {
      // Rien à faire pendant le mouvement
    },
    onPanResponderRelease: (evt, gestureState) => {
      const swipeThreshold = 50; // Distance minimale pour considérer comme un swipe
      
      if (Math.abs(gestureState.dx) > swipeThreshold) {
        if (gestureState.dx > 0) {
          // Swipe vers la droite - aller à la page précédente
          goToPreviousPage();
        } else {
          // Swipe vers la gauche - aller à la page suivante
          goToNextPage();
        }
      }
    },
  });

  // Ouvrir le modal de dessin
  const openDrawingModal = (panel: MangaPanel) => {
    const panelData = {
      id: panel.id,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
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
        });
        
        Alert.alert(
          '✅ Succès', 
          'Manga sauvegardé !',
          [
            {
              text: 'Continuer l\'édition',
              style: 'cancel'
            },
            {
              text: 'Voir dans la bibliothèque',
              onPress: () => {
                // Rediriger vers la bibliothèque après sauvegarde
                router.replace('/library/Library' as any);
              }
            }
          ]
        );
      } else {
        // Nouveau projet - créer
        const newProjectId = await mangaProjectService.createProject({
          title: project.title,
          authorId: 'current-user',
          authorUid: 'current-user-uid',
          author: 'Auteur',
          pages: project.pages,
          templateId: templateId as string,
          description: 'Nouveau manga',
          genre: 'Manga',
        });
        
        Alert.alert(
          '✅ Succès', 
          'Nouveau manga créé !',
          [
            {
              text: 'Continuer l\'édition',
              style: 'cancel'
            },
            {
              text: 'Voir dans la bibliothèque',
              onPress: () => {
                // Rediriger vers la bibliothèque après création
                router.replace('/library/Library' as any);
              }
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
    setEditingTitle(project?.title || `Mon Manga ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`);
    setShowTitleEditor(true);
  };

  const saveTitleEdit = async () => {
    if (!project || !editingTitle.trim()) return;
    
    const newProject = { ...project, title: editingTitle.trim() };
    setProject(newProject);
    setHasUnsavedChanges(true);
    setShowTitleEditor(false);
    
    // Sauvegarder automatiquement le titre
    if (projectId && projectId !== 'new') {
      try {
        await mangaProjectService.updateProject(projectId as string, {
          title: editingTitle.trim(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error('Erreur sauvegarde titre:', error);
      }
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
        
        {/* Numéro du panneau */}
        <View style={styles.panelNumber}>
          <Text style={styles.panelNumberText}>{panel.id}</Text>
        </View>
        
        {/* Indicateur de dessins */}
        {panel.paths.length > 0 && (
          <View style={styles.drawingIndicator}>
            <Ionicons name="brush" size={12} color="#4CAF50" />
          </View>
        )}
        
        {/* Bouton de dessin */}
        {selectedPanel === panel.id && (
          <TouchableOpacity
            style={styles.drawingButton}
            onPress={() => openDrawingModal(panel)}
          >
            <Ionicons name="brush" size={16} color="#fff" />
            <Text style={styles.drawingButtonText}>
              {panel.paths.length > 0 ? 'Modifier' : 'Dessiner'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  // Rendu d'une page dans la liste
  const renderPageItem = ({ item }: { item: MangaPage }) => (
    <TouchableOpacity
      style={[
        styles.pageItem,
        currentPage?.id === item.id && styles.currentPageItem
      ]}
      onPress={() => switchToPage(item)}
    >
      <Text style={styles.pageNumber}>{item.pageNumber}</Text>
      <Text style={styles.pageTitle}>{item.title}</Text>
      {item.panels.some(p => p.paths.length > 0) && (
        <Ionicons name="brush" size={12} color="#4CAF50" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={openTitleEditor} style={styles.titleContainer}>
          <Text style={styles.headerTitle}>
            {project?.title || 'Éditeur Manga'}
          </Text>
          <View style={styles.titleStatus}>
            {isSaving && <Ionicons name="save" size={14} color="#4CAF50" />}
            {hasUnsavedChanges && !isSaving && <Ionicons name="warning" size={14} color="#FF9800" />}
            <Ionicons name="create-outline" size={12} color="#888" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={addNewPage} style={styles.headerButton}>
            <Ionicons name="add" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={saveProject} style={styles.headerButton}>
            <Ionicons 
              name={isSaving ? "hourglass-outline" : "save-outline"} 
              size={20} 
              color={hasUnsavedChanges ? "#FF6B6B" : "#FFA94D"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des pages */}
      <View style={styles.pagesContainer}>
        <FlatList
          horizontal
          data={project?.pages || []}
          renderItem={renderPageItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          style={styles.pagesList}
        />
      </View>

      {/* Canvas - Page courante */}
      <View style={styles.canvas} {...panResponder.panHandlers}>
        {currentPage && currentPage.panels.map(renderPanel)}
        
        {/* Indicateurs de navigation */}
        {project && project.pages.length > 1 && (
          <View style={styles.swipeIndicators}>
            <Text style={styles.swipeIndicatorText}>
              Page {project.pages.findIndex(p => p.id === currentPage?.id) + 1} / {project.pages.length}
            </Text>
            <Text style={styles.swipeHintText}>
              ← Swipe pour naviguer →
            </Text>
          </View>
        )}
      </View>

      {/* Boutons de navigation flottants */}
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

      {/* Modal de dessin */}
      <MangaDrawingModal
        visible={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        panelData={drawingPanelData}
        onSaveDrawing={handleSaveDrawing}
      />

      {/* Modal d'édition de titre */}
      <Modal
        visible={showTitleEditor}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View style={styles.titleModalOverlay}>
          <View style={styles.titleModalContainer}>
            <View style={styles.titleModalHeader}>
              <Text style={styles.titleModalTitle}>Titre du Manga</Text>
              <TouchableOpacity onPress={() => setShowTitleEditor(false)}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.titleModalContent}>
              <TextInput
                style={styles.titleInput}
                value={editingTitle}
                onChangeText={setEditingTitle}
                placeholder="Entrez le titre de votre manga"
                placeholderTextColor="#666"
                autoFocus
                maxLength={50}
              />
              
              <Text style={styles.titleCharCount}>
                {editingTitle.length}/50 caractères
              </Text>
            </View>
            
            <View style={styles.titleModalActions}>
              <TouchableOpacity 
                style={styles.titleModalButton}
                onPress={() => setShowTitleEditor(false)}
              >
                <Text style={styles.titleModalButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.titleModalButton, styles.titleModalButtonPrimary]}
                onPress={saveTitleEdit}
                disabled={!editingTitle.trim()}
              >
                <Text style={styles.titleModalButtonPrimaryText}>Sauvegarder</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagesContainer: {
    backgroundColor: '#23232a',
    paddingVertical: 12,
  },
  pagesList: {
    paddingHorizontal: 16,
  },
  pageItem: {
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  currentPageItem: {
    backgroundColor: '#FFA94D',
  },
  pageNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pageTitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  panel: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  selectedPanel: {
    borderColor: '#FFA94D',
    borderStyle: 'solid',
  },
  panelTouchArea: {
    width: '100%',
    height: '100%',
  },
  panelNumber: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  drawingIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawingButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFA94D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  drawingButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  swipeIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 20,
  },
  swipeIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  swipeHintText: {
    color: '#ccc',
    fontSize: 12,
    fontStyle: 'italic',
  },
  navigationButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 169, 77, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  // Styles pour la modal de titre
  titleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleModalContainer: {
    backgroundColor: '#181818',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  titleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  titleModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  titleModalContent: {
    padding: 20,
  },
  titleInput: {
    backgroundColor: '#23232a',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  titleCharCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
  },
  titleModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  titleModalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  titleModalButtonPrimary: {
    backgroundColor: '#FFA94D',
  },
  titleModalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  titleModalButtonPrimaryText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MangaEditorSimple;