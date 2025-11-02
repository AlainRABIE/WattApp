// Service de paiement pour WattApp
// Gère les transactions et achats de livres

import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { doc, updateDoc, arrayUnion, serverTimestamp, addDoc, collection, increment, getDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

export class PaymentService {
  
  /**
   * Créer un Payment Intent pour un livre
   * En production, ceci serait fait côté serveur sécurisé
   */
  static async createPaymentIntent(bookId: string, amount: number): Promise<{clientSecret: string, paymentIntentId: string}> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Validation basique
      if (!bookId || !amount || amount < 0.5) {
        throw new Error('Paramètres invalides');
      }

      // Générer un Payment Intent simulé
      const paymentIntentId = `pi_${bookId}_${Date.now()}`;
      const clientSecret = `${paymentIntentId}_secret`;

      console.log('Payment Intent créé:', {
        paymentIntentId,
        bookId,
        amount,
        userId: user.uid,
      });

      return {
        clientSecret,
        paymentIntentId,
      };

    } catch (error: any) {
      console.error('Erreur createPaymentIntent:', error);
      throw new Error(error.message || 'Impossible de créer le paiement');
    }
  }

  /**
   * Traiter un paiement réussi
   * Met à jour la base de données après confirmation du paiement
   */
  static async handlePaymentSuccess(bookId: string, paymentIntentId: string, amount: number): Promise<void> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Marquer le livre comme acheté
      const bookRef = doc(db, 'books', bookId);
      await updateDoc(bookRef, {
        purchasedBy: arrayUnion(user.uid),
        sales: increment(1),
        revenue: increment(amount),
        updatedAt: serverTimestamp(),
      });

      // Créer un document utilisateur s'il n'existe pas
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Créer le document utilisateur
        await updateDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Enregistrer la transaction séparément
      await addDoc(collection(db, 'transactions'), {
        paymentIntentId,
        bookId,
        userId: user.uid,
        amount,
        currency: 'eur',
        status: 'completed',
        platformCommission: amount * 0.1,
        authorRevenue: amount * 0.9,
        purchaseDate: Date.now(),
        createdAt: serverTimestamp(),
      });

      // Ajouter l'achat à l'historique utilisateur (document séparé)
      await addDoc(collection(db, 'user_purchases'), {
        userId: user.uid,
        bookId,
        paymentIntentId,
        amount,
        purchaseDate: Date.now(),
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      console.log('Paiement traité avec succès:', {
        bookId,
        paymentIntentId,
        amount,
        userId: user.uid,
      });

    } catch (error: any) {
      console.error('Erreur handlePaymentSuccess:', error);
      throw new Error(error.message || 'Erreur lors du traitement du paiement');
    }
  }

  /**
   * Vérifier si un utilisateur a acheté un livre
   */
  static async checkPurchase(bookId: string): Promise<boolean> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        return false;
      }

      // Vérifier dans les transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('bookId', '==', bookId),
        where('status', '==', 'completed')
      );

      const snapshot = await getDocs(transactionsQuery);
      return !snapshot.empty;

    } catch (error) {
      console.error('Erreur checkPurchase:', error);
      return false;
    }
  }

  /**
   * Obtenir l'historique des achats d'un utilisateur
   */
  static async getPurchaseHistory(): Promise<any[]> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        return [];
      }

      // Récupérer les transactions de l'utilisateur
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('status', '==', 'completed'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(transactionsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    } catch (error) {
      console.error('Erreur getPurchaseHistory:', error);
      return [];
    }
  }

  /**
   * Simuler le processus complet de paiement
   * Version de démonstration qui simule un paiement réel
   */
  static async processPayment(bookId: string, amount: number): Promise<{success: boolean, message: string}> {
    try {
      // Étape 1: Créer le Payment Intent
      const { paymentIntentId } = await this.createPaymentIntent(bookId, amount);
      
      // Étape 2: Simuler le délai de traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Étape 3: Traiter le paiement réussi
      await this.handlePaymentSuccess(bookId, paymentIntentId, amount);
      
      return {
        success: true,
        message: 'Paiement traité avec succès !',
      };

    } catch (error: any) {
      console.error('Erreur processPayment:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors du paiement',
      };
    }
  }

  /**
   * Obtenir les livres achetés par l'utilisateur
   */
  static async getUserPurchasedBooks(): Promise<string[]> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        return [];
      }

      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        where('status', '==', 'completed')
      );

      const snapshot = await getDocs(transactionsQuery);
      const bookIds = snapshot.docs.map(doc => doc.data().bookId);
      
      // Retourner uniquement les IDs uniques
      return [...new Set(bookIds)];

    } catch (error) {
      console.error('Erreur getUserPurchasedBooks:', error);
      return [];
    }
  }
}

export default PaymentService;