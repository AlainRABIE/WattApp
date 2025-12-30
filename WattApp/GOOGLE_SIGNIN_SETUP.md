# 🔐 Configuration Google Sign-In pour WattApp

## 📋 Étapes de configuration

### 1️⃣ Configuration Google Cloud Console

1. **Accédez à Google Cloud Console**
   - Allez sur https://console.cloud.google.com/
   - Sélectionnez votre projet Firebase ou créez-en un nouveau

2. **Activez l'API Google Sign-In**
   - Dans le menu, allez à "APIs & Services" > "Library"
   - Recherchez "Google Sign-In API" ou "Google+ API"
   - Cliquez sur "Enable"

3. **Créez les identifiants OAuth 2.0**
   - Allez dans "APIs & Services" > "Credentials"
   - Cliquez sur "Create Credentials" > "OAuth client ID"

4. **Configurez l'écran de consentement OAuth** (si demandé)
   - Type d'application : External
   - Nom de l'application : WattApp
   - Email de support : votre email
   - Domaines autorisés : auth.expo.io (si vous utilisez Expo Go)

5. **Créez un ID client Web** (OBLIGATOIRE)
   - Type d'application : **Web application**
   - Nom : "WattApp Web Client"
   - Authorized redirect URIs : 
     ```
     https://auth.expo.io/@YOUR_EXPO_USERNAME/WattApp
     ```
   - **Notez le Client ID généré** (format: xxxxx.apps.googleusercontent.com)

### 2️⃣ Configuration Firebase Console

1. **Activez Google comme fournisseur d'authentification**
   - Allez sur https://console.firebase.google.com/
   - Sélectionnez votre projet
   - Allez dans "Authentication" > "Sign-in method"
   - Cliquez sur "Google"
   - Activez le fournisseur
   - **Collez le Web Client ID obtenu à l'étape 1.5**
   - Sauvegardez

### 3️⃣ Configuration de l'application

1. **Modifiez le fichier `constants/googleConfig.ts`**
   ```typescript
   export const GOOGLE_CONFIG = {
     WEB_CLIENT_ID: 'COLLEZ_ICI_VOTRE_WEB_CLIENT_ID.apps.googleusercontent.com',
     IOS_CLIENT_ID: '', // Optionnel
     ANDROID_CLIENT_ID: '', // Optionnel
   };
   ```

2. **Vérifiez votre app.json**
   - Assurez-vous que vous avez un `slug` et un `owner` définis :
   ```json
   {
     "expo": {
       "name": "WattApp",
       "slug": "wattapp",
       "owner": "votre-username-expo"
     }
   }
   ```

### 4️⃣ Installation des dépendances (si nécessaire)

```bash
npx expo install expo-auth-session expo-web-browser
```

### 5️⃣ Testez la connexion

1. Lancez l'application : `npx expo start`
2. Cliquez sur le bouton Google Sign In
3. Une fenêtre de connexion Google devrait s'ouvrir
4. Connectez-vous avec votre compte Google
5. Vous devriez être redirigé vers la page d'accueil

## 🔧 Résolution des problèmes courants

### Erreur "redirect_uri_mismatch"
- Vérifiez que l'URI de redirection dans Google Cloud Console correspond exactement à :
  `https://auth.expo.io/@YOUR_EXPO_USERNAME/YOUR_APP_SLUG`
- Remplacez `YOUR_EXPO_USERNAME` par votre username Expo
- Remplacez `YOUR_APP_SLUG` par le slug dans app.json

### Erreur "invalid_client"
- Vérifiez que le Web Client ID dans `googleConfig.ts` est correct
- Vérifiez que vous avez bien collé le Web Client ID (pas le Android ou iOS Client ID)

### Le popup Google ne s'ouvre pas
- Vérifiez que `expo-auth-session` et `expo-web-browser` sont installés
- Essayez de recharger l'application (R dans le terminal)

### L'utilisateur n'est pas créé dans Firestore
- Vérifiez les règles de sécurité Firestore
- Vérifiez la console pour les erreurs

## 📱 Configuration pour builds standalone (optionnel)

### Pour Android
1. Créez un OAuth Client ID de type "Android"
2. Ajoutez le SHA-1 de votre certificat de signature
3. Collez le Client ID dans `ANDROID_CLIENT_ID`

### Pour iOS
1. Créez un OAuth Client ID de type "iOS"
2. Ajoutez le Bundle ID de votre app
3. Collez le Client ID dans `IOS_CLIENT_ID`

## ✅ Vérification

Après configuration, vous devriez avoir :
- ✅ Un Web Client ID dans Google Cloud Console
- ✅ Google activé dans Firebase Authentication
- ✅ Le Web Client ID dans `googleConfig.ts`
- ✅ Les redirect URIs configurés correctement
- ✅ Un compte Google de test qui peut se connecter

## 📚 Documentation

- [Expo Auth Session](https://docs.expo.dev/guides/authentication/#google)
- [Firebase Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
