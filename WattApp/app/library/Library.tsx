
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
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Types
type BookType = {
  id: string;
  titre: string;
  auteur: string;
  couverture?: string;
  tags?: string[];
  views?: number;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  templateId?: string;
  coverImage?: string;
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
          }
          return;
        }
        // Charger les livres avec ownerUid (livres de la bibliothèque)
        const qBooks = query(collection(db, 'books'), where('ownerUid', '==', user.uid));
        const snapBooks = await getDocs(qBooks);
        // Charger les brouillons avec authorUid (créés par l'utilisateur)
        const qDrafts = query(collection(db, 'books'), where('authorUid', '==', user.uid));
        const snapDrafts = await getDocs(qDrafts);
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
        }
      } catch (err) {
        console.warn('Failed to load library books', err);
        if (mounted) {
          setBooks([]);
          setDrafts([]);
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
      b.titre.toLowerCase().includes(q) ||
      b.auteur.toLowerCase().includes(q) ||
  (b.tags || []).some((t: string) => t.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header avec padding pour éviter la BottomNav */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Bibliothèque</Text>
          <TouchableOpacity onPress={() => router.push('/write')} style={styles.addBtn}>
            <Text style={styles.addText}>+ Nouveau</Text>
          </TouchableOpacity>
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
                  {readBooks.map((book: BookType) => (
                    <View key={book.id} style={styles.horizontalCard}>
                      <TouchableOpacity
                        onPress={() => Alert.alert(book.titre, `${book.auteur}\n\nTags: ${(book.tags || []).join(', ')}`)}
                      >
                        <Image
                          source={{ uri: book.couverture || 'https://via.placeholder.com/120x180.png?text=Cover' }}
                          style={styles.horizontalCover}
                        />
                        <View style={styles.horizontalCardContent}>
                          <Text style={styles.horizontalBookTitle} numberOfLines={2}>{book.titre}</Text>
                          <Text style={styles.horizontalBookAuthor} numberOfLines={1}>par {book.auteur}</Text>
                        </View>
                      </TouchableOpacity>
                      {/* Bouton Ajouter à la bibliothèque */}
                      <TouchableOpacity
                        style={{
                          marginTop: 8,
                          backgroundColor: '#FFA94D',
                          borderRadius: 8,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          alignSelf: 'center',
                        }}
                        onPress={async () => {
                          try {
                            const auth = getAuth(app);
                            const user = auth.currentUser;
                            if (!user) {
                              Alert.alert('Erreur', 'Vous devez être connecté pour ajouter un livre.');
                              return;
                            }
                            // Ajouter le livre à la collection de l'utilisateur (copie minimale)
                            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                            const bookRef = doc(db, 'books', book.id);
                            await setDoc(bookRef, {
                              ...book,
                              ownerUid: user.uid,
                              status: 'published',
                              addedAt: serverTimestamp(),
                            }, { merge: true });
                            Alert.alert('Ajouté', `Le livre "${book.titre}" a été ajouté à votre bibliothèque !`);
                            // Recharger la liste
                            if (loadBooksRef.current) await loadBooksRef.current();
                          } catch (e) {
                            Alert.alert('Erreur', 'Impossible d\'ajouter le livre.');
                          }
                        }}
                      >
                        <Text style={{ color: '#18191c', fontWeight: 'bold', fontSize: 13 }}>Ajouter à la bibliothèque</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Section: Mes dossiers (playlists) */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📁 Mes dossiers</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TextInput
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    placeholder="Nouveau dossier..."
                    placeholderTextColor="#888"
                    style={{ backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 8, flex: 1, marginRight: 8 }}
                  />
                  <TouchableOpacity onPress={handleAddFolder} style={{ backgroundColor: '#FFA94D', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 }}>
                    <Text style={{ color: '#18191c', fontWeight: 'bold', fontSize: 15 }}>Créer</Text>
                  </TouchableOpacity>
                </View>
                {folders.length === 0 ? (
                  <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 8 }}>Aucun dossier créé</Text>
                ) : (
                  folders.map(folder => (
                    <View key={folder.id} style={{ marginBottom: 14, backgroundColor: '#23232a', borderRadius: 12, padding: 12 }}>
                      <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>{folder.name}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {(folder.bookIds.map(id => books.find((b: BookType) => b.id === id)).filter(Boolean) as BookType[]).map(book => (
                          <View key={book.id} style={{ marginRight: 12, alignItems: 'center' }}>
                            <Image source={{ uri: book.couverture || 'https://via.placeholder.com/120x180.png?text=Cover' }} style={{ width: 60, height: 90, borderRadius: 8, marginBottom: 4 }} />
                            <Text style={{ color: '#fff', fontSize: 12, maxWidth: 60 }} numberOfLines={2}>{book.titre}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  ))
                )}
              </View>

              {/* Section: Mes créations - Carousel horizontal */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>✍️ Mes créations</Text>
                  <Text style={styles.sectionCount}>{createdBooks.length}</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.horizontalList}
                >
                  {createdBooks.map(book => (
                    <View key={book.id} style={{ flexDirection: 'column', alignItems: 'center', marginRight: 16 }}>
                      <TouchableOpacity 
                        style={styles.creationCard} 
                        onPress={() => Alert.alert(book.titre, `${book.auteur} • ${book.views ?? 0} vues\n\nTags: ${(book.tags || []).join(', ')}`)}
                      >
                        <Image 
                          source={{ uri: book.couverture || 'https://via.placeholder.com/120x180.png?text=Cover' }} 
                          style={styles.creationCover} 
                        />
                        <View style={styles.creationCardContent}>
                          <Text style={styles.creationBookTitle} numberOfLines={2}>{book.titre}</Text>
                          <Text style={styles.creationBookAuthor} numberOfLines={1}>par {book.auteur}</Text>
                          <View style={styles.statsRow}>
                            <Text style={styles.viewsText}>👁 {book.views ?? 0} vues</Text>
                          </View>
                          <View style={styles.tagsRow}>
                            {(book.tags || []).slice(0, 2).map((tag: string) => (
                              <View key={tag} style={styles.tagBox}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </TouchableOpacity>
                      {/* Ajout à un dossier */}
                      {folders.length > 0 && (
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                          {folders.map(folder => (
                            <TouchableOpacity
                              key={folder.id}
                              style={{ backgroundColor: '#FFA94D', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, marginRight: 6 }}
                              onPress={() => handleAddBookToFolder(folder.id, book.id)}
                            >
                              <Text style={{ color: '#18191c', fontWeight: 'bold', fontSize: 12 }}>Ajouter à {folder.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
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
  addBtn: {
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    borderWidth: 1,
    borderColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addText: { 
    color: '#FFA94D', 
    fontWeight: '600',
    fontSize: 14,
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
  horizontalCardContent: {
    alignItems: 'center',
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
