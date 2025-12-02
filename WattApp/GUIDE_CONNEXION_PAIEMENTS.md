# 💳 Guide de Connexion - Stripe & PayPal

## 📋 Table des matières
1. [Configuration Stripe Connect](#stripe-connect)
2. [Configuration PayPal](#paypal)
3. [Interface utilisateur](#interface-utilisateur)
4. [Flux complet](#flux-complet)
5. [Backend requis](#backend-requis)

---

## 🔵 STRIPE CONNECT

### ✅ Ce qui est déjà fait

Votre app a déjà l'infrastructure de base :

1. **API d'onboarding** : `api/stripe/onboard.ts` ✅
2. **Page Settings** : Bouton "Connecter Stripe" ✅
3. **Firestore** : Stockage de `stripeAccountId` ✅

### 🔧 Comment ça fonctionne

#### 1. L'utilisateur clique "Connecter Stripe"

**Localisation** : `app/settings.tsx` ou `app/write/publish-manga.tsx`

```typescript
const handleStripeConnect = async () => {
  setStripeStatus('loading');
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Non connecté');
    
    // Appel à votre backend
    const res = await fetch('/api/stripe/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        uid: user.uid, 
        email: user.email 
      }),
    });
    
    const data = await res.json();
    
    if (data.url) {
      // Ouvre le formulaire Stripe dans le navigateur
      Linking.openURL(data.url);
    } else {
      Alert.alert('Erreur', 'Impossible de générer le lien Stripe.');
    }
  } catch (e) {
    Alert.alert('Erreur', 'Impossible de se connecter à Stripe.');
  } finally {
    setStripeStatus('not-connected');
  }
};
```

#### 2. Le backend crée un compte Stripe Connect

**Fichier** : `api/stripe/onboard.ts`

```typescript
import Stripe from 'stripe';
import admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2025-10-29.clover' 
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { uid, email } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: 'Missing uid or email' });
  }

  try {
    // Vérifier si l'utilisateur a déjà un compte Stripe
    const userRef = admin.firestore().collection('users').doc(uid);
    const userSnap = await userRef.get();
    let stripeAccountId = userSnap.get('stripeAccountId');

    if (!stripeAccountId) {
      // Créer un nouveau compte Stripe Connect Express
      const account = await stripe.accounts.create({
        type: 'express', // Type recommandé pour les créateurs
        email,
        country: 'FR', // Adapter selon votre pays
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      
      stripeAccountId = account.id;
      
      // Sauvegarder dans Firestore
      await userRef.update({ stripeAccountId });
    }

    // Créer un lien d'onboarding Stripe
    const origin = req.headers.origin || 'https://wattapp.com';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/settings`, // Retour en cas d'erreur
      return_url: `${origin}/settings?stripe=success`, // Retour après succès
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Stripe onboarding error' });
  }
}
```

#### 3. L'utilisateur remplit le formulaire Stripe

Stripe ouvre un formulaire où l'utilisateur doit fournir :
- 📧 Email
- 📱 Numéro de téléphone
- 🏦 Coordonnées bancaires (IBAN)
- 🆔 Informations d'identité (selon le pays)
- 📄 Documents (si nécessaire)

#### 4. Retour sur l'app après validation

Stripe redirige vers : `https://wattapp.com/settings?stripe=success`

**Gérer le retour** dans `app/settings.tsx` :

```typescript
useEffect(() => {
  // Vérifier si l'utilisateur revient de Stripe
  const checkStripeReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('stripe') === 'success') {
      // Recharger le statut Stripe
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().stripeAccountId) {
          setStripeStatus('connected');
          Alert.alert('✅ Succès', 'Votre compte Stripe est maintenant connecté !');
        }
      }
      
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/settings');
    }
  };
  
  checkStripeReturn();
}, []);
```

### 🔑 Variables d'environnement requises

**Fichier** : `.env` (à la racine du projet backend)

```bash
# Clés Stripe (récupérées sur https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_51SNV17GeB5M3eZWm...
STRIPE_PUBLISHABLE_KEY=pk_live_51SNV17GeB5M3eZWm...

# Pour Firebase Functions
firebase functions:config:set stripe.secret_key="sk_live_51SNV17..."
```

### 📊 Structure Firestore

**Collection** : `users/{userId}`

```javascript
{
  // ... autres champs
  stripeAccountId: "acct_1Qxxx...",  // ID du compte Stripe Connect
  stripeOnboardingComplete: true,     // Onboarding terminé
  stripeChargesEnabled: true,         // Peut recevoir des paiements
  stripePayoutsEnabled: true,         // Peut recevoir des virements
  stripeCreatedAt: Timestamp,         // Date de création du compte
}
```

---

## 🔴 PAYPAL

### ✅ Ce qui est déjà fait

PayPal est déjà intégré de manière simple :

1. **Page Settings** : Bouton "Connecter PayPal" ✅
2. **Firestore** : Stockage de `paypalEmail` ✅

### 🔧 Comment ça fonctionne

#### 1. L'utilisateur clique "Connecter PayPal"

**Localisation** : `app/settings.tsx`

```typescript
const handlePaypalConnect = async () => {
  Alert.prompt(
    'Connecter PayPal',
    'Entrez votre adresse email PayPal pour recevoir vos paiements.',
    async (email) => {
      if (!email) return;
      
      setPaypalStatus('loading');
      
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('Non connecté');
        
        // Valider le format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Alert.alert('Erreur', 'Adresse email invalide');
          setPaypalStatus('not-connected');
          return;
        }
        
        // Sauvegarder dans Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          paypalEmail: email,
          paypalConnectedAt: serverTimestamp()
        });
        
        setPaypalStatus('connected');
        setPaypalEmail(email);
        Alert.alert('✅ Succès', 'Votre compte PayPal est connecté.');
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de connecter PayPal.');
        setPaypalStatus('not-connected');
      }
    },
    'plain-text',
    paypalEmail || '' // Valeur par défaut si déjà configuré
  );
};
```

#### 2. Version améliorée avec validation

Pour une meilleure UX, créer un modal personnalisé :

```typescript
import { Modal, TextInput } from 'react-native';

const [paypalModalVisible, setPaypalModalVisible] = useState(false);
const [paypalEmailInput, setPaypalEmailInput] = useState('');

const handlePaypalConnect = () => {
  setPaypalEmailInput(paypalEmail || '');
  setPaypalModalVisible(true);
};

const savePaypalEmail = async () => {
  if (!paypalEmailInput.trim()) {
    Alert.alert('Erreur', 'Veuillez entrer une adresse email');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(paypalEmailInput)) {
    Alert.alert('Erreur', 'Format d\'email invalide');
    return;
  }
  
  setPaypalStatus('loading');
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Non connecté');
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { 
      paypalEmail: paypalEmailInput,
      paypalConnectedAt: serverTimestamp()
    });
    
    setPaypalStatus('connected');
    setPaypalEmail(paypalEmailInput);
    setPaypalModalVisible(false);
    Alert.alert('✅ Succès', 'Votre compte PayPal est connecté.');
  } catch (e) {
    Alert.alert('Erreur', 'Impossible de connecter PayPal.');
    setPaypalStatus('not-connected');
  }
};
```

### 📊 Structure Firestore

**Collection** : `users/{userId}`

```javascript
{
  // ... autres champs
  paypalEmail: "auteur@email.com",   // Email PayPal
  paypalConnectedAt: Timestamp,       // Date de connexion
  paypalVerified: false,              // Vérifié manuellement (optionnel)
}
```

### 💡 Option avancée : PayPal Connect API

Pour une intégration plus sécurisée (similaire à Stripe Connect) :

```typescript
// Backend : Créer une session PayPal Connect
const createPayPalConnectSession = async (userId: string, email: string) => {
  const response = await fetch('https://api.paypal.com/v1/customer/partner-referrals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAYPAL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      email: email,
      preferred_language_code: 'fr_FR',
      tracking_id: userId,
      partner_config_override: {
        return_url: 'https://wattapp.com/settings?paypal=success',
        return_url_description: 'Retour vers WattApp',
      },
      operations: [
        {
          operation: 'API_INTEGRATION',
          api_integration_preference: {
            rest_api_integration: {
              integration_method: 'PAYPAL',
              integration_type: 'THIRD_PARTY',
            },
          },
        },
      ],
      products: ['EXPRESS_CHECKOUT'],
      legal_consents: [
        {
          type: 'SHARE_DATA_CONSENT',
          granted: true,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.links.find((link: any) => link.rel === 'action_url')?.href;
};
```

---

## 🎨 INTERFACE UTILISATEUR

### Page Settings

**Fichier** : `app/settings.tsx`

```tsx
// Section Paiements
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
    💰 Comptes de paiement
  </Text>
  
  {/* Stripe */}
  <TouchableOpacity 
    style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
    onPress={handleStripeConnect}
    disabled={stripeStatus === 'connected'}
  >
    <View style={styles.settingContent}>
      <View style={[styles.iconContainer, { backgroundColor: '#635BFF' + '20' }]}>
        <Ionicons name="card" size={20} color="#635BFF" />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingLabel}>Stripe</Text>
        <Text style={styles.settingDescription}>
          {stripeStatus === 'connected' 
            ? 'Compte connecté ✓' 
            : 'Recevoir vos paiements'}
        </Text>
      </View>
    </View>
    {stripeStatus === 'connected' ? (
      <View style={styles.statusBadge}>
        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
        <Text style={{ color: '#4CAF50' }}>Connecté</Text>
      </View>
    ) : stripeStatus === 'loading' ? (
      <ActivityIndicator color={theme.colors.primary} />
    ) : (
      <TouchableOpacity style={styles.connectButton}>
        <Text style={styles.connectButtonText}>Connecter</Text>
      </TouchableOpacity>
    )}
  </TouchableOpacity>

  {/* PayPal */}
  <TouchableOpacity 
    style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
    onPress={handlePaypalConnect}
  >
    <View style={styles.settingContent}>
      <View style={[styles.iconContainer, { backgroundColor: '#0070BA' + '20' }]}>
        <Ionicons name="logo-paypal" size={20} color="#0070BA" />
      </View>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingLabel}>PayPal</Text>
        <Text style={styles.settingDescription}>
          {paypalStatus === 'connected' 
            ? `Connecté: ${paypalEmail}` 
            : 'Alternative pour vos paiements'}
        </Text>
      </View>
    </View>
    {paypalStatus === 'connected' ? (
      <View style={styles.statusBadge}>
        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
        <Text style={{ color: '#4CAF50' }}>Connecté</Text>
      </View>
    ) : paypalStatus === 'loading' ? (
      <ActivityIndicator color={theme.colors.primary} />
    ) : (
      <TouchableOpacity style={styles.connectButton}>
        <Text style={styles.connectButtonText}>Connecter</Text>
      </TouchableOpacity>
    )}
  </TouchableOpacity>
</View>
```

---

## 🔄 FLUX COMPLET

### Scénario 1 : Connexion Stripe

```
1. Utilisateur → Clique "Connecter Stripe" dans Settings
   ↓
2. App → Appel POST /api/stripe/onboard
   ↓
3. Backend → Crée compte Stripe Connect (ou récupère l'existant)
   ↓
4. Backend → Génère lien d'onboarding Stripe
   ↓
5. App → Ouvre le lien dans le navigateur (Linking.openURL)
   ↓
6. Stripe → Formulaire d'inscription (identité, banque, etc.)
   ↓
7. Utilisateur → Remplit et soumet le formulaire
   ↓
8. Stripe → Valide les informations
   ↓
9. Stripe → Redirige vers return_url (wattapp.com/settings?stripe=success)
   ↓
10. App → Détecte le retour, recharge le statut
   ↓
11. Firestore → stripeAccountId sauvegardé
   ↓
12. UI → Badge "Connecté ✓" affiché
```

### Scénario 2 : Connexion PayPal

```
1. Utilisateur → Clique "Connecter PayPal" dans Settings
   ↓
2. App → Affiche modal/prompt pour saisir l'email
   ↓
3. Utilisateur → Entre son email PayPal
   ↓
4. App → Valide le format email
   ↓
5. App → Sauvegarde dans Firestore (users/{uid}.paypalEmail)
   ↓
6. UI → Badge "Connecté ✓" affiché avec l'email
```

---

## 🖥️ BACKEND REQUIS

### Option 1 : Firebase Functions (Recommandé)

**Installation** :

```bash
cd functions
npm install stripe firebase-admin
```

**Fichier** : `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

admin.initializeApp();

const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2025-10-29.clover',
});

// Endpoint pour créer un compte Stripe Connect
export const createStripeAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Non authentifié');
  }

  const { email } = data;
  const userId = context.auth.uid;

  try {
    // Vérifier si l'utilisateur a déjà un compte
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    let stripeAccountId = userDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      // Créer un compte Stripe Connect
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        country: 'FR',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      // Sauvegarder dans Firestore
      await admin.firestore().collection('users').doc(userId).update({
        stripeAccountId,
        stripeCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Créer un lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: 'https://wattapp.com/settings',
      return_url: 'https://wattapp.com/settings?stripe=success',
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Webhook pour les événements Stripe
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      functions.config().stripe.webhook_secret
    );

    // Gérer les événements
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        
        // Mettre à jour le statut dans Firestore
        const usersSnapshot = await admin.firestore()
          .collection('users')
          .where('stripeAccountId', '==', account.id)
          .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            stripeChargesEnabled: account.charges_enabled,
            stripePayoutsEnabled: account.payouts_enabled,
            stripeOnboardingComplete: account.details_submitted,
          });
        }
        break;
      
      // Autres événements...
    }

    res.json({ received: true });
  } catch (error: any) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

**Déploiement** :

```bash
# Configurer les secrets
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# Déployer
firebase deploy --only functions
```

### Option 2 : Backend Node.js/Express

**Fichier** : `server.js`

```javascript
const express = require('express');
const Stripe = require('stripe');
const admin = require('firebase-admin');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

app.use(express.json());

// Endpoint d'onboarding
app.post('/api/stripe/onboard', async (req, res) => {
  const { uid, email } = req.body;

  try {
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();
    let stripeAccountId = userDoc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
      });
      
      stripeAccountId = account.id;
      await userRef.update({ stripeAccountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: 'https://wattapp.com/settings',
      return_url: 'https://wattapp.com/settings?stripe=success',
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## ✅ CHECKLIST DE MISE EN PLACE

### Stripe

- [ ] Créer un compte Stripe sur [stripe.com](https://stripe.com)
- [ ] Récupérer les clés API (Dashboard → Developers → API keys)
- [ ] Activer Stripe Connect (Dashboard → Connect → Settings)
- [ ] Configurer les webhooks (Dashboard → Developers → Webhooks)
- [ ] Déployer le backend (Firebase Functions ou serveur Node.js)
- [ ] Configurer les variables d'environnement
- [ ] Tester avec les clés de test (`pk_test_` et `sk_test_`)
- [ ] Passer en production avec les clés live (`pk_live_` et `sk_live_`)

### PayPal

- [ ] Version simple : Juste demander l'email PayPal ✅ (déjà fait)
- [ ] Version avancée : Intégrer PayPal Connect API
- [ ] Configurer les variables d'environnement PayPal
- [ ] Tester les paiements PayPal

### App

- [ ] Vérifier que `app/settings.tsx` a les boutons de connexion
- [ ] Vérifier que `Linking.openURL()` fonctionne
- [ ] Gérer le retour après onboarding Stripe (`?stripe=success`)
- [ ] Afficher les badges de statut (Connecté/Non connecté)
- [ ] Tester le flux complet de A à Z

---

## 🚀 MISE EN PRODUCTION

### 1. Environnements

**Développement** :
```bash
STRIPE_SECRET_KEY=sk_test_51xxx...
STRIPE_PUBLISHABLE_KEY=pk_test_51xxx...
```

**Production** :
```bash
STRIPE_SECRET_KEY=sk_live_51xxx...
STRIPE_PUBLISHABLE_KEY=pk_live_51xxx...
```

### 2. Webhooks Stripe

Configurer les endpoints :
- **Dev** : `https://yourapp-dev.com/api/stripe/webhook`
- **Prod** : `https://yourapp.com/api/stripe/webhook`

Événements à écouter :
- `account.updated` - Mise à jour du statut du compte
- `payment_intent.succeeded` - Paiement réussi
- `transfer.created` - Virement vers l'auteur
- `payout.paid` - Virement bancaire effectué

### 3. Tests

```bash
# Tester l'onboarding Stripe
curl -X POST https://yourapp.com/api/stripe/onboard \
  -H "Content-Type: application/json" \
  -d '{"uid": "test123", "email": "test@example.com"}'

# Tester avec Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger account.updated
```

---

## 📚 RESSOURCES

### Documentation Stripe
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Account Onboarding](https://stripe.com/docs/connect/onboarding)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

### Documentation PayPal
- [PayPal Developer](https://developer.paypal.com/)
- [PayPal Connect](https://developer.paypal.com/docs/marketplaces/)

### Votre code actuel
- ✅ `api/stripe/onboard.ts` - Endpoint d'onboarding
- ✅ `app/settings.tsx` - Page de configuration
- ✅ `constants/stripeConfig.ts` - Configuration Stripe
- ✅ `STRIPE_SETUP.md` - Documentation Stripe complète

---

**Dernière mise à jour** : 2 décembre 2025
