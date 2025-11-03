import { collection, doc, getDoc, setDoc, updateDoc, increment, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';

export interface TagStats {
  name: string;
  usage: number;
  lastUsed: number;
}

export class TagService {
  // Collection pour stocker les statistiques des tags
  private static tagsCollection = collection(db, 'tagStats');

  /**
   * Incrémente l'usage d'un tag
   */
  static async incrementTagUsage(tagName: string): Promise<void> {
    try {
      const tagDoc = doc(this.tagsCollection, tagName.toLowerCase());
      const tagSnapshot = await getDoc(tagDoc);

      if (tagSnapshot.exists()) {
        await updateDoc(tagDoc, {
          usage: increment(1),
          lastUsed: Date.now(),
        });
      } else {
        await setDoc(tagDoc, {
          name: tagName,
          usage: 1,
          lastUsed: Date.now(),
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation du tag:', error);
    }
  }

  /**
   * Incrémente l'usage de plusieurs tags
   */
  static async incrementMultipleTagsUsage(tags: string[]): Promise<void> {
    const promises = tags.map(tag => this.incrementTagUsage(tag));
    await Promise.all(promises);
  }

  /**
   * Récupère les tags les plus populaires
   */
  static async getPopularTags(limitCount: number = 20): Promise<TagStats[]> {
    try {
      const q = query(
        this.tagsCollection,
        orderBy('usage', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as TagStats);
    } catch (error) {
      console.error('Erreur lors de la récupération des tags populaires:', error);
      return [];
    }
  }

  /**
   * Récupère les tags récemment utilisés
   */
  static async getRecentTags(limitCount: number = 10): Promise<TagStats[]> {
    try {
      const q = query(
        this.tagsCollection,
        orderBy('lastUsed', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as TagStats);
    } catch (error) {
      console.error('Erreur lors de la récupération des tags récents:', error);
      return [];
    }
  }

  /**
   * Écoute en temps réel les tags populaires
   */
  static subscribeToPopularTags(
    callback: (tags: TagStats[]) => void,
    limitCount: number = 20
  ): () => void {
    const q = query(
      this.tagsCollection,
      orderBy('usage', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const tags = snapshot.docs.map(doc => doc.data() as TagStats);
      callback(tags);
    }, (error) => {
      console.error('Erreur lors de l\'écoute des tags populaires:', error);
      callback([]);
    });
  }

  /**
   * Recherche des tags par nom (pour l'autocomplétion)
   */
  static async searchTags(searchTerm: string, limitCount: number = 10): Promise<TagStats[]> {
    try {
      // Note: Firestore ne supporte pas nativement la recherche textuelle.
      // Pour une recherche plus avancée, il faudrait utiliser Algolia ou une solution similaire.
      // Ici, on récupère tous les tags populaires et on filtre côté client.
      const popularTags = await this.getPopularTags(100);
      
      return popularTags
        .filter(tag => 
          tag.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, limitCount);
    } catch (error) {
      console.error('Erreur lors de la recherche de tags:', error);
      return [];
    }
  }
}