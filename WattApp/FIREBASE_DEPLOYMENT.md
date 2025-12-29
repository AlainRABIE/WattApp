# Déploiement de Firebase Storage

## 📝 Prérequis

1. Node.js et npm installés
2. Firebase CLI installé (`npm install -g firebase-tools`)
3. Accès au projet Firebase (wattapp-12e91)
4. Plan Blaze activé sur Firebase

## 🚀 Étapes de déploiement

### 1. Installation de Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Connexion à Firebase

```bash
firebase login
```

Suivez les instructions pour vous connecter avec votre compte Google.

### 3. Vérification du projet

```bash
# Lister vos projets Firebase
firebase projects:list

# Sélectionner le projet
firebase use wattapp-12e91
```

### 4. Initialisation de Storage (si pas déjà fait)

```bash
firebase init storage
```

Choisissez:
- Utiliser un projet existant
- Sélectionner `wattapp-12e91`
- Utiliser le fichier `storage.rules` existant

### 5. Déploiement des règles de sécurité

```bash
# Déployer uniquement les règles de Storage
firebase deploy --only storage:rules

# Ou déployer tout Firebase (Firestore + Storage + Functions si elles existent)
firebase deploy
```

### 6. Vérification

Après le déploiement, vérifiez dans la [Firebase Console](https://console.firebase.google.com):

1. Allez dans votre projet `wattapp-12e91`
2. Cliquez sur **Storage** dans le menu
3. Allez dans l'onglet **Rules**
4. Vérifiez que les règles sont bien déployées

## 🧪 Tests des règles

### Test 1: Upload d'une couverture (authentifié)

```typescript
import { getAuth } from 'firebase/auth';
import StorageService from './services/StorageService';

const testUploadCover = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ User not authenticated');
    return;
  }
  
  try {
    const url = await StorageService.uploadBookCover(
      'file://path/to/image.jpg',
      'test-book-id',
      user.uid
    );
    console.log('✅ Test réussi:', url);
  } catch (error) {
    console.error('❌ Test échoué:', error);
  }
};
```

### Test 2: Lecture publique

```typescript
// Tester la lecture d'une image publique (doit fonctionner sans auth)
const testPublicRead = async () => {
  const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/wattapp-12e91.appspot.com/o/books%2FuserId%2FbookId%2Fcover.jpg?alt=media';
  
  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      console.log('✅ Lecture publique OK');
    } else {
      console.log('❌ Lecture publique échouée');
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};
```

### Test 3: Upload sans authentification (doit échouer)

```typescript
// Ce test doit échouer si les règles fonctionnent correctement
const testUnauthorizedUpload = async () => {
  // Déconnecter l'utilisateur
  const auth = getAuth();
  await auth.signOut();
  
  try {
    await StorageService.uploadBookCover(
      'file://path/to/image.jpg',
      'test-book-id',
      'fake-user-id'
    );
    console.log('❌ PROBLÈME: Upload sans auth a réussi!');
  } catch (error) {
    console.log('✅ Correct: Upload sans auth bloqué');
  }
};
```

## 📊 Monitoring

### Surveillance de l'usage

1. Allez dans la [Firebase Console](https://console.firebase.google.com)
2. Storage → Usage
3. Surveillez:
   - Stockage total utilisé
   - Bande passante de téléchargement
   - Nombre d'opérations

### Configurer des alertes

```bash
# Installer Firebase Admin SDK pour monitoring
npm install firebase-admin

# Créer un script de monitoring (voir monitoring.js)
```

### Exemple de monitoring.js

```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: 'wattapp-12e91.appspot.com'
});

const bucket = admin.storage().bucket();

// Lister tous les fichiers
async function listFiles() {
  const [files] = await bucket.getFiles();
  console.log(`Total files: ${files.length}`);
  
  let totalSize = 0;
  for (const file of files) {
    const [metadata] = await file.getMetadata();
    totalSize += parseInt(metadata.size);
  }
  
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

listFiles();
```

## 🔧 Troubleshooting

### Problème: "Permission denied"

**Cause**: Les règles de sécurité bloquent l'accès

**Solution**:
1. Vérifier que l'utilisateur est authentifié
2. Vérifier que l'userId correspond à l'utilisateur connecté
3. Vérifier que le type de fichier est correct
4. Vérifier la taille du fichier

### Problème: "CORS error"

**Cause**: Configuration CORS manquante

**Solution**:
```bash
# Créer un fichier cors.json
echo '[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]' > cors.json

# Appliquer la configuration CORS
gsutil cors set cors.json gs://wattapp-12e91.appspot.com
```

### Problème: Upload très lent

**Cause**: Fichier trop volumineux ou connexion lente

**Solution**:
1. Compresser les images avant upload
2. Utiliser `uploadBytesResumable` avec progression
3. Limiter la taille des fichiers
4. Optimiser les images côté client

### Problème: "Quota exceeded"

**Cause**: Dépassement des quotas gratuits

**Solution**:
1. Vérifier l'usage dans Firebase Console
2. Optimiser le stockage (supprimer les fichiers inutilisés)
3. Implémenter un système de cache
4. Considérer l'upgrade du plan

## 📚 Commandes utiles

```bash
# Vérifier le statut Firebase
firebase projects:list

# Afficher les règles actuelles
firebase database:get / --project wattapp-12e91

# Tester les règles localement
firebase emulators:start --only storage

# Voir les logs
firebase functions:log

# Supprimer tous les fichiers d'un dossier
# ATTENTION: Irréversible!
gsutil -m rm -r gs://wattapp-12e91.appspot.com/temp/**
```

## 🔐 Bonnes pratiques

1. **Toujours valider côté client ET serveur**
   - Taille des fichiers
   - Type MIME
   - Format de fichier

2. **Implémenter une logique de nettoyage**
   - Supprimer les anciens fichiers lors de l'upload de nouveaux
   - Nettoyer les fichiers temporaires
   - Supprimer les fichiers des utilisateurs supprimés

3. **Utiliser des chemins structurés**
   - `books/{userId}/{bookId}/cover.jpg`
   - Facilite la gestion et le nettoyage

4. **Optimiser les images**
   - Redimensionner avant upload
   - Compresser avec qualité 0.8
   - Utiliser des formats modernes (WebP quand possible)

5. **Gérer les erreurs gracieusement**
   - Retry automatique pour les erreurs réseau
   - Messages d'erreur clairs pour l'utilisateur
   - Logging pour debug

## 📞 Support

En cas de problème:
1. Consulter les logs Firebase
2. Vérifier les règles de sécurité
3. Tester avec Firebase Emulator
4. Consulter la documentation: https://firebase.google.com/docs/storage

## ✅ Checklist de déploiement

- [ ] Firebase CLI installé
- [ ] Connecté au bon compte Firebase
- [ ] Projet `wattapp-12e91` sélectionné
- [ ] Règles de sécurité déployées
- [ ] Tests d'upload réussis
- [ ] Tests de lecture publique réussis
- [ ] Monitoring configuré
- [ ] CORS configuré si nécessaire
- [ ] Documentation mise à jour
