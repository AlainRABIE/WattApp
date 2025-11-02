import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';

export class FollowService {
  
  /**
   * Suivre un utilisateur
   */
  static async followUser(followerId: string, followerName: string, followedUserId: string, followedUserName: string) {
    try {
      const followId = `${followerId}_${followedUserId}`;
      const followRef = doc(db, 'follows', followId);
      
      await setDoc(followRef, {
        followerId,
        followerName,
        followedUserId,
        followedUserName,
        createdAt: serverTimestamp(),
      });
      
      // Mettre à jour les statistiques
      await this.updateFollowStats(followerId, followedUserId, 1);
      
      return true;
    } catch (error) {
      console.error('Erreur lors du suivi:', error);
      throw error;
    }
  }
  
  /**
   * Ne plus suivre un utilisateur
   */
  static async unfollowUser(followerId: string, followedUserId: string) {
    try {
      const followId = `${followerId}_${followedUserId}`;
      const followRef = doc(db, 'follows', followId);
      
      await deleteDoc(followRef);
      
      // Mettre à jour les statistiques
      await this.updateFollowStats(followerId, followedUserId, -1);
      
      return true;
    } catch (error) {
      console.error('Erreur lors du désuivi:', error);
      throw error;
    }
  }
  
  /**
   * Vérifier si un utilisateur suit un autre
   */
  static async isFollowing(followerId: string, followedUserId: string): Promise<boolean> {
    try {
      const followId = `${followerId}_${followedUserId}`;
      const followRef = doc(db, 'follows', followId);
      const followDoc = await getDoc(followRef);
      
      return followDoc.exists();
    } catch (error) {
      console.error('Erreur lors de la vérification du suivi:', error);
      return false;
    }
  }
  
  /**
   * Obtenir le nombre d'abonnés d'un utilisateur
   */
  static async getFollowersCount(userId: string): Promise<number> {
    try {
      const followersQuery = query(
        collection(db, 'follows'),
        where('followedUserId', '==', userId)
      );
      
      const followersSnapshot = await getDocs(followersQuery);
      return followersSnapshot.size;
    } catch (error) {
      console.error('Erreur lors du comptage des abonnés:', error);
      return 0;
    }
  }
  
  /**
   * Obtenir le nombre d'abonnements d'un utilisateur
   */
  static async getFollowingCount(userId: string): Promise<number> {
    try {
      const followingQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', userId)
      );
      
      const followingSnapshot = await getDocs(followingQuery);
      return followingSnapshot.size;
    } catch (error) {
      console.error('Erreur lors du comptage des abonnements:', error);
      return 0;
    }
  }
  
  /**
   * Obtenir la liste des abonnés d'un utilisateur
   */
  static async getFollowers(userId: string) {
    try {
      const followersQuery = query(
        collection(db, 'follows'),
        where('followedUserId', '==', userId)
      );
      
      const followersSnapshot = await getDocs(followersQuery);
      return followersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des abonnés:', error);
      return [];
    }
  }
  
  /**
   * Obtenir la liste des abonnements d'un utilisateur
   */
  static async getFollowing(userId: string) {
    try {
      const followingQuery = query(
        collection(db, 'follows'),
        where('followerId', '==', userId)
      );
      
      const followingSnapshot = await getDocs(followingQuery);
      return followingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
      return [];
    }
  }
  
  /**
   * Mettre à jour les statistiques de suivi
   */
  private static async updateFollowStats(followerId: string, followedUserId: string, change: number) {
    try {
      // Mettre à jour les statistiques du suivi (follower)
      const followerStatsRef = doc(db, 'userStats', followerId);
      await updateDoc(followerStatsRef, {
        followingCount: increment(change),
        updatedAt: serverTimestamp(),
      }).catch(async () => {
        // Si le document n'existe pas, le créer
        await setDoc(followerStatsRef, {
          followingCount: Math.max(0, change),
          followersCount: 0,
          booksCount: 0,
          totalReads: 0,
          updatedAt: serverTimestamp(),
        });
      });
      
      // Mettre à jour les statistiques du suivi (followed)
      const followedStatsRef = doc(db, 'userStats', followedUserId);
      await updateDoc(followedStatsRef, {
        followersCount: increment(change),
        updatedAt: serverTimestamp(),
      }).catch(async () => {
        // Si le document n'existe pas, le créer
        await setDoc(followedStatsRef, {
          followersCount: Math.max(0, change),
          followingCount: 0,
          booksCount: 0,
          totalReads: 0,
          updatedAt: serverTimestamp(),
        });
      });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
  }
  
  /**
   * Initialiser les statistiques d'un utilisateur
   */
  static async initializeUserStats(userId: string, initialData?: Partial<any>) {
    try {
      const statsRef = doc(db, 'userStats', userId);
      const statsDoc = await getDoc(statsRef);
      
      if (!statsDoc.exists()) {
        await setDoc(statsRef, {
          followersCount: 0,
          followingCount: 0,
          booksCount: 0,
          totalReads: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...initialData,
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des statistiques:', error);
    }
  }
}

export default FollowService;