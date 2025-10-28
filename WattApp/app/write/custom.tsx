import React, { useState, useEffect, useRef } from 'react';
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
import app from '../../constants/firebaseConfig';
import { getAuth } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import PDFDrawingEditorComplete from '../components/PDFDrawingEditorComplete';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { ActionSheetIOS } from 'react-native';

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

  // États pour le partage
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState<'free' | 'paid'>('free');
  const [sharePrice, setSharePrice] = useState('');

  // Référence pour la vue à exporter
  const exportViewRef = useRef(null);

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

  // Ajout automatique du template importé à la base de données
  useEffect(() => {
    if (template && templateData) {
      // Ici, tu peux récupérer l'ID utilisateur si besoin (remplace 'userId')
      addDoc(collection(db, 'templates'), {
        nom: template.title || 'Template importé',
        ownerId: 'userId', // Remplace par l'ID utilisateur réel si tu l'as
        createdAt: serverTimestamp(),
        data: template,
        type: 'imported',
      }).catch((error) => {
        console.error('Erreur lors de l\'import du template:', error);
      });
    }
  }, [template]);

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
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Template personnalisé',
        templateBackgroundImage: template?.backgroundImage || null,
        isPublished: false,
        authorUid: user?.uid || null,
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
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Template personnalisé',
        templateBackgroundImage: template?.backgroundImage || null,
        isPublished: true,
        authorUid: user?.uid || null,
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

  // Fonctions spécifiques pour les PDFs depuis l'en-tête
  const handlePDFSaveDraft = () => {
    setSaveType('draft');
    setModalTitle('');
    setModalCoverImage(null);
    setShowSaveModal(true);
  };

  const handlePDFPublish = () => {
    setSaveType('publish');
    setModalTitle('');
    setModalCoverImage(null);
    setShowSaveModal(true);
  };

  const handleModalSave = async () => {
    if (!modalTitle.trim()) {
      Alert.alert('Attention', 'Veuillez donner un nom à votre annotation PDF.');
      return;
    }

    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: modalTitle.trim(),
        content,
        coverImage: modalCoverImage,
        templateId: template?.id || 'custom-pdf',
        templateName: template?.name || 'Annotation PDF',
        templateBackgroundImage: template?.backgroundImage || null,
        isPublished: saveType === 'publish',
        isPDFAnnotation: true,
        authorUid: user?.uid || null,
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

  // Fonction pour enregistrer un template dans Firestore
  const saveTemplate = async () => {
    if (!title.trim()) {
      Alert.alert('Attention', 'Veuillez donner un nom à votre template.');
      return;
    }
    try {
      await addDoc(collection(db, 'templates'), {
        nom: title.trim(),
        ownerId: 'userId', // Remplace par l'ID utilisateur réel si tu l'as
        createdAt: serverTimestamp(),
        data: {
          content,
          coverImage,
          templateId: template?.id || null,
          templateName: template?.name || null,
          templateBackgroundImage: template?.backgroundImage || null,
        },
        type: 'custom',
      });
      Alert.alert('Succès', 'Template enregistré dans Firestore !');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du template:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le template.');
    }
  };

  // Fonction d'export
  const handleExport = () => {
    const showSheet = (options: string[], callback: (i: number) => void) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions({
          options: [...options, 'Annuler'],
          cancelButtonIndex: options.length,
        }, (buttonIndex) => {
          if (buttonIndex < options.length) callback(buttonIndex);
        });
      } else {
        // Android fallback simple
        Alert.alert('Exporter', 'Choisissez un format', [
          ...options.map((opt, i) => ({ text: opt, onPress: () => callback(i) })),
          { text: 'Annuler', style: 'cancel' },
        ]);
      }
    };

    showSheet(['PDF', 'PNG', 'JPEG'], async (i) => {
      if (i === 0) {
        // Export PDF
        const html = `<html><body><pre>${content}</pre></body></html>`;
        try {
          const { uri } = await Print.printToFileAsync({ html });
          await Sharing.shareAsync(uri);
        } catch (e) {
          Alert.alert('Erreur', 'Impossible d’exporter le PDF');
        }
      } else if (i === 1 || i === 2) {
        // Export PNG/JPEG
        try {
          const format = i === 1 ? 'png' : 'jpg';
          const uri = await captureRef(exportViewRef, { format, quality: 1 });
          await Sharing.shareAsync(uri);
        } catch (e) {
          Alert.alert('Erreur', 'Impossible d’exporter l’image');
        }
      }
    });
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleConfirmShare = async () => {
    // Enregistre le partage dans Firestore (exemple sur la collection 'books')
    try {
      await addDoc(collection(db, 'sharedBooks'), {
        title: title.trim(),
        content,
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Livre partagé',
        templateBackgroundImage: template?.backgroundImage || null,
        isShared: true,
        isFree: shareType === 'free',
        price: shareType === 'paid' ? parseFloat(sharePrice) : 0,
        commission: shareType === 'paid' ? parseFloat(sharePrice) * 0.1 : 0,
        createdAt: serverTimestamp(),
      });
      setShowShareModal(false);
      Alert.alert('Succès', 'Livre partagé !');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de partager le livre.');
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
      
      {/* En-tête fixe comme Notes+ */}
      <View style={styles.notesHeader}>
        <View style={styles.notesLeftSection}>
          <TouchableOpacity 
            style={styles.notesBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.notesBackText}>‹ Retour</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.notesHeaderButtons}>
          <TouchableOpacity 
            style={[styles.notesHeaderButton, styles.notesDraftHeaderButton]}
            onPress={template.isPDF ? handlePDFSaveDraft : saveDraft}
          >
            <Text style={styles.notesHeaderButtonText}>Brouillon</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notesHeaderButton, styles.notesPublishHeaderButton]}
            onPress={template.isPDF ? handlePDFPublish : publishBook}
          >
            <Text style={styles.notesHeaderButtonText}>Publier</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notesHeaderButton, { backgroundColor: '#0a7ea4' }]}
            onPress={saveTemplate}
          >
            <Text style={styles.notesHeaderButtonText}>Enregistrer comme template</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notesHeaderButton, { backgroundColor: '#6c47ff' }]}
            onPress={handleExport}
          >
            <Text style={styles.notesHeaderButtonText}>Exporter</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notesHeaderButton, { backgroundColor: '#34b6e4' }]}
            onPress={handleShare}
          >
            <Text style={styles.notesHeaderButtonText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.notesScrollView}
        contentContainerStyle={styles.notesContent}
        showsVerticalScrollIndicator={false}
      >

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
          // Mode annotation PDF en plein écran
          <PDFDrawingEditorComplete
            pdfUri={template.backgroundImage}
            onSave={(strokes: Stroke[]) => {
              setPdfAnnotations(strokes);
              setContent(JSON.stringify(strokes));
              setShowSaveModal(true);
            }}
            onSaveDraft={(strokes: Stroke[]) => {
              setPdfAnnotations(strokes);
              setContent(JSON.stringify(strokes));
              setSaveType('draft');
              setShowSaveModal(true);
            }}
            onPublish={(strokes: Stroke[]) => {
              setPdfAnnotations(strokes);
              setContent(JSON.stringify(strokes));
              setSaveType('publish');
              setShowSaveModal(true);
            }}
          />
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

        {/* Le contenu à exporter doit être wrappé dans une View avec la ref */}
        <View ref={exportViewRef} collapsable={false}>
          {/* ...le contenu à exporter, par exemple le ScrollView ou la note... */}
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

      {/* Modal de partage */}
      {showShareModal && (
        <View style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320, maxWidth: '90%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Partager ce livre</Text>
            <TouchableOpacity
              style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => setShareType('free')}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#34b6e4', marginRight: 8, backgroundColor: shareType === 'free' ? '#34b6e4' : '#fff' }} />
              <Text>Gratuit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => setShareType('paid')}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#34b6e4', marginRight: 8, backgroundColor: shareType === 'paid' ? '#34b6e4' : '#fff' }} />
              <Text>Payant</Text>
            </TouchableOpacity>
            {shareType === 'paid' && (
              <View style={{ marginBottom: 12 }}>
                <Text>Prix (€)</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginTop: 4 }}
                  keyboardType="decimal-pad"
                  value={sharePrice}
                  onChangeText={setSharePrice}
                  placeholder="Ex: 5.00"
                />
                <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                  Frais de service : {sharePrice && !isNaN(Number(sharePrice)) ? (Number(sharePrice) * 0.1).toFixed(2) : '0.00'} € (10%)
                </Text>
                <Text style={{ color: '#1a9c3c', fontWeight: 'bold', fontSize: 14, marginTop: 2 }}>
                  Vous recevrez : {sharePrice && !isNaN(Number(sharePrice)) ? (Number(sharePrice) * 0.9).toFixed(2) : '0.00'} €
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Text style={{ color: '#888', fontSize: 16 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmShare} disabled={shareType === 'paid' && (!sharePrice || isNaN(Number(sharePrice)))}>
                <Text style={{ color: '#34b6e4', fontWeight: 'bold', fontSize: 16 }}>Partager</Text>
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
    paddingBottom: 20,
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
    gap: 12,
    marginTop: 15,
    marginBottom: 10,
  },
  draftButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  draftButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  publishButton: {
    flex: 1,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    flex: 1, // Prendre tout l'espace disponible
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#444',
    position: 'absolute', // Position absolue pour couvrir tout l'écran
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

  // Styles Notes+ Layout
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  notesBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesBackText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  notesActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  notesToolButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesToolIcon: {
    fontSize: 16,
  },
  notesScrollView: {
    flex: 1,
  },
  notesContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  notesCompactActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  notesCompactButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  notesDraftButton: {
    backgroundColor: '#FF9500',
  },
  notesPublishButton: {
    backgroundColor: '#34C759',
  },
  notesButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Nouveaux styles pour les boutons en-tête
  notesLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notesHeaderButtons: {
    flexDirection: 'row',
    marginLeft: 20,
    gap: 10,
  },
  notesHeaderButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  notesDraftHeaderButton: {
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
  },
  notesPublishHeaderButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  notesHeaderButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});