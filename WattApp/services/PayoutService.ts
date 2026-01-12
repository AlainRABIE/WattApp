// Service de gestion des paiements aux auteurs
// Gère les connexions Stripe Connect et PayPal pour les auteurs

import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc 
} from 'firebase/firestore';

export interface AuthorPayoutAccount {
  stripe?: {
    accountId: string;
    connected: boolean;
    connectedAt: Date;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  };
  paypal?: {
    email: string;
    connected: boolean;
    connectedAt: Date;
    verified: boolean;
  };
  bankTransfer?: {
    iban: string;
    bic: string;
    accountHolder: string;
    connected: boolean;
  };
  defaultMethod: 'stripe' | 'paypal' | 'bank';
  earnings: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
  };
  currency: string;
}

export class PayoutService {
  
  /**
   * Obtenir le compte de paiement d'un auteur
   */
  static async getAuthorPayoutAccount(authorUid?: string): Promise<AuthorPayoutAccount | null> {
    try {
      const auth = getAuth(app);
      const userId = authorUid || auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      const accountRef = doc(db, 'authorPayoutAccounts', userId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        return accountSnap.data() as AuthorPayoutAccount;
      }

      // Créer un compte par défaut
      const defaultAccount: AuthorPayoutAccount = {
        defaultMethod: 'stripe',
        earnings: {
          total: 0,
          available: 0,
          pending: 0,
          withdrawn: 0,
        },
        currency: 'eur',
      };

      await setDoc(accountRef, {
        ...defaultAccount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return defaultAccount;

    } catch (error: any) {
      console.error('Erreur getAuthorPayoutAccount:', error);
      return null;
    }
  }

  /**
   * Connecter un compte Stripe Connect
   */
  static async connectStripeAccount(): Promise<{success: boolean, accountLink?: string, error?: string}> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Appeler la Firebase Function pour créer le compte Stripe Connect
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(app);
      const createConnectAccountFn = httpsCallable(functions, 'createStripeConnectAccount');
      
      const result = await createConnectAccountFn({ 
        email: user.email 
      });
      
      const data = result.data as any;
      
      if (data.success && data.onboardingUrl) {
        // Ouvrir le lien d'onboarding Stripe dans le navigateur
        return { 
          success: true,
          accountLink: data.onboardingUrl
        };
      }
      
      return { success: false, error: 'Impossible de créer le compte Stripe' };

    } catch (error: any) {
      console.error('Erreur connectStripeAccount:', error);
      return { 
        success: false, 
        error: error.message || 'Impossible de connecter Stripe' 
      };
    }
  }

  /**
   * Déconnecter le compte Stripe
   */
  static async disconnectStripeAccount(): Promise<boolean> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) return false;

      const accountRef = doc(db, 'authorPayoutAccounts', user.uid);
      await updateDoc(accountRef, {
        stripe: null,
        updatedAt: serverTimestamp(),
      });

      return true;

    } catch (error: any) {
      console.error('Erreur disconnectStripeAccount:', error);
      return false;
    }
  }

  /**
   * Connecter un compte PayPal
   */
  static async connectPayPalAccount(email: string): Promise<{success: boolean, error?: string}> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Validation basique de l'email
      if (!email || !email.includes('@')) {
        return { success: false, error: 'Email PayPal invalide' };
      }

      // En production, vous devriez:
      // 1. Vérifier que l'email PayPal existe
      // 2. Envoyer un micro-paiement de vérification
      // 3. Valider le compte

      const accountRef = doc(db, 'authorPayoutAccounts', user.uid);
      await setDoc(accountRef, {
        paypal: {
          email: email.toLowerCase().trim(),
          connected: true,
          connectedAt: new Date(),
          verified: false, // À mettre true après vérification
        },
        defaultMethod: 'paypal',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return { success: true };

    } catch (error: any) {
      console.error('Erreur connectPayPalAccount:', error);
      return { 
        success: false, 
        error: error.message || 'Impossible de connecter PayPal' 
      };
    }
  }

  /**
   * Déconnecter le compte PayPal
   */
  static async disconnectPayPalAccount(): Promise<boolean> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) return false;

      const accountRef = doc(db, 'authorPayoutAccounts', user.uid);
      await updateDoc(accountRef, {
        paypal: null,
        updatedAt: serverTimestamp(),
      });

      return true;

    } catch (error: any) {
      console.error('Erreur disconnectPayPalAccount:', error);
      return false;
    }
  }

  /**
   * Définir la méthode de paiement par défaut
   */
  static async setDefaultPaymentMethod(method: 'stripe' | 'paypal' | 'bank'): Promise<boolean> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) return false;

      const accountRef = doc(db, 'authorPayoutAccounts', user.uid);
      await updateDoc(accountRef, {
        defaultMethod: method,
        updatedAt: serverTimestamp(),
      });

      return true;

    } catch (error: any) {
      console.error('Erreur setDefaultPaymentMethod:', error);
      return false;
    }
  }

  /**
   * Calculer les revenus d'un auteur
   */
  static async calculateAuthorEarnings(authorUid?: string): Promise<{
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
  }> {
    try {
      const auth = getAuth(app);
      const userId = authorUid || auth.currentUser?.uid;
      
      if (!userId || userId === 'current') {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('Utilisateur non authentifié');
        }
        authorUid = currentUser.uid;
      } else {
        authorUid = userId;
      }

      // Récupérer toutes les transactions de l'auteur
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef, 
        where('authorUid', '==', authorUid),
        where('status', '==', 'completed')
      );
      
      const snapshot = await getDocs(q);
      
      let total = 0;
      let withdrawn = 0;
      
      snapshot.forEach((doc) => {
        const transaction = doc.data();
        total += transaction.authorRevenue || 0;
        if (transaction.withdrawn) {
          withdrawn += transaction.authorRevenue || 0;
        }
      });

      // Les revenus en attente (15 jours de période de sécurité)
      const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
      let pending = 0;
      let available = 0;

      snapshot.forEach((doc) => {
        const transaction = doc.data();
        if (!transaction.withdrawn) {
          if (transaction.purchaseDate > fifteenDaysAgo) {
            pending += transaction.authorRevenue || 0;
          } else {
            available += transaction.authorRevenue || 0;
          }
        }
      });

      return {
        total,
        available,
        pending,
        withdrawn,
      };

    } catch (error: any) {
      console.error('Erreur calculateAuthorEarnings:', error);
      return {
        total: 0,
        available: 0,
        pending: 0,
        withdrawn: 0,
      };
    }
  }

  /**
   * Demander un retrait des revenus
   */
  static async requestPayout(amount: number): Promise<{success: boolean, error?: string}> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        return { success: false, error: 'Utilisateur non authentifié' };
      }

      // Vérifier que l'auteur a un compte de paiement configuré
      const account = await this.getAuthorPayoutAccount();
      if (!account) {
        return { success: false, error: 'Aucun compte de paiement configuré' };
      }

      if (!account.stripe?.connected && !account.paypal?.connected) {
        return { 
          success: false, 
          error: 'Veuillez connecter Stripe ou PayPal pour recevoir les paiements' 
        };
      }

      // Vérifier les revenus disponibles
      const earnings = await this.calculateAuthorEarnings(user.uid);
      if (earnings.available < amount) {
        return { 
          success: false, 
          error: `Solde disponible insuffisant: ${earnings.available.toFixed(2)}€` 
        };
      }

      // Montant minimum de retrait: 10€
      if (amount < 10) {
        return { success: false, error: 'Montant minimum de retrait: 10€' };
      }

      // Appeler la Firebase Function appropriée
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions(app);
      
      if (account.defaultMethod === 'stripe' && account.stripe?.accountId) {
        // Payout via Stripe
        const processPayoutFn = httpsCallable(functions, 'processStripePayout');
        const result = await processPayoutFn({
          amount,
          stripeAccountId: account.stripe.accountId,
        });
        
        const data = result.data as any;
        if (data.success) {
          return { success: true };
        }
      } else if (account.defaultMethod === 'paypal' && account.paypal?.email) {
        // Payout via PayPal
        const processPayoutFn = httpsCallable(functions, 'processPayPalPayout');
        const result = await processPayoutFn({
          amount,
          paypalEmail: account.paypal.email,
        });
        
        const data = result.data as any;
        if (data.success) {
          return { success: true };
        }
      }

      return { success: false, error: 'Méthode de paiement non configurée' };

    } catch (error: any) {
      console.error('Erreur requestPayout:', error);
      return { 
        success: false, 
        error: error.message || 'Impossible de demander le retrait' 
      };
    }
  }

  /**
   * Obtenir l'historique des retraits
   */
  static async getPayoutHistory(): Promise<any[]> {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) return [];

      const payoutsRef = collection(db, 'payoutRequests');
      const q = query(
        payoutsRef,
        where('authorUid', '==', user.uid)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

    } catch (error: any) {
      console.error('Erreur getPayoutHistory:', error);
      return [];
    }
  }
}
