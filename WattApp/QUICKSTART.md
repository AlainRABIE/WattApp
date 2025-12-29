# ⚡ Démarrage Rapide - Firebase Storage

## 🚀 En 5 minutes, commencez à utiliser Firebase Storage !

### Étape 1 : Vérifier la configuration ✅

Votre Firebase Storage est déjà configuré ! Vérifiez simplement que vous avez bien :

```typescript
// constants/firebaseConfig.ts
export const storage = getStorage(app); // ✅ Déjà ajouté
```

### Étape 2 : Déployer les règles de sécurité 🔒

```bash
# Ouvrir un terminal dans le dossier WattApp
cd c:\Users\rabie\WattApp\WattApp

# Se connecter à Firebase (une seule fois)
firebase login

# Déployer les règles
firebase deploy --only storage:rules
```

### Étape 3 : Premier upload ! 📸

Copiez ce code dans n'importe quel écran React Native :

```tsx
import { useState } from 'react';
import { Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import StorageService from '../services/StorageService';
import { getAuth } from 'firebase/auth';

export default function MyScreen() {
  const [uploading, setUploading] = useState(false);

  const testUpload = async () => {
    try {
      // 1. Sélectionner une image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;

      // 2. Vérifier l'authentification
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Erreur', 'Connectez-vous d\'abord');
        return;
      }

      // 3. Upload vers Firebase
      setUploading(true);
      const url = await StorageService.uploadBookCover(
        result.assets[0].uri,
        'test-book-123',
        user.uid,
        (progress) => {
          console.log(`Upload: ${progress.progress}%`);
        }
      );

      // 4. Succès !
      Alert.alert('✅ Succès!', `Image uploadée:\n${url}`);
    } catch (error) {
      Alert.alert('❌ Erreur', String(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Button 
      title={uploading ? "Upload en cours..." : "Tester Firebase Storage"} 
      onPress={testUpload}
      disabled={uploading}
    />
  );
}
```

### Étape 4 : Utiliser les composants prêts à l'emploi 🎨

```tsx
import BookCoverUploader from '../components/BookCoverUploader';
import BookPDFUploader from '../components/BookPDFUploader';

export default function PublishScreen() {
  return (
    <>
      <BookCoverUploader 
        bookId="mon-livre-123"
        onCoverUploaded={(url) => {
          console.log('✅ Couverture:', url);
        }}
      />
      
      <BookPDFUploader
        bookId="mon-livre-123"
        onPDFUploaded={(url) => {
          console.log('✅ PDF:', url);
        }}
      />
    </>
  );
}
```

## 🎯 Cas d'usage courants

### Upload d'une couverture de livre

```typescript
import StorageService from './services/StorageService';

const url = await StorageService.uploadBookCover(
  imageUri,
  bookId,
  userId
);
```

### Upload d'un PDF

```typescript
const url = await StorageService.uploadBookPDF(
  pdfUri,
  bookId,
  userId,
  (progress) => {
    console.log(`${progress.progress}%`);
  }
);
```

### Upload d'une page de manga

```typescript
import MangaService from './services/MangaService';

const mangaService = new MangaService();
const url = await mangaService.uploadPageImage(
  imageUri,
  mangaId,
  userId,
  pageNumber
);
```

### Upload d'une photo de profil

```typescript
const url = await StorageService.uploadProfilePicture(
  imageUri,
  userId
);
```

## 🔍 Vérifier que ça fonctionne

### Méthode 1 : Console Firebase
1. Allez sur https://console.firebase.google.com
2. Sélectionnez votre projet "wattapp-12e91"
3. Cliquez sur "Storage" dans le menu
4. Vous verrez vos fichiers uploadés !

### Méthode 2 : Tests automatiques

```typescript
import storageTests from './tests/storage.test';

// Dans votre composant
const runTests = async () => {
  const results = await storageTests.runAllTests(imageUri);
  storageTests.displayTestResults(results);
};
```

## 🐛 Problèmes courants

### "User not authenticated"
**Solution :** Connectez-vous d'abord avec Firebase Auth

```typescript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
await signInWithEmailAndPassword(auth, email, password);
```

### "Permission denied"
**Solution :** Déployez les règles de sécurité

```bash
firebase deploy --only storage:rules
```

### "File too large"
**Solution :** Vérifiez les limites :
- Images : 10 MB max
- PDF : 100 MB max

## 📱 Intégration dans vos écrans existants

### PublishDetailsModal.tsx

Remplacez :
```typescript
setCover(result.assets[0].uri); // ❌ Local seulement
```

Par :
```typescript
const url = await StorageService.uploadBookCover(
  result.assets[0].uri,
  bookId,
  userId
);
setCover(url); // ✅ URL Firebase
```

### publish-manga.tsx

Ajoutez après la sélection d'image :
```typescript
const firebaseUrl = await StorageService.uploadMangaCover(
  localUri,
  mangaId,
  userId
);
setPublication(prev => ({ 
  ...prev, 
  coverImage: firebaseUrl 
}));
```

## 💡 Astuces

### Afficher la progression
```typescript
const [progress, setProgress] = useState(0);

await StorageService.uploadBookCover(
  uri, bookId, userId,
  (p) => setProgress(p.progress)
);
```

### Gérer les erreurs
```typescript
try {
  await StorageService.uploadBookCover(...);
  Alert.alert('Succès', 'Image uploadée !');
} catch (error) {
  Alert.alert('Erreur', 'Upload échoué');
  console.error(error);
}
```

### Upload en arrière-plan
```typescript
// L'upload continue même si l'utilisateur change d'écran
const uploadPromise = StorageService.uploadBookPDF(...);

// Plus tard...
const url = await uploadPromise;
```

## 🎓 Prochaines étapes

1. ✅ **Testez** avec un premier upload
2. 📖 **Lisez** FIREBASE_STORAGE_GUIDE.md pour plus de détails
3. 🔧 **Intégrez** dans vos écrans existants
4. 🚀 **Déployez** votre app

## 📞 Ressources

- 📖 Guide complet : `FIREBASE_STORAGE_GUIDE.md`
- 🚀 Déploiement : `FIREBASE_DEPLOYMENT.md`
- 💻 Exemples : `INTEGRATION_EXAMPLES.md`
- 🧪 Tests : `tests/storage.test.ts`

## ✅ Checklist de démarrage

- [ ] Firebase CLI installé (`npm install -g firebase-tools`)
- [ ] Connecté à Firebase (`firebase login`)
- [ ] Règles déployées (`firebase deploy --only storage:rules`)
- [ ] Premier upload testé
- [ ] Vérifié dans Firebase Console
- [ ] Intégré dans au moins un écran

---

**🎉 Vous êtes prêt ! Commencez par l'Étape 2 (déployer les règles) puis testez l'Étape 3 !**
