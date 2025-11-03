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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getWishlistBooks } from './wishlistUtils';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

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
};

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

  // Limite de téléchargements simultanés
  const MAX_DOWNLOADS = 2;

  // Fonction d'importation PDF
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

      // Vérifier que c'est bien un PDF
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Erreur', 'Veuillez sélectionner un fichier PDF');
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

      // Créer l'entrée du livre dans Firebase
      const bookData = {
        title: bookTitle,
        titre: bookTitle,
        author: 'Importé',
        auteur: 'Importé',
        ownerUid: user.uid,
        authorUid: user.uid,
        status: 'imported',
        type: 'pdf',
        filePath: file.uri,
        fileName: file.name,
        fileSize: file.size,
        coverImage: null,
        couverture: null,
        synopsis: 'Livre importé depuis PDF',
        tags: ['PDF', 'Importé'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reads: 0,
        body: 'Contenu PDF - Utilisez un lecteur PDF pour lire ce livre.',
      };

      // Ajouter à Firebase
      await addDoc(collection(db, 'books'), bookData);

      Alert.alert(
        'Importation réussie', 
        `Le livre "${bookTitle}" a été ajouté à votre bibliothèque !`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Recharger la bibliothèque
              if (loadBooksRef.current) {
                loadBooksRef.current();
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier PDF');
    } finally {
      setImporting(false);
    }
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

      // Simuler le téléchargement avec progression
      const downloadInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const currentProgress = prev[book.id] || 0;
          if (currentProgress >= 100) {
            clearInterval(downloadInterval);
            return prev;
          }
          return { ...prev, [book.id]: currentProgress + 10 };
        });
      }, 200);

      // Simuler le temps de téléchargement (2 secondes)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Sauvegarder le livre localement (AsyncStorage ou autre)
      const bookData = {
        ...book,
        downloadedAt: new Date().toISOString(),
        offline: true
      };

      // Ici vous pourriez sauvegarder dans AsyncStorage
      // await AsyncStorage.setItem(`offline_book_${book.id}`, JSON.stringify(bookData));

      setDownloadedBooks(prev => new Set([...prev, book.id]));
      setDownloadProgress(prev => ({ ...prev, [book.id]: 100 }));
      
      Alert.alert('Téléchargement terminé', `"${book.title || book.titre}" est maintenant disponible hors ligne !`);

    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le livre');
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
      }, 1000);
    }
  };

  // Fonction pour supprimer un livre téléchargé
  const handleRemoveDownload = async (bookId: string) => {
    Alert.alert(
      'Supprimer le téléchargement',
      'Voulez-vous supprimer ce livre de vos téléchargements ? Vous pourrez le télécharger à nouveau plus tard.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer du stockage local
              // await AsyncStorage.removeItem(`offline_book_${bookId}`);
              
              setDownloadedBooks(prev => {
                const newSet = new Set(prev);
                newSet.delete(bookId);
                return newSet;
              });
              
              Alert.alert('Supprimé', 'Le livre a été supprimé de vos téléchargements');
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

  // Les livres lus et créés sont alimentés par la base de données uniquement
  const readBooks = books.filter((b: BookType) => b.status === 'published');
  const createdBooks = books.filter((b: BookType) => b.status !== 'published');

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
        // Charger les livres avec ownerUid (livres de la bibliothèque)
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
          // Livres de la bibliothèque
          if (snapBooks.empty) {
            setBooks([]);
          } else {
            const booksList: BookType[] = snapBooks.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
            setBooks(booksList);
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
            text: 'Ouvrir PDF',
            onPress: () => {
              // Utiliser expo-web-browser ou une app externe pour ouvrir le PDF
              Alert.alert('PDF', 'Fonctionnalité d\'ouverture PDF en cours de développement');
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
        `${book.auteur || book.author || 'Auteur inconnu'}\n\nTags: ${(book.tags || []).join(', ')}\n\n${isDownloaded ? '✅ Disponible hors ligne' : isDownloading ? '⏳ Téléchargement en cours...' : '🌐 Nécessite une connexion'}`,
        options
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
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
                    >
                      <View style={styles.horizontalCover}>
                        {book.type === 'pdf' ? (
                          <View style={styles.pdfIndicator}>
                            <Ionicons name="document-text" size={40} color="#FF6B6B" />
                            <Text style={styles.pdfLabel}>PDF</Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: book.couverture || book.coverImage || 'https://via.placeholder.com/120x180.png?text=Cover' }}
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

          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.empty}>Aucun livre trouvé</Text>
              <Text style={styles.emptySubtext}>Essayez une autre recherche</Text>
            </View>
          ) : (
            <>
              {/* Section: Livres lus - Carousel horizontal */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>� Livres lus</Text>
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
                          onLongPress={() => {
                            if (isDownloaded) {
                              handleRemoveDownload(book.id);
                            } else if (!isDownloading) {
                              handleDownloadBook(book);
                            }
                          }}
                        >
                          <View style={styles.horizontalCover}>
                            {book.type === 'pdf' ? (
                              <View style={styles.pdfIndicator}>
                                <Ionicons name="document-text" size={40} color="#FF6B6B" />
                                <Text style={styles.pdfLabel}>PDF</Text>
                              </View>
                            ) : (
                              <Image
                                source={{ uri: book.couverture || book.coverImage || 'https://via.placeholder.com/120x180.png?text=Cover' }}
                                style={styles.horizontalCover}
                              />
                            )}
                            
                            {/* Indicateur de téléchargement */}
                            <View style={styles.downloadIndicator}>
                              {isDownloaded && (
                                <View style={styles.downloadedBadge}>
                                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                </View>
                              )}
                              {isDownloading && (
                                <View style={styles.downloadingBadge}>
                                  <Text style={styles.downloadProgressText}>{downloadProgressValue}%</Text>
                                </View>
                              )}
                              {!isDownloaded && !isDownloading && downloadedBooks.size < MAX_DOWNLOADS && (
                                <View style={styles.downloadAvailableBadge}>
                                  <Ionicons name="cloud-download-outline" size={16} color="#4FC3F7" />
                                </View>
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
                        <TouchableOpacity onPress={() => (router as any).push(`/book/${draft.id}`)}>
                          <View style={styles.draftCover}>
                            {draft.coverImage ? (
                              <Image 
                                source={{ uri: draft.coverImage }} 
                                style={styles.draftCoverImage}
                              />
                            ) : (
                              <Text style={styles.draftIcon}>📄</Text>
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
                            onPress={() => (router as any).push(`/book/${draft.id}/read`)}
                            activeOpacity={0.85}
                          >
                            <Text style={{ color: '#18191c', fontWeight: 'bold', fontSize: 15 }}>Aperçu</Text>
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
  downloadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  downloadedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadingBadge: {
    backgroundColor: 'rgba(79, 195, 247, 0.9)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadProgressText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  downloadAvailableBadge: {
    backgroundColor: 'rgba(79, 195, 247, 0.7)',
    borderRadius: 10,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default Library;
