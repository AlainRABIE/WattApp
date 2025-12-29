import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import StorageService from '../../services/StorageService';
import BookService from '../../services/BookService';

interface Props {
  bookId: string;
  onPDFUploaded?: (url: string) => void;
}

/**
 * Composant exemple pour uploader un PDF de livre vers Firebase Storage
 * 
 * Utilisation:
 * <BookPDFUploader bookId="book123" onPDFUploaded={(url) => console.log(url)} />
 */
export const BookPDFUploader: React.FC<Props> = ({ bookId, onPDFUploaded }) => {
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Sélectionner un fichier PDF
   */
  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Vérifier la taille (max 100 MB)
        const maxSize = 100 * 1024 * 1024; // 100 MB
        if (file.size && file.size > maxSize) {
          Alert.alert(
            'Fichier trop volumineux',
            'Le fichier PDF ne doit pas dépasser 100 MB'
          );
          return;
        }

        setPdfName(file.name);
        setPdfUri(file.uri);
      }
    } catch (error) {
      console.error('Erreur pickPDF:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier PDF');
    }
  };

  /**
   * Uploader le PDF vers Firebase Storage
   */
  const uploadPDF = async () => {
    if (!pdfUri) {
      Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un fichier PDF');
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
      const downloadURL = await StorageService.uploadBookPDF(
        pdfUri,
        bookId,
        user.uid,
        (progress) => {
          const percent = Math.round(progress.progress);
          setUploadProgress(percent);
          console.log(`Upload PDF: ${percent}%`);
        }
      );

      console.log('✅ PDF uploadé:', downloadURL);

      // Mettre à jour le livre dans Firestore
      await BookService.updateBook(bookId, {
        pdfUrl: downloadURL,
      });

      Alert.alert('Succès', 'PDF uploadé avec succès !');
      
      // Callback
      if (onPDFUploaded) {
        onPDFUploaded(downloadURL);
      }
    } catch (error) {
      console.error('Erreur upload PDF:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader le PDF');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fichier PDF du livre</Text>

      {/* Informations sur le fichier sélectionné */}
      {pdfName && (
        <View style={styles.fileInfo}>
          <Ionicons name="document-text" size={24} color="#FFA94D" />
          <Text style={styles.fileName} numberOfLines={1}>
            {pdfName}
          </Text>
        </View>
      )}

      {/* Progression de l'upload */}
      {uploading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Upload en cours... {uploadProgress}%
          </Text>
          <Text style={styles.progressSubtext}>
            Cette opération peut prendre quelques minutes
          </Text>
        </View>
      )}

      {/* Boutons d'action */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.selectButton]}
          onPress={pickPDF}
          disabled={uploading}
        >
          <Ionicons name="folder-open-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            {pdfName ? 'Changer le PDF' : 'Sélectionner un PDF'}
          </Text>
        </TouchableOpacity>

        {pdfUri && (
          <TouchableOpacity
            style={[styles.button, styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={uploadPDF}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Uploader le PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Avertissement */}
      <View style={styles.warning}>
        <Ionicons name="information-circle-outline" size={16} color="#999" />
        <Text style={styles.warningText}>
          Taille maximale: 100 MB • Format: PDF uniquement
        </Text>
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
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
  },
  fileName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  progressSubtext: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginBottom: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  warningText: {
    color: '#999',
    fontSize: 12,
  },
});

export default BookPDFUploader;
