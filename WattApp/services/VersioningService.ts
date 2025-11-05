import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  serverTimestamp, 
  orderBy, 
  query, 
  limit,
  where,
  Timestamp 
} from 'firebase/firestore';

export interface Version {
  id: string;
  bookId: string;
  chapterId?: string;
  content: string;
  title?: string;
  versionNumber: number;
  createdAt: Timestamp;
  createdBy: string;
  authorName: string;
  changeType: 'auto' | 'manual' | 'backup' | 'milestone';
  changeDescription?: string;
  wordCount: number;
  characterCount: number;
  diff?: VersionDiff;
  tags?: string[];
  isActive: boolean;
}

export interface VersionDiff {
  added: string[];
  removed: string[];
  changed: { from: string; to: string; }[];
}

export interface RestoreOptions {
  createBackup: boolean;
  notifyUser: boolean;
  updateMetadata: boolean;
}

export class VersioningService {
  
  /**
   * Créer une nouvelle version d'un document
   */
  static async createVersion(
    bookId: string,
    content: string,
    options: {
      chapterId?: string;
      title?: string;
      changeType?: 'auto' | 'manual' | 'backup' | 'milestone';
      changeDescription?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Calculer les statistiques
      const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
      const characterCount = content.length;

      // Obtenir le numéro de version suivant
      const nextVersionNumber = await this.getNextVersionNumber(bookId, options.chapterId);

      // Obtenir la version précédente pour le diff
      const previousVersion = await this.getLatestVersion(bookId, options.chapterId);
      const diff = previousVersion ? this.calculateDiff(previousVersion.content, content) : undefined;

      // Créer la version
      const versionData: Omit<Version, 'id'> = {
        bookId,
        chapterId: options.chapterId,
        content,
        title: options.title,
        versionNumber: nextVersionNumber,
        createdAt: serverTimestamp() as Timestamp,
        createdBy: user.uid,
        authorName: user.displayName || user.email || 'Auteur inconnu',
        changeType: options.changeType || 'auto',
        changeDescription: options.changeDescription,
        wordCount,
        characterCount,
        diff,
        tags: options.tags || [],
        isActive: true,
      };

      const versionsRef = collection(db, 'versions');
      const versionDoc = await addDoc(versionsRef, versionData);

      // Désactiver les anciennes versions auto si nécessaire
      if (options.changeType === 'auto') {
        await this.cleanupOldAutoVersions(bookId, options.chapterId);
      }

      // Mettre à jour les métadonnées du document principal
      await this.updateDocumentMetadata(bookId, options.chapterId, {
        lastVersionId: versionDoc.id,
        versionCount: nextVersionNumber,
        lastModified: serverTimestamp(),
        wordCount,
        characterCount,
      });

      return versionDoc.id;
    } catch (error) {
      console.error('Erreur lors de la création de version:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des versions
   */
  static async getVersionHistory(
    bookId: string,
    chapterId?: string,
    limitCount: number = 50
  ): Promise<Version[]> {
    try {
      const versionsRef = collection(db, 'versions');
      let q = query(
        versionsRef,
        where('bookId', '==', bookId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (chapterId) {
        q = query(
          versionsRef,
          where('bookId', '==', bookId),
          where('chapterId', '==', chapterId),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Version[];
    } catch (error) {
      console.error('Erreur lors de la récupération des versions:', error);
      throw error;
    }
  }

  /**
   * Restaurer une version spécifique
   */
  static async restoreVersion(
    versionId: string,
    options: RestoreOptions = {
      createBackup: true,
      notifyUser: true,
      updateMetadata: true,
    }
  ): Promise<void> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer la version à restaurer
      const versionDoc = await getDoc(doc(db, 'versions', versionId));
      if (!versionDoc.exists()) {
        throw new Error('Version introuvable');
      }

      const version = { id: versionDoc.id, ...versionDoc.data() } as Version;

      // Créer une sauvegarde de la version actuelle si demandé
      if (options.createBackup) {
        const currentContent = await this.getCurrentContent(version.bookId, version.chapterId);
        if (currentContent) {
          await this.createVersion(version.bookId, currentContent, {
            chapterId: version.chapterId,
            changeType: 'backup',
            changeDescription: `Sauvegarde avant restauration de la version ${version.versionNumber}`,
          });
        }
      }

      // Restaurer le contenu
      if (version.chapterId) {
        // Restaurer un chapitre
        const chapterRef = doc(db, 'books', version.bookId, 'chapters', version.chapterId);
        await updateDoc(chapterRef, {
          content: version.content,
          title: version.title || undefined,
          updatedAt: serverTimestamp(),
          restoredFromVersion: versionId,
          restoredAt: serverTimestamp(),
          restoredBy: user.uid,
        });
      } else {
        // Restaurer le livre principal
        const bookRef = doc(db, 'books', version.bookId);
        await updateDoc(bookRef, {
          body: version.content,
          title: version.title || undefined,
          updatedAt: serverTimestamp(),
          restoredFromVersion: versionId,
          restoredAt: serverTimestamp(),
          restoredBy: user.uid,
        });
      }

      // Créer une nouvelle version marquant la restauration
      await this.createVersion(version.bookId, version.content, {
        chapterId: version.chapterId,
        title: version.title,
        changeType: 'manual',
        changeDescription: `Restauration de la version ${version.versionNumber}`,
        tags: ['restoration'],
      });

    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      throw error;
    }
  }

  /**
   * Comparer deux versions
   */
  static async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: Version;
    version2: Version;
    diff: VersionDiff;
    summary: {
      addedWords: number;
      removedWords: number;
      changedWords: number;
    };
  }> {
    try {
      const [version1Doc, version2Doc] = await Promise.all([
        getDoc(doc(db, 'versions', versionId1)),
        getDoc(doc(db, 'versions', versionId2)),
      ]);

      if (!version1Doc.exists() || !version2Doc.exists()) {
        throw new Error('Une ou plusieurs versions introuvables');
      }

      const version1 = { id: version1Doc.id, ...version1Doc.data() } as Version;
      const version2 = { id: version2Doc.id, ...version2Doc.data() } as Version;

      const diff = this.calculateDiff(version1.content, version2.content);
      
      const summary = {
        addedWords: diff.added.reduce((sum, text) => sum + text.split(/\s+/).length, 0),
        removedWords: diff.removed.reduce((sum, text) => sum + text.split(/\s+/).length, 0),
        changedWords: diff.changed.reduce((sum, change) => 
          sum + Math.max(
            change.from.split(/\s+/).length, 
            change.to.split(/\s+/).length
          ), 0
        ),
      };

      return {
        version1,
        version2,
        diff,
        summary,
      };
    } catch (error) {
      console.error('Erreur lors de la comparaison:', error);
      throw error;
    }
  }

  /**
   * Créer un jalon (milestone)
   */
  static async createMilestone(
    bookId: string,
    chapterId: string | undefined,
    title: string,
    description: string,
    tags: string[] = []
  ): Promise<string> {
    try {
      const currentContent = await this.getCurrentContent(bookId, chapterId);
      if (!currentContent) {
        throw new Error('Contenu actuel introuvable');
      }

      return await this.createVersion(bookId, currentContent, {
        chapterId,
        title,
        changeType: 'milestone',
        changeDescription: description,
        tags: ['milestone', ...tags],
      });
    } catch (error) {
      console.error('Erreur lors de la création du jalon:', error);
      throw error;
    }
  }

  /**
   * Obtenir les jalons (milestones)
   */
  static async getMilestones(bookId: string, chapterId?: string): Promise<Version[]> {
    try {
      const versionsRef = collection(db, 'versions');
      let q = query(
        versionsRef,
        where('bookId', '==', bookId),
        where('changeType', '==', 'milestone'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (chapterId) {
        q = query(
          versionsRef,
          where('bookId', '==', bookId),
          where('chapterId', '==', chapterId),
          where('changeType', '==', 'milestone'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Version[];
    } catch (error) {
      console.error('Erreur lors de la récupération des jalons:', error);
      throw error;
    }
  }

  // ========== MÉTHODES PRIVÉES ==========

  private static async getNextVersionNumber(bookId: string, chapterId?: string): Promise<number> {
    const versions = await this.getVersionHistory(bookId, chapterId, 1);
    return versions.length > 0 ? versions[0].versionNumber + 1 : 1;
  }

  private static async getLatestVersion(bookId: string, chapterId?: string): Promise<Version | null> {
    const versions = await this.getVersionHistory(bookId, chapterId, 1);
    return versions.length > 0 ? versions[0] : null;
  }

  private static async getCurrentContent(bookId: string, chapterId?: string): Promise<string | null> {
    try {
      if (chapterId) {
        const chapterDoc = await getDoc(doc(db, 'books', bookId, 'chapters', chapterId));
        return chapterDoc.exists() ? chapterDoc.data()?.content || null : null;
      } else {
        const bookDoc = await getDoc(doc(db, 'books', bookId));
        return bookDoc.exists() ? bookDoc.data()?.body || null : null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du contenu:', error);
      return null;
    }
  }

  private static calculateDiff(oldContent: string, newContent: string): VersionDiff {
    // Algorithme de diff simple - pourrait être amélioré avec une librairie comme 'diff'
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const added: string[] = [];
    const removed: string[] = [];
    const changed: { from: string; to: string; }[] = [];

    const maxLength = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        // Pas de changement
        continue;
      } else if (!oldLine && newLine) {
        // Ligne ajoutée
        added.push(newLine);
      } else if (oldLine && !newLine) {
        // Ligne supprimée
        removed.push(oldLine);
      } else {
        // Ligne modifiée
        changed.push({ from: oldLine, to: newLine });
      }
    }

    return { added, removed, changed };
  }

  private static async cleanupOldAutoVersions(bookId: string, chapterId?: string): Promise<void> {
    try {
      // Garder seulement les 10 dernières versions automatiques
      const versionsRef = collection(db, 'versions');
      let q = query(
        versionsRef,
        where('bookId', '==', bookId),
        where('changeType', '==', 'auto'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (chapterId) {
        q = query(
          versionsRef,
          where('bookId', '==', bookId),
          where('chapterId', '==', chapterId),
          where('changeType', '==', 'auto'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const versions = snapshot.docs;

      // Désactiver les versions au-delà des 10 plus récentes
      if (versions.length > 10) {
        const versionsToDeactivate = versions.slice(10);
        await Promise.all(
          versionsToDeactivate.map(versionDoc =>
            updateDoc(versionDoc.ref, { isActive: false })
          )
        );
      }
    } catch (error) {
      console.warn('Erreur lors du nettoyage des anciennes versions:', error);
    }
  }

  private static async updateDocumentMetadata(
    bookId: string,
    chapterId: string | undefined,
    metadata: {
      lastVersionId: string;
      versionCount: number;
      lastModified: any;
      wordCount: number;
      characterCount: number;
    }
  ): Promise<void> {
    try {
      if (chapterId) {
        const chapterRef = doc(db, 'books', bookId, 'chapters', chapterId);
        await updateDoc(chapterRef, metadata);
      } else {
        const bookRef = doc(db, 'books', bookId);
        await updateDoc(bookRef, metadata);
      }
    } catch (error) {
      console.warn('Erreur lors de la mise à jour des métadonnées:', error);
    }
  }
}

export default VersioningService;