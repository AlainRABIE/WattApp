# Configuration Stripe & PayPal pour WattApp

Ce guide explique comment configurer correctement Stripe et PayPal pour permettre aux auteurs de recevoir leurs paiements.

## 🎯 Vue d'ensemble

WattApp utilise un système de marketplace où:
- **Utilisateurs** achètent des livres via Stripe
- **Auteurs** reçoivent 90% du prix du livre
- **Plateforme** garde 10% de commission
- **Paiements aux auteurs** via Stripe Connect ou PayPal

---

## 📱 Configuration Stripe Connect

### 1. Créer un compte Stripe

1. Allez sur [https://stripe.com](https://stripe.com)
2. Créez un compte professionnel
3. Activez Stripe Connect dans le Dashboard

### 2. Obtenir les clés API

Dans votre Dashboard Stripe:

```
Developers → API Keys
```

**Clés de test (développement):**
- `pk_test_...` → Clé publique (client-side)
- `sk_test_...` → Clé secrète (serveur uniquement)

**Clés de production:**
- `pk_live_...` → Clé publique
- `sk_live_...` → Clé secrète

### 3. Mettre à jour la configuration

Éditez `constants/stripeConfig.ts`:

```typescript
export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: 'pk_live_VOTRE_CLE_ICI', // Remplacer par votre clé live
  // ...
};
```

### 4. Configurer Stripe Connect

1. **Activer Connect** dans Dashboard → Settings → Connect
2. **Type de plateforme**: Standard Connect
3. **Branding**: Ajoutez votre logo et couleurs
4. **OAuth Settings**:
   - Redirect URI: `https://votre-app.com/stripe/callback`

### 5. Firebase Functions pour Stripe

Créez ces Cloud Functions dans `functions/src/stripe.ts`:

```typescript
import * as functions from 'firebase-functions';
import Stripe from 'stripe';

const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: '2023-10-16',
});

// Créer un Payment Intent
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { bookId, amount } = data;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: 'eur',
      metadata: {
        bookId,
        userId: context.auth.uid,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Erreur création Payment Intent');
  }
});

// Créer un Stripe Connect Account
export const createConnectAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: context.auth.token.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Créer un lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://votre-app.com/earnings',
      return_url: 'https://votre-app.com/earnings',
      type: 'account_onboarding',
    });

    return {
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Erreur création compte');
  }
});

// Créer un Transfer vers un auteur
export const createAuthorPayout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { amount, stripeAccountId } = data;

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      destination: stripeAccountId,
      description: 'Paiement revenus livres',
    });

    return {
      success: true,
      transferId: transfer.id,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Erreur création transfer');
  }
});

// Webhook pour gérer les événements Stripe
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = functions.config().stripe.webhook_secret;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return res.status(400).send('Webhook Error');
  }

  // Gérer les différents types d'événements
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Marquer le livre comme acheté
      await handlePaymentSuccess(paymentIntent);
      break;
    
    case 'account.updated':
      // Mettre à jour le statut du compte Connect
      break;
    
    case 'transfer.created':
      // Confirmer le transfer vers l'auteur
      break;
  }

  res.json({ received: true });
});
```

### 6. Déployer les Functions

```bash
cd functions
npm install stripe
firebase deploy --only functions
```

### 7. Configurer les Webhooks

Dans Stripe Dashboard → Developers → Webhooks:

1. Ajouter un endpoint: `https://votre-fonction.cloudfunctions.net/stripeWebhook`
2. Sélectionner les événements:
   - `payment_intent.succeeded`
   - `account.updated`
   - `transfer.created`
3. Copier le **Signing Secret**

Ajouter le secret dans Firebase:
```bash
firebase functions:config:set stripe.secret="sk_live_..." stripe.webhook_secret="whsec_..."
```

---

## 💰 Configuration PayPal

### 1. Créer une App PayPal

1. Allez sur [https://developer.paypal.com](https://developer.paypal.com)
2. Créez une application
3. Activez les Payouts API

### 2. Obtenir les credentials

```
Dashboard → My Apps & Credentials
```

- **Client ID**
- **Secret**

### 3. Firebase Function pour PayPal Payouts

Dans `functions/src/paypal.ts`:

```typescript
import * as functions from 'firebase-functions';
import axios from 'axios';

const PAYPAL_API = 'https://api-m.paypal.com'; // Production
// const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Test

async function getPayPalAccessToken() {
  const clientId = functions.config().paypal.client_id;
  const secret = functions.config().paypal.secret;

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

export const createPayPalPayout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
  }

  const { amount, email } = data;

  try {
    const accessToken = await getPayPalAccessToken();

    const payout = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: 'Vous avez reçu un paiement de WattApp',
        email_message: 'Merci d\'utiliser WattApp!',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'EUR',
          },
          receiver: email,
          note: 'Paiement revenus livres WattApp',
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

    return {
      success: true,
      batchId: response.data.batch_header.payout_batch_id,
    };
  } catch (error) {
    console.error('Erreur PayPal payout:', error);
    throw new functions.https.HttpsError('internal', 'Erreur payout PayPal');
  }
});
```

### 4. Configurer les credentials PayPal

```bash
firebase functions:config:set paypal.client_id="YOUR_CLIENT_ID" paypal.secret="YOUR_SECRET"
```

---

## 🔒 Sécurité

### Variables d'environnement

**Ne JAMAIS mettre les clés secrètes dans le code client!**

Les clés secrètes doivent être uniquement:
- Dans Firebase Functions
- Dans les variables d'environnement serveur
- Dans Firebase Config

### Validation côté serveur

Tous les paiements doivent être validés côté serveur:

1. ✅ Vérifier le montant
2. ✅ Vérifier l'identité de l'acheteur
3. ✅ Vérifier que le livre existe
4. ✅ Éviter les doubles achats

---

## 📊 Flux de Paiement

### Achat d'un livre

```
1. Utilisateur clique "Acheter"
2. App appelle createPaymentIntent (Firebase Function)
3. Stripe Payment Sheet s'ouvre
4. Utilisateur entre ses infos bancaires
5. Stripe confirme le paiement
6. Webhook notifie votre serveur
7. handlePaymentSuccess marque le livre comme acheté
8. 90% du montant est alloué à l'auteur
```

### Paiement à un auteur

```
1. Auteur demande un retrait
2. Vérification du solde disponible (min 10€)
3. Période de sécurité de 15 jours respectée
4. Paiement via Stripe Connect ou PayPal
5. Marquer les transactions comme "withdrawn"
6. Email de confirmation envoyé
```

---

## 🧪 Tests

### Mode Test Stripe

Utilisez ces cartes de test:
- **Succès**: `4242 4242 4242 4242`
- **Échec**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

Date: N'importe quelle date future
CVC: N'importe quel 3 chiffres

### Mode Sandbox PayPal

Créez des comptes de test sur PayPal Developer:
- 1 compte Business (pour vous)
- Plusieurs comptes Personal (pour tester les auteurs)

---

## 📝 Checklist avant Production

- [ ] Remplacer toutes les clés test par les clés live
- [ ] Configurer les webhooks Stripe en production
- [ ] Tester les paiements avec de vraies cartes (petits montants)
- [ ] Vérifier les payouts Stripe Connect
- [ ] Tester les payouts PayPal
- [ ] Configurer les emails de notification
- [ ] Mettre en place le support client
- [ ] Vérifier la conformité PCI DSS
- [ ] Implémenter la gestion des remboursements
- [ ] Configurer les taxes si applicable (TVA)

---

## 🆘 Support

- **Stripe**: https://support.stripe.com
- **PayPal**: https://developer.paypal.com/support
- **Firebase**: https://firebase.google.com/support

---

## 💡 Conseils

1. **Toujours tester en mode test/sandbox** avant de passer en production
2. **Surveillez vos webhooks** - 95%+ doivent être livrés avec succès
3. **Gérez les erreurs gracieusement** - les paiements peuvent échouer
4. **Période de sécurité** - 15 jours avant que les auteurs puissent retirer
5. **Support client** - Préparez des réponses pour les questions fréquentes
6. **Monitoring** - Utilisez Stripe Dashboard et Firebase Analytics

Bonne chance! 🚀
