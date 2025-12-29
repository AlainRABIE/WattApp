import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import StorageService from '../../services/StorageService';
import BookService from '../../services/BookService';

interface Props {
  bookId: string;
  onCoverUploaded?: (url: string) => void;
}

/**
 * Composant exemple pour uploader une couverture de livre vers Firebase Storage
 * 
 * Utilisation:
 * <BookCoverUploader bookId="book123" onCoverUploaded={(url) => console.log(url)} />
 */
export const BookCoverUploader: React.FC<Props> = ({ bookId, onCoverUploaded }) => {
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Sélectionner une image depuis la galerie
   */
  const pickImage = async () => {
    try {
      // Demander la permission
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'Autorisez l\'accès à la galerie pour choisir une couverture.'
        );
        return;
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Format portrait pour couverture
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur pickImage:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  /**
   * Uploader la couverture vers Firebase Storage
   */
  const uploadCover = async () => {
    if (!coverUri) {
      Alert.alert('Erreur', 'Veuillez d\'abord sélectionner une image');
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour uploader');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Upload vers Firebase Storage avec suivi de progression
      const downloadURL = await StorageService.uploadBookCover(
        coverUri,
        bookId,
        user.uid,
        (progress) => {
          const percent = Math.round(progress.progress);
          setUploadProgress(percent);
          console.log(`Upload: ${percent}%`);
        }
      );

      console.log('✅ Couverture uploadée:', downloadURL);

      // Mettre à jour le livre dans Firestore
      await BookService.updateBook(bookId, {
        coverImageUrl: downloadURL,
      });

      Alert.alert('Succès', 'Couverture uploadée avec succès !');
      
      // Callback
      if (onCoverUploaded) {
        onCoverUploaded(downloadURL);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader la couverture');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couverture du livre</Text>

      {/* Aperçu de la couverture */}
      <TouchableOpacity
        style={styles.coverContainer}
        onPress={pickImage}
        disabled={uploading}
      >
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverImage} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={48} color="#666" />
            <Text style={styles.placeholderText}>
              Toucher pour choisir une couverture
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Progression de l'upload */}
      {uploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>
      )}

      {/* Boutons d'action */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.selectButton]}
          onPress={pickImage}
          disabled={uploading}
        >
          <Ionicons name="images-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            {coverUri ? 'Changer' : 'Sélectionner'}
          </Text>
        </TouchableOpacity>

        {coverUri && (
          <TouchableOpacity
            style={[styles.button, styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={uploadCover}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Uploader</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 4,
  },
  progressText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectButton: {
    backgroundColor: '#333',
  },
  uploadButton: {
    backgroundColor: '#FFA94D',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookCoverUploader;
