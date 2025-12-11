import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import app from '../../../constants/firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';

const { width, height } = Dimensions.get('window');

interface StoryboardPanel {
  id: string;
  number: number;
  sketch: string; // URL ou base64 du croquis
  description: string;
  dialogue: string;
  notes: string;
  cameraAngle: 'normal' | 'high' | 'low' | 'dutch' | 'pov';
  shotType: 'close-up' | 'medium' | 'full' | 'wide' | 'extreme-wide';
  emotion: string;
}

interface Storyboard {
  id: string;
  title: string;
  authorId: string;
  createdAt: any;
  updatedAt: any;
  panels: StoryboardPanel[];
  mangaProjectId?: string;
}

const MangaStoryboard: React.FC = () => {
  const router = useRouter();
  const { storyboardId } = useLocalSearchParams();
  
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState<StoryboardPanel | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingDialogue, setEditingDialogue] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingCameraAngle, setEditingCameraAngle] = useState<StoryboardPanel['cameraAngle']>('normal');
  const [editingShotType, setEditingShotType] = useState<StoryboardPanel['shotType']>('medium');
  const [title, setTitle] = useState('');
  const [showTitleEditor, setShowTitleEditor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Charger ou créer le storyboard
  useEffect(() => {
    loadStoryboard();
  }, [storyboardId]);

  const loadStoryboard = async () => {
    setLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        router.back();
        return;
      }

      if (storyboardId === 'new') {
        // Créer un nouveau storyboard
        const newStoryboard: Storyboard = {
          id: 'new',
          title: `Storyboard ${new Date().toLocaleDateString('fr-FR')}`,
          authorId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          panels: [
            createNewPanel(1),
            createNewPanel(2),
            createNewPanel(3),
          ],
        };
        setStoryboard(newStoryboard);
        setTitle(newStoryboard.title);
      } else {
        // Charger un storyboard existant
        const docRef = doc(db, 'storyboards', storyboardId as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as Storyboard;
          setStoryboard({ ...data, id: docSnap.id });
          setTitle(data.title);
        } else {
          Alert.alert('Erreur', 'Storyboard introuvable');
          router.back();
        }
      }
    } catch (error) {
      console.error('Erreur chargement storyboard:', error);
      Alert.alert('Erreur', 'Impossible de charger le storyboard');
    } finally {
      setLoading(false);
    }
  };

  const createNewPanel = (number: number): StoryboardPanel => ({
    id: `panel-${Date.now()}-${number}`,
    number,
    sketch: '',
    description: '',
    dialogue: '',
    notes: '',
    cameraAngle: 'normal',
    shotType: 'medium',
    emotion: '',
  });

  const saveStoryboard = async () => {
    if (!storyboard) return;
    
    setIsSaving(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const storyboardData = {
        ...storyboard,
        title,
        updatedAt: serverTimestamp(),
      };

      if (storyboard.id === 'new') {
        // Créer un nouveau document
        const docRef = doc(collection(db, 'storyboards'));
        await setDoc(docRef, {
          ...storyboardData,
          createdAt: serverTimestamp(),
          id: docRef.id,
        });
        setStoryboard({ ...storyboard, id: docRef.id });
        Alert.alert('✅ Succès', 'Storyboard créé avec succès');
      } else {
        // Mettre à jour le document existant
        const docRef = doc(db, 'storyboards', storyboard.id);
        await updateDoc(docRef, storyboardData);
        Alert.alert('✅ Succès', 'Storyboard sauvegardé');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder le storyboard');
    } finally {
      setIsSaving(false);
    }
  };

  const addPanel = () => {
    if (!storyboard) return;
    
    const newPanel = createNewPanel(storyboard.panels.length + 1);
    setStoryboard({
      ...storyboard,
      panels: [...storyboard.panels, newPanel],
    });
  };

  const deletePanel = (panelId: string) => {
    if (!storyboard) return;
    
    Alert.alert(
      'Supprimer le panel',
      'Êtes-vous sûr de vouloir supprimer ce panel ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updatedPanels = storyboard.panels
              .filter(p => p.id !== panelId)
              .map((p, idx) => ({ ...p, number: idx + 1 }));
            setStoryboard({ ...storyboard, panels: updatedPanels });
          },
        },
      ]
    );
  };

  const openEditModal = (panel: StoryboardPanel) => {
    setSelectedPanel(panel);
    setEditingDescription(panel.description);
    setEditingDialogue(panel.dialogue);
    setEditingNotes(panel.notes);
    setEditingCameraAngle(panel.cameraAngle);
    setEditingShotType(panel.shotType);
    setShowEditModal(true);
  };

  const saveEditPanel = () => {
    if (!storyboard || !selectedPanel) return;
    
    const updatedPanels = storyboard.panels.map(p =>
      p.id === selectedPanel.id
        ? {
            ...p,
            description: editingDescription,
            dialogue: editingDialogue,
            notes: editingNotes,
            cameraAngle: editingCameraAngle,
            shotType: editingShotType,
          }
        : p
    );
    
    setStoryboard({ ...storyboard, panels: updatedPanels });
    setShowEditModal(false);
  };

  const getCameraAngleIcon = (angle: StoryboardPanel['cameraAngle']) => {
    switch (angle) {
      case 'high': return 'arrow-down';
      case 'low': return 'arrow-up';
      case 'dutch': return 'arrow-forward';
      case 'pov': return 'eye';
      default: return 'camera';
    }
  };

  const getShotTypeLabel = (type: StoryboardPanel['shotType']) => {
    switch (type) {
      case 'close-up': return 'Gros plan';
      case 'medium': return 'Plan moyen';
      case 'full': return 'Plan large';
      case 'wide': return 'Plan d\'ensemble';
      case 'extreme-wide': return 'Plan très large';
      default: return type;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowTitleEditor(true)} style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Ionicons name="create-outline" size={16} color="#FFA94D" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={saveStoryboard}
            disabled={isSaving}
          >
            <Ionicons name={isSaving ? "sync" : "save"} size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Grille de panels */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.panelsGrid}>
          {storyboard?.panels.map((panel, index) => (
            <View key={panel.id} style={styles.panelCard}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelNumber}>Panel {panel.number}</Text>
                <TouchableOpacity onPress={() => deletePanel(panel.id)}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              
              {/* Zone de croquis */}
              <View style={styles.sketchArea}>
                {panel.sketch ? (
                  <Image source={{ uri: panel.sketch }} style={styles.sketchImage} />
                ) : (
                  <View style={styles.emptySketch}>
                    <Ionicons name="brush-outline" size={32} color="#666" />
                    <Text style={styles.emptySketchText}>Tap to draw</Text>
                  </View>
                )}
              </View>
              
              {/* Infos du panel */}
              <View style={styles.panelInfo}>
                <View style={styles.panelMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name={getCameraAngleIcon(panel.cameraAngle)} size={14} color="#FFA94D" />
                    <Text style={styles.metaText}>{panel.cameraAngle}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="resize" size={14} color="#9C27B0" />
                    <Text style={styles.metaText}>{getShotTypeLabel(panel.shotType)}</Text>
                  </View>
                </View>
                
                {panel.description && (
                  <Text style={styles.description} numberOfLines={2}>
                    {panel.description}
                  </Text>
                )}
                
                {panel.dialogue && (
                  <View style={styles.dialogueBubble}>
                    <Text style={styles.dialogueText} numberOfLines={2}>"{panel.dialogue}"</Text>
                  </View>
                )}
              </View>
              
              {/* Bouton d'édition */}
              <TouchableOpacity 
                style={styles.editPanelButton}
                onPress={() => openEditModal(panel)}
              >
                <Ionicons name="create" size={16} color="#fff" />
                <Text style={styles.editPanelButtonText}>Éditer</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Bouton d'ajout de panel */}
          <TouchableOpacity style={styles.addPanelCard} onPress={addPanel}>
            <Ionicons name="add-circle" size={48} color="#FFA94D" />
            <Text style={styles.addPanelText}>Ajouter un panel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal d'édition de titre */}
      <Modal visible={showTitleEditor} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.titleEditorModal}>
            <Text style={styles.modalTitle}>Titre du storyboard</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              placeholder="Entrez un titre..."
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowTitleEditor(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={() => setShowTitleEditor(false)}
              >
                <Text style={styles.modalSaveText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'édition de panel */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editModalHeader}>
              <Text style={styles.modalTitle}>Éditer Panel {selectedPanel?.number}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editModalContent}>
              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description de la scène</Text>
                <TextInput
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: Le héros entre dans la pièce sombre..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              
              {/* Dialogue */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dialogue</Text>
                <TextInput
                  value={editingDialogue}
                  onChangeText={setEditingDialogue}
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: Qui est là ?!"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
              
              {/* Angle de caméra */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Angle de caméra</Text>
                <View style={styles.optionsRow}>
                  {(['normal', 'high', 'low', 'dutch', 'pov'] as const).map(angle => (
                    <TouchableOpacity
                      key={angle}
                      style={[
                        styles.optionButton,
                        editingCameraAngle === angle && styles.optionButtonSelected,
                      ]}
                      onPress={() => setEditingCameraAngle(angle)}
                    >
                      <Ionicons 
                        name={getCameraAngleIcon(angle)} 
                        size={18} 
                        color={editingCameraAngle === angle ? '#fff' : '#FFA94D'} 
                      />
                      <Text style={[
                        styles.optionText,
                        editingCameraAngle === angle && styles.optionTextSelected,
                      ]}>
                        {angle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Type de plan */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type de plan</Text>
                <View style={styles.optionsColumn}>
                  {(['close-up', 'medium', 'full', 'wide', 'extreme-wide'] as const).map(shot => (
                    <TouchableOpacity
                      key={shot}
                      style={[
                        styles.optionButtonWide,
                        editingShotType === shot && styles.optionButtonSelected,
                      ]}
                      onPress={() => setEditingShotType(shot)}
                    >
                      <Text style={[
                        styles.optionText,
                        editingShotType === shot && styles.optionTextSelected,
                      ]}>
                        {getShotTypeLabel(shot)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optionnel)</Text>
                <TextInput
                  value={editingNotes}
                  onChangeText={setEditingNotes}
                  style={[styles.input, styles.textArea]}
                  placeholder="Ajouter des notes pour ce panel..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            <View style={styles.editModalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveEditPanel}
              >
                <Text style={styles.modalSaveText}>Sauvegarder</Text>
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
    backgroundColor: '#0f0f1e',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backButton: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  panelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  panelCard: {
    width: (width - 48) / 2,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#16213e',
  },
  panelNumber: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sketchArea: {
    width: '100%',
    height: 150,
    backgroundColor: '#fff',
  },
  sketchImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptySketch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptySketchText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  panelInfo: {
    padding: 12,
  },
  panelMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#999',
    fontSize: 11,
  },
  description: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 8,
  },
  dialogueBubble: {
    backgroundColor: '#2a2a3e',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA94D',
  },
  dialogueText: {
    color: '#fff',
    fontSize: 11,
    fontStyle: 'italic',
  },
  editPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#FFA94D',
  },
  editPanelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  addPanelCard: {
    width: (width - 48) / 2,
    height: 280,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFA94D',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPanelText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleEditorModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
  },
  modalTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  titleInput: {
    backgroundColor: '#16213e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
  },
  modalCancelText: {
    color: '#999',
    fontWeight: 'bold',
  },
  modalSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFA94D',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    width: width * 0.92,
    maxHeight: height * 0.85,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#16213e',
  },
  editModalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsColumn: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  optionButtonWide: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  optionButtonSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  optionText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#fff',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    backgroundColor: '#16213e',
  },
});

export default MangaStoryboard;
