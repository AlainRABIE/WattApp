# Guide d'intégration de Firebase Storage

## ✅ Modifications effectuées

### 1. Configuration Firebase Storage
- **Fichier**: `constants/firebaseConfig.ts`
- Ajout de l'initialisation de Firebase Storage
- Export de `storage` pour utilisation dans toute l'application

### 2. Service de Storage centralisé
- **Fichier**: `services/StorageService.ts`
- Service complet pour gérer tous les uploads vers Firebase Storage
- Fonctions disponibles:
  - `uploadImage()` - Upload d'images génériques
  - `uploadPDF()` - Upload de fichiers PDF
  - `uploadBookCover()` - Upload de couvertures de livres
  - `uploadMangaCover()` - Upload de couvertures de manga
  - `uploadMangaPage()` - Upload de pages de manga
  - `uploadBookPDF()` - Upload de PDF de livres
  - `uploadProfilePicture()` - Upload de photos de profil
  - `deleteFile()` - Suppression de fichiers
  - `deleteBookFiles()` - Suppression de tous les fichiers d'un livre
  - `deleteMangaFiles()` - Suppression de tous les fichiers d'un manga

### 3. BookService
- **Fichier**: `services/BookService.ts`
- Nouveau service complet pour la gestion des livres
- Intégration avec Firebase Storage pour les couvertures et PDFs
- Fonctions CRUD complètes
- Gestion des statistiques et analytics

### 4. MangaService mis à jour
- **Fichier**: `services/MangaService.ts`
- Remplacement des fonctions désactivées par des appels à StorageService
- `uploadCoverImage()` - Maintenant fonctionnel avec Firebase Storage
- `uploadPageImage()` - Upload de pages de manga
- `deleteMangaFiles()` - Suppression complète des fichiers

### 5. NativePDFService étendu
- **Fichier**: `app/services/NativePDFService.ts`
- Ajout de `uploadPDFToFirebase()` - Upload de PDF vers le cloud
- Ajout de `uploadCoverToFirebase()` - Upload de couvertures vers le cloud
- Conservation du stockage local pour lecture hors ligne
- Interface `PDFBookData` étendue avec URLs Firebase

### 6. Règles de sécurité Storage
- **Fichier**: `storage.rules`
- Règles de sécurité complètes pour Firebase Storage
- Protection des fichiers par utilisateur
- Validation des types de fichiers et tailles
- Accès en lecture public pour contenus publiés

## 📋 Comment utiliser Firebase Storage

### Upload d'une couverture de livre
\`\`\`typescript
import StorageService from './services/StorageService';
import { getAuth } from 'firebase/auth';

const uploadCover = async (imageUri: string, bookId: string) => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  if (!userId) throw new Error('User not authenticated');
  
  // Avec suivi de progression
  const url = await StorageService.uploadBookCover(
    imageUri, 
    bookId, 
    userId,
    (progress) => {
      console.log(\`Upload: \${progress.progress.toFixed(0)}%\`);
    }
  );
  
  console.log('URL de la couverture:', url);
  return url;
};
\`\`\`

### Upload d'un PDF de livre
\`\`\`typescript
import BookService from './services/BookService';

const uploadBookPDF = async (pdfUri: string, bookId: string) => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  if (!userId) throw new Error('User not authenticated');
  
  const url = await BookService.uploadBookPDF(
    pdfUri,
    bookId,
    userId,
    (progress) => {
      console.log(\`Upload PDF: \${progress.progress.toFixed(0)}%\`);
    }
  );
  
  return url;
};
\`\`\`

### Upload d'une page de manga
\`\`\`typescript
import MangaService from './services/MangaService';

const uploadMangaPage = async (imageUri: string, mangaId: string, pageNumber: number) => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  if (!userId) throw new Error('User not authenticated');
  
  const mangaService = new MangaService();
  const url = await mangaService.uploadPageImage(
    imageUri,
    mangaId,
    userId,
    pageNumber,
    (progress) => {
      console.log(\`Upload page \${pageNumber}: \${progress.progress.toFixed(0)}%\`);
    }
  );
  
  return url;
};
\`\`\`

### Créer un livre complet avec couverture
\`\`\`typescript
import BookService from './services/BookService';
import { getAuth } from 'firebase/auth';

const createBookWithCover = async (
  bookData: any, 
  coverUri: string
) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) throw new Error('User not authenticated');
  
  // 1. Créer le livre dans Firestore
  const bookId = await BookService.createBook({
    ...bookData,
    userId: user.uid,
    authorId: user.uid,
    authorName: user.displayName || user.email || 'Anonyme',
  });
  
  // 2. Upload la couverture
  const coverUrl = await BookService.uploadBookCover(
    coverUri,
    bookId,
    user.uid,
    (progress) => {
      console.log(\`Upload couverture: \${progress.progress}%\`);
    }
  );
  
  console.log('Livre créé avec ID:', bookId);
  console.log('Couverture uploadée:', coverUrl);
  
  return { bookId, coverUrl };
};
\`\`\`

## 🔧 Déploiement des règles de sécurité

Pour déployer les règles de sécurité Firebase Storage:

\`\`\`bash
# Installer Firebase CLI si ce n'est pas déjà fait
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Initialiser Firebase dans le projet (si pas déjà fait)
firebase init storage

# Déployer uniquement les règles de storage
firebase deploy --only storage
\`\`\`

## 📁 Structure des fichiers dans Firebase Storage

\`\`\`
storage/
├── books/
│   └── {userId}/
│       └── {bookId}/
│           ├── cover.jpg
│           └── book.pdf
├── manga/
│   └── {userId}/
│       └── {mangaId}/
│           ├── cover.jpg
│           └── pages/
│               ├── page_1.jpg
│               ├── page_2.jpg
│               └── ...
├── profiles/
│   └── {userId}/
│       └── avatar.jpg
├── chats/
│   └── {chatId}/
│       └── images/
└── community/
    └── {groupId}/
        └── images/
\`\`\`

## ⚙️ Configuration dans Firebase Console

1. Aller dans la [Firebase Console](https://console.firebase.google.com)
2. Sélectionner votre projet "wattapp-12e91"
3. Aller dans **Storage** dans le menu de gauche
4. Vérifier que le Storage est activé
5. Vérifier le bucket: `wattapp-12e91.appspot.com`
6. Onglet **Rules** - Déployer les règles depuis `storage.rules`

## 🚀 Prochaines étapes recommandées

1. **Mettre à jour les composants UI**
   - Modifier les composants qui uploadent des images pour utiliser StorageService
   - Ajouter des indicateurs de progression pour les uploads

2. **Optimisation des images**
   - Les images sont automatiquement redimensionnées côté client
   - Considérer l'ajout de thumbnails pour meilleures performances

3. **Gestion du cache**
   - Implémenter un système de cache pour les images téléchargées
   - Utiliser `expo-file-system` pour le stockage local

4. **Nettoyage automatique**
   - Implémenter des Cloud Functions pour nettoyer les fichiers orphelins
   - Supprimer les fichiers temporaires après 24h

5. **Monitoring**
   - Surveiller l'utilisation du Storage dans Firebase Console
   - Configurer des alertes pour les quotas

## 💰 Coûts Firebase Storage (Plan Blaze)

- **Stockage**: $0.026 par GB/mois
- **Download**: $0.12 par GB
- **Upload**: Gratuit
- **Quotas gratuits mensuels**:
  - 5 GB de stockage
  - 1 GB de download par jour
  - 20,000 uploads par jour

## 🔒 Sécurité

- ✅ Authentification requise pour les uploads
- ✅ Validation des types de fichiers (images, PDF)
- ✅ Limites de taille (10 MB pour images, 100 MB pour PDF)
- ✅ Isolation par utilisateur
- ✅ Accès en lecture public pour contenus publiés uniquement

## 📝 Notes importantes

- Les URLs Firebase Storage sont permanentes et ne changent pas
- Les fichiers supprimés ne peuvent pas être récupérés
- Toujours vérifier que l'utilisateur est authentifié avant l'upload
- Utiliser des callbacks de progression pour les gros fichiers
- Les règles de sécurité sont vérifiées côté serveur
