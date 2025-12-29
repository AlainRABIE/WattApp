import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';
import StorageService from './StorageService';

export interface Book {
  id: string;
  userId: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  synopsis: string;
  body?: string; // Contenu textuel du livre
  
  // Médias
  coverImageUrl?: string;
  pdfUrl?: string; // URL du PDF sur Firebase Storage
  
  // Métadonnées
  category: string;
  genre: string[];
  tags: string[];
  language: string;
  
  // Publication
  isPublished: boolean;
  isDraft: boolean;
  publishDate: Timestamp | Date;
  lastModified: Timestamp | Date;
  
  // Monétisation
  isFree: boolean;
  price: number;
  currency: 'EUR' | 'USD';
  
  // Statistiques
  views: number;
  downloads: number;
  likes: number;
  rating_average: number;
  rating_count: number;
  
  // Chapitres
  chapters?: Chapter[];
  totalChapters: number;
  
  // Autres
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  rating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
  copyrightInfo?: string;
  isAdult: boolean;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  chapterNumber: number;
  body: string;
  wordCount: number;
  isPublished: boolean;
  publishDate: Timestamp | Date;
  isFree: boolean;
  price?: number;
}

export interface UserBookStats {
  totalPublished: number;
  totalDrafts: number;
  totalViews: number;
  totalDownloads: number;
  totalEarnings: number;
  followersCount: number;
}

class BookService {
  /**
   * Crée un nouveau livre
   */
  async createBook(bookData: Omit<Book, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'books'), {
        ...bookData,
        publishDate: serverTimestamp(),
        lastModified: serverTimestamp(),
        views: 0,
        downloads: 0,
        likes: 0,
        rating_average: 0,
        rating_count: 0,
        totalChapters: 0,
      });
      console.log('📚 Livre créé avec ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Erreur createBook:', error);
      throw error;
    }
  }

  /**
   * Récupère un livre par son ID
   */
  async getBook(bookId: string): Promise<Book | null> {
    try {
      const docRef = doc(db, 'books', bookId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Book;
      }
      return null;
    } catch (error) {
      console.error('Erreur getBook:', error);
      throw error;
    }
  }

  /**
   * Met à jour un livre
   */
  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    try {
      const docRef = doc(db, 'books', bookId);
      await updateDoc(docRef, {
        ...updates,
        lastModified: serverTimestamp(),
      });
      console.log('📚 Livre mis à jour:', bookId);
    } catch (error) {
      console.error('Erreur updateBook:', error);
      throw error;
    }
  }

  /**
   * Supprime un livre et tous ses fichiers
   */
  async deleteBook(bookId: string): Promise<void> {
    try {
      // Récupérer le livre pour obtenir l'userId
      const book = await this.getBook(bookId);
      
      if (book) {
        // Supprimer tous les fichiers du Storage
        await StorageService.deleteBookFiles(bookId, book.userId);
      }
      
      // Supprimer le document
      await deleteDoc(doc(db, 'books', bookId));
      console.log('🗑️ Livre supprimé:', bookId);
    } catch (error) {
      console.error('Erreur deleteBook:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les livres d'un utilisateur
   */
  async getUserBooks(
    userId: string, 
    includePublished = true, 
    includeDrafts = true
  ): Promise<Book[]> {
    try {
      const constraints = [where('userId', '==', userId)];
      
      if (!includePublished) {
        constraints.push(where('isPublished', '==', false));
      }
      if (!includeDrafts) {
        constraints.push(where('isDraft', '==', false));
      }
      
      const q = query(
        collection(db, 'books'),
        ...constraints,
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Book));
    } catch (error) {
      console.error('Erreur getUserBooks:', error);
      throw error;
    }
  }

  /**
   * Récupère les livres publiés pour le marketplace
   */
  async getPublishedBooks(
    category?: string,
    genre?: string,
    limitCount = 20,
    orderByField: 'publishDate' | 'views' | 'rating_average' = 'publishDate'
  ): Promise<Book[]> {
    try {
      const constraints = [
        where('isPublished', '==', true),
        where('isDraft', '==', false)
      ];
      
      if (category) {
        constraints.push(where('category', '==', category));
      }
      
      if (genre) {
        constraints.push(where('genre', 'array-contains', genre));
      }
      
      const q = query(
        collection(db, 'books'),
        ...constraints,
        orderBy(orderByField, 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Book));
    } catch (error) {
      console.error('Erreur getPublishedBooks:', error);
      throw error;
    }
  }

  /**
   * Recherche de livres
   */
  async searchBooks(searchTerm: string): Promise<Book[]> {
    try {
      const titleQuery = query(
        collection(db, 'books'),
        where('isPublished', '==', true),
        where('title', '>=', searchTerm),
        where('title', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      
      const tagsQuery = query(
        collection(db, 'books'),
        where('isPublished', '==', true),
        where('tags', 'array-contains-any', [searchTerm.toLowerCase()]),
        limit(10)
      );
      
      const [titleSnapshot, tagsSnapshot] = await Promise.all([
        getDocs(titleQuery),
        getDocs(tagsQuery)
      ]);
      
      const results = new Map<string, Book>();
      
      titleSnapshot.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() } as Book);
      });
      
      tagsSnapshot.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() } as Book);
      });
      
      return Array.from(results.values());
    } catch (error) {
      console.error('Erreur searchBooks:', error);
      throw error;
    }
  }

  /**
   * Upload la couverture d'un livre
   */
  async uploadBookCover(
    uri: string,
    bookId: string,
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      const downloadURL = await StorageService.uploadBookCover(
        uri, 
        bookId, 
        userId, 
        onProgress
      );
      
      // Mettre à jour le livre avec l'URL de la couverture
      await this.updateBook(bookId, { coverImageUrl: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error('Erreur uploadBookCover:', error);
      throw error;
    }
  }

  /**
   * Upload un PDF de livre
   */
  async uploadBookPDF(
    uri: string,
    bookId: string,
    userId: string,
    onProgress?: (progress: any) => void
  ): Promise<string> {
    try {
      const downloadURL = await StorageService.uploadBookPDF(
        uri, 
        bookId, 
        userId, 
        onProgress
      );
      
      // Mettre à jour le livre avec l'URL du PDF
      await this.updateBook(bookId, { pdfUrl: downloadURL });
      
      return downloadURL;
    } catch (error) {
      console.error('Erreur uploadBookPDF:', error);
      throw error;
    }
  }

  /**
   * Incrémente les vues
   */
  async incrementViews(bookId: string): Promise<void> {
    try {
      const docRef = doc(db, 'books', bookId);
      await updateDoc(docRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error('Erreur incrementViews:', error);
    }
  }

  /**
   * Incrémente les téléchargements
   */
  async incrementDownloads(bookId: string): Promise<void> {
    try {
      const docRef = doc(db, 'books', bookId);
      await updateDoc(docRef, {
        downloads: increment(1)
      });
    } catch (error) {
      console.error('Erreur incrementDownloads:', error);
    }
  }

  /**
   * Ajoute un like
   */
  async addLike(bookId: string): Promise<void> {
    try {
      const docRef = doc(db, 'books', bookId);
      await updateDoc(docRef, {
        likes: increment(1)
      });
    } catch (error) {
      console.error('Erreur addLike:', error);
    }
  }

  /**
   * Retire un like
   */
  async removeLike(bookId: string): Promise<void> {
    try {
      const docRef = doc(db, 'books', bookId);
      await updateDoc(docRef, {
        likes: increment(-1)
      });
    } catch (error) {
      console.error('Erreur removeLike:', error);
    }
  }

  /**
   * Ajoute une note
   */
  async addRating(bookId: string, rating: number): Promise<void> {
    try {
      const book = await this.getBook(bookId);
      if (!book) return;

      const newCount = book.rating_count + 1;
      const newAverage = ((book.rating_average * book.rating_count) + rating) / newCount;

      const docRef = doc(db, 'books', bookId);
      await updateDoc(docRef, {
        rating_average: newAverage,
        rating_count: newCount
      });
    } catch (error) {
      console.error('Erreur addRating:', error);
    }
  }

  /**
   * Récupère les statistiques d'un utilisateur
   */
  async getUserStats(userId: string): Promise<UserBookStats> {
    try {
      const userBooksQuery = query(
        collection(db, 'books'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(userBooksQuery);
      const books = querySnapshot.docs.map(doc => doc.data() as Book);
      
      const stats: UserBookStats = {
        totalPublished: books.filter(b => b.isPublished && !b.isDraft).length,
        totalDrafts: books.filter(b => b.isDraft).length,
        totalViews: books.reduce((sum, b) => sum + (b.views || 0), 0),
        totalDownloads: books.reduce((sum, b) => sum + (b.downloads || 0), 0),
        totalEarnings: 0, // À calculer depuis les transactions
        followersCount: 0, // À calculer depuis FollowService
      };
      
      return stats;
    } catch (error) {
      console.error('Erreur getUserStats:', error);
      throw error;
    }
  }

  /**
   * Crée un chapitre
   */
  async createChapter(chapterData: Omit<Chapter, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'books', chapterData.bookId, 'chapters'),
        {
          ...chapterData,
          publishDate: serverTimestamp(),
        }
      );
      
      // Incrémenter le nombre de chapitres du livre
      await this.updateBook(chapterData.bookId, {
        totalChapters: increment(1) as any
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Erreur createChapter:', error);
      throw error;
    }
  }

  /**
   * Récupère les chapitres d'un livre
   */
  async getChapters(bookId: string): Promise<Chapter[]> {
    try {
      const q = query(
        collection(db, 'books', bookId, 'chapters'),
        orderBy('chapterNumber', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chapter));
    } catch (error) {
      console.error('Erreur getChapters:', error);
      throw error;
    }
  }
}

export default new BookService();
