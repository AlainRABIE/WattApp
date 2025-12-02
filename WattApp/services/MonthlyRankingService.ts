import { db } from '../constants/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

export interface MonthlyBook {
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  reads: number;
  avgRating: number;
  rank: number;
}

export interface MonthlyRanking {
  month: string; // Format: "2025-12"
  year: number;
  monthNumber: number;
  topBook: MonthlyBook | null;
  topBooks: MonthlyBook[];
  generatedAt: Date;
}

class MonthlyRankingServiceClass {
  /**
   * Obtenir le mois et l'année actuels au format "YYYY-MM"
   */
  private getCurrentMonth(): { monthKey: string; year: number; month: number } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    return { monthKey, year, month };
  }

  /**
   * Obtenir le mois précédent au format "YYYY-MM"
   */
  private getPreviousMonth(): { monthKey: string; year: number; month: number } {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    return { monthKey, year, month };
  }

  /**
   * Calculer le classement du mois
   * À exécuter automatiquement le 1er de chaque mois (via Cloud Function)
   */
  async calculateMonthlyRanking(targetMonth?: string): Promise<MonthlyRanking> {
    try {
      const { monthKey, year, month } = targetMonth 
        ? this.parseMonthKey(targetMonth)
        : this.getPreviousMonth();

      // Récupérer tous les livres
      const booksRef = collection(db, 'books');
      const booksSnapshot = await getDocs(booksRef);

      const booksWithStats: MonthlyBook[] = [];

      for (const bookDoc of booksSnapshot.docs) {
        const bookData = bookDoc.data();
        
        // Calculer la moyenne des notes
        const ratingsRef = collection(db, 'books', bookDoc.id, 'ratings');
        const ratingsSnapshot = await getDocs(ratingsRef);
        
        let totalRating = 0;
        let ratingCount = 0;
        
        ratingsSnapshot.forEach(ratingDoc => {
          const rating = ratingDoc.data().rating;
          if (typeof rating === 'number') {
            totalRating += rating;
            ratingCount++;
          }
        });

        const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

        booksWithStats.push({
          bookId: bookDoc.id,
          title: bookData.title || 'Sans titre',
          author: bookData.author || 'Auteur inconnu',
          coverImage: bookData.cover || bookData.coverImage || '',
          reads: bookData.reads || 0,
          avgRating,
          rank: 0,
        });
      }

      // Trier par nombre de lectures (décroissant)
      booksWithStats.sort((a, b) => b.reads - a.reads);

      // Assigner les rangs
      booksWithStats.forEach((book, index) => {
        book.rank = index + 1;
      });

      // Garder le top 10
      const topBooks = booksWithStats.slice(0, 10);
      const topBook = topBooks.length > 0 ? topBooks[0] : null;

      const ranking: MonthlyRanking = {
        month: monthKey,
        year,
        monthNumber: month,
        topBook,
        topBooks,
        generatedAt: new Date(),
      };

      // Sauvegarder dans Firestore
      const rankingRef = doc(db, 'monthlyRankings', monthKey);
      await setDoc(rankingRef, {
        ...ranking,
        generatedAt: serverTimestamp(),
      });

      return ranking;
    } catch (error) {
      console.error('Erreur calcul classement mensuel:', error);
      throw error;
    }
  }

  /**
   * Récupérer le classement d'un mois spécifique
   */
  async getMonthlyRanking(monthKey?: string): Promise<MonthlyRanking | null> {
    try {
      const targetMonth = monthKey || this.getPreviousMonth().monthKey;
      const rankingRef = doc(db, 'monthlyRankings', targetMonth);
      const rankingSnap = await getDoc(rankingRef);

      if (!rankingSnap.exists()) {
        // Générer le classement si inexistant
        return await this.calculateMonthlyRanking(targetMonth);
      }

      const data = rankingSnap.data();
      return {
        month: data.month,
        year: data.year,
        monthNumber: data.monthNumber,
        topBook: data.topBook,
        topBooks: data.topBooks || [],
        generatedAt: data.generatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Erreur récupération classement:', error);
      return null;
    }
  }

  /**
   * Obtenir le livre du mois en cours
   */
  async getCurrentMonthTopBook(): Promise<MonthlyBook | null> {
    const ranking = await this.getMonthlyRanking();
    return ranking?.topBook || null;
  }

  /**
   * Vérifier si un livre est le livre du mois
   */
  async isBookOfTheMonth(bookId: string): Promise<boolean> {
    const topBook = await this.getCurrentMonthTopBook();
    return topBook?.bookId === bookId;
  }

  /**
   * Obtenir tous les classements mensuels (historique)
   */
  async getAllRankings(limitCount: number = 6): Promise<MonthlyRanking[]> {
    try {
      const rankingsRef = collection(db, 'monthlyRankings');
      const rankingsQuery = query(
        rankingsRef,
        orderBy('year', 'desc'),
        orderBy('monthNumber', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(rankingsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          month: data.month,
          year: data.year,
          monthNumber: data.monthNumber,
          topBook: data.topBook,
          topBooks: data.topBooks || [],
          generatedAt: data.generatedAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Erreur récupération historique:', error);
      return [];
    }
  }

  /**
   * Parser un monthKey "YYYY-MM"
   */
  private parseMonthKey(monthKey: string): { monthKey: string; year: number; month: number } {
    const [yearStr, monthStr] = monthKey.split('-');
    return {
      monthKey,
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
    };
  }

  /**
   * Obtenir le nom du mois en français
   */
  getMonthName(monthNumber: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[monthNumber - 1] || '';
  }
}

export const MonthlyRankingService = new MonthlyRankingServiceClass();
