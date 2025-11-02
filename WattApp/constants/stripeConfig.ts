// Configuration Stripe
export const STRIPE_CONFIG = {
  // Clés publiques (safe pour le client)
  PUBLISHABLE_KEY: 'pk_live_51SNV17GeB5M3eZWmWhyj6bp25dcoNOsCSooRN46E6lTsUBB8UVnOaLqVVrMPC74ny6EFtQOG3BiqHchjLKtjXK2X00iHwjUO73',
  
  // ATTENTION: La clé secrète ne doit JAMAIS être exposée côté client
  // Elle doit être utilisée uniquement côté serveur/backend
  // SECRET_KEY: 'sk_live_...' // À SUPPRIMER DE CE FICHIER
  
  // Configuration de l'app
  MERCHANT_IDENTIFIER: 'merchant.com.wattapp',
  COUNTRY_CODE: 'FR',
  CURRENCY: 'eur',
};

// ⚠️ SÉCURITÉ CRITIQUE ⚠️
// La clé secrète Stripe doit être stockée dans:
// 1. Variables d'environnement serveur
// 2. Firebase Functions (côté serveur)
// 3. Votre backend sécurisé
// 
// JAMAIS dans le code client React Native !