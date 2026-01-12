// @ts-nocheck
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(functions.config().stripe?.secret || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

// PayPal Config
const PAYPAL_API = functions.config().paypal?.mode === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// ========================================
// STRIPE PAYMENT INTENT
// ========================================
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  try {
    // Vérifier l'authentification
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
    }

    const { bookId, amount } = data;

    // Validation
    if (!bookId || !amount || amount < 0.5) {
      throw new functions.https.HttpsError('invalid-argument', 'Paramètres invalides');
    }

    // Récupérer les infos du livre
    const bookDoc = await db.collection('books').doc(bookId).get();
    if (!bookDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Livre introuvable');
    }

    const bookData = bookDoc.data();
    const authorUid = bookData?.authorUid || bookData?.userId;

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: 'eur',
      metadata: {
        bookId,
        userId: context.auth.uid,
        authorUid: authorUid || 'unknown',
        bookTitle: bookData?.title || 'Livre',
      },
      description: `Achat: ${bookData?.title || 'Livre'}`,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error('Erreur createPaymentIntent:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Erreur création paiement');
  }
});

// ========================================
// STRIPE WEBHOOK - Confirmation paiement
// ========================================
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = functions.config().stripe?.webhook_secret;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Gérer les événements
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', failedIntent.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Webhook handler failed');
  }
});

// Traiter un paiement réussi
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { bookId, userId, authorUid } = paymentIntent.metadata;
  const amount = paymentIntent.amount / 100; // Convertir en euros

  const platformCommission = amount * 0.10;
  const authorRevenue = amount * 0.90;

  // Marquer le livre comme acheté
  await db.collection('books').doc(bookId).update({
    purchasedBy: admin.firestore.FieldValue.arrayUnion(userId),
    sales: admin.firestore.FieldValue.increment(1),
    revenue: admin.firestore.FieldValue.increment(amount),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Créer la transaction
  await db.collection('transactions').add({
    paymentIntentId: paymentIntent.id,
    bookId,
    userId,
    authorUid,
    amount,
    currency: 'eur',
    status: 'completed',
    platformCommission,
    authorRevenue,
    purchaseDate: Date.now(),
    withdrawn: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Ajouter à l'historique utilisateur
  await db.collection('user_purchases').add({
    userId,
    bookId,
    paymentIntentId: paymentIntent.id,
    amount,
    purchaseDate: Date.now(),
    status: 'completed',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Payment processed:', paymentIntent.id);
}

// ========================================
// STRIPE CONNECT - Créer un compte auteur
// ========================================
export const createStripeConnectAccount = functions.https.onCall(async (data, context) => {
  try {
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { email } = data;
    const userId = context.auth.uid;

    // Créer le compte Stripe Connect
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: email || (context.auth.token as any).email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    // Créer le lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${functions.config().app?.url || 'http://localhost:8081'}/earnings`,
      return_url: `${functions.config().app?.url || 'http://localhost:8081'}/earnings`,
      type: 'account_onboarding',
    });

    // Sauvegarder dans Firestore
    await db.collection('authorPayoutAccounts').doc(userId).set({
      stripe: {
        accountId: account.id,
        connected: false,
        connectedAt: new Date(),
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      },
      defaultMethod: 'stripe',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error: any) {
    console.error('Error creating Stripe account:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ========================================
// STRIPE CONNECT - Vérifier le statut
// ========================================
export const checkStripeAccountStatus = functions.https.onCall(async (data, context) => {
  try {
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { accountId } = data;

    const account = await stripe.accounts.retrieve(accountId);

    // Mettre à jour Firestore
    await db.collection('authorPayoutAccounts').doc(context.auth.uid).update({
      'stripe.detailsSubmitted': account.details_submitted,
      'stripe.chargesEnabled': account.charges_enabled,
      'stripe.payoutsEnabled': account.payouts_enabled,
      'stripe.connected': account.charges_enabled && account.payouts_enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  } catch (error: any) {
    console.error('Error checking account status:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ========================================
// STRIPE PAYOUT - Transférer vers auteur
// ========================================
export const processStripePayout = functions.https.onCall(async (data, context) => {
  try {
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { amount, stripeAccountId } = data;

    // Vérifier le solde disponible
    const userId = context.auth.uid;
    const accountDoc = await db.collection('authorPayoutAccounts').doc(userId).get();
    
    if (!accountDoc.exists || !accountDoc.data()?.stripe?.connected) {
      throw new functions.https.HttpsError('failed-precondition', 'Compte Stripe non connecté');
    }

    // Créer le transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      destination: stripeAccountId,
      description: 'Paiement revenus livres WattApp',
    });

    // Marquer les transactions comme retirées
    const transactionsQuery = await db.collection('transactions')
      .where('authorUid', '==', userId)
      .where('withdrawn', '==', false)
      .get();

    const batch = db.batch();
    transactionsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { withdrawn: true, withdrawnAt: Date.now() });
    });
    await batch.commit();

    // Enregistrer le retrait
    await db.collection('payoutRequests').add({
      authorUid: userId,
      amount,
      method: 'stripe',
      status: 'completed',
      transferId: transfer.id,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeAccountId,
      currency: 'eur',
    });

    return {
      success: true,
      transferId: transfer.id,
    };
  } catch (error: any) {
    console.error('Error processing payout:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ========================================
// PAYPAL - Obtenir Access Token
// ========================================
async function getPayPalAccessToken() {
  const clientId = functions.config().paypal?.client_id;
  const secret = functions.config().paypal?.secret;

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.access_token;
}

// ========================================
// PAYPAL PAYOUT - Envoyer paiement
// ========================================
export const processPayPalPayout = functions.https.onCall(async (data, context) => {
  try {
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
    }

    const { amount, paypalEmail } = data;
    const userId = context.auth.uid;

    // Vérifier le compte PayPal
    const accountDoc = await db.collection('authorPayoutAccounts').doc(userId).get();
    
    if (!accountDoc.exists || !accountDoc.data()?.paypal?.connected) {
      throw new functions.https.HttpsError('failed-precondition', 'Compte PayPal non connecté');
    }

    // Obtenir le token PayPal
    const accessToken = await getPayPalAccessToken();

    // Créer le payout
    const payout = {
      sender_batch_header: {
        sender_batch_id: `batch_${userId}_${Date.now()}`,
        email_subject: 'Vous avez reçu un paiement de WattApp',
        email_message: 'Vos revenus de livres sont disponibles !',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'EUR',
          },
          receiver: paypalEmail,
          note: 'Paiement revenus livres WattApp',
          sender_item_id: `item_${Date.now()}`,
        },
      ],
    };

    const response = await axios.post(
      `${PAYPAL_API}/v1/payments/payouts`,
      payout,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    // Marquer les transactions comme retirées
    const transactionsQuery = await db.collection('transactions')
      .where('authorUid', '==', userId)
      .where('withdrawn', '==', false)
      .get();

    const batch = db.batch();
    transactionsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { withdrawn: true, withdrawnAt: Date.now() });
    });
    await batch.commit();

    // Enregistrer le retrait
    await db.collection('payoutRequests').add({
      authorUid: userId,
      amount,
      method: 'paypal',
      status: 'completed',
      batchId: response.data.batch_header.payout_batch_id,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      paypalEmail,
      currency: 'eur',
    });

    return {
      success: true,
      batchId: response.data.batch_header.payout_batch_id,
    };
  } catch (error: any) {
    console.error('Error processing PayPal payout:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Erreur payout PayPal');
  }
});