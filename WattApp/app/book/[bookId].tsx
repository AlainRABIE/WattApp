import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { TEMPLATES } from '../write';
import NoteLayout from '../components/NoteLayout';
import * as ImagePicker from 'expo-image-picker';

const BookEditor: React.FC = () => {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  
  const [book, setBook] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const loadBook = async () => {
    if (!bookId || typeof bookId !== 'string') {
      Alert.alert('Erreur', 'ID du livre invalide');
      router.back();
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        router.back();
        return;
      }

      const docRef = doc(db, 'books', bookId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Alert.alert('Erreur', 'Livre introuvable');
        router.back();
        return;
      }

      const bookData = { id: docSnap.id, ...docSnap.data() } as any;
      
      // Vérifier que l'utilisateur est bien l'auteur
      if (bookData.authorUid !== user.uid) {
        Alert.alert('Erreur', 'Vous n\'êtes pas autorisé à modifier ce livre');
        router.back();
        return;
      }

      setBook(bookData);
      setTitle(bookData.title || '');
      setBody(bookData.body || '');
      setCoverImage(bookData.coverImage || null);

      // Charger le template si disponible
      if (bookData.templateId) {
        const foundTemplate = TEMPLATES.find(t => t.id === bookData.templateId);
        if (foundTemplate) {
          setTemplate(foundTemplate);
        }
      }
    } catch (error: any) {
      console.warn('Erreur lors du chargement du livre:', error);
      Alert.alert('Erreur', 'Impossible de charger le livre');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const saveBook = async () => {
    if (!book) return;

    try {
      setSaving(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      const docRef = doc(db, 'books', book.id);
      await updateDoc(docRef, {
        title: title.trim() || '(Sans titre)',
        body: body.trim(),
        coverImage: coverImage,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Sauvegardé', 
        'Vos modifications ont été sauvegardées !',
        [
          {
            text: 'OK',
            onPress: () => (router as any).push('/library/Library')
          }
        ]
      );
    } catch (error: any) {
      console.warn('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setSaving(false);
    }
  };

  const publishBook = async () => {
    if (!book) return;

    Alert.alert(
      'Publier le livre',
      'Êtes-vous sûr de vouloir publier ce livre ? Il ne sera plus modifiable.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          style: 'default',
          onPress: async () => {
            try {
              setSaving(true);
              const docRef = doc(db, 'books', book.id);
              await updateDoc(docRef, {
                title: title.trim() || '(Sans titre)',
                body: body.trim(),
                coverImage: coverImage,
                status: 'published',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              Alert.alert(
                'Publié !',
                'Votre livre a été publié avec succès !',
                [
                  {
                    text: 'Voir dans la bibliothèque',
                    onPress: () => (router as any).push('/library/Library')
                  }
                ]
              );
            } catch (error: any) {
              console.warn('Erreur lors de la publication:', error);
              Alert.alert('Erreur', 'Impossible de publier le livre');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const pickCoverImage = async () => {
    try {
      // Demander la permission d'accès à la galerie
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour choisir une couverture.');
        return;
      }

      // Lancer le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Format portrait pour couverture de livre
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.warn('Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeCoverImage = () => {
    Alert.alert(
      'Supprimer la couverture',
      'Êtes-vous sûr de vouloir supprimer l\'image de couverture ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => setCoverImage(null) }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFA94D" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <NoteLayout title={title || '(Sans titre)'}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelButton}>← Retour</Text>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.actionButton, saving && styles.actionButtonDisabled]} 
              onPress={saveBook}
              disabled={saving}
            >
              <Text style={styles.actionButtonText}>
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </TouchableOpacity>
            
            {book?.status === 'draft' && (
              <TouchableOpacity 
                style={[styles.publishButton, saving && styles.actionButtonDisabled]} 
                onPress={publishBook}
                disabled={saving}
              >
                <Text style={styles.publishButtonText}>Publier</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Template info */}
        {template && (
          <View style={[styles.templateInfo, { borderLeftColor: template.color || '#FFA94D' }]}>
            <Text style={styles.templateLabel}>📄 Template: {template.title}</Text>
            <Text style={styles.templateDescription}>{template.subtitle}</Text>
            <View style={[styles.templateColorIndicator, { backgroundColor: template.color || '#FFA94D' }]} />
          </View>
        )}

        {/* Status */}
        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            Statut: {book?.status === 'draft' ? '📝 Brouillon' : '📚 Publié'}
          </Text>
          {book?.createdAt && (
            <Text style={styles.dateText}>
              Créé le: {book.createdAt.toDate?.()?.toLocaleDateString?.() || 'Date inconnue'}
            </Text>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section Couverture */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Couverture</Text>
            <View style={styles.coverSection}>
              {coverImage ? (
                <View style={styles.coverContainer}>
                  <Image source={{ uri: coverImage }} style={styles.coverImage} />
                  <View style={styles.coverActions}>
                    <TouchableOpacity style={styles.coverButton} onPress={pickCoverImage}>
                      <Text style={styles.coverButtonText}>Changer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.coverButton, styles.removeButton]} onPress={removeCoverImage}>
                      <Text style={styles.removeButtonText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addCoverButton} onPress={pickCoverImage}>
                  <Text style={styles.addCoverIcon}>📷</Text>
                  <Text style={styles.addCoverText}>Ajouter une couverture</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Titre */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Titre</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de votre œuvre..."
              placeholderTextColor="#888"
              style={styles.titleInput}
            />
          </View>

          {/* Contenu */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Contenu</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={template?.starter || "Commencez à écrire votre histoire..."}
              placeholderTextColor="#888"
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </View>
    </NoteLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  loadingText: {
    color: '#FFA94D',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 16,
    backgroundColor: '#181818',
  },
  cancelButton: {
    color: '#4FC3F7',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  publishButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#181818',
    fontWeight: '600',
    fontSize: 14,
  },
  publishButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  templateInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#232323',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA94D',
    position: 'relative',
  },
  templateLabel: {
    color: '#FFA94D',
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDescription: {
    color: '#ccc',
    fontSize: 12,
  },
  templateColorIndicator: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#181818',
  },
  statusInfo: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#FFA94D',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFA94D',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  titleInput: {
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#333',
  },
  bodyInput: {
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  // Cover styles
  coverSection: {
    alignItems: 'center',
  },
  coverContainer: {
    alignItems: 'center',
  },
  coverImage: {
    width: 150,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#333',
    marginBottom: 12,
  },
  coverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  coverButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  coverButtonText: {
    color: '#181818',
    fontWeight: '600',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#FF5722',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addCoverButton: {
    backgroundColor: '#232323',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 200,
  },
  addCoverIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  addCoverText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BookEditor;