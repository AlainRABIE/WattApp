import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import StorageService from '../../services/StorageService';

export interface PDFBookData {
  id: string;
  title: string;
  filePath: string; // URI du PDF original (local)
  firebaseUrl?: string; // URL Firebase Storage du PDF
  coverImagePath?: string; // URI de l'image de couverture locale
  coverImageUrl?: string; // URL Firebase Storage de la couverture
  pagesImagePaths?: string[]; // URIs des images de chaque page
  totalPages?: number; // Nombre total de pages
  downloadedAt: number;
  fileSize?: number;
}

export class NativePDFService {
  private static COVERS_DIR = `${FileSystem.documentDirectory}pdf-covers/`;
  private static PDFS_DIR = `${FileSystem.documentDirectory}pdfs/`;

  /**
   * Crée les dossiers de stockage si nécessaire
   */
  private static async ensureDirectories(): Promise<void> {
    const coversDir = await FileSystem.getInfoAsync(this.COVERS_DIR);
    if (!coversDir.exists) {
      await FileSystem.makeDirectoryAsync(this.COVERS_DIR, { intermediates: true });
    }

    const pdfsDir = await FileSystem.getInfoAsync(this.PDFS_DIR);
    if (!pdfsDir.exists) {
      await FileSystem.makeDirectoryAsync(this.PDFS_DIR, { intermediates: true });
    }
  }

  /**
   * Télécharge un PDF et génère une couverture locale
   */
  static async downloadPDFLocally(
    pdfUrl: string, 
    bookId: string, 
    title: string,
    customCoverUri?: string
  ): Promise<PDFBookData> {
    try {
      await this.ensureDirectories();

      // Télécharger le PDF localement
      const pdfFileName = `${bookId}.pdf`;
      const localPdfPath = `${this.PDFS_DIR}${pdfFileName}`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, localPdfPath);
      
      if (!downloadResult.uri) {
        throw new Error('Échec du téléchargement du PDF');
      }

      // Générer ou copier l'image de couverture
      let coverImagePath: string | undefined;
      
      if (customCoverUri) {
        // L'utilisateur a fourni une couverture personnalisée
        coverImagePath = await this.saveCoverImage(customCoverUri, bookId);
      } else {
        // Générer une couverture par défaut (icône PDF)
        coverImagePath = await this.generateDefaultCover(bookId, title);
      }

      // Obtenir la taille du fichier
      const fileInfo = await FileSystem.getInfoAsync(localPdfPath);
      const fileSize = fileInfo.exists && fileInfo.size ? fileInfo.size : 0;

      return {
        id: bookId,
        title,
        filePath: localPdfPath, // URI locale du PDF
        coverImagePath,
        downloadedAt: Date.now(),
        fileSize
      };
    } catch (error) {
      console.error('Erreur lors du téléchargement PDF:', error);
      throw error;
    }
  }

  /**
   * Upload un PDF vers Firebase Storage et retourne l'URL
   */
  static async uploadPDFToFirebase(
    localPdfUri: string,
    bookId: string,
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      console.log('☁️ Upload PDF vers Firebase Storage...');
      const firebaseUrl = await StorageService.uploadBookPDF(
        localPdfUri,
        bookId,
        userId,
        onProgress
      );
      console.log('✅ PDF uploadé:', firebaseUrl);
      return firebaseUrl;
    } catch (error) {
      console.error('Erreur uploadPDFToFirebase:', error);
      throw error;
    }
  }

  /**
   * Upload une couverture vers Firebase Storage
   */
  static async uploadCoverToFirebase(
    coverUri: string,
    bookId: string,
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      console.log('☁️ Upload couverture vers Firebase Storage...');
      const firebaseUrl = await StorageService.uploadBookCover(
        coverUri,
        bookId,
        userId,
        onProgress
      );
      console.log('✅ Couverture uploadée:', firebaseUrl);
      return firebaseUrl;
    } catch (error) {
      console.error('Erreur uploadCoverToFirebase:', error);
      throw error;
    }
  }

  /**
   * Copie un PDF local (depuis DocumentPicker) vers le stockage de l'app
   */
  static async saveLocalPDF(
    localPdfUri: string,
    bookId: string,
    title: string,
    customCoverUri?: string
  ): Promise<PDFBookData> {
    try {
      await this.ensureDirectories();

      console.log('📱 Copie du PDF local vers le stockage app...');
      console.log('📱 Source:', localPdfUri);

      // Copier le PDF depuis l'URI local vers notre dossier
      const pdfFileName = `${bookId}.pdf`;
      const localPdfPath = `${this.PDFS_DIR}${pdfFileName}`;

      console.log('📱 Destination:', localPdfPath);

      // Utiliser copyAsync pour les fichiers locaux
      await FileSystem.copyAsync({
        from: localPdfUri,
        to: localPdfPath
      });

      // Vérifier que la copie a réussi
      const fileInfo = await FileSystem.getInfoAsync(localPdfPath);
      if (!fileInfo.exists) {
        throw new Error('Échec de la copie du PDF local');
      }

      console.log('📱 PDF copié avec succès, taille:', fileInfo.size);

      // Générer ou copier l'image de couverture
      let coverImagePath: string | undefined;
      
      if (customCoverUri) {
        // L'utilisateur a fourni une couverture personnalisée
        coverImagePath = await this.saveCoverImage(customCoverUri, bookId);
      } else {
        // Générer une couverture par défaut (icône PDF)
        coverImagePath = await this.generateDefaultCover(bookId, title);
      }

      return {
        id: bookId,
        title,
        filePath: localPdfPath, // URI locale du PDF
        coverImagePath,
        downloadedAt: Date.now(),
        fileSize: fileInfo.size || 0
      };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde PDF local:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde une image de couverture personnalisée
   */
  private static async saveCoverImage(coverUri: string, bookId: string): Promise<string> {
    try {
      const coverFileName = `cover_${bookId}.jpg`;
      const localCoverPath = `${this.COVERS_DIR}${coverFileName}`;

      // Redimensionner et optimiser l'image de couverture
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        coverUri,
        [{ resize: { width: 400, height: 600 } }], // Ratio livre classique
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      // Copier vers le stockage permanent
      await FileSystem.copyAsync({
        from: manipulatedImage.uri,
        to: localCoverPath
      });

      return localCoverPath;
    } catch (error) {
      console.error('Erreur sauvegarde couverture:', error);
      throw error;
    }
  }

  /**
   * Génère une couverture par défaut avec le titre
   */
  private static async generateDefaultCover(bookId: string, title: string): Promise<string> {
    try {
      // Pour une couverture par défaut, on peut soit :
      // 1. Créer une image avec du texte (complexe sans canvas natif)
      // 2. Utiliser une image par défaut prédéfinie
      // 3. Retourner null et gérer côté UI
      
      // Option simple : retourner null et gérer une icône par défaut côté UI
      return '';
    } catch (error) {
      console.error('Erreur génération couverture par défaut:', error);
      return '';
    }
  }

  /**
   * Récupère les informations d'un livre téléchargé
   */
  static async getLocalBook(bookId: string): Promise<PDFBookData | null> {
    try {
      const pdfPath = `${this.PDFS_DIR}${bookId}.pdf`;
      const coverPath = `${this.COVERS_DIR}cover_${bookId}.jpg`;

      const pdfInfo = await FileSystem.getInfoAsync(pdfPath);
      if (!pdfInfo.exists) {
        return null;
      }

      const coverInfo = await FileSystem.getInfoAsync(coverPath);
      const coverImagePath = coverInfo.exists ? coverPath : undefined;

      return {
        id: bookId,
        title: 'PDF Local', // Le titre devrait être stocké séparément
        filePath: pdfPath,
        coverImagePath,
        downloadedAt: pdfInfo.modificationTime || Date.now(),
        fileSize: pdfInfo.size
      };
    } catch (error) {
      console.error('Erreur récupération livre local:', error);
      return null;
    }
  }

  /**
   * Supprime un livre et sa couverture du stockage local
   */
  static async deleteLocalBook(bookId: string): Promise<void> {
    try {
      const pdfPath = `${this.PDFS_DIR}${bookId}.pdf`;
      const coverPath = `${this.COVERS_DIR}cover_${bookId}.jpg`;

      // Supprimer le PDF
      const pdfInfo = await FileSystem.getInfoAsync(pdfPath);
      if (pdfInfo.exists) {
        await FileSystem.deleteAsync(pdfPath);
      }

      // Supprimer la couverture
      const coverInfo = await FileSystem.getInfoAsync(coverPath);
      if (coverInfo.exists) {
        await FileSystem.deleteAsync(coverPath);
      }
    } catch (error) {
      console.error('Erreur suppression livre local:', error);
      throw error;
    }
  }

  /**
   * Liste tous les livres téléchargés localement
   */
  static async getLocalBooks(): Promise<PDFBookData[]> {
    try {
      await this.ensureDirectories();
      
      const pdfsDir = await FileSystem.getInfoAsync(this.PDFS_DIR);
      if (!pdfsDir.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(this.PDFS_DIR);
      const books: PDFBookData[] = [];

      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const bookId = file.replace('.pdf', '');
          const book = await this.getLocalBook(bookId);
          if (book) {
            books.push(book);
          }
        }
      }

      return books.sort((a, b) => b.downloadedAt - a.downloadedAt);
    } catch (error) {
      console.error('Erreur liste livres locaux:', error);
      return [];
    }
  }

  /**
   * Calcule l'espace total utilisé par les PDFs téléchargés
   */
  static async getTotalStorageUsed(): Promise<number> {
    try {
      let totalSize = 0;

      // Taille des PDFs
      const pdfsDir = await FileSystem.getInfoAsync(this.PDFS_DIR);
      if (pdfsDir.exists) {
        const pdfFiles = await FileSystem.readDirectoryAsync(this.PDFS_DIR);
        for (const file of pdfFiles) {
          const filePath = `${this.PDFS_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }
      }

      // Taille des couvertures
      const coversDir = await FileSystem.getInfoAsync(this.COVERS_DIR);
      if (coversDir.exists) {
        const coverFiles = await FileSystem.readDirectoryAsync(this.COVERS_DIR);
        for (const file of coverFiles) {
          const filePath = `${this.COVERS_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Erreur calcul stockage:', error);
      return 0;
    }
  }

  /**
   * Formate la taille en octets en format lisible
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}