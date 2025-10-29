import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Keyboard, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, limit as queryLimit } from 'firebase/firestore';
import app, { db } from '../../constants/firebaseConfig';
import { useRouter } from 'expo-router';


export default function ExploreScreen() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [suggestedBooks, setSuggestedBooks] = useState<any[]>([]);
  const router = useRouter();
  const debounceRef = useRef<number | null>(null);

  // Suggestions de livres (populaires ou aléatoires)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'books'), queryLimit(8)));
        setSuggestedBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setSuggestedBooks([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!q || q.trim() === '') {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(q.trim());
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  async function doSearch(term: string) {
    setLoading(true);
    try {
      const lower = term.toLowerCase();
      // USERS
      const qUsers = query(collection(db, 'users'), queryLimit(100));
      const snapUsers = await getDocs(qUsers);
      const users = snapUsers.docs
        .map(d => ({ id: d.id, ...d.data(), _type: 'user' }))
        .filter((u: any) => {
          const pseudo = (u.pseudo || u.displayName || '').toString().toLowerCase();
          const mail = (u.mail || u.email || '').toString().toLowerCase();
          return pseudo.includes(lower) || mail.includes(lower);
        });
      // BOOKS
      const qBooks = query(collection(db, 'books'), queryLimit(100));
      const snapBooks = await getDocs(qBooks);
      const books = snapBooks.docs
        .map(d => ({ id: d.id, ...d.data(), _type: 'book' }))
        .filter((b: any) => {
          const titre = (b.titre || b.title || '').toString().toLowerCase();
          const auteur = (b.auteur || b.author || '').toString().toLowerCase();
          return titre.includes(lower) || auteur.includes(lower);
        });
      setResults([...users, ...books]);
    } catch (err) {
      console.warn('Search failed', err);
      Alert.alert('Erreur', 'Recherche impossible pour le moment.');
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    if (item._type === 'user') {
      return (
        <View style={styles.card}>
          <Image source={{ uri: item.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.pseudo || item.displayName || 'User')}&length=${((item.pseudo || item.displayName || 'User') as string).trim().includes(' ') ? 2 : 1}&background=FFA94D&color=181818&size=128` }} style={styles.avatarLarge} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.nameLarge}>{item.pseudo || item.displayName || 'Utilisateur'}</Text>
            <Text style={styles.emailLarge}>{item.mail || item.email || ''}</Text>
            <TouchableOpacity style={styles.profileBtn} onPress={() => Alert.alert(item.pseudo || item.displayName || 'Utilisateur', item.mail || item.email || '')}>
              <Text style={styles.profileBtnText}>Voir profil</Text>
            </TouchableOpacity>
          </View>
          <Ionicons name="person" size={22} color="#FFA94D" style={{ marginLeft: 8 }} />
        </View>
      );
    } else if (item._type === 'book') {
      return (
        <View style={styles.card}>
          <Image source={{ uri: item.couverture || item.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.titre || item.title || 'Livre')}&background=23232a&color=FFA94D&size=128` }} style={styles.avatarLarge} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.nameLarge}>{item.titre || item.title || 'Livre sans titre'}</Text>
            <Text style={styles.emailLarge}>par {item.auteur || item.author || 'Auteur inconnu'}</Text>
            <TouchableOpacity style={styles.profileBtn} onPress={() => Alert.alert(item.titre || item.title || 'Livre', `Auteur : ${item.auteur || item.author || 'Inconnu'}`)}>
              <Text style={styles.profileBtnText}>Voir le livre</Text>
            </TouchableOpacity>
          </View>
          <Ionicons name="book" size={22} color="#FFA94D" style={{ marginLeft: 8 }} />
        </View>
      );
    }
    return null;
  };

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 20,
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#333',
  },
  nameLarge: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 2,
  },
  emailLarge: {
    color: '#aaa',
    fontSize: 15,
    marginBottom: 8,
  },
  profileBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginTop: 2,
  },
  profileBtnText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  safeArea: { flex: 1, backgroundColor: '#181818' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    color: '#FFA94D',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 22,
    marginHorizontal: 18,
    marginBottom: 18,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 6,
    height: 54,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 19,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  suggestSection: {
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 18,
  },
  suggestTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  suggestCard: {
    width: 120,
    marginRight: 14,
    backgroundColor: '#23232a',
    borderRadius: 16,
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestCover: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#333',
  },
  suggestBookTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  suggestBookAuthor: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 24,
  },
  welcomeTitle: {
    color: '#FFA94D',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
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

});

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header modern */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="account-search" size={28} color="#FFA94D" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Explorer</Text>
        </View>
        {/* Barre de recherche flottante */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={22} color="#888" style={{ marginLeft: 10 }} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher un utilisateur, un livre, un auteur..."
            placeholderTextColor="#aaa"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={20} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
        {/* Suggestions de livres */}
        {(!q || q.trim() === '') && suggestedBooks.length > 0 && !loading && (
          <View style={styles.suggestSection}>
            <Text style={styles.suggestTitle}>Suggestions de livres</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {suggestedBooks.map((book) => (
                <TouchableOpacity key={book.id} style={styles.suggestCard} onPress={() => Alert.alert(book.titre || book.title || 'Livre', `Auteur : ${book.auteur || book.author || 'Inconnu'}`)}>
                  <Image source={{ uri: book.couverture || book.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(book.titre || book.title || 'Livre')}&background=23232a&color=FFA94D&size=128` }} style={styles.suggestCover} />
                  <Text style={styles.suggestBookTitle} numberOfLines={1}>{book.titre || book.title || 'Sans titre'}</Text>
                  <Text style={styles.suggestBookAuthor} numberOfLines={1}>par {book.auteur || book.author || 'Auteur inconnu'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {/* Message d'accueil ou résultats */}
        {(!q || q.trim() === '') && !loading ? (
          <View style={styles.welcomeContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={80} color="#FFA94D" style={{ marginBottom: 16 }} />
            <Text style={styles.welcomeTitle}>Découvre la communauté et les livres</Text>
            <Text style={styles.welcomeText}>Recherche par pseudo, email, titre ou auteur pour explorer les membres et les ouvrages de WattApp.</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color="#FFA94D" style={{ marginTop: 32 }} size="large" />
        ) : q.length > 0 && results.length === 0 ? (
          <View style={styles.noResultContainer}>
            <MaterialCommunityIcons name="account-off-outline" size={60} color="#aaa" style={{ marginBottom: 12 }} />
            <Text style={styles.noResult}>Aucun résultat trouvé.</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(i) => i.id + i._type}
            renderItem={renderItem}
            style={{ width: '100%', marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </ScrollView>
    </SafeAreaView>

  );

}
