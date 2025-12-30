import { storage } from '../constants/firebaseConfig';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll,
  UploadMetadata,
  UploadTask
} from 'firebase/storage';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

/**
 * Service centralisé pour gérer tous les uploads vers Firebase Storage
 */
class StorageService {
  
  /**
   * Upload une image depuis une URI locale (React Native)
   */
  async uploadImage(
    uri: string, 
    path: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      console.log('📤 Upload image vers:', path);
      console.log('📤 URI source:', uri);
      
      // Convertir l'URI en Blob
      console.log('🔄 Début conversion URI -> Blob...');
      const blob = await this.uriToBlob(uri);
      console.log('✅ Blob créé, taille:', blob.size, 'type:', blob.type);
      
      const storageRef = ref(storage, path);
      console.log('📁 Storage ref créé:', storageRef.fullPath);
      
      const metadata: UploadMetadata = {
        contentType: 'image/jpeg',
      };

      if (onProgress) {
        // Upload avec suivi de progression
        console.log('🚀 Début upload avec progression...');
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              };
              console.log('📊 Progression:', progress.progress.toFixed(1) + '%');
              onProgress(progress);
            },
            (error) => {
              console.error('❌ Erreur upload avec progression:', error);
              console.error('❌ Error code:', error.code);
              console.error('❌ Error message:', error.message);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ Image uploadée:', downloadURL);
              resolve(downloadURL);
            }
          );
        });
      } else {
        // Upload simple sans progression
        console.log('🚀 Début upload simple...');
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        console.log('✅ Upload terminé, récupération URL...');
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ Image uploadée:', downloadURL);
        return downloadURL;
      }
    } catch (error: any) {
      console.error('❌ Erreur uploadImage:', error);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error serverResponse:', error?.serverResponse);
      throw error;
    }
  }

  /**
   * Upload un PDF depuis une URI locale
   */
  async uploadPDF(
    uri: string, 
    path: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      console.log('📤 Upload PDF vers:', path);
      
      const blob = await this.uriToBlob(uri);
      
      const storageRef = ref(storage, path);
      const metadata: UploadMetadata = {
        contentType: 'application/pdf',
      };

      if (onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              };
              onProgress(progress);
            },
            (error) => {
              console.error('Erreur upload PDF:', error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ PDF uploadé:', downloadURL);
              resolve(downloadURL);
            }
          );
        });
      } else {
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ PDF uploadé:', downloadURL);
        return downloadURL;
      }
    } catch (error) {
      console.error('Erreur uploadPDF:', error);
      throw error;
    }
  }

  /**
   * Upload un fichier générique
   */
  async uploadFile(
    uri: string,
    path: string,
    contentType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      console.log('📤 Upload fichier vers:', path);
      
      const blob = await this.uriToBlob(uri);
      
      const storageRef = ref(storage, path);
      const metadata: UploadMetadata = {
        contentType,
      };

      if (onProgress) {
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              };
              onProgress(progress);
            },
            (error) => {
              console.error('Erreur upload fichier:', error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ Fichier uploadé:', downloadURL);
              resolve(downloadURL);
            }
          );
        });
      } else {
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ Fichier uploadé:', downloadURL);
        return downloadURL;
      }
    } catch (error) {
      console.error('Erreur uploadFile:', error);
      throw error;
    }
  }

  /**
   * Upload une couverture de livre
   */
  async uploadBookCover(
    uri: string,
    bookId: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const path = `books/${userId}/${bookId}/cover.jpg`;
    return this.uploadImage(uri, path, onProgress);
  }

  /**
   * Upload une couverture de manga
   */
  async uploadMangaCover(
    uri: string,
    mangaId: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const path = `manga/${userId}/${mangaId}/cover.jpg`;
    return this.uploadImage(uri, path, onProgress);
  }

  /**
   * Upload une page de manga
   */
  async uploadMangaPage(
    uri: string,
    mangaId: string,
    userId: string,
    pageNumber: number,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const path = `manga/${userId}/${mangaId}/pages/page_${pageNumber}.jpg`;
    return this.uploadImage(uri, path, onProgress);
  }

  /**
   * Upload un fichier PDF de livre
   */
  async uploadBookPDF(
    uri: string,
    bookId: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const path = `books/${userId}/${bookId}/book.pdf`;
    return this.uploadPDF(uri, path, onProgress);
  }

  /**
   * Upload une image de profil
   */
  async uploadProfilePicture(
    uri: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    const path = `profiles/${userId}/avatar.jpg`;
    return this.uploadImage(uri, path, onProgress);
  }

  /**
   * Upload une image depuis une URL externe
   */
  async uploadImageFromUrl(
    imageUrl: string,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      console.log('📤 Upload image depuis URL:', imageUrl);
      console.log('📤 Vers path:', path);
      
      // Télécharger l'image depuis l'URL
      console.log('🔄 Téléchargement de l\'image...');
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('✅ Image téléchargée, taille:', blob.size, 'type:', blob.type);
      
      const storageRef = ref(storage, path);
      console.log('📁 Storage ref créé:', storageRef.fullPath);
      
      const metadata: UploadMetadata = {
        contentType: blob.type || 'image/jpeg',
      };

      if (onProgress) {
        // Upload avec suivi de progression
        console.log('🚀 Début upload avec progression...');
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
        
        return new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = {
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              };
              onProgress(progress);
            },
            (error) => {
              console.error('❌ Erreur upload:', error);
              reject(error);
            },
            async () => {
              console.log('✅ Upload terminé !');
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ URL de téléchargement:', downloadURL);
              resolve(downloadURL);
            }
          );
        });
      } else {
        // Upload direct sans progression
        console.log('🚀 Upload direct...');
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        console.log('✅ Upload terminé !');
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('✅ URL de téléchargement:', downloadURL);
        
        return downloadURL;
      }
    } catch (error) {
      console.error('❌ Erreur uploadImageFromUrl:', error);
      throw error;
    }
  }

  /**
   * Supprime un fichier du storage
   */
  async deleteFile(url: string): Promise<void> {
    try {
      if (!url || !url.includes('firebasestorage.googleapis.com')) {
        console.warn('URL invalide pour suppression:', url);
        return;
      }

      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
      console.log('🗑️ Fichier supprimé:', url);
    } catch (error) {
      console.error('Erreur deleteFile:', error);
      // Ne pas throw pour éviter de bloquer l'application
    }
  }

  /**
   * Supprime tous les fichiers d'un livre
   */
  async deleteBookFiles(bookId: string, userId: string): Promise<void> {
    try {
      const bookRef = ref(storage, `books/${userId}/${bookId}`);
      const listResult = await listAll(bookRef);
      
      const deletePromises = listResult.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);
      
      console.log('🗑️ Tous les fichiers du livre supprimés');
    } catch (error) {
      console.error('Erreur deleteBookFiles:', error);
    }
  }

  /**
   * Supprime tous les fichiers d'un manga
   */
  async deleteMangaFiles(mangaId: string, userId: string): Promise<void> {
    try {
      const mangaRef = ref(storage, `manga/${userId}/${mangaId}`);
      const listResult = await listAll(mangaRef);
      
      // Supprimer tous les fichiers
      const deletePromises = listResult.items.map(item => deleteObject(item));
      await Promise.all(deletePromises);
      
      // Supprimer tous les sous-dossiers (pages)
      const folderPromises = listResult.prefixes.map(async (folderRef) => {
        const folderList = await listAll(folderRef);
        return Promise.all(folderList.items.map(item => deleteObject(item)));
      });
      await Promise.all(folderPromises);
      
      console.log('🗑️ Tous les fichiers du manga supprimés');
    } catch (error) {
      console.error('Erreur deleteMangaFiles:', error);
    }
  }

  /**
   * Convertit une URI locale en Blob pour l'upload
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    try {
      console.log('🔄 Converting URI to Blob:', uri);
      
      const response = await fetch(uri);
      console.log('📥 Fetch response status:', response.status);
      console.log('📥 Fetch response headers:', JSON.stringify(Array.from(response.headers.entries())));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('✅ Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      return blob;
    } catch (error) {
      console.error('❌ Erreur uriToBlob:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Impossible de convertir l'URI en Blob: ${error}`);
    }
  }

  /**
   * Obtient la taille d'un fichier depuis son URI
   */
  async getFileSize(uri: string): Promise<number> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Erreur getFileSize:', error);
      return 0;
    }
  }
}

export default new StorageService();
