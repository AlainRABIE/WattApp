import { getAuth } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';
import StorageService from './StorageService';

/**
 * Service pour migrer les photos de profil base64 vers Firebase Storage
 */
class ProfileMigrationService {
  
  /**
   * Migre la photo de profil d'un utilisateur de base64 vers Firebase Storage
   */
  async migrateUserPhotoToStorage(userId: string): Promise<string | null> {
    try {
      console.log('🔄 Migration de la photo de profil pour:', userId);
      
      // 1. Récupérer le document utilisateur
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('❌ Utilisateur non trouvé');
        return null;
      }
      
      const userData = userDoc.data();
      const photoURL = userData?.photoURL;
      
      if (!photoURL) {
        console.log('ℹ️ Pas de photo de profil à migrer');
        return null;
      }
      
      // 2. Vérifier si c'est déjà une URL Firebase Storage
      if (photoURL.includes('firebasestorage.googleapis.com') || photoURL.includes('firebasestorage.app')) {
        console.log('✅ Photo déjà sur Firebase Storage');
        return photoURL;
      }
      
      // 3. Vérifier si c'est une image base64 très longue
      if (photoURL.startsWith('data:image') && photoURL.length > 1000) {
        console.log('📤 Migration de l\'image base64 vers Storage...');
        console.log('📊 Taille base64:', photoURL.length, 'caractères');
        
        // Upload vers Firebase Storage
        const storageURL = await StorageService.uploadProfilePicture(
          photoURL,
          userId
        );
        
        console.log('✅ Photo uploadée vers Storage:', storageURL);
        
        // 4. Mettre à jour Firestore avec la nouvelle URL
        await updateDoc(userDocRef, {
          photoURL: storageURL,
          photoMigratedAt: new Date().toISOString(),
        });
        
        console.log('✅ Firestore mis à jour avec la nouvelle URL');
        
        return storageURL;
      }
      
      // Si c'est une autre URL (ui-avatars, etc.), on la garde
      console.log('ℹ️ Photo est une URL externe, pas de migration nécessaire');
      return photoURL;
      
    } catch (error) {
      console.error('❌ Erreur migration photo de profil:', error);
      throw error;
    }
  }
  
  /**
   * Migre automatiquement la photo de l'utilisateur connecté
   */
  async migrateCurrentUserPhoto(): Promise<string | null> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.log('❌ Aucun utilisateur connecté');
        return null;
      }
      
      return await this.migrateUserPhotoToStorage(user.uid);
    } catch (error) {
      console.error('❌ Erreur migration photo utilisateur connecté:', error);
      return null;
    }
  }
  
  /**
   * Vérifie si une photo doit être migrée
   */
  shouldMigrate(photoURL: string | null | undefined): boolean {
    if (!photoURL) return false;
    
    // Déjà sur Firebase Storage
    if (photoURL.includes('firebasestorage.googleapis.com') || photoURL.includes('firebasestorage.app')) {
      return false;
    }
    
    // Base64 très longue (> 1KB)
    if (photoURL.startsWith('data:image') && photoURL.length > 1000) {
      return true;
    }
    
    return false;
  }
}

export default new ProfileMigrationService();
