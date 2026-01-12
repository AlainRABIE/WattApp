import { db } from '../constants/firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  QuerySnapshot
} from 'firebase/firestore';

export interface Notification {
  id?: string;
  userId: string;
  type: 'follow' | 'like' | 'comment' | 'new_chapter' | 'purchase' | 'message' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | any;
  relatedUserId?: string;
  relatedUserName?: string;
  relatedUserAvatar?: string;
  relatedBookId?: string;
  relatedBookTitle?: string;
  actionUrl?: string; // URL pour redirection (ex: /book/123, /profile/456)
}

class NotificationService {
  /**
   * Créer une nouvelle notification
   */
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    options?: {
      relatedUserId?: string;
      relatedUserName?: string;
      relatedUserAvatar?: string;
      relatedBookId?: string;
      relatedBookTitle?: string;
      actionUrl?: string;
    }
  ): Promise<string | null> {
    try {
      const notification: Omit<Notification, 'id'> = {
        userId,
        type,
        title,
        message,
        read: false,
        createdAt: serverTimestamp(),
        ...options,
      };

      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log('✅ Notification créée:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la notification:', error);
      return null;
    }
  }

  /**
   * Récupérer toutes les notifications d'un utilisateur
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des notifications:', error);
      return [];
    }
  }

  /**
   * Écouter les notifications en temps réel
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];
        callback(notifications);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Erreur lors de l\'écoute des notifications:', error);
      return () => {};
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
      console.log('✅ Notification marquée comme lue:', notificationId);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du marquage de la notification:', error);
      return false;
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log('ℹ️ Aucune notification non lue');
        return true;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { read: true });
      });

      await batch.commit();
      console.log('✅ Toutes les notifications marquées comme lues');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du marquage de toutes les notifications:', error);
      return false;
    }
  }

  /**
   * Compter les notifications non lues
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('❌ Erreur lors du comptage des notifications:', error);
      return 0;
    }
  }

  /**
   * Créer une notification de suivi
   */
  async notifyFollow(
    targetUserId: string,
    followerUserId: string,
    followerName: string,
    followerAvatar?: string
  ): Promise<string | null> {
    return this.createNotification(
      targetUserId,
      'follow',
      'Nouveau abonné',
      `${followerName} a commencé à vous suivre`,
      {
        relatedUserId: followerUserId,
        relatedUserName: followerName,
        relatedUserAvatar: followerAvatar,
        actionUrl: `/profile/${followerUserId}`,
      }
    );
  }

  /**
   * Créer une notification de nouveau chapitre
   */
  async notifyNewChapter(
    authorId: string,
    authorName: string,
    bookId: string,
    bookTitle: string,
    followerUserIds: string[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const notificationsRef = collection(db, 'notifications');

      for (const userId of followerUserIds) {
        const notification: Omit<Notification, 'id'> = {
          userId,
          type: 'new_chapter',
          title: 'Nouveau chapitre',
          message: `${authorName} a publié un nouveau chapitre de "${bookTitle}"`,
          read: false,
          createdAt: serverTimestamp(),
          relatedUserId: authorId,
          relatedUserName: authorName,
          relatedBookId: bookId,
          relatedBookTitle: bookTitle,
          actionUrl: `/book/${bookId}`,
        };

        const docRef = doc(notificationsRef);
        batch.set(docRef, notification);
      }

      await batch.commit();
      console.log(`✅ ${followerUserIds.length} notifications de nouveau chapitre créées`);
    } catch (error) {
      console.error('❌ Erreur lors de la création des notifications de nouveau chapitre:', error);
    }
  }

  /**
   * Créer une notification de like
   */
  async notifyLike(
    targetUserId: string,
    likerUserId: string,
    likerName: string,
    bookId: string,
    bookTitle: string,
    likerAvatar?: string
  ): Promise<string | null> {
    return this.createNotification(
      targetUserId,
      'like',
      'Nouveau like',
      `${likerName} aime "${bookTitle}"`,
      {
        relatedUserId: likerUserId,
        relatedUserName: likerName,
        relatedUserAvatar: likerAvatar,
        relatedBookId: bookId,
        relatedBookTitle: bookTitle,
        actionUrl: `/book/${bookId}`,
      }
    );
  }

  /**
   * Créer une notification de commentaire
   */
  async notifyComment(
    targetUserId: string,
    commenterUserId: string,
    commenterName: string,
    bookId: string,
    bookTitle: string,
    commentPreview: string,
    commenterAvatar?: string
  ): Promise<string | null> {
    return this.createNotification(
      targetUserId,
      'comment',
      'Nouveau commentaire',
      `${commenterName} a commenté "${bookTitle}": ${commentPreview}`,
      {
        relatedUserId: commenterUserId,
        relatedUserName: commenterName,
        relatedUserAvatar: commenterAvatar,
        relatedBookId: bookId,
        relatedBookTitle: bookTitle,
        actionUrl: `/book/${bookId}`,
      }
    );
  }

  /**
   * Créer une notification d'achat
   */
  async notifyPurchase(
    authorId: string,
    buyerName: string,
    bookId: string,
    bookTitle: string,
    amount: number
  ): Promise<string | null> {
    return this.createNotification(
      authorId,
      'purchase',
      'Nouvel achat',
      `${buyerName} a acheté "${bookTitle}" pour ${amount.toFixed(2)}€`,
      {
        relatedBookId: bookId,
        relatedBookTitle: bookTitle,
        actionUrl: `/book/${bookId}`,
      }
    );
  }

  /**
   * Créer une notification système
   */
  async notifySystem(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<string | null> {
    return this.createNotification(userId, 'system', title, message, { actionUrl });
  }
}

export default new NotificationService();
