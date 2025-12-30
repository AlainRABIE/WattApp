/**
 * Configuration Google OAuth pour l'authentification
 * 
 * Pour obtenir ces identifiants :
 * 1. Allez sur https://console.cloud.google.com/
 * 2. Sélectionnez votre projet ou créez-en un nouveau
 * 3. Activez l'API "Google Sign-In" 
 * 4. Allez dans "Identifiants" > "Créer des identifiants" > "ID client OAuth 2.0"
 * 5. Créez un ID client pour :
 *    - Application Web (pour Expo Go et web)
 *    - Android (optionnel, pour APK standalone)
 *    - iOS (optionnel, pour IPA standalone)
 * 
 * IMPORTANT: Dans la console Firebase, activez aussi le fournisseur Google
 * dans Authentication > Sign-in method > Google
 */

export const GOOGLE_CONFIG = {
  // ID client Web (pour référence Firebase)
  WEB_CLIENT_ID: '375000137421-r26v90o59fqmv9p181kffe9iml5ne38i.apps.googleusercontent.com',
  
  // ID client iOS (optionnel) - Uniquement pour build standalone iOS
  IOS_CLIENT_ID: '',
  
  // ID client Android (OBLIGATOIRE pour expo-auth-session sans proxy)
  // Remplacez par votre Android Client ID créé dans Google Cloud Console
  ANDROID_CLIENT_ID: 'COLLEZ_ICI_VOTRE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
};

/**
 * INSTRUCTIONS DÉTAILLÉES :
 * 
 * 1. OBTENIR LE WEB CLIENT ID :
 *    - Google Cloud Console > APIs & Services > Credentials
 *    - Create Credentials > OAuth client ID
 *    - Application type: Web application
 *    - Authorized redirect URIs: https://auth.expo.io/@YOUR_EXPO_USERNAME/YOUR_APP_SLUG
 *    - Copiez le "Client ID" généré
 * 
 * 2. CONFIGURATION FIREBASE :
 *    - Firebase Console > Authentication > Sign-in method
 *    - Activez "Google"
 *    - Ajoutez le Web Client ID dans la configuration
 * 
 * 3. EXPO CONFIGURATION (app.json) :
 *    - Ajoutez votre slug et owner dans app.json si ce n'est pas déjà fait
 * 
 * 4. POUR LES BUILDS STANDALONE (optionnel) :
 *    - Créez des OAuth clients pour iOS et Android
 *    - Configurez les dans app.json sous "ios.config.googleSignIn" et "android.config.googleServicesFile"
 */
