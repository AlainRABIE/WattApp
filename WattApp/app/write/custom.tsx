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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveType, setSaveType] = useState<'draft' | 'publish'>('draft');
  const [modalTitle, setModalTitle] = useState('');
  const [modalCoverImage, setModalCoverImage] = useState<string | null>(null);

  useEffect(() => {
    if (templateData) {
      try {
        const parsedTemplate = JSON.parse(templateData as string);
        setTemplate(parsedTemplate);
        setContent(parsedTemplate.starter || '');
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
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        synopsis: synopsis.trim(),
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Template personnalisé',
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
    }
  };

  const publishBook = async () => {
    if (!title.trim() || !content.trim() || !synopsis.trim()) {
      Alert.alert('Attention', 'Veuillez remplir le titre, le contenu et le synopsis.');
      return;
    }
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      await addDoc(collection(db, 'books'), {
        title: title.trim(),
        content,
        synopsis: synopsis.trim(),
        coverImage,
        templateId: template?.id || 'custom',
        templateName: template?.name || 'Template personnalisé',
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollContent}>
        <TouchableOpacity style={styles.coverSection} onPress={pickCoverImage}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>+ Ajouter une couverture</Text>
            </View>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.titleInput}
          placeholder="Titre de votre livre..."
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.synopsisInput}
          placeholder="Résumé / synopsis (obligatoire pour publication rapide)"
          placeholderTextColor="#888"
          value={synopsis}
          onChangeText={setSynopsis}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
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
        <View ref={exportViewRef} collapsable={false} />
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.draftButton} onPress={saveDraft}>
            <Text style={styles.draftButtonText}>Sauvegarder le brouillon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.publishButton} onPress={publishBook}>
            <Text style={styles.publishButtonText}>Publier</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  synopsisInput: {
    minHeight: 48,
    maxHeight: 90,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 15,
    color: '#181818',
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
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});