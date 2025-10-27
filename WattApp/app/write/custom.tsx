import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import PDFAnnotatorClean from '../components/PDFAnnotatorClean';
import PDFDrawingEditorComplete from '../components/PDFDrawingEditorClean';

// Interface pour les traits de dessin PDF
interface Stroke {
  id: string;
  path: string;
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

const { width, height } = Dimensions.get('window');

export default function CustomTemplateEditor() {
  const router = useRouter();
  const { templateData } = useLocalSearchParams();
  
  const [template, setTemplate] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(2);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser' | 'text'>('text');
  const [pdfAnnotations, setPdfAnnotations] = useState<Stroke[] | null>(null);
  
  // États pour la modal de sauvegarde
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveType, setSaveType] = useState<'draft' | 'publish'>('draft');
  const [modalTitle, setModalTitle] = useState('');
  const [modalCoverImage, setModalCoverImage] = useState<string | null>(null);

  useEffect(() => {
    if (templateData) {
      try {
        const parsedTemplate = JSON.parse(templateData as string);
        setTemplate(parsedTemplate);
        
        // Adapter le contenu de départ selon le type de template
        if (parsedTemplate.isPDF) {
          setContent(''); // PDF templates start empty
        } else if (parsedTemplate.title?.toLowerCase().includes('cornell')) {
          setContent('Sujet: \n\nNotes principales:\n\n\n\nRésumé:\n');
        } else if (parsedTemplate.title?.toLowerCase().includes('bullet')) {
          setContent('• \n• \n• \n');
        } else if (parsedTemplate.title?.toLowerCase().includes('planning')) {
          setContent('Lundi:\n\nMardi:\n\nMercredi:\n\nJeudi:\n\nVendredi:\n\nSamedi:\n\nDimanche:\n');
        } else {
          setContent(parsedTemplate.starter || '');
        }
      } catch (error) {
        console.error('Erreur parsing template:', error);
        Alert.alert('Erreur', 'Template invalide');
        router.back();
      }
    }
  }, [templateData]);

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const pickModalCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setModalCoverImage(result.assets[0].uri);
    }
  };

  const saveDraft = async () => {
    if (template.isPDF) {
      // Pour les PDFs, ouvrir la modal
      setSaveType('draft');
      setModalTitle('');
      setModalCoverImage(null);
      setShowSaveModal(true);
      return;
    }

    // Pour les templates normaux
    if (!title.trim()) {
      Alert.alert('Attention', 'Veuillez donner un titre à votre livre.');
      return;
    }

    try {
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Template personnalisé',
        templateBackgroundImage: template?.backgroundImage || null,
        isPublished: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Succès', 'Votre brouillon a été sauvegardé!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le brouillon.');
    }
  };

  const publishBook = async () => {
    if (template.isPDF) {
      // Pour les PDFs, ouvrir la modal
      setSaveType('publish');
      setModalTitle('');
      setModalCoverImage(null);
      setShowSaveModal(true);
      return;
    }

    // Pour les templates normaux
    if (!title.trim() || !content.trim()) {
      Alert.alert('Attention', 'Veuillez remplir le titre et le contenu.');
      return;
    }

    try {
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Template personnalisé',
        templateBackgroundImage: template?.backgroundImage || null,
        isPublished: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Succès', 'Votre livre a été publié!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
      Alert.alert('Erreur', 'Impossible de publier le livre.');
    }
  };

  const handleModalSave = async () => {
    if (!modalTitle.trim()) {
      Alert.alert('Attention', 'Veuillez donner un nom à votre annotation PDF.');
      return;
    }

    try {
      await addDoc(collection(db, 'books'), {
        title: modalTitle.trim(),
        content,
        coverImage: modalCoverImage,
        templateId: template?.id || 'custom-pdf',
        templateName: template?.name || 'Annotation PDF',
        templateBackgroundImage: template?.backgroundImage || null,
        isPublished: saveType === 'publish',
        isPDFAnnotation: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const message = saveType === 'publish' ? 'Votre annotation PDF a été publiée!' : 'Votre annotation PDF a été sauvegardée!';
      setShowSaveModal(false);
      Alert.alert('Succès', message, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'annotation PDF.');
    }
  };

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement du template...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      template?.isPDF && { backgroundColor: '#181818' }
    ]}>
      <StatusBar barStyle="light-content" />
      
      {/* Background du template - seulement pour les non-PDF */}
      {template.backgroundImage && !template.isPDF && (
        <Image 
          source={{ uri: template.backgroundImage }} 
          style={styles.backgroundImage}
          contentFit="cover"
        />
      )}
      
      {/* Overlay pour la lisibilité - seulement pour les non-PDF */}
      {!template.backgroundImage && (
        <View style={styles.overlay} />
      )}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* En-tête avec outils */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.templateTitle}>{template.name}</Text>
          <TouchableOpacity 
            style={styles.toolsButton}
            onPress={() => setShowToolbar(!showToolbar)}
          >
            <Text style={styles.toolsButtonText}>🖊️</Text>
          </TouchableOpacity>
        </View>

        {/* Barre d'outils flottante */}
        {showToolbar && (
          <View style={styles.toolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {/* Couleurs de stylo */}
              <View style={styles.toolSection}>
                <Text style={styles.toolLabel}>Couleurs</Text>
                <View style={styles.colorPalette}>
                  {['#000000', '#FF0000', '#0066FF', '#00AA00', '#FF9900', '#9900FF'].map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        penColor === color && styles.selectedColor
                      ]}
                      onPress={() => setPenColor(color)}
                    />
                  ))}
                </View>
              </View>

              {/* Tailles de stylo */}
              <View style={styles.toolSection}>
                <Text style={styles.toolLabel}>Taille</Text>
                <View style={styles.sizeOptions}>
                  {[1, 2, 4, 6].map(size => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeButton,
                        penSize === size && styles.selectedSize
                      ]}
                      onPress={() => setPenSize(size)}
                    >
                      <View style={[styles.sizeDot, { width: size * 3, height: size * 3 }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Outils */}
              <View style={styles.toolSection}>
                <Text style={styles.toolLabel}>Outils</Text>
                <View style={styles.toolButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.toolButton,
                      currentTool === 'text' && styles.selectedTool
                    ]}
                    onPress={() => setCurrentTool('text')}
                  >
                    <Text style={styles.toolButtonText}>📝</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.toolButton,
                      currentTool === 'pen' && styles.selectedTool
                    ]}
                    onPress={() => setCurrentTool('pen')}
                  >
                    <Text style={styles.toolButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.toolButton,
                      currentTool === 'highlighter' && styles.selectedTool
                    ]}
                    onPress={() => setCurrentTool('highlighter')}
                  >
                    <Text style={styles.toolButtonText}>�️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Couverture - seulement pour les non-PDF */}
        {!template.isPDF && (
          <TouchableOpacity style={styles.coverSection} onPress={pickCoverImage}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverPlaceholderText}>+ Ajouter une couverture</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Titre - seulement pour les non-PDF */}
        {!template.isPDF && (
          <TextInput
            style={[
              styles.titleInput,
              template.backgroundImage && { backgroundColor: 'rgba(255, 255, 255, 0.85)' }
            ]}
            placeholder="Titre de votre livre..."
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
          />
        )}

        {/* Contenu - Adaptatif selon le template */}
        {template.isPDF ? (
          // Mode annotation PDF avancé avec Apple Pencil support
          <View style={styles.pdfAnnotationContainer}>
            <PDFDrawingEditorComplete
              pdfUri={template.backgroundImage}
              onSave={(strokes: Stroke[]) => {
                setPdfAnnotations(strokes);
                setContent(JSON.stringify(strokes)); // Sauvegarder les dessins comme contenu
              }}
            />
          </View>
        ) : template.backgroundImage ? (
          // Template avec image de fond mais pas PDF
          <View style={styles.templateOverlay}>
            <TextInput
              style={[
                styles.overlayTextInput,
                { 
                  color: penColor,
                  fontSize: 14 + penSize * 2,
                  fontWeight: penSize > 3 ? 'bold' : 'normal'
                }
              ]}
              placeholder="Suivez les lignes du template..."
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={25}
              textAlignVertical="top"
            />
          </View>
        ) : (
          // Template sans image de fond, éditeur classique
          <TextInput
            style={styles.contentInput}
            placeholder="Commencez à écrire votre histoire..."
            placeholderTextColor="#888"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={20}
            textAlignVertical="top"
          />
        )}

        {/* Boutons d'action */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.draftButton,
              template.backgroundImage && styles.transparentButton,
              template.isPDF && { backgroundColor: '#444', borderWidth: 1, borderColor: '#666' }
            ]} 
            onPress={saveDraft}
          >
            <Text style={[
              styles.draftButtonText,
              template.isPDF && { color: '#fff' }
            ]}>Sauvegarder le brouillon</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.publishButton,
              template.backgroundImage && styles.transparentButton,
              template.isPDF && { backgroundColor: '#0a7ea4', borderWidth: 1, borderColor: '#087ea4' }
            ]} 
            onPress={publishBook}
          >
            <Text style={styles.publishButtonText}>Publier</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de sauvegarde pour PDF */}
      {showSaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.saveModal}>
            <Text style={styles.modalTitle}>
              {saveType === 'publish' ? 'Publier l\'annotation PDF' : 'Sauvegarder l\'annotation PDF'}
            </Text>

            {/* Nom de l'annotation */}
            <TextInput
              style={styles.modalInput}
              placeholder="Nom de votre annotation PDF..."
              placeholderTextColor="#888"
              value={modalTitle}
              onChangeText={setModalTitle}
              autoFocus
            />

            {/* Couverture */}
            <TouchableOpacity style={styles.modalCoverSection} onPress={pickModalCoverImage}>
              {modalCoverImage ? (
                <Image source={{ uri: modalCoverImage }} style={styles.modalCoverImage} />
              ) : (
                <View style={styles.modalCoverPlaceholder}>
                  <Text style={styles.modalCoverText}>+ Ajouter une couverture</Text>
                  <Text style={styles.modalCoverSubtext}>(Optionnel)</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Boutons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={handleModalSave}
              >
                <Text style={styles.modalSaveText}>
                  {saveType === 'publish' ? 'Publier' : 'Sauvegarder'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  templateTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  coverSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  coverImage: {
    width: 150,
    height: 200,
    borderRadius: 10,
  },
  coverPlaceholder: {
    width: 150,
    height: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  coverPlaceholderText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  contentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    minHeight: 300,
    marginBottom: 30,
    color: '#333',
  },
  templateOverlay: {
    position: 'relative',
    minHeight: 400,
    marginBottom: 30,
  },
  overlayTextInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    padding: 20,
    fontSize: 16,
    color: '#000',
    textAlign: 'left',
    minHeight: 400,
    fontWeight: '500',
  },
  pdfOverlayInput: {
    fontSize: 14,
    lineHeight: 22,
    padding: 25,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  draftButton: {
    flex: 1,
    backgroundColor: 'rgba(100, 100, 100, 0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  draftButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  publishButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transparentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  toolsButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
  },
  toolsButtonText: {
    fontSize: 18,
  },
  toolbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toolSection: {
    marginRight: 25,
    alignItems: 'center',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 8,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSize: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  sizeDot: {
    backgroundColor: '#333',
    borderRadius: 10,
  },
  toolButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonText: {
    fontSize: 18,
  },
  selectedTool: {
    backgroundColor: '#007AFF',
  },
  pdfAnnotationContainer: {
    height: 700,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#444',
  },

  // Styles pour la modal de sauvegarde
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  saveModal: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  modalInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  
  modalCoverSection: {
    marginBottom: 24,
  },
  
  modalCoverImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  
  modalCoverPlaceholder: {
    height: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalCoverText: {
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '500',
    marginBottom: 4,
  },
  
  modalCoverSubtext: {
    fontSize: 14,
    color: '#888',
  },
  
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});