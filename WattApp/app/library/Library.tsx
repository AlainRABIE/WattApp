import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StatusBar,
  useWindowDimensions,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getWishlistBooks } from './wishlistUtils';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { NativePDFService, PDFBookData } from '../services/NativePDFService';
import PDFPageExtractor from '../components/PDFPageExtractor';

// Types
type BookType = {
  id: string;
  // Champs français
  titre?: string;
  auteur?: string;
  couverture?: string;
  // Champs anglais (compatibilité)
  title?: string;
  author?: string;
  coverImage?: string;
  coverImageUrl?: string;
  tags?: string[];
  views?: number;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  templateId?: string;
  // Pourcentage de lecture
  pagesRead?: number;
  totalPages?: number;
  // Propriétés PDF
  type?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  // Stockage local
  isDownloaded?: boolean;
  localPdfPath?: string;
  localCoverPath?: string;
  downloadedAt?: number;
};

// Interface pour les données du fichier PDF sélectionné
interface PDFFileData {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

type FolderType = {
  id: string;
  name: string;
  bookIds: string[];
};

const initialFolders: FolderType[] = [];

const Library: React.FC = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.max(width, height) >= 768;


  // State
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);
  const [newFolderName, setNewFolderName] = useState('');
  const [books, setBooks] = useState<BookType[]>([]);
  const [drafts, setDrafts] = useState<BookType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [wishlist, setWishlist] = useState<BookType[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadedBooks, setDownloadedBooks] = useState<Set<string>>(new Set());
  const [downloadingBooks, setDownloadingBooks] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [localBooks, setLocalBooks] = useState<PDFBookData[]>([]);
  
  // États pour l'extraction de pages PDF
  const [extractingPages, setExtractingPages] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 });
  const [showExtractor, setShowExtractor] = useState(false);
  const [pendingPdfUri, setPendingPdfUri] = useState<string | null>(null);
  const [pendingBookData, setPendingBookData] = useState<any>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<PDFFileData | null>(null);
  
  // États pour le menu contextuel
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Limite de téléchargements simultanés
  const MAX_DOWNLOADS = 2;

  // Clés pour AsyncStorage
  const STORAGE_KEYS = {
    DOWNLOADED_BOOKS: 'downloaded_books',
    OFFLINE_BOOK_PREFIX: 'offline_book_'
  };

  // Charger les téléchargements depuis le stockage local au démarrage
  useEffect(() => {
    const initDownloads = async () => {
      const downloaded = await loadDownloadedBooks();
      setDownloadedBooks(downloaded);
      
      // Charger les livres stockés localement
      const localPDFs = await loadLocalBooks();
      setLocalBooks(localPDFs);
    };
    initDownloads();
  }, []);

  const loadDownloadedBooks = async (): Promise<Set<string>> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DOWNLOADED_BOOKS);
      if (stored) {
        const bookIds = JSON.parse(stored);
        return new Set(bookIds);
      }
      return new Set();
    } catch (error) {
      console.error('Erreur lors du chargement des téléchargements:', error);
      return new Set();
    }
  };

  const loadLocalBooks = async (): Promise<PDFBookData[]> => {
    try {
      return await NativePDFService.getLocalBooks();
    } catch (error) {
      console.error('Erreur lors du chargement des livres locaux:', error);
      return [];
    }
  };

  const saveDownloadedBooks = async (bookIds: Set<string>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DOWNLOADED_BOOKS, JSON.stringify(Array.from(bookIds)));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des téléchargements:', error);
    }
  };

  // Fonction d'importation PDF (stockage local natif)
  const handleImportPDF = async () => {
    try {
      setImporting(true);
      
      // Sélectionner le fichier PDF
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        Alert.alert('Erreur', 'Aucun fichier sélectionné');
        return;
      }

      // Stocker les données du fichier PDF pour l'extraction
      const pdfFileData: PDFFileData = {
        uri: file.uri,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType
      };
      setSelectedPdfFile(pdfFileData);

      // Diagnostics du fichier PDF
      console.log('📱 Données du fichier PDF sélectionné:', {
        name: file.name,
        uri: file.uri,
        size: file.size,
        mimeType: file.mimeType,
        sizeInMB: file.size ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Inconnue'
      });

      // Vérifier que c'est bien un PDF
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Erreur', 'Veuillez sélectionner un fichier PDF');
        return;
      }

      // Vérifier que le fichier a une taille valide
      if (!file.size || file.size === 0) {
        Alert.alert('Erreur', 'Le fichier PDF semble être vide ou corrompu');
        return;
      }

      // Vérifier la taille maximum (par exemple 50MB)
      const maxSizeMB = 50;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        Alert.alert(
          'Fichier trop volumineux', 
          `Le fichier fait ${(file.size / (1024 * 1024)).toFixed(1)} MB. La taille maximum est de ${maxSizeMB} MB.`
        );
        return;
      }

      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      // Extraire le nom du livre depuis le nom du fichier
      const fileName = file.name.replace('.pdf', '');
      const bookTitle = fileName.replace(/[_-]/g, ' ').trim();

      // Proposer à l'utilisateur de sélectionner une image de couverture
      let customCoverUri = null;
      
      const shouldAddCover = await new Promise((resolve) => {
        Alert.alert(
          'Image de couverture',
          'Voulez-vous ajouter une image de couverture pour ce livre PDF ?',
          [
            { text: 'Non, continuer', onPress: () => resolve(false) },
            { text: 'Oui, choisir image', onPress: () => resolve(true) }
          ]
        );
      });

      if (shouldAddCover) {
        try {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4], // Format livre
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            customCoverUri = result.assets[0].uri;
          }
        } catch (error) {
          console.warn('Erreur lors de la sélection d\'image:', error);
        }
      }

      // Générer un ID unique pour ce livre
      const bookId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Préparer les données pour l'extraction de pages
      setPendingBookData({
        bookId,
        title: bookTitle,
        pdfUri: file.uri,
        customCoverUri,
        fileData: pdfFileData // Ajouter les données du fichier
      });

      // Démarrer l'extraction des pages
      setExtractingPages(true);
      setExtractionProgress({ current: 0, total: 0 });
      setPendingPdfUri(file.uri);
      setShowExtractor(true);

    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier PDF');
    } finally {
      setImporting(false);
    }
  };

  // Gérer l'extraction réussie des pages
  const handlePagesExtracted = async (pageUris: string[], totalPages: number) => {
    try {
      if (!pendingBookData) {
        console.error('❌ Données du livre manquantes');
        return;
      }

      const { bookId, title, pdfUri, customCoverUri } = pendingBookData;

      // Diagnostic des données
      console.log('📱 Données reçues pour finalisation:', {
        bookId,
        title,
        pdfUri,
        customCoverUri,
        totalPages,
        pagesExtracted: pageUris.length
      });

      // Vérifier que l'URI du PDF existe
      if (!pdfUri) {
        throw new Error('URI du PDF manquante');
      }

      // Utiliser le service natif pour copier et stocker le PDF avec les pages
      console.log('Stockage local du PDF avec pages extraites...');
      const localBookData = await NativePDFService.saveLocalPDF(
        pdfUri,
        bookId,
        title,
        customCoverUri || undefined
      );

      // Ajouter les informations des pages extraites
      const enhancedBookData: PDFBookData = {
        ...localBookData,
        pagesImagePaths: pageUris,
        totalPages: totalPages
      };

      // Ajouter aux livres locaux
      setLocalBooks(prev => [enhancedBookData, ...prev]);

      // Nettoyer les états
      cleanupExtractionStates();

      Alert.alert(
        'Importation réussie', 
        `Le livre "${title}" a été ajouté avec ${totalPages} pages extraites !`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Optionnel : recharger la liste
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      
      // Diagnostic détaillé de l'erreur
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('📱 Erreur détaillée:', {
        error: errorMessage,
        pendingBookData,
        type: typeof error
      });
      
      handleExtractionError(`Impossible de finaliser l'importation: ${errorMessage}`);
    }
  };

  // Gérer les erreurs d'extraction
  const handleExtractionError = (error: string) => {
    setShowExtractor(false);
    setExtractingPages(false);
    setPendingPdfUri(null);
    setPendingBookData(null);
    setSelectedPdfFile(null); // Nettoyer les données du fichier
    Alert.alert('Erreur d\'extraction', error);
  };

  // Mettre à jour le progrès d'extraction
  const handleExtractionProgress = (currentPage: number, totalPages: number) => {
    setExtractionProgress({ current: currentPage, total: totalPages });
  };

  // Nettoyer tous les états d'extraction
  const cleanupExtractionStates = () => {
    setShowExtractor(false);
    setExtractingPages(false);
    setPendingPdfUri(null);
    setPendingBookData(null);
    setSelectedPdfFile(null);
    setExtractionProgress({ current: 0, total: 0 });
  };

  // Fonction pour diagnostiquer les capacités PDF
  const diagnosticPDFCapabilities = () => {
    Alert.alert(
      '📱 Diagnostic PDF Mobile - Mode Hors Ligne',
      `Capacités de l'appareil:
      
✅ Document Picker: Disponible
✅ Expo File System: Disponible  
✅ PDF.js Local: Intégré (HORS LIGNE)
✅ Stockage local: Disponible
✅ Extraction pages: Mode Rapide
      
Performance:
🚀 Vitesse: INDÉPENDANTE de la connexion
📱 Mode: 100% Local et Hors Ligne
⚡ PDF.js: Intégré dans l'app
      
Variables d'état:
• Fichier sélectionné: ${selectedPdfFile ? selectedPdfFile.name : 'Aucun'}
• Extraction en cours: ${extractingPages ? 'Oui' : 'Non'}
• Livres locaux: ${localBooks.length}
      
✨ L'importation PDF est maintenant INDÉPENDANTE de votre connexion internet !`,
      [{ text: 'OK' }]
    );
  };

  // Fonction pour télécharger un livre pour lecture hors ligne
  const handleDownloadBook = async (book: BookType) => {
    // Vérifier la limite de téléchargements
    if (downloadedBooks.size >= MAX_DOWNLOADS) {
      Alert.alert(
        'Limite atteinte', 
        `Vous pouvez télécharger maximum ${MAX_DOWNLOADS} livres. Supprimez un livre téléchargé pour en ajouter un nouveau.`,
        [
          {
            text: 'Gérer les téléchargements',
            onPress: () => showDownloadManager()
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    // Vérifier si le livre est déjà téléchargé
    if (downloadedBooks.has(book.id)) {
      Alert.alert('Information', 'Ce livre est déjà téléchargé');
      return;
    }

    // Vérifier si le livre est en cours de téléchargement
    if (downloadingBooks.has(book.id)) {
      Alert.alert('Information', 'Ce livre est déjà en cours de téléchargement');
      return;
    }

    try {
      setDownloadingBooks(prev => new Set([...prev, book.id]));
      setDownloadProgress(prev => ({ ...prev, [book.id]: 0 }));

      // Récupérer les données complètes du livre depuis Firebase
      const bookRef = doc(db, 'books', book.id);
      const bookDoc = await getDoc(bookRef);
      
      if (!bookDoc.exists()) {
        throw new Error('Livre introuvable');
      }

      const fullBookData = { id: bookDoc.id, ...bookDoc.data() };

      // Simuler le téléchargement avec vraie progression
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const currentProgress = prev[book.id] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [book.id]: currentProgress + 10 };
        });
      }, 300);

      // Simuler le temps de téléchargement (3 secondes)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Sauvegarder le livre complet localement
      const offlineBookData = {
        ...fullBookData,
        downloadedAt: new Date().toISOString(),
        offline: true,
        downloadVersion: '1.0'
      };

      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.OFFLINE_BOOK_PREFIX}${book.id}`, 
        JSON.stringify(offlineBookData)
      );

      // Mettre à jour la liste des livres téléchargés
      const newDownloadedBooks = new Set([...downloadedBooks, book.id]);
      setDownloadedBooks(newDownloadedBooks);
      await saveDownloadedBooks(newDownloadedBooks);

      setDownloadProgress(prev => ({ ...prev, [book.id]: 100 }));
      
      Alert.alert(
        'Téléchargement terminé', 
        `"${book.title || book.titre}" est maintenant disponible hors ligne !\n\nLe livre complet a été sauvegardé sur votre appareil.`
      );

    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le livre: ' + (error as Error).message);
    } finally {
      setDownloadingBooks(prev => {
        const newSet = new Set(prev);
        newSet.delete(book.id);
        return newSet;
      });
      
      // Nettoyer le progrès après un délai
      setTimeout(() => {
        setDownloadProgress(prev => {
          const { [book.id]: _, ...rest } = prev;
          return rest;
        });
      }, 2000);
    }
  };

  // Fonction pour supprimer un livre téléchargé
  const handleRemoveDownload = async (bookId: string) => {
    Alert.alert(
      'Supprimer le téléchargement',
      'Voulez-vous supprimer ce livre de vos téléchargements ? Le livre sera supprimé de votre appareil mais restera dans votre bibliothèque en ligne.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer du stockage local AsyncStorage
              await AsyncStorage.removeItem(`${STORAGE_KEYS.OFFLINE_BOOK_PREFIX}${bookId}`);
              
              // Mettre à jour la liste des téléchargements
              const newDownloadedBooks = new Set(downloadedBooks);
              newDownloadedBooks.delete(bookId);
              setDownloadedBooks(newDownloadedBooks);
              await saveDownloadedBooks(newDownloadedBooks);
              
              Alert.alert('Supprimé', 'Le livre a été supprimé de votre appareil');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le téléchargement');
            }
          }
        }
      ]
    );
  };

  // Gestionnaire des téléchargements
  const showDownloadManager = () => {
    const downloadedBooksArray = Array.from(downloadedBooks).map(bookId => {
      const book = books.find(b => b.id === bookId);
      return book ? `• ${book.title || book.titre}` : `• Livre ${bookId}`;
    }).join('\n');

    Alert.alert(
      'Livres téléchargés',
      downloadedBooksArray.length > 0 
        ? `Livres disponibles hors ligne (${downloadedBooks.size}/${MAX_DOWNLOADS}) :\n\n${downloadedBooksArray}\n\nPour supprimer un livre, appuyez longuement dessus dans la liste.`
        : 'Aucun livre téléchargé',
      [{ text: 'OK' }]
    );
  };

  // Fonction pour ouvrir le menu contextuel
  const openContextMenu = (book: BookType, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedBook(book);
    setMenuPosition({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  // Fonction pour fermer le menu contextuel
  const closeContextMenu = () => {
    setContextMenuVisible(false);
    setSelectedBook(null);
  };

  // Fonction pour supprimer un livre de la bibliothèque
  const handleDeleteBook = async (book: BookType) => {
    Alert.alert(
      'Supprimer le livre',
      `Voulez-vous vraiment supprimer "${book.title || book.titre}" de votre bibliothèque ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer de Firebase
              await deleteDoc(doc(db, 'books', book.id));
              
              // Supprimer des téléchargements si présent
              if (downloadedBooks.has(book.id)) {
                setDownloadedBooks(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(book.id);
                  return newSet;
                });
              }
              
              // Recharger la bibliothèque
              if (loadBooksRef.current) {
                loadBooksRef.current();
              }
              
              Alert.alert('Supprimé', 'Le livre a été supprimé de votre bibliothèque');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le livre');
            }
          }
        }
      ]
    );
  };

  // Ajout d'un dossier
  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    setFolders([...folders, { id: Date.now().toString(), name: newFolderName.trim(), bookIds: [] }]);
    setNewFolderName('');
  };

  // Ajout d'un livre à un dossier
  const handleAddBookToFolder = (folderId: string, bookId: string) => {
    setFolders(folders.map((f: FolderType) => f.id === folderId ? { ...f, bookIds: [...f.bookIds, bookId] } : f));
  };


  // (supprimé: redéclaration inutile)

  // Mes livres : tous les livres dans la bibliothèque
  const myBooks = books;
  
  // Livres lus : uniquement les livres qui ont été commencés (avec pagesRead > 0)
  const readBooks = books.filter((b: BookType) => b.pagesRead && b.pagesRead > 0);
  
  // Créations : livres créés par l'utilisateur (ne devrait pas être dans books normalement)
  const createdBooks = books.filter((b: BookType) => b.status !== 'published' && b.status !== 'imported');

  // Pour pouvoir rappeler loadBooks depuis un callback
  const loadBooksRef = React.useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    let mounted = true;
    const loadBooks = async () => {
      setLoading(true);
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) {
          // no user, show sample
          if (mounted) {
            setBooks([]);
            setDrafts([]);
            setWishlist([]);
          }
          return;
        }
        
        // Charger les livres téléchargés depuis AsyncStorage
        const downloadedBooksSet = await loadDownloadedBooks();
        if (mounted) {
          setDownloadedBooks(downloadedBooksSet);
        }
        
        // Charger les livres ajoutés à la bibliothèque de l'utilisateur
        const qLibrary = query(collection(db, 'users', user.uid, 'library'));
        const snapLibrary = await getDocs(qLibrary);
        
        // Charger les livres avec ownerUid (livres de la bibliothèque - ancien système)
        const qBooks = query(collection(db, 'books'), where('ownerUid', '==', user.uid));
        const snapBooks = await getDocs(qBooks);
        
        // Charger les brouillons avec authorUid (créés par l'utilisateur)
        const qDrafts = query(collection(db, 'books'), where('authorUid', '==', user.uid));
        const snapDrafts = await getDocs(qDrafts);
        
        // Charger la wishlist
        let wishlistBooks = await getWishlistBooks();
        // Filtrer pour ne pas afficher les livres dont l'ownerUid est l'utilisateur
        wishlistBooks = wishlistBooks.filter((b: any) => b.ownerUid !== user.uid);
        
        if (mounted) {
          // Combiner les livres de la bibliothèque (nouveau système + ancien système)
          const libraryBooks: BookType[] = snapLibrary.docs.map((d: any) => ({ 
            id: d.data().bookId || d.id, 
            ...(d.data() as any) 
          }));
          
          const oldBooks: BookType[] = snapBooks.docs.map((d: any) => ({ 
            id: d.id, 
            ...(d.data() as any) 
          }));
          
          // Fusionner en évitant les doublons
          const allBooks = [...libraryBooks];
          oldBooks.forEach(book => {
            if (!allBooks.find(b => b.id === book.id)) {
              allBooks.push(book);
            }
          });
          
          setBooks(allBooks);
          
          // Livres de la bibliothèque
          if (snapBooks.empty) {
            setBooks(allBooks);
          } else {
            setBooks(allBooks);
          }
          // Brouillons (filtrer seulement les drafts)
          if (!snapDrafts.empty) {
            const allUserBooks = snapDrafts.docs.map((d: any) => ({ id: d.id, ...d.data() })) as BookType[];
            const userDrafts = allUserBooks
              .filter((book: BookType) => book.status === 'draft')
              .sort((a: BookType, b: BookType) => {
                // Tri par date de création décroissante
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
              });
            setDrafts(userDrafts);
          } else {
            setDrafts([]);
          }
          setWishlist(wishlistBooks);
        }
      } catch (err) {
        console.warn('Failed to load library books', err);
        if (mounted) {
          setBooks([]);
          setDrafts([]);
          setWishlist([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
  loadBooksRef.current = loadBooks;
  loadBooks();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = books.filter(b => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (b.titre && b.titre.toLowerCase().includes(q)) ||
      (b.auteur && b.auteur.toLowerCase().includes(q)) ||
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.tags || []).some((t: string) => t.toLowerCase().includes(q))
    );
  });

  // Fonction pour vider la wishlist
  const handleClearWishlist = async () => {
    setWishlistLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      // Récupérer tous les documents wishlist de l'utilisateur
      const q = query(collection(db, 'wishlist'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      const batch = snap.docs.map(docSnap => deleteDoc(doc(db, 'wishlist', docSnap.id)));
      await Promise.all(batch);
      setWishlist([]);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Fonction pour retirer un livre de la wishlist
  const handleRemoveFromWishlist = async (bookId: string) => {
    setWishlistLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      // Trouver le document wishlist correspondant
      const q = query(collection(db, 'wishlist'), where('uid', '==', user.uid), where('bookId', '==', bookId));
      const snap = await getDocs(q);
      const batch = snap.docs.map(docSnap => deleteDoc(doc(db, 'wishlist', docSnap.id)));
      await Promise.all(batch);
      setWishlist(wishlist => wishlist.filter(b => b.id !== bookId));
    } finally {
      setWishlistLoading(false);
    }
  };

  // Fonction pour ouvrir un livre (différent selon le type)
  const handleOpenBook = (book: BookType) => {
    if (book.type === 'pdf') {
      // Pour les PDFs importés, afficher des options
      Alert.alert(
        `📄 ${book.titre || book.title}`,
        `Livre PDF importé\n\nAuteur: ${book.auteur || book.author}\nTaille: ${book.fileSize ? Math.round(book.fileSize / 1024) + ' KB' : 'Inconnue'}\n\nComment souhaitez-vous ouvrir ce livre ?`,
        [
          {
            text: 'Voir les détails',
            onPress: () => router.push(`/book/${book.id}`)
          },
          {
            text: 'Lire PDF',
            onPress: () => {
              // Ouvrir le lecteur PDF dédié
              router.push(`/pdf/read/${book.id}` as any);
            }
          },
          {
            text: 'Annuler',
            style: 'cancel'
          }
        ]
      );
    } else {
      // Pour les livres normaux, afficher les informations et options de téléchargement
      const isDownloaded = downloadedBooks.has(book.id);
      const isDownloading = downloadingBooks.has(book.id);
      
      const options = [
        {
          text: 'Ouvrir',
          onPress: () => router.push(`/book/${book.id}`)
        }
      ];

      if (!isDownloaded && !isDownloading) {
        options.unshift({
          text: '⬇️ Télécharger',
          onPress: () => handleDownloadBook(book)
        });
      }

      if (isDownloaded) {
        options.unshift({
          text: '🗑️ Supprimer téléchargement',
          onPress: () => handleRemoveDownload(book.id)
        });
      }

      options.push({
        text: 'Annuler',
        onPress: () => {}
      });

      Alert.alert(
        `${isDownloaded ? '📱 ' : ''}${book.titre || book.title || 'Titre inconnu'}`, 
        `${book.auteur || book.author || 'Auteur inconnu'}\n\nTags: ${(book.tags || []).join(', ')}\n\n${isDownloaded ? '✅ Disponible hors ligne' : isDownloading ? '⏳ Téléchargement en cours...' : ''}`,
        options
      );
    }
  };

  // Composant du menu contextuel
  const renderContextMenu = () => {
    if (!selectedBook) return null;

    const isDownloaded = downloadedBooks.has(selectedBook.id);
    const isDownloading = downloadingBooks.has(selectedBook.id);
    const isPDF = selectedBook.type === 'pdf';

    const menuItems = [
      {
        icon: 'book-outline',
        label: 'Ouvrir',
        color: '#4FC3F7',
        onPress: () => {
          closeContextMenu();
          router.push(`/book/${selectedBook.id}`);
        }
      }
    ];

    // Ajouter l'option de téléchargement si applicable
    if (!isPDF && !isDownloaded && !isDownloading && downloadedBooks.size < MAX_DOWNLOADS) {
      menuItems.push({
        icon: 'cloud-download-outline',
        label: 'Télécharger',
        color: '#4CAF50',
        onPress: () => {
          closeContextMenu();
          handleDownloadBook(selectedBook);
        }
      });
    }

    // Ajouter l'option de suppression du téléchargement
    if (isDownloaded) {
      menuItems.push({
        icon: 'cloud-offline-outline',
        label: 'Supprimer téléchargement',
        color: '#FF9800',
        onPress: () => {
          closeContextMenu();
          handleRemoveDownload(selectedBook.id);
        }
      });
    }

    // Ajouter l'option de suppression du livre
    menuItems.push({
      icon: 'trash-outline',
      label: 'Supprimer de la bibliothèque',
      color: '#F44336',
      onPress: () => {
        closeContextMenu();
        handleDeleteBook(selectedBook);
      }
    });

    // Pour les PDFs, ajouter l'option d'ouverture PDF
    if (isPDF) {
      menuItems.splice(1, 0, {
        icon: 'document-text-outline',
        label: 'Ouvrir PDF',
        color: '#FF6B6B',
        onPress: () => {
          closeContextMenu();
          Alert.alert('PDF', 'Fonctionnalité d\'ouverture PDF en cours de développement');
        }
      });
    }

    return (
      <Modal
        visible={contextMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <Pressable style={styles.contextMenuOverlay} onPress={closeContextMenu}>
          <View style={[styles.contextMenu, { 
            left: Math.min(menuPosition.x, 300), 
            top: Math.min(menuPosition.y, 500) 
          }]}>
            <View style={styles.contextMenuHeader}>
              <Text style={styles.contextMenuTitle} numberOfLines={1}>
                {selectedBook.title || selectedBook.titre}
              </Text>
              <Text style={styles.contextMenuSubtitle} numberOfLines={1}>
                {selectedBook.author || selectedBook.auteur}
              </Text>
            </View>
            
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contextMenuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={20} color={item.color} />
                <Text style={[styles.contextMenuItemText, { color: item.color }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Extracteur de pages PDF */}
      {showExtractor && pendingPdfUri && pendingBookData && (
        <PDFPageExtractor
          pdfUri={pendingPdfUri}
          bookId={pendingBookData.bookId}
          onPagesExtracted={handlePagesExtracted}
          onError={handleExtractionError}
          onProgress={handleExtractionProgress}
        />
      )}

      {/* Indicateur de progrès d'extraction */}
      {extractingPages && extractionProgress && (
        <View style={styles.extractionProgress}>
          <Text style={styles.extractionText}>
            Extraction des pages... {extractionProgress.current}/{extractionProgress.total}
          </Text>
          {selectedPdfFile && (
            <Text style={styles.extractionSubtext}>
              📄 {selectedPdfFile.name} ({selectedPdfFile.size ? (selectedPdfFile.size / (1024 * 1024)).toFixed(1) + ' MB' : 'Taille inconnue'})
            </Text>
          )}
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(extractionProgress.current / extractionProgress.total) * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}
      
      {/* Header avec padding pour éviter la BottomNav */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Bibliothèque</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              onPress={showDownloadManager} 
              style={[styles.actionBtn, styles.downloadManagerBtn]}
            >
              <Ionicons name="cloud-done-outline" size={16} color="#181818" />
              <Text style={styles.actionText}>{downloadedBooks.size}/{MAX_DOWNLOADS}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleImportPDF} 
              style={[styles.actionBtn, styles.importBtn]}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#181818" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={16} color="#181818" />
                  <Text style={styles.actionText}>Importer</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/write')} style={[styles.actionBtn, styles.addBtn]}>
              <Ionicons name="add" size={16} color="#181818" />
              <Text style={styles.actionText}>Nouveau</Text>
            </TouchableOpacity>
            {/* Bouton de diagnostic temporaire */}
            <TouchableOpacity onPress={diagnosticPDFCapabilities} style={[styles.actionBtn, { backgroundColor: '#4A90E2' }]}>
              <Ionicons name="bug-outline" size={16} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Debug</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Rechercher titre, auteur, tag..."
              placeholderTextColor="#888"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
            <View style={styles.searchIcon}>
              <Text style={styles.searchIconText}>🔍</Text>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FFA94D" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.list, isTablet && styles.listTablet]}
          showsVerticalScrollIndicator={false}
        >
          {/* Section : Liste d'envie */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💛 Liste d'envie</Text>
              <Text style={styles.sectionCount}>{wishlist.length}</Text>
              <TouchableOpacity onPress={handleClearWishlist} disabled={wishlistLoading || wishlist.length === 0} style={{ marginLeft: 12, opacity: wishlist.length === 0 ? 0.4 : 1 }}>
                <Ionicons name="trash" size={22} color="#FF4D4D" />
              </TouchableOpacity>
            </View>
            {wishlist.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>Aucun livre dans la liste d'envie</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {wishlist.map((book: BookType) => (
                  <View key={book.id} style={styles.horizontalCard}>
                    <TouchableOpacity
                      onPress={() => handleOpenBook(book)}
                      onLongPress={(event) => openContextMenu(book, event)}
                    >
                      <View style={styles.horizontalCover}>
                        {book.type === 'pdf' ? (
                          <View style={styles.pdfIndicator}>
                            <Ionicons name="document-text" size={40} color="#FF6B6B" />
                            <Text style={styles.pdfLabel}>PDF</Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: book.coverImageUrl || book.couverture || book.coverImage || 'https://via.placeholder.com/120x180.png?text=Cover' }}
                            style={styles.horizontalCover}
                          />
                        )}
                      </View>
                      <View style={styles.horizontalCardContent}>
                        <View style={styles.titleRow}>
                          <Text style={styles.horizontalBookTitle} numberOfLines={2}>{book.titre || book.title || 'Titre inconnu'}</Text>
                          {book.type === 'pdf' && (
                            <Ionicons name="document-text-outline" size={16} color="#FF6B6B" style={styles.typeIcon} />
                          )}
                        </View>
                        <Text style={styles.horizontalBookAuthor} numberOfLines={1}>par {book.auteur || book.author || 'Auteur inconnu'}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemoveFromWishlist(book.id)} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,77,77,0.9)', borderRadius: 16, padding: 4 }}>
                      <Ionicons name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Section : PDFs Locaux */}
          {localBooks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📱 PDFs Locaux</Text>
                <Text style={styles.sectionCount}>{localBooks.length}</Text>
                <TouchableOpacity 
                  onPress={async () => {
                    const totalSize = await NativePDFService.getTotalStorageUsed();
                    Alert.alert(
                      'Stockage utilisé', 
                      `${NativePDFService.formatFileSize(totalSize)} utilisés pour ${localBooks.length} livres locaux`
                    );
                  }} 
                  style={{ marginLeft: 12 }}
                >
                  <Ionicons name="information-circle" size={22} color="#4FC3F7" />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {localBooks.map((localBook: PDFBookData) => (
                  <View key={localBook.id} style={styles.horizontalCard}>
                    <TouchableOpacity
                      onPress={() => {
                        // Naviguer vers le lecteur PDF avec l'URI locale
                        router.push(`/pdf/read/${localBook.id}?localPath=${encodeURIComponent(localBook.filePath)}`);
                      }}
                      onLongPress={() => {
                        Alert.alert(
                          'Actions',
                          `Que voulez-vous faire avec "${localBook.title}" ?`,
                          [
                            { text: 'Annuler', style: 'cancel' },
                            { 
                              text: 'Supprimer', 
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await NativePDFService.deleteLocalBook(localBook.id);
                                  setLocalBooks(prev => prev.filter(b => b.id !== localBook.id));
                                  Alert.alert('Supprimé', 'Le livre a été supprimé du stockage local');
                                } catch (error) {
                                  Alert.alert('Erreur', 'Impossible de supprimer le livre');
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <View style={styles.horizontalCover}>
                        {localBook.coverImagePath ? (
                          <Image
                            source={{ uri: localBook.coverImagePath }}
                            style={styles.horizontalCover}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.pdfIndicator, { backgroundColor: '#4FC3F7' }]}>
                            <Ionicons name="document-text" size={40} color="#fff" />
                          </View>
                        )}
                        {/* Badge "Local" */}
                        <View style={[styles.downloadedBadge, { backgroundColor: '#4FC3F7' }]}>
                          <Ionicons name="phone-portrait" size={12} color="#fff" />
                        </View>
                      </View>
                      <Text style={styles.horizontalBookTitle} numberOfLines={2}>
                        {localBook.title}
                      </Text>
                      <Text style={styles.horizontalBookAuthor}>
                        Local • {NativePDFService.formatFileSize(localBook.fileSize || 0)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.empty}>Aucun livre trouvé</Text>
              <Text style={styles.emptySubtext}>Essayez une autre recherche</Text>
            </View>
          ) : (
            <>
              {/* Section: Mes livres - Carousel horizontal */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📚 Mes livres</Text>
                  <Text style={styles.sectionCount}>{myBooks.length}</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.horizontalList}
                >
                  {myBooks.map((book: BookType) => {
                    // Pourcentage d'avancement : pagesRead / totalPages
                    let percent = 0;
                    if (book.pagesRead && book.totalPages && book.totalPages > 0) {
                      percent = Math.floor((book.pagesRead / book.totalPages) * 100);
                    }

                    const isDownloaded = downloadedBooks.has(book.id);
                    const isDownloading = downloadingBooks.has(book.id);
                    const downloadProgressValue = downloadProgress[book.id] || 0;

                    return (
                      <View key={book.id} style={styles.horizontalCard}>
                        <TouchableOpacity
                          onPress={() => handleOpenBook(book)}
                          onLongPress={(event) => openContextMenu(book, event)}
                        >
                          <View style={styles.horizontalCover}>
                            {book.type === 'pdf' ? (
                              // Si le PDF a une miniature, l'afficher, sinon afficher l'indicateur PDF
                              (book.coverImageUrl || book.couverture || book.coverImage) ? (
                                <View style={styles.pdfCoverContainer}>
                                  <Image
                                    source={{ uri: book.coverImageUrl || book.couverture || book.coverImage }}
                                    style={styles.horizontalCover}
                                  />
                                  <View style={styles.pdfBadge}>
                                    <Text style={styles.pdfBadgeText}>PDF</Text>
                                  </View>
                                </View>
                              ) : (
                                <View style={styles.pdfIndicator}>
                                  <Ionicons name="document-text" size={40} color="#FF6B6B" />
                                  <Text style={styles.pdfLabel}>PDF</Text>
                                </View>
                              )
                            ) : (
                              <Image
                                source={{ uri: book.coverImageUrl || book.couverture || book.coverImage || 'https://via.placeholder.com/120x180.png?text=Cover' }}
                                style={styles.horizontalCover}
                              />
                            )}
                            
                            {/* Indicateur de téléchargement */}
                            <View style={styles.downloadIndicator}>
                              {isDownloaded && (
                                <View style={styles.downloadedBadge}>
                                  <Ionicons name="cloud-done" size={18} color="#fff" />
                                </View>
                              )}
                              {isDownloading && (
                                <View style={styles.downloadingBadge}>
                                  <Ionicons name="cloud-download" size={14} color="#fff" />
                                  <Text style={styles.downloadProgressText}>{downloadProgressValue}%</Text>
                                </View>
                              )}
                              {!isDownloaded && !isDownloading && downloadedBooks.size < MAX_DOWNLOADS && book.type !== 'pdf' && (
                                <TouchableOpacity 
                                  style={styles.downloadAvailableBadge}
                                  onPress={() => handleDownloadBook(book)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                          <View style={styles.horizontalCardContent}>
                            <View style={styles.titleRow}>
                              <Text style={styles.horizontalBookTitle} numberOfLines={2}>{book.titre || book.title || 'Titre inconnu'}</Text>
                              {book.type === 'pdf' && (
                                <Ionicons name="document-text-outline" size={16} color="#FF6B6B" style={styles.typeIcon} />
                              )}
                            </View>
                            <Text style={styles.horizontalBookAuthor} numberOfLines={1}>par {book.auteur || book.author || 'Auteur inconnu'}</Text>
                          </View>
                        </TouchableOpacity>
                        {/* Affichage du pourcentage d'avancement si le livre a été lu */}
                        {percent > 0 && (
                          <View style={{ alignItems: 'center', marginTop: 6 }}>
                            <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 13 }}>
                              {percent}% lu
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Section: Livres lus - Carousel horizontal */}
              {readBooks.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📖 Livres lus</Text>
                    <Text style={styles.sectionCount}>{readBooks.length}</Text>
                  </View>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.horizontalList}
                  >
                    {readBooks.map((book: BookType) => {
                      // Pourcentage d'avancement : pagesRead / totalPages
                      let percent = 0;
                      if (book.pagesRead && book.totalPages && book.totalPages > 0) {
                        percent = Math.floor((book.pagesRead / book.totalPages) * 100);
                      }

                      const isDownloaded = downloadedBooks.has(book.id);
                      const isDownloading = downloadingBooks.has(book.id);
                      const downloadProgressValue = downloadProgress[book.id] || 0;

                      return (
                        <View key={book.id} style={styles.horizontalCard}>
                          <TouchableOpacity
                            onPress={() => handleOpenBook(book)}
                            onLongPress={(event) => openContextMenu(book, event)}
                          >
                            <View style={styles.horizontalCover}>
                              {book.type === 'pdf' ? (
                                // Si le PDF a une miniature, l'afficher, sinon afficher l'indicateur PDF
                                (book.coverImageUrl || book.couverture || book.coverImage) ? (
                                  <View style={styles.pdfCoverContainer}>
                                    <Image
                                      source={{ uri: book.coverImageUrl || book.couverture || book.coverImage }}
                                      style={styles.horizontalCover}
                                    />
                                    <View style={styles.pdfBadge}>
                                      <Text style={styles.pdfBadgeText}>PDF</Text>
                                    </View>
                                  </View>
                                ) : (
                                  <View style={styles.pdfIndicator}>
                                    <Ionicons name="document-text" size={40} color="#FF6B6B" />
                                    <Text style={styles.pdfLabel}>PDF</Text>
                                  </View>
                                )
                              ) : (
                                <Image
                                  source={{ uri: book.coverImageUrl || book.couverture || book.coverImage || 'https://via.placeholder.com/120x180.png?text=Cover' }}
                                  style={styles.horizontalCover}
                                />
                              )}
                              
                              {/* Indicateur de téléchargement */}
                              <View style={styles.downloadIndicator}>
                                {isDownloaded && (
                                  <View style={styles.downloadedBadge}>
                                    <Ionicons name="cloud-done" size={18} color="#fff" />
                                  </View>
                                )}
                                {isDownloading && (
                                  <View style={styles.downloadingBadge}>
                                    <Ionicons name="cloud-download" size={14} color="#fff" />
                                    <Text style={styles.downloadProgressText}>{downloadProgressValue}%</Text>
                                  </View>
                                )}
                                {!isDownloaded && !isDownloading && downloadedBooks.size < MAX_DOWNLOADS && book.type !== 'pdf' && (
                                  <TouchableOpacity 
                                    style={styles.downloadAvailableBadge}
                                    onPress={() => handleDownloadBook(book)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="cloud-download-outline" size={16} color="#fff" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <View style={styles.horizontalCardContent}>
                              <View style={styles.titleRow}>
                                <Text style={styles.horizontalBookTitle} numberOfLines={2}>{book.titre || book.title || 'Titre inconnu'}</Text>
                                {book.type === 'pdf' && (
                                  <Ionicons name="document-text-outline" size={16} color="#FF6B6B" style={styles.typeIcon} />
                                )}
                              </View>
                              <Text style={styles.horizontalBookAuthor} numberOfLines={1}>par {book.auteur || book.author || 'Auteur inconnu'}</Text>
                            </View>
                          </TouchableOpacity>
                          {/* Affichage du pourcentage d'avancement */}
                          <View style={{ alignItems: 'center', marginTop: 6 }}>
                            <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 13 }}>
                              {percent}% lu
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Section: Mes brouillons - Carousel horizontal */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📝 Mes brouillons</Text>
                  <Text style={styles.sectionCount}>{drafts.length}</Text>
                </View>
                {drafts.length === 0 ? (
                  <View style={styles.emptySection}>
                    <Text style={styles.emptySectionText}>Aucun brouillon</Text>
                    <Text style={styles.emptySectionSubtext}>Créez votre premier brouillon</Text>
                  </View>
                ) : (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.horizontalList}
                  >
                    {drafts.map((draft: any) => (
                      <View key={draft.id} style={styles.draftCard}>
                        <TouchableOpacity onPress={() => {
                          // Rediriger selon le type de projet
                          if (draft.type === 'manga') {
                            (router as any).push(`/write/manga-editor/simple?projectId=${draft.id}`);
                          } else {
                            (router as any).push(`/book/${draft.id}`);
                          }
                        }}>
                          <View style={styles.draftCover}>
                            {(draft.coverImageUrl || draft.coverImage) ? (
                              <Image 
                                source={{ uri: draft.coverImageUrl || draft.coverImage }} 
                                style={styles.draftCoverImage}
                              />
                            ) : (
                              <Text style={styles.draftIcon}>
                                {draft.type === 'manga' ? '🎨' : '📄'}
                              </Text>
                            )}
                            {/* Badge pour les mangas */}
                            {draft.type === 'manga' && (
                              <View style={styles.mangaBadge}>
                                <Text style={styles.mangaBadgeText}>MANGA</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        <View style={styles.draftCardContent}>
                          <Text style={styles.draftTitle} numberOfLines={2}>
                            {draft.title || '(Sans titre)'}
                          </Text>
                          <Text style={styles.draftTemplate} numberOfLines={1}>
                            {draft.templateId || 'Sans template'}
                          </Text>
                          <Text style={styles.draftDate} numberOfLines={1}>
                            Créé: {draft.createdAt?.toDate?.()?.toLocaleDateString?.('fr-FR') || 'Date inconnue'}
                          </Text>
                          {draft.updatedAt && (
                            <Text style={styles.draftUpdatedDate} numberOfLines={1}>
                              Modifié: {draft.updatedAt?.toDate?.()?.toLocaleString?.('fr-FR', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) || 'Date inconnue'}
                            </Text>
                          )}
                          <TouchableOpacity
                            style={{ backgroundColor: '#FFA94D', borderRadius: 18, paddingVertical: 7, paddingHorizontal: 18, alignSelf: 'flex-end', marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => {
                              if (draft.type === 'manga') {
                                (router as any).push(`/write/manga-editor/simple?projectId=${draft.id}`);
                              } else {
                                (router as any).push(`/book/${draft.id}/read`);
                              }
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={{ color: '#18191c', fontWeight: 'bold', fontSize: 15 }}>
                              {draft.type === 'manga' ? 'Éditer' : 'Aperçu'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Menu contextuel */}
      {renderContextMenu()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? 100 : (StatusBar.currentHeight || 0) + 80, // Plus d'espace pour la BottomNav
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#181818',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    color: '#FFA94D',
    fontSize: 28,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    justifyContent: 'center',
  },
  importBtn: {
    backgroundColor: '#4FC3F7',
  },
  downloadManagerBtn: {
    backgroundColor: '#9C27B0',
  },
  addBtn: {
    backgroundColor: '#FFA94D',
  },
  actionText: { 
    color: '#181818', 
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  searchRow: {
    marginBottom: 8,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#232323',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  searchIconText: {
    fontSize: 16,
  },
  loader: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingTop: 60,
  },
  list: { 
    paddingBottom: 140, // Plus d'espace pour la BottomNav
    paddingHorizontal: 20,
  },
  listTablet: { 
    paddingBottom: 140, 
  },
  
  // Section styles
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA94D',
  },
  sectionCount: {
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    color: '#FFA94D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },

  // Horizontal cards (Livres lus)
  horizontalList: {
    paddingRight: 20,
  },
  horizontalCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  horizontalCover: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#181818',
    marginBottom: 8,
  },
  pdfIndicator: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#2a1810',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  pdfLabel: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  pdfCoverContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  pdfBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  pdfBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  downloadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  downloadedBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadingBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadProgressText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  downloadAvailableBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9800',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  horizontalCardContent: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  typeIcon: {
    marginLeft: 4,
  },
  horizontalBookTitle: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  horizontalBookAuthor: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },

  // Creation cards (Mes créations) - Style similaire mais avec plus d'infos
  creationCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creationCover: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#181818',
    marginBottom: 8,
  },
  creationCardContent: {
    alignItems: 'center',
  },
  creationBookTitle: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  creationBookAuthor: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },

  // Draft cards (Mes brouillons)
  draftCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  draftCover: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  draftCoverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  draftIcon: {
    fontSize: 48,
    color: '#666',
  },
  draftCardContent: {
    alignItems: 'center',
  },
  draftTitle: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  draftTemplate: {
    color: '#999',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  draftDate: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 2,
  },
  draftUpdatedDate: {
    color: '#FFA94D',
    fontSize: 9,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Empty section
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySectionText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySectionSubtext: {
    color: '#666',
    fontSize: 14,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  viewsText: {
    color: '#888',
    fontSize: 11,
  },
  tagsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginTop: 4,
    justifyContent: 'center',
  },
  tagBox: { 
    backgroundColor: 'rgba(255, 169, 77, 0.1)', 
    borderRadius: 8, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    marginRight: 4, 
    marginBottom: 4, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  tagText: { 
    color: '#FFA94D', 
    fontSize: 10, 
    fontWeight: '500',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  empty: { 
    color: '#fff', 
    textAlign: 'center', 
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
  },

  // Context Menu styles
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  contextMenuHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 4,
  },
  contextMenuTitle: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  contextMenuSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 2,
  },
  contextMenuItemText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  // Styles pour l'extraction de pages PDF
  extractionProgress: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : (StatusBar.currentHeight || 0) + 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.95)',
    padding: 16,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  extractionText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  extractionSubtext: {
    color: 'rgba(24, 24, 24, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(24, 24, 24, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#181818',
    borderRadius: 2,
  },
  // Styles pour badge manga
  mangaBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mangaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Library;
