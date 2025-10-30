import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { StyleProp, ViewStyle } from 'react-native';
import PDFAnnotator from '../components/PDFAnnotatorClean';

const { width, height } = Dimensions.get('window');

export default function CustomTemplateEditor() {
  const router = useRouter();
  const { templateData } = useLocalSearchParams();
  const exportViewRef = useRef(null);
  const [template, setTemplate] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (templateData) {
      try {
        const parsedTemplate = JSON.parse(templateData as string);
        setTemplate(parsedTemplate);
        setContent(parsedTemplate.starter || '');
        setTitle(parsedTemplate.title || '');
      } catch (error) {
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

  const saveDraft = async () => {
    if (!title.trim()) {
      Alert.alert('Attention', 'Veuillez donner un titre à votre livre.');
      return;
    }
    try {
      setSaving(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        synopsis: synopsis.trim(),
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.title || template?.name || 'Template personnalisé',
        isPublished: false,
        authorUid: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Succès', 'Votre brouillon a été sauvegardé!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le brouillon.');
    } finally {
      setSaving(false);
    }
  };

  const publishBook = async () => {
    if (!title.trim() || !content.trim() || !synopsis.trim()) {
      Alert.alert('Attention', 'Veuillez remplir le titre, le contenu et le synopsis.');
      return;
    }
    try {
      setSaving(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        synopsis: synopsis.trim(),
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.title || template?.name || 'Template personnalisé',
        isPublished: true,
        authorUid: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Succès', 'Votre livre a été publié!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de publier le livre.');
    } finally {
      setSaving(false);
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

  // Utilisation de la couleur ou image du template comme fond
  const templateColor = template.color || '#FFF8E1';
  const backgroundImage = template.backgroundImage;
  const templateId = template.id;
  const pdfUri = template.pdfUri || template.backgroundImage || '';

  // Styles dynamiques pour le fond
  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { backgroundColor: templateColor },
  ];

  return (
    <SafeAreaView style={containerStyle}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      {/* Header du template */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.templateInfo}>
          <Text style={styles.templateTitle}>{template.title || 'Template personnalisé'}</Text>
          {template.subtitle ? <Text style={styles.templateSubtitle}>{template.subtitle}</Text> : null}
        </View>
      </View>

      {/* PDF Annotator intégré */}
      <View style={{ flex: 1 }}>
        <PDFAnnotator
          pdfUri={pdfUri}
          penColor={'#222'}
          penSize={2}
          currentTool={'text'}
          onSaveAnnotations={(annotations) => {
            // Tu peux gérer la sauvegarde ici
            Alert.alert('Annotations sauvegardées');
          }}
        />
      </View>

      {/* Actions flottantes en bas (optionnel, à adapter selon besoin) */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.actionBtn, styles.draftButton]} onPress={saveDraft} disabled={saving}>
          <Text style={styles.actionBtnText}>{saving ? 'Sauvegarde...' : 'Brouillon'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.publishButton]} onPress={publishBook} disabled={saving}>
          <Text style={styles.actionBtnText}>Publier</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#222',
    fontSize: 18,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    opacity: 0.18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backText: {
    fontSize: 22,
    color: '#222',
    fontWeight: '700',
  },
  templateInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  templateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  templateSubtitle: {
    fontSize: 14,
    color: '#555',
    opacity: 0.8,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    marginTop: 18,
    marginBottom: 8,
    gap: 18,
  },
  coverSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  coverImage: {
    width: 90,
    height: 120,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF9500',
    marginBottom: 4,
  },
  removeCoverBtn: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  removeCoverText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  coverPlaceholder: {
    width: 90,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 149, 0, 0.18)',
    borderStyle: 'dashed',
  },
  coverPlaceholderText: {
    color: '#FF9500',
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  synopsisBox: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    padding: 10,
    minHeight: 60,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  synopsisInput: {
    fontSize: 15,
    color: '#222',
    minHeight: 40,
    maxHeight: 80,
  },
  editorBoxFull: {
    flex: 1,
    marginTop: 0,
    marginHorizontal: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 0,
    padding: 0,
    minHeight: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  titleInputFull: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 18,
    borderRadius: 0,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,120,120,0.13)',
  },
  linedContainerFull: {
    position: 'relative',
    flex: 1,
    minHeight: 400,
    marginBottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
  },
  contentInputFull: {
    backgroundColor: 'transparent',
    padding: 18,
    fontSize: 18,
    minHeight: 400,
    color: '#222',
    zIndex: 1,
    width: '100%',
    textAlign: 'left',
  },
  linedRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(200,200,200,0.18)',
  },
  gridRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(120,120,120,0.13)',
  },
  gridCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(120,120,120,0.13)',
  },
  dotRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    borderStyle: 'dotted',
    borderBottomWidth: 1,
    borderColor: 'rgba(120,120,120,0.18)',
  },
  seyesRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(0, 120, 255, 0.13)',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  draftButton: {
    backgroundColor: 'rgba(255, 149, 0, 0.95)',
  },
  publishButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});