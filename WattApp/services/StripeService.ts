// Service pour intégrer avec Stripe via Firebase Functions
// À utiliser dans votre app React Native

import { getAuth } from 'firebase/auth';
import app from '../constants/firebaseConfig';

const FUNCTIONS_BASE_URL = 'https://YOUR_PROJECT.cloudfunctions.net'; // À remplacer

export class StripeService {
  
  /**
   * Créer un Payment Intent pour un livre
   */
  static async createPaymentIntent(bookId: string, amount: number): Promise<{clientSecret: string, paymentIntentId: string}> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Obtenir le token d'authentification
      const idToken = await user.getIdToken();

      const response = await fetch(`${FUNCTIONS_BASE_URL}/createPaymentIntent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookId,
          amount,
          currency: 'eur',
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création du paiement');
      }

      return await response.json();

    } catch (error: any) {
      console.error('Erreur createPaymentIntent:', error);
      throw new Error(error.message || 'Impossible de créer le paiement');
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

      const idToken = await user.getIdToken();

      const response = await fetch(`${FUNCTIONS_BASE_URL}/checkPurchase?userId=${user.uid}&bookId=${bookId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        console.warn('Erreur lors de la vérification d\'achat');
        return false;
      }

      const result = await response.json();
      return result.hasPurchased || false;

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

      const idToken = await user.getIdToken();

      const response = await fetch(`${FUNCTIONS_BASE_URL}/getPurchaseHistory?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        console.warn('Erreur lors de la récupération de l\'historique');
        return [];
      }

      const result = await response.json();
      return result.purchases || [];

    } catch (error) {
      console.error('Erreur getPurchaseHistory:', error);
      return [];
    }
  }
}

export default StripeService;