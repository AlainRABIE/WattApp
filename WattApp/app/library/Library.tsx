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
          if (mounted) setBooks(sampleBooks);
          return;
        }
        const q = query(collection(db, 'books'), where('ownerUid', '==', user.uid));
        const snap = await getDocs(q);
        if (snap.empty) {
          if (mounted) setBooks(sampleBooks);
        } else {
          const list: Book[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          if (mounted) setBooks(list);
        }
      } catch (err) {
        console.warn('Failed to load library books', err);
        if (mounted) setBooks(sampleBooks);
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Bibliothèque</Text>
        <TouchableOpacity onPress={() => router.push('/write')} style={styles.addBtn}>
          <Text style={styles.addText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Rechercher titre, auteur, tag..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FFA94D" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, isTablet && styles.listTablet]}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>Aucun livre trouvé.</Text>
          ) : (
            <>
              {/* Section: Livres lus */}
              <Text style={styles.sectionTitle}>Livres lus</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {readBooks.map(book => (
                  <TouchableOpacity key={book.id} style={[styles.card, { width: 160, marginRight: 12 }]} onPress={() => Alert.alert(book.titre, `${book.auteur}\n\nTags: ${(book.tags || []).join(', ')}`)}>
                    <Image source={{ uri: book.couverture || 'https://via.placeholder.com/120x180.png?text=Cover' }} style={[{ width: 70, height: 100, borderRadius: 8, marginRight: 8 }]} />
                    <View style={styles.cardBody}>
                      <Text style={styles.bookTitle}>{book.titre}</Text>
                      <Text style={styles.bookAuthor}>par {book.auteur}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Section: Mes créations */}
              <Text style={styles.sectionTitle}>Mes créations</Text>
                {createdBooks.map(book => (
                <TouchableOpacity key={book.id} style={[styles.card, isTablet && styles.cardTablet]} onPress={() => Alert.alert(book.titre, `${book.auteur} • ${book.views ?? 0} vues\n\nTags: ${(book.tags || []).join(', ')}`)}>
                  <Image source={{ uri: book.couverture || 'https://via.placeholder.com/120x180.png?text=Cover' }} style={[styles.cover, isTablet && styles.coverTablet]} />
                  <View style={styles.cardBody}>
                    <Text style={styles.bookTitle}>{book.titre}</Text>
                    <Text style={styles.bookAuthor}>par {book.auteur} • {book.views ?? 0} vues</Text>
                    <View style={styles.tagsRow}>
                      {(book.tags || []).slice(0, 3).map(tag => (
                        <View key={tag} style={styles.tagBox}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0) + 8,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addBtn: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addText: { color: '#181818', fontWeight: '700' },
  searchRow: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#232323',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 120 },
  listTablet: { paddingBottom: 120, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  card: { flexDirection: 'row', backgroundColor: '#232323', borderRadius: 10, padding: 10, marginBottom: 12, alignItems: 'center' },
  cardTablet: { width: '48%', marginRight: 12 },
  cover: { width: 80, height: 120, borderRadius: 8, marginRight: 12, backgroundColor: '#181818' },
  coverTablet: { width: 120, height: 180 },
  cardBody: { flex: 1 },
  bookTitle: { color: '#FFA94D', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  bookAuthor: { color: '#fff', marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  tagBox: { backgroundColor: '#181818', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: '#FFA94D' },
  tagText: { color: '#FFA94D', fontSize: 12, fontWeight: '700' },
  empty: { color: '#fff', textAlign: 'center', marginTop: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA94D',
    marginTop: 8,
    marginBottom: 8,
  },
});

export default Library;
