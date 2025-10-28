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

type Book = {
  id: string;
  titre: string;
  auteur: string;
  couverture?: string;
  tags?: string[];
  views?: number;
};

const sampleBooks: Book[] = [
  {
    id: 's1',
    titre: 'Le Voyageur des Étoiles',
    auteur: 'A. Martin',
    couverture: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
    tags: ['aventure'],
  },
  {
    id: 's2',
    titre: 'La Forêt des Secrets',
    auteur: 'J. Dubois',
    couverture: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    tags: ['mystère'],
  },
  {
    id: 's3',
    titre: 'Pretty Boy',
    auteur: 'Sophie Calune',
    couverture: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80',
    tags: ['romance'],
  },
  {
    id: 's4',
    titre: 'Manga: Légende du Vent',
    auteur: 'K. Tanaka',
    couverture: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    tags: ['manga', 'action'],
  },
  {
    id: 's5',
    titre: 'La Protégée du Diable',
    auteur: 'M. Lapop',
    couverture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    tags: ['fantasy', 'romance'],
  },
  {
    id: 's6',
    titre: 'L’Histoire de Soumaya',
    auteur: 'Soumaya',
    couverture: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    tags: ['chronique'],
  },
];

const Library: React.FC = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.max(width, height) >= 768;

  const [books, setBooks] = useState<Book[]>([]);
  const [drafts, setDrafts] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // split sample data into "read" and "created" for the UI
  const readBooks = sampleBooks.slice(0, 3).map(b => ({ ...b }));
  const createdBooks = sampleBooks.slice(3).map((b, i) => ({ ...b, views: 120 - i * 7 }));

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
            setBooks(sampleBooks);
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
            setBooks(sampleBooks);
          } else {
            const booksList: Book[] = snapBooks.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            setBooks(booksList);
          }
          
          // Brouillons (filtrer seulement les drafts)
          if (!snapDrafts.empty) {
            const allUserBooks = snapDrafts.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            const userDrafts = allUserBooks
              .filter((book: any) => book.status === 'draft')
              .sort((a: any, b: any) => {
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
          setBooks(sampleBooks);
          setDrafts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
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
      (b.tags || []).some(t => t.toLowerCase().includes(q))
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
                  {readBooks.map(book => (
                    <TouchableOpacity 
                      key={book.id} 
                      style={styles.horizontalCard} 
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
                  ))}
                </ScrollView>
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
                    <TouchableOpacity 
                      key={book.id} 
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
                          {(book.tags || []).slice(0, 2).map(tag => (
                            <View key={tag} style={styles.tagBox}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>
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
