# 💳 Configuration Stripe pour WattApp

## ✅ Étapes déjà réalisées

### 1. 📦 Installation des packages
```bash
npm install @stripe/stripe-react-native stripe
```

### 2. 🔧 Configuration initiale
- ✅ `constants/stripeConfig.ts` - Configuration Stripe
- ✅ `app/_layout.tsx` - Provider Stripe ajouté
- ✅ `services/stripePaymentService.ts` - Service de paiement
- ✅ `app/components/StripePaymentComponent.tsx` - Composant de paiement
- ✅ `examples/BookPurchaseExample.tsx` - Exemple d'intégration

### 3. 🔐 Sécurité mise en place
- ✅ Clé publique configurée côté client
- ✅ Avertissements de sécurité pour la clé secrète
- ✅ Structure backend recommandée

---

## 🚨 ÉTAPES CRITIQUES POUR LA PRODUCTION

### 1. 🏗️ BACKEND SÉCURISÉ (OBLIGATOIRE)

#### Firebase Functions (Recommandé)
```javascript
// functions/src/stripe.js
const functions = require('firebase-functions');
const stripe = require('stripe')('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');

exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non connecté');
  }

  const { bookId, amount } = data;
  
  // Calculer la commission (10% pour WattApp)
  const platformFee = Math.round(amount * 0.1);
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // en centimes
      currency: 'eur',
      application_fee_amount: platformFee,
      metadata: {
        bookId,
        buyerId: context.auth.uid,
        platformFee: platformFee.toString(),
      },
    });

    return { client_secret: paymentIntent.client_secret };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### Déploiement Firebase Functions
```bash
cd functions
npm install stripe firebase-functions
firebase deploy --only functions
```

### 2. 🏦 STRIPE CONNECT (pour les auteurs)

#### Configuration des comptes auteurs
```javascript
// Créer un compte Stripe Connect pour chaque auteur
exports.createAuthorStripeAccount = functions.https.onCall(async (data, context) => {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email: data.authorEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // Sauvegarder l'ID du compte Stripe dans Firestore
  await admin.firestore().collection('users').doc(context.auth.uid).update({
    stripeAccountId: account.id,
  });

  return { accountId: account.id };
});
```

### 3. 🔄 WEBHOOKS Stripe

#### Configuration des webhooks
```javascript
// functions/src/webhooks.js
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Confirmer l'achat en base de données
    await admin.firestore().collection('purchases').add({
      paymentIntentId: paymentIntent.id,
      bookId: paymentIntent.metadata.bookId,
      buyerId: paymentIntent.metadata.buyerId,
      amount: paymentIntent.amount,
      status: 'completed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  res.json({ received: true });
});
```

---

## 📱 INTÉGRATION DANS L'APP

### 1. Modifier le service de paiement
Remplacer dans `services/stripePaymentService.ts` :
```typescript
// Remplacer la fonction createPaymentIntent par:
static async createPaymentIntent(data: PaymentIntentData): Promise<{ client_secret: string } | null> {
  try {
    const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
    const result = await createPaymentIntent({
      bookId: data.bookId,
      amount: data.amount,
    });
    
    return result.data as { client_secret: string };
  } catch (error) {
    console.error('Erreur PaymentIntent:', error);
    return null;
  }
}
```

### 2. Ajouter dans une page de livre existante
```typescript
import StripePaymentComponent from '../components/StripePaymentComponent';

// Dans votre composant de page de livre:
<StripePaymentComponent
  bookData={{
    id: book.id,
    title: book.title,
    price: book.price,
    authorId: book.authorId,
  }}
  buyerId={user.uid}
  onPaymentSuccess={handlePurchaseSuccess}
  onPaymentError={handlePurchaseError}
/>
```

---

## 🔐 VARIABLES D'ENVIRONNEMENT

### Firebase Functions (.env)
```
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Configuration Firebase Functions
```bash
firebase functions:config:set stripe.secret_key="sk_live_51SNV17..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
```

---

## 📊 STRUCTURE DE DONNÉES

### Collection `purchases`
```javascript
{
  bookId: string,
  buyerId: string,
  authorId: string,
  amount: number, // Prix total
  platformCommission: number, // 10%
  authorEarnings: number, // 90%
  paymentIntentId: string,
  stripeTransferId?: string, // Pour Stripe Connect
  status: 'pending' | 'completed' | 'failed',
  purchasedAt: timestamp,
  confirmedAt?: timestamp,
}
```

### Collection `users` (ajouts)
```javascript
{
  // ... champs existants
  stripeAccountId?: string, // Pour les auteurs
  purchasedBooks: string[], // IDs des livres achetés
  totalEarnings: number, // Pour les auteurs
  totalSpent: number, // Pour les acheteurs
}
```

---

## ⚖️ CONFORMITÉ LÉGALE

### 1. 🧾 Facturation
- Génération automatique de factures
- Numérotation séquentielle
- Données légales obligatoires

### 2. 📋 TVA
- Calcul automatique selon le pays
- Déclarations périodiques
- Reverse charge si applicable

### 3. 🔍 Audit
- Logs de toutes les transactions
- Rapports financiers
- Traçabilité complète

---

## 🚀 DÉPLOIEMENT

### 1. Tests
```bash
# Tester avec les clés de test Stripe
# pk_test_... et sk_test_...
```

### 2. Production
```bash
# Basculer vers les clés live
# Configurer les webhooks production
# Tester les transferts Stripe Connect
```

### 3. Surveillance
- Monitoring des paiements
- Alertes sur les échecs
- Rapports de performance

---

## 📞 SUPPORT

En cas de problème:
1. Vérifier les logs Firebase Functions
2. Consulter le dashboard Stripe
3. Tester les webhooks
4. Contacter le support Stripe si nécessaire

---

**⚠️ RAPPEL DE SÉCURITÉ ⚠️**
- JAMAIS de clé secrète côté client
- Toujours valider côté serveur
- Utiliser HTTPS en production
- Surveiller les transactions suspectes