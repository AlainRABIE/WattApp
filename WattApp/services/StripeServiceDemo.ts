// Service Stripe simplifié pour la démo
// Simule les appels backend sans Firebase Functions

import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { doc, updateDoc, arrayUnion, serverTimestamp, addDoc, collection } from 'firebase/firestore';

export class StripeServiceDemo {
  
  /**
   * Simuler la création d'un Payment Intent
   * En production, ceci serait fait côté serveur
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

      // Simuler la réponse de Stripe
      // En production, ceci viendrait de votre backend sécurisé
      const paymentIntentId = `pi_demo_${bookId}_${Date.now()}`;
      const clientSecret = `${paymentIntentId}_secret_demo`;

      // Log pour le debug
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
   * Simuler le traitement d'un paiement réussi
   * En production, ceci serait déclenché par les webhooks Stripe
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
        sales: (await import('firebase/firestore')).increment(1),
        revenue: (await import('firebase/firestore')).increment(amount),
        updatedAt: serverTimestamp(),
      });

      // Ajouter à l'historique d'achat de l'utilisateur
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        purchasedBooks: arrayUnion({
          bookId,
          paymentIntentId,
          amount,
          purchaseDate: serverTimestamp(),
          status: 'completed',
        }),
        updatedAt: serverTimestamp(),
      });

      // Enregistrer la transaction
      await addDoc(collection(db, 'transactions'), {
        paymentIntentId,
        bookId,
        userId: user.uid,
        amount,
        currency: 'eur',
        status: 'completed',
        platformCommission: amount * 0.1,
        authorRevenue: amount * 0.9,
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

      // Vérifier dans Firestore si l'utilisateur figure dans purchasedBy
      const bookRef = doc(db, 'books', bookId);
      const bookSnap = await (await import('firebase/firestore')).getDoc(bookRef);
      
      if (!bookSnap.exists()) {
        return false;
      }

      const bookData = bookSnap.data();
      const purchasedBy = bookData.purchasedBy || [];
      
      return purchasedBy.includes(user.uid);

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
      const transactionsQuery = (await import('firebase/firestore')).query(
        collection(db, 'transactions'),
        (await import('firebase/firestore')).where('userId', '==', user.uid),
        (await import('firebase/firestore')).orderBy('createdAt', 'desc')
      );

      const snapshot = await (await import('firebase/firestore')).getDocs(transactionsQuery);
      
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
   * Combine createPaymentIntent + handlePaymentSuccess
   */
  static async processPayment(bookId: string, amount: number): Promise<{success: boolean, message: string}> {
    try {
      // Étape 1: Créer le Payment Intent
      const { paymentIntentId } = await this.createPaymentIntent(bookId, amount);
      
      // Étape 2: Simuler le délai de traitement Stripe
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
}

export default StripeServiceDemo;