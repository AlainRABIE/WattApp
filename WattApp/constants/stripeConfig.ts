// Configuration Stripe
export const STRIPE_CONFIG = {
  // Clés publiques (safe pour le client)
  PUBLISHABLE_KEY: 'pk_test_51QIoJWKrEF9JtU2uMFbZSrZrjH5SQ5Z3R7VZhJNjvDmD0zPj9qQoNKpGdjBNy8OFCLi8PeK1aaIeCj8v18wqLhrf00LpXGP0D0',
  
  // Configuration de l'app
  MERCHANT_IDENTIFIER: 'merchant.com.wattapp',
  COUNTRY_CODE: 'FR',
  CURRENCY: 'eur',
  MERCHANT_DISPLAY_NAME: 'WattApp',
  
  // Configuration pour l'apparence du Payment Sheet
  APPEARANCE: {
    colors: {
      primary: '#FFA94D',
      background: '#181818',
      componentBackground: '#23232a',
      componentBorder: '#333',
      componentDivider: '#333',
      primaryText: '#ffffff',
      secondaryText: '#aaaaaa',
      componentText: '#ffffff',
      placeholderText: '#888888',
    },
    shapes: {
      borderRadius: 12,
      borderWidth: 1,
    },
  },
};

// ⚠️ SÉCURITÉ CRITIQUE ⚠️
// La clé secrète Stripe doit être stockée dans:
// 1. Variables d'environnement serveur
// 2. Firebase Functions (côté serveur)
// 3. Votre backend sécurisé
// 
// JAMAIS dans le code client React Native !

// ⚠️ À FAIRE AVANT LA PRODUCTION :
/*
1. Remplacer pk_test_ par pk_live_ (clé de production)
2. Configurer les webhooks sur stripe.com
3. Implémenter les Firebase Functions pour :
   - createPaymentIntent
   - handleStripeWebhooks
   - validatePurchases
4. Configurer Stripe Connect pour les auteurs
5. Mettre en place la gestion des taxes (si applicable)
6. Configurer les remboursements automatiques
7. Ajouter la conformité SCA (Strong Customer Authentication)
*/