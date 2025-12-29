import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Keyboard, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { collection, getDocs, query, limit as queryLimit } from 'firebase/firestore';
import app, { db } from '../../constants/firebaseConfig';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';

const CATEGORIES = [
  'Roman d\'amour', 'Fanfiction', 'Fiction générale', 'Roman pour adolescents', 'Aléatoire',
  'Action', 'Aventure', 'Nouvelles', 'Fantasy', 'Non-Fiction', 'Fantastique', 'Mystère'
];
const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [libraryBookIds, setLibraryBookIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState(CATEGORIES[0]);
  const router = useRouter();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        // Charger les IDs des livres dans la bibliothèque
        if (user) {
          const librarySnap = await getDocs(collection(db, 'users', user.uid, 'library'));
          const libraryIds = new Set(librarySnap.docs.map(d => d.data().bookId || d.id));
          setLibraryBookIds(libraryIds);
        }
        
        const snap = await getDocs(query(collection(db, 'books'), queryLimit(40)));
        setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setBooks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredBooks = books.filter(b => {
    // Exclure les livres dans la bibliothèque
    if (libraryBookIds.has(b.id)) return false;
    
    const search = q.trim().toLowerCase();
    const tags = (b.tags || []).map((t: string) => t.toLowerCase());
    const matchCat = category === CATEGORIES[0] || tags.includes(category.toLowerCase());
    const matchSearch =
      !search ||
      (b.titre && b.titre.toLowerCase().includes(search)) ||
      (b.title && b.title.toLowerCase().includes(search)) ||
      (b.auteur && b.auteur.toLowerCase().includes(search)) ||
      (b.author && b.author.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });

  const renderBook = ({ item, index }: { item: any, index: number }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => router.push(`/book/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.bookRank}><Text style={styles.bookRankText}>{index + 1}</Text></View>
      <Image source={{ uri: item.coverImageUrl || item.couverture || item.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.titre || item.title || 'Livre')}&background=23232a&color=FFA94D&size=128` }} style={styles.bookCover} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={1}>{item.titre || item.title || 'Sans titre'}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.auteur || item.author || 'Auteur inconnu'}</Text>
        <View style={styles.bookStatsRow}>
          <Text style={styles.bookStat}><Feather name="eye" size={14} color="#aaa" /> {item.views || '—'}</Text>
          <Text style={styles.bookStat}><Feather name="list" size={14} color="#aaa" /> {item.chapters || item.nbChapitres || '—'}</Text>
        </View>
        <View style={styles.bookTagsRow}>
          {(item.tags || []).slice(0, 3).map((tag: string, i: number) => (
            <View key={i} style={styles.bookTag}><Text style={styles.bookTagText}>{tag}</Text></View>
          ))}
          {(item.tags || []).length > 3 && <View style={styles.bookTag}><Text style={styles.bookTagText}>+ autres</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );

const styles = StyleSheet.create({
  noResultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  noResult: {
    color: '#aaa',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#23232a',
    color: '#fff',
    borderRadius: 16,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterBtn: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 8,
    marginLeft: 2,
  },
  tabsRow: {
    backgroundColor: '#181818',
    paddingVertical: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#23232a',
    marginTop: 0,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#23232a',
  },
  tabBtnText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#FFA94D',
    fontWeight: 'bold',
  },
  bookCard: {
    backgroundColor: '#181818',
    borderRadius: 16,
    marginBottom: 18,
    flex: 1,
    marginHorizontal: 6,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 120,
    maxHeight: 120,
    maxWidth: (width / 2) - 18,
    overflow: 'hidden',
  },
  bookRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#23232a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 2,
  },
  bookRankText: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bookCover: {
    width: 54,
    height: 74,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 8,
  },
  bookInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    maxWidth: 110,
    overflow: 'hidden',
  },
  bookAuthor: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 2,
    maxWidth: 110,
    overflow: 'hidden',
  },
  bookStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  bookStat: {
    color: '#aaa',
    fontSize: 13,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  bookTag: {
    backgroundColor: '#23232a',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  bookTagText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 60,
    overflow: 'hidden',
  },
});

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barre de recherche + onglets (une seule fois) */}
      <View style={{marginBottom: 0}}>
        <View style={styles.topBar}>
          <Ionicons name="chevron-back" size={24} color="#fff" style={{ marginRight: 8, opacity: 0 }} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher des histoires/personnes"
            placeholderTextColor="#888"
            style={styles.searchBar}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Feather name="filter" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Onglets catégories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsRow, {marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0}]} contentContainerStyle={{ paddingHorizontal: 8, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.tabBtn, category === cat && styles.tabBtnActive]}
              onPress={() => setCategory(cat)}>
              <Text style={[styles.tabBtnText, category === cat && styles.tabBtnTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Résultats */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color="#FFA94D" style={{ marginTop: 32 }} size="large" />
        ) : filteredBooks.length === 0 ? (
          <View style={styles.noResultContainer}>
            <Text style={styles.noResult}>Aucun résultat trouvé.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredBooks}
            keyExtractor={item => item.id}
            renderItem={renderBook}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 8 }}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );

}
