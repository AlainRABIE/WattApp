import { db } from '../constants/firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  writeBatch,
  Timestamp,
  limit
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type NotificationType = 
  | 'new_follower'      // Quelqu'un vous suit
  | 'new_comment'       // Nouveau commentaire sur votre livre
  | 'new_rating'        // Nouvelle note sur votre livre
  | 'new_purchase'      // Quelqu'un a acheté votre livre
  | 'book_published'    // Un auteur que vous suivez a publié un livre
  | 'chapter_added'     // Nouveau chapitre ajouté
  | 'book_of_month'     // Votre livre est devenu livre du mois
  | 'achievement'       // Badge/récompense obtenu
  | 'message'           // Nouveau message privé
  | 'system';           // Notification système

export interface AppNotification {
  id?: string;
  userId: string;           // Destinataire
  type: NotificationType;
  title: string;
  message: string;
  data?: any;              // Données additionnelles
  read: boolean;
  createdAt: Date | Timestamp;
  actionUrl?: string;      // URL de navigation
  imageUrl?: string;       // Image optionnelle
  fromUserId?: string;     // ID de l'utilisateur qui a déclenché la notification
  fromUserName?: string;   // Nom de l'utilisateur
  fromUserAvatar?: string; // Avatar de l'utilisateur
}

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationServiceClass {
  private expoPushToken: string | null = null;

  /**
   * Initialiser les notifications push
   */
  async initialize(userId: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Les notifications push ne fonctionnent que sur un vrai appareil');
      return null;
    }

    try {
      // Demander la permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Permission de notification refusée');
        return null;
      }

      // Obtenir le token Expo Push
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;

      // Sauvegarder le token dans Firestore
      await this.saveExpoPushToken(userId, token);

      // Configuration Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFA94D',
        });
      }

      return token;
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
      return null;
    }
  }

  /**
   * Sauvegarder le token push dans Firestore
   */
  private async saveExpoPushToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        expoPushToken: token,
        pushTokenUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur sauvegarde token:', error);
    }
  }

  /**
   * Créer une notification in-app
   */
  async createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Envoyer aussi une push notification
      await this.sendPushNotification(notification.userId, notification.title, notification.message, notification.data);
    } catch (error) {
      console.error('Erreur création notification:', error);
      throw error;
    }
  }

  /**
   * Envoyer une notification push via Expo
   */
  async sendPushNotification(userId: string, title: string, body: string, data?: any): Promise<void> {
    try {
      // Récupérer le token push de l'utilisateur
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
      
      if (userSnap.empty) return;
      
      const userData = userSnap.docs[0].data();
      const expoPushToken = userData.expoPushToken;
      
      if (!expoPushToken) return;

      // Envoyer via l'API Expo Push
      const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
        badge: await this.getUnreadCount(userId),
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Erreur envoi push notification:', error);
    }
  }

  /**
   * Récupérer les notifications d'un utilisateur
   */
  async getNotifications(userId: string, limitCount: number = 50): Promise<AppNotification[]> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as AppNotification[];
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      return [];
    }
  }

  /**
   * Écouter les notifications en temps réel
   */
  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as AppNotification[];
      
      callback(notifications);
    });
  }

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  }

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  }

  /**
   * Supprimer toutes les notifications d'un utilisateur
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, where('userId', '==', userId));

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Erreur suppression toutes notifications:', error);
    }
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
      return 0;
    }
  }

  /**
   * Helpers pour créer des notifications spécifiques
   */

  async notifyNewFollower(targetUserId: string, followerUserId: string, followerName: string, followerAvatar?: string): Promise<void> {
    await this.createNotification({
      userId: targetUserId,
      type: 'new_follower',
      title: 'Nouveau abonné',
      message: `${followerName} a commencé à vous suivre`,
      fromUserId: followerUserId,
      fromUserName: followerName,
      fromUserAvatar: followerAvatar,
      actionUrl: `/profile?userId=${followerUserId}`,
    });
  }

  async notifyNewComment(authorUserId: string, bookId: string, bookTitle: string, commenterName: string, comment: string): Promise<void> {
    await this.createNotification({
      userId: authorUserId,
      type: 'new_comment',
      title: 'Nouveau commentaire',
      message: `${commenterName} a commenté sur "${bookTitle}": ${comment.substring(0, 50)}...`,
      fromUserName: commenterName,
      actionUrl: `/book/${bookId}`,
      data: { bookId, comment },
    });
  }

  async notifyNewRating(authorUserId: string, bookId: string, bookTitle: string, rating: number, raterName: string): Promise<void> {
    await this.createNotification({
      userId: authorUserId,
      type: 'new_rating',
      title: 'Nouvelle note',
      message: `${raterName} a donné ${rating}⭐ à "${bookTitle}"`,
      fromUserName: raterName,
      actionUrl: `/book/${bookId}`,
      data: { bookId, rating },
    });
  }

  async notifyNewPurchase(authorUserId: string, bookId: string, bookTitle: string, buyerName: string, amount: number): Promise<void> {
    await this.createNotification({
      userId: authorUserId,
      type: 'new_purchase',
      title: '🎉 Nouvelle vente !',
      message: `${buyerName} a acheté "${bookTitle}" pour ${amount.toFixed(2)}€`,
      fromUserName: buyerName,
      actionUrl: `/book/${bookId}`,
      data: { bookId, amount },
    });
  }

  async notifyBookPublished(followerUserId: string, authorId: string, authorName: string, bookId: string, bookTitle: string, coverImage?: string): Promise<void> {
    await this.createNotification({
      userId: followerUserId,
      type: 'book_published',
      title: 'Nouveau livre publié',
      message: `${authorName} a publié un nouveau livre : "${bookTitle}"`,
      fromUserId: authorId,
      fromUserName: authorName,
      actionUrl: `/book/${bookId}`,
      imageUrl: coverImage,
      data: { bookId },
    });
  }

  async notifyChapterAdded(followerUserId: string, bookId: string, bookTitle: string, chapterNumber: number, chapterTitle: string): Promise<void> {
    await this.createNotification({
      userId: followerUserId,
      type: 'chapter_added',
      title: 'Nouveau chapitre disponible',
      message: `Chapitre ${chapterNumber} de "${bookTitle}" : ${chapterTitle}`,
      actionUrl: `/book/${bookId}`,
      data: { bookId, chapterNumber },
    });
  }

  async notifyBookOfTheMonth(authorUserId: string, bookId: string, bookTitle: string): Promise<void> {
    await this.createNotification({
      userId: authorUserId,
      type: 'book_of_month',
      title: '👑 Félicitations !',
      message: `"${bookTitle}" est le livre du mois ! Vous êtes en tête du classement.`,
      actionUrl: `/book/${bookId}`,
      data: { bookId },
    });
  }

  async notifyAchievement(userId: string, achievementTitle: string, achievementDescription: string): Promise<void> {
    await this.createNotification({
      userId: userId,
      type: 'achievement',
      title: `🏆 ${achievementTitle}`,
      message: achievementDescription,
      actionUrl: '/profile',
    });
  }

  async notifyMessage(receiverUserId: string, senderUserId: string, senderName: string, messagePreview: string, chatId: string): Promise<void> {
    await this.createNotification({
      userId: receiverUserId,
      type: 'message',
      title: `Message de ${senderName}`,
      message: messagePreview,
      fromUserId: senderUserId,
      fromUserName: senderName,
      actionUrl: `/chat/${chatId}`,
      data: { chatId },
    });
  }

  async notifySystem(userId: string, title: string, message: string, actionUrl?: string): Promise<void> {
    await this.createNotification({
      userId: userId,
      type: 'system',
      title: title,
      message: message,
      actionUrl: actionUrl,
    });
  }
}

export const NotificationService = new NotificationServiceClass();
