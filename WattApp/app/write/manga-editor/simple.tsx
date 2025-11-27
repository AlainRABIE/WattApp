import * as Linking from 'expo-linking';
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, collection, query as firestoreQuery, orderBy } from 'firebase/firestore';
  // --- Notification acceptation collaboration ---
  const [collabAccepted, setCollabAccepted] = useState(false);
  const [collabAcceptedBy, setCollabAcceptedBy] = useState<string | null>(null);

  // États principaux
  const [project, setProject] = useState<MangaProject | null>(null);
  // ...existing code...

  // Vérifie s'il y a un message d'acceptation dans le chat lié à la room collaborative
  useEffect(() => {
    let unsub: any;
    if (!project?.id) return;
    const checkCollabAccept = async () => {
      try {
        const db = (await import('../../../constants/firebaseConfig')).db;
        const roomDocRef = doc(db, 'drawingRooms', project.id);
        const roomSnap = await getDoc(roomDocRef);
        if (!roomSnap.exists()) return;
        const roomData = roomSnap.data();
        const chatId = roomData?.chatId;
        if (!chatId) return;
        const q = firestoreQuery(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
        unsub = onSnapshot(q, (snap) => {
          const acceptMsg = snap.docs.find(d => d.data().type === 'draw-accept');
          if (acceptMsg) {
            setCollabAccepted(true);
            setCollabAcceptedBy(acceptMsg.data().text || null);
          }
        });
      } catch (e) {
        // ignore
      }
    };
    checkCollabAccept();
    return () => { if (unsub) unsub(); };
  }, [project?.id]);
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
  // --- Partage collaboratif ---
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  // Charge la liste des amis (même logique que friends.tsx)
  const loadFriends = async () => {
    setLoadingFriends(true);
    setFriendsError(null);
    try {
      const auth = getAuth(app);
      const current = auth.currentUser;
      if (!current) {
        setFriendsError('Utilisateur non connecté.');
        setFriendsList([]);
        return;
      }
      const { collection, getDocs, where, query } = await import('firebase/firestore');
      const db = (await import('../../../constants/firebaseConfig')).db;
      // Récupère uniquement les amis de l'utilisateur courant
      const qFriends = query(collection(db, 'friends'), where('uids', 'array-contains', current.uid));
      const snap = await getDocs(qFriends);
      console.log('Amis trouvés (docs):', snap.docs.length);
      const myFriendDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter((f: any) => Array.isArray(f.uids) && f.uids.includes(current.uid));
      console.log('myFriendDocs:', myFriendDocs);
      const enriched = await Promise.all(myFriendDocs.map(async (fd: any) => {
        const otherUid = (fd.uids || []).find((u: string) => u !== current.uid);
        if (!otherUid) return { ...fd, otherUser: null };
        try {
          const uSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', otherUid)));
          if (!uSnap.empty) {
            const userData = uSnap.docs[0].data();
            console.log('Profil ami:', userData);
            return { ...fd, otherUser: { id: uSnap.docs[0].id, uid: otherUid, ...userData } };
          }
        } catch (e) { console.warn('Erreur profil ami', e); }
        return { ...fd, otherUser: { uid: otherUid } };
      }));
      console.log('Liste enrichie:', enriched);
      setFriendsList(enriched);
    } catch (e) {
      console.warn('Erreur loadFriends:', e);
      setFriendsList([]);
      setFriendsError('Erreur lors du chargement des amis.');
    } finally {
      setLoadingFriends(false);
    }
  };

  // Ouvre le modal de partage et charge les amis
  const openShareModal = () => {
    setShareModalVisible(true);
    loadFriends();
  };

  // Envoie le lien de collaboration en DM (chat privé)
  const sendCollabLinkToFriend = async (friend: any) => {
    const roomId = project?.id || uuidv4();
    const url = Linking.createURL(`/draw?roomId=${roomId}`);
    try {
      const { addDoc, collection, serverTimestamp, doc, updateDoc } = await import('firebase/firestore');
      const db = (await import('../../../constants/firebaseConfig')).db;
      const auth = getAuth(app);
      const current = auth.currentUser;
      console.log('Envoi DM à:', friend.otherUser);
      if (!current || !friend?.otherUser?.uid) {
        console.warn('Utilisateur courant ou ami manquant', { current, friend });
        return;
      }
      const chatId = [current.uid, friend.otherUser.uid].sort().join('_');
      console.log('chatId:', chatId);
      // Vérifie si le chat existe, sinon le crée
      const chatDocRef = doc(db, 'chats', chatId);
      const { getDoc, setDoc } = await import('firebase/firestore');
      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        // Crée le chat avec les participants
        const participantsMeta = {};
        participantsMeta[current.uid] = { displayName: current.displayName || current.email || 'Moi', photoURL: current.photoURL || null };
        participantsMeta[friend.otherUser.uid] = { displayName: friend.otherUser.displayName || friend.otherUser.email || 'Ami', photoURL: friend.otherUser.photoURL || null };
        await setDoc(chatDocRef, {
          participants: [current.uid, friend.otherUser.uid],
          participantsMeta,
          createdAt: new Date(),
        });
        console.log('Chat créé');
      }
      // Crée ou met à jour la room collaborative Firestore pour stocker inviterUid et chatId
      try {
        const { setDoc: setDocRoom, doc: docRoom, getDoc: getDocRoom } = await import('firebase/firestore');
        const roomDocRef = docRoom(db, 'drawingRooms', roomId);
        const roomSnap = await getDocRoom(roomDocRef);
        if (!roomSnap.exists()) {
          await setDocRoom(roomDocRef, {
            inviterUid: current.uid,
            chatId,
            createdAt: new Date(),
          });
        } else {
          await setDocRoom(roomDocRef, {
            inviterUid: current.uid,
            chatId,
            updatedAt: new Date(),
          }, { merge: true });
        }
      } catch (e) {
        console.warn('Erreur création room collaborative:', e);
      }
      // Envoie le message
      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          sender: current.uid,
          text: `Tu veux bien m'aider à concevoir un manga ? Clique ici pour collaborer : ${url}`,
          createdAt: serverTimestamp(),
          type: 'draw-invite',
          roomId,
        });
        console.log('Message envoyé');
      } catch (err) {
        console.warn('Erreur addDoc message:', err);
        throw err;
      }
      // Met à jour le chat principal
      try {
        await updateDoc(chatDocRef, {
          lastMessageText: '[Invitation à dessiner]',
          lastMessageAt: serverTimestamp(),
        });
        console.log('Chat principal mis à jour');
      } catch (err) {
        console.warn('Erreur updateDoc chat:', err);
        throw err;
      }
      Alert.alert('Invitation envoyée', `Lien envoyé à ${friend.otherUser?.displayName || 'ton ami'}`);
      setShareModalVisible(false);
    } catch (e) {
      console.warn('Erreur globale envoi DM:', e);
      Alert.alert('Erreur', `Impossible d'envoyer le lien.\n${e?.message || e}`);
    }
  };
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
      {/* Notification acceptation collaboration */}
      {collabAccepted && (
        <View style={{ backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, margin: 12 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
            {collabAcceptedBy ? collabAcceptedBy : "Un collaborateur a accepté l'invitation à dessiner !"}
          </Text>
        </View>
      )}
      {/* Bouton de partage */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#FFA94D', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={openShareModal}
        >
          <Ionicons name="share-social" size={18} color="#181818" />
          <Text style={{ color: '#181818', fontWeight: 'bold' }}>Partager</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de partage */}
      <Modal visible={shareModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#23232a', borderRadius: 16, padding: 24, width: width * 0.8, maxHeight: height * 0.7 }}>
            <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Partager avec un ami</Text>
            {loadingFriends ? (
              <Text style={{ color: '#fff' }}>Chargement...</Text>
            ) : friendsError ? (
              <Text style={{ color: 'red', marginBottom: 10 }}>{friendsError}</Text>
            ) : friendsList.length === 0 ? (
              <Text style={{ color: '#fff' }}>Aucun ami trouvé.</Text>
            ) : (
              <ScrollView style={{ maxHeight: height * 0.5 }}>
                {friendsList.map((friend, idx) => (
                  <View key={friend.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="person-circle" size={32} color="#FFA94D" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#fff', flex: 1 }}>{friend.otherUser?.displayName || friend.otherUser?.pseudo || friend.otherUser?.email || 'Ami'}</Text>
                    <TouchableOpacity
                      style={{ backgroundColor: '#FFA94D', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14, marginLeft: 8 }}
                      onPress={() => sendCollabLinkToFriend(friend)}
                    >
                      <Text style={{ color: '#181818', fontWeight: 'bold' }}>Envoyer en DM</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={{ marginTop: 18, alignSelf: 'center' }} onPress={() => setShareModalVisible(false)}>
              <Text style={{ color: '#FFA94D', fontWeight: 'bold' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButton: {
    backgroundColor: '#FFA94D',
  },

  // Canvas
  canvasContainer: {
    flex: 1,
    margin: 20,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Couverture
  coverPreview: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 60,
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
    paddingVertical: 2,
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
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  selectedPanel: {
    borderColor: '#FFA94D',
    borderStyle: 'solid',
  },
  panelTouchArea: {
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Navigation
  navigationButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  prevButton: {
    left: 10,
  },
  nextButton: {
    right: 10,
  },

  // Pages
  pagesContainer: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  pagesList: {
    paddingHorizontal: 20,
  },
  pageItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
  },
  currentPageItem: {
    backgroundColor: '#FFA94D',
  },
  pageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal du titre
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleModal: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 20,
    width: width * 0.8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  titleModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MangaEditorSimple;