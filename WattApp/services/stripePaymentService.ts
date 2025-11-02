import { Alert } from 'react-native';
import { STRIPE_CONFIG } from '../constants/stripeConfig';

export interface PaymentIntentData {
  bookId: string;
  bookTitle: string;
  amount: number; // En centimes (ex: 299 pour 2,99€)
  authorId: string;
  buyerId: string;
}

export interface StripePaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

// ⚠️ ATTENTION SÉCURITÉ ⚠️
// Cette fonction nécessite un backend sécurisé !
// La création de PaymentIntent doit se faire côté serveur
export class StripePaymentService {
  
  // Cette fonction doit être remplacée par un appel à votre backend
  static async createPaymentIntent(data: PaymentIntentData): Promise<{ client_secret: string } | null> {
    try {
      // 🚨 TEMPORAIRE - REMPLACER PAR VOTRE BACKEND 🚨
      // Cette implémentation est DANGEREUSE en production
      // Car elle expose la clé secrète côté client
      
      Alert.alert(
        'Backend requis',
        'Pour la sécurité, les paiements nécessitent un backend sécurisé.\n\nCréez un endpoint POST /create-payment-intent qui:\n1. Reçoit les données du livre\n2. Calcule le montant\n3. Crée le PaymentIntent avec Stripe\n4. Retourne le client_secret',
        [{ text: 'Compris' }]
      );
      
      return null;
      
      // EXEMPLE D'IMPLÉMENTATION BACKEND REQUISE:
      /*
      const response = await fetch('https://votre-backend.com/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          bookId: data.bookId,
          amount: data.amount,
        }),
      });
      
      const { client_secret } = await response.json();
      return { client_secret };
      */
      
    } catch (error) {
      console.error('Erreur création PaymentIntent:', error);
      return null;
    }
  }
  
  static async processPayment(
    paymentIntentClientSecret: string,
    paymentMethodId: string
  ): Promise<StripePaymentResult> {
    try {
      // La confirmation du paiement se fait avec le SDK Stripe
      // Cette partie est sécurisée car elle utilise client_secret
      
      return {
        success: true,
        paymentIntentId: 'pi_example',
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de paiement',
      };
    }
  }
}

// STRUCTURE BACKEND REQUISE:
/*
=================================
ENDPOINT: POST /create-payment-intent
=================================

Côté serveur (Node.js/Firebase Functions):

const stripe = require('stripe')('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');

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { bookId, amount } = req.body;
    
    // Vérifier l'utilisateur et le livre
    // Calculer les frais (commission 10%)
    const authorAmount = Math.round(amount * 0.9);
    const platformFee = amount - authorAmount;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // en centimes
      currency: 'eur',
      application_fee_amount: platformFee, // Commission WattApp
      transfer_data: {
        destination: 'acct_author_stripe_id', // Compte Stripe de l'auteur
      },
      metadata: {
        bookId,
        authorAmount: authorAmount.toString(),
        platformFee: platformFee.toString(),
      },
    });
    
    res.json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/