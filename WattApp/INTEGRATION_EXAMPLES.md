# 🔌 Guide d'intégration dans vos écrans existants

Ce guide montre comment intégrer Firebase Storage dans vos écrans et composants existants.

## 📝 PublishDetailsModal.tsx

### Avant (stockage local uniquement)
```typescript
const pickImage = async () => {
  setLoading(true);
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  setLoading(false);
  if (!result.canceled && result.assets && result.assets.length > 0) {
    setCover(result.assets[0].uri); // Stockage local uniquement
  }
};
```

### Après (avec Firebase Storage)
```typescript
import StorageService from '../../services/StorageService';
import { getAuth } from 'firebase/auth';

const [uploadProgress, setUploadProgress] = useState(0);
const [uploading, setUploading] = useState(false);

const pickAndUploadImage = async () => {
  // 1. Sélectionner l'image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  
  if (result.canceled || !result.assets[0]) return;
  
  const localUri = result.assets[0].uri;
  setCover(localUri); // Afficher l'aperçu local
  
  // 2. Upload vers Firebase (en arrière-plan)
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    Alert.alert('Erreur', 'Vous devez être connecté');
    return;
  }
  
  try {
    setUploading(true);
    const bookId = 'temp-' + Date.now(); // ID temporaire
    
    const firebaseUrl = await StorageService.uploadBookCover(
      localUri,
      bookId,
      user.uid,
      (progress) => {
        setUploadProgress(progress.progress);
      }
    );
    
    // Stocker l'URL Firebase au lieu de l'URI locale
    setCover(firebaseUrl);
    Alert.alert('Succès', 'Couverture uploadée !');
  } catch (error) {
    console.error('Erreur upload:', error);
    Alert.alert('Erreur', 'Impossible d\'uploader la couverture');
  } finally {
    setUploading(false);
    setUploadProgress(0);
  }
};
```

### Ajout de l'indicateur de progression
```tsx
{uploading && (
  <View style={styles.uploadProgress}>
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
    </View>
    <Text style={styles.progressText}>{uploadProgress.toFixed(0)}%</Text>
  </View>
)}
```

## 🎨 publish-manga.tsx

### Modification de uploadCoverImage

```typescript
const uploadCoverImage = async () => {
  try {
    setUploadingCover(true);
    
    // 1. Sélectionner l'image
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) return;
    
    const localUri = result.assets[0].uri;
    
    // 2. Obtenir l'utilisateur
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }
    
    // 3. Upload vers Firebase
    const mangaId = projectId as string || 'temp-' + Date.now();
    
    const firebaseUrl = await StorageService.uploadMangaCover(
      localUri,
      mangaId,
      user.uid,
      (progress) => {
        console.log(`Upload: ${progress.progress.toFixed(0)}%`);
      }
    );
    
    // 4. Mettre à jour l'état avec l'URL Firebase
    setPublication(prev => ({
      ...prev,
      coverImage: firebaseUrl
    }));
    
    Alert.alert('Succès', 'Couverture uploadée !');
  } catch (error) {
    console.error('Erreur upload:', error);
    Alert.alert('Erreur', 'Impossible d\'uploader l\'image de couverture');
  } finally {
    setUploadingCover(false);
  }
};
```

## 📚 book/[bookId].tsx (Publication d'un livre)

### Ajout de la fonction d'upload complète

```typescript
import BookService from '../../services/BookService';
import StorageService from '../../services/StorageService';

const [uploadingCover, setUploadingCover] = useState(false);
const [uploadingPDF, setUploadingPDF] = useState(false);

const publishBook = async () => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (!user) {
    Alert.alert('Erreur', 'Vous devez être connecté');
    return;
  }
  
  try {
    setSaving(true);
    
    // 1. Créer le livre dans Firestore
    const bookId = await BookService.createBook({
      title: book.title,
      description: book.description || '',
      synopsis: book.synopsis || '',
      userId: user.uid,
      authorId: user.uid,
      authorName: user.displayName || user.email || 'Anonyme',
      category: book.category || 'Autre',
      genre: book.genre || [],
      tags: book.tags || [],
      isPublished: true,
      isDraft: false,
      isFree: book.isFree !== false,
      price: book.price || 0,
      currency: 'EUR',
      rating: 'PG',
      status: 'ongoing',
      isAdult: false,
    });
    
    // 2. Upload la couverture si présente
    if (coverImage) {
      setUploadingCover(true);
      const coverUrl = await BookService.uploadBookCover(
        coverImage,
        bookId,
        user.uid,
        (progress) => {
          console.log(`Couverture: ${progress.progress.toFixed(0)}%`);
        }
      );
      console.log('✅ Couverture uploadée:', coverUrl);
    }
    
    // 3. Upload le PDF si présent
    if (pdfUri) {
      setUploadingPDF(true);
      const pdfUrl = await BookService.uploadBookPDF(
        pdfUri,
        bookId,
        user.uid,
        (progress) => {
          console.log(`PDF: ${progress.progress.toFixed(0)}%`);
        }
      );
      console.log('✅ PDF uploadé:', pdfUrl);
    }
    
    Alert.alert('Succès', 'Livre publié avec succès !');
    router.back();
  } catch (error) {
    console.error('Erreur publication:', error);
    Alert.alert('Erreur', 'Impossible de publier le livre');
  } finally {
    setSaving(false);
    setUploadingCover(false);
    setUploadingPDF(false);
  }
};
```

## 📱 library/Library.tsx (Import de PDF avec couverture)

### Modification de l'import de PDF

```typescript
import { NativePDFService } from '../services/NativePDFService';

const handlePDFUpload = async (file: any) => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (!user) {
    Alert.alert('Erreur', 'Vous devez être connecté');
    return;
  }
  
  try {
    const bookId = 'book-' + Date.now();
    const fileName = file.name.replace('.pdf', '');
    
    // 1. Demander si l'utilisateur veut ajouter une couverture
    const shouldAddCover = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Image de couverture',
        'Voulez-vous ajouter une image de couverture ?',
        [
          { text: 'Non', onPress: () => resolve(false) },
          { text: 'Oui', onPress: () => resolve(true) }
        ]
      );
    });
    
    let coverUri: string | undefined;
    
    if (shouldAddCover) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        coverUri = result.assets[0].uri;
      }
    }
    
    // 2. Sauvegarder localement (pour lecture hors ligne)
    const pdfData = await NativePDFService.saveLocalPDF(
      file.uri,
      bookId,
      fileName,
      coverUri
    );
    
    // 3. Upload vers Firebase Storage (pour partage/sync)
    const pdfUrl = await NativePDFService.uploadPDFToFirebase(
      file.uri,
      bookId,
      user.uid,
      (progress) => {
        console.log(`Upload PDF: ${progress.progress.toFixed(0)}%`);
      }
    );
    
    let coverUrl: string | undefined;
    if (coverUri) {
      coverUrl = await NativePDFService.uploadCoverToFirebase(
        coverUri,
        bookId,
        user.uid
      );
    }
    
    // 4. Créer l'entrée dans Firestore
    await BookService.createBook({
      title: fileName,
      description: '',
      synopsis: '',
      userId: user.uid,
      authorId: user.uid,
      authorName: user.displayName || 'Anonyme',
      pdfUrl,
      coverImageUrl: coverUrl,
      category: 'PDF',
      genre: [],
      tags: ['pdf'],
      isPublished: false,
      isDraft: true,
      isFree: true,
      price: 0,
      currency: 'EUR',
      rating: 'PG',
      status: 'completed',
      isAdult: false,
    });
    
    Alert.alert('Succès', 'PDF importé et uploadé !');
  } catch (error) {
    console.error('Erreur import PDF:', error);
    Alert.alert('Erreur', 'Impossible d\'importer le PDF');
  }
};
```

## 🎯 EditProfile.tsx (Photo de profil)

### Upload de photo de profil

```typescript
import StorageService from '../services/StorageService';

const uploadProfilePicture = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Carré pour avatar
      quality: 0.8,
    });
    
    if (result.canceled || !result.assets[0]) return;
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }
    
    setUploading(true);
    
    // Upload vers Firebase
    const avatarUrl = await StorageService.uploadProfilePicture(
      result.assets[0].uri,
      user.uid,
      (progress) => {
        console.log(`Avatar: ${progress.progress.toFixed(0)}%`);
      }
    );
    
    // Mettre à jour le profil dans Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      photoURL: avatarUrl,
      updatedAt: serverTimestamp(),
    });
    
    Alert.alert('Succès', 'Photo de profil mise à jour !');
  } catch (error) {
    console.error('Erreur upload avatar:', error);
    Alert.alert('Erreur', 'Impossible d\'uploader la photo');
  } finally {
    setUploading(false);
  }
};
```

## 🔄 Migration des données existantes

Si vous avez déjà des données avec des URIs locales, voici comment les migrer:

```typescript
import BookService from './services/BookService';
import StorageService from './services/StorageService';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './constants/firebaseConfig';

const migrateLocalToFirebase = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) return;
  
  try {
    // 1. Récupérer tous les livres de l'utilisateur
    const booksQuery = query(
      collection(db, 'books'),
      where('userId', '==', user.uid)
    );
    
    const snapshot = await getDocs(booksQuery);
    
    // 2. Pour chaque livre avec une couverture locale
    for (const bookDoc of snapshot.docs) {
      const book = bookDoc.data();
      
      // Si la couverture est locale (file://)
      if (book.coverImageUrl && book.coverImageUrl.startsWith('file://')) {
        console.log(`Migration du livre: ${book.title}`);
        
        try {
          // Upload vers Firebase
          const firebaseUrl = await StorageService.uploadBookCover(
            book.coverImageUrl,
            bookDoc.id,
            user.uid
          );
          
          // Mettre à jour Firestore
          await updateDoc(doc(db, 'books', bookDoc.id), {
            coverImageUrl: firebaseUrl,
          });
          
          console.log(`✅ Migré: ${book.title}`);
        } catch (error) {
          console.error(`❌ Erreur migration ${book.title}:`, error);
        }
      }
    }
    
    Alert.alert('Migration terminée', 'Toutes les couvertures ont été migrées vers Firebase');
  } catch (error) {
    console.error('Erreur migration:', error);
    Alert.alert('Erreur', 'Impossible de migrer les données');
  }
};
```

## 🎨 Styles pour les indicateurs de progression

```typescript
const styles = StyleSheet.create({
  uploadProgress: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 4,
  },
  progressText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
});
```

## ⚡ Optimisations recommandées

### 1. Upload en arrière-plan avec React Native Background Fetch

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_UPLOAD_TASK = 'background-upload';

TaskManager.defineTask(BACKGROUND_UPLOAD_TASK, async () => {
  // Logique d'upload en arrière-plan
  const pendingUploads = await AsyncStorage.getItem('pendingUploads');
  
  if (pendingUploads) {
    // Traiter les uploads en attente
  }
  
  return BackgroundFetch.BackgroundFetchResult.NewData;
});
```

### 2. Cache des images téléchargées

```typescript
import * as FileSystem from 'expo-file-system';

const cacheImage = async (url: string): Promise<string> => {
  const filename = url.split('/').pop() || 'image.jpg';
  const localPath = `${FileSystem.cacheDirectory}${filename}`;
  
  // Vérifier si déjà en cache
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    return localPath;
  }
  
  // Télécharger et mettre en cache
  await FileSystem.downloadAsync(url, localPath);
  return localPath;
};
```

### 3. Queue d'upload

```typescript
class UploadQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  
  add(uploadFn: () => Promise<void>) {
    this.queue.push(uploadFn);
    this.process();
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const uploadFn = this.queue.shift();
      if (uploadFn) {
        try {
          await uploadFn();
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }
    }
    
    this.processing = false;
  }
}

export const uploadQueue = new UploadQueue();
```

## 📝 Notes importantes

1. **Toujours vérifier l'authentification** avant d'uploader
2. **Afficher la progression** pour les gros fichiers (PDF)
3. **Gérer les erreurs gracieusement** avec des messages clairs
4. **Conserver le stockage local** pour lecture hors ligne
5. **Nettoyer les fichiers temporaires** après upload réussi

---

**Dernière mise à jour:** 29 décembre 2025
