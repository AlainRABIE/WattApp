import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Book {
  id: string;
  title: string;
  author?: string;
  authorUid?: string;
  coverImage?: string;
  cover?: string;
  chapters?: number;
  status?: string;
  tags?: string[];
  createdAt?: any;
}

interface BookSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectBook: (book: Book) => void;
  title?: string;
}

const BookSelector: React.FC<BookSelectorProps> = ({
  visible,
  onClose,
  onSelectBook,
  title = "Sélectionner un livre"
}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Charger les livres de l'utilisateur
  const loadUserBooks = async () => {
    setLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour voir vos livres');
        return;
      }

      // Charger les livres où l'utilisateur est l'auteur
      const booksQuery = query(
        collection(db, 'books'),
        where('authorUid', '==', user.uid)
      );

      const snapshot = await getDocs(booksQuery);
      const userBooks: Book[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        userBooks.push({
          id: doc.id,
          title: data.title || data.titre || 'Sans titre',
          author: data.author || data.auteur,
          authorUid: data.authorUid,
          coverImage: data.coverImage || data.cover || data.couverture,
          chapters: data.chapters || 0,
          status: data.status,
          tags: data.tags || [],
          createdAt: data.createdAt,
        });
      });

      // Trier les livres par date de création côté client
      userBooks.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        if (a.createdAt.toDate && b.createdAt.toDate) {
          return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
        }
        if (typeof a.createdAt === 'number' && typeof b.createdAt === 'number') {
          return b.createdAt - a.createdAt;
        }
        return 0;
      });

      setBooks(userBooks);
      setFilteredBooks(userBooks);
    } catch (error) {
      console.error('Erreur lors du chargement des livres:', error);
      Alert.alert('Erreur', 'Impossible de charger vos livres');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les livres selon la recherche
  const handleSearch = (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredBooks(books);
    } else {
      const filtered = books.filter(book =>
        book.title.toLowerCase().includes(text.toLowerCase()) ||
        (book.tags && book.tags.some(tag => 
          tag.toLowerCase().includes(text.toLowerCase())
        ))
      );
      setFilteredBooks(filtered);
    }
  };

  // Charger les livres quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      loadUserBooks();
      setSearchText('');
    }
  }, [visible]);

  const renderBookItem = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => {
        onSelectBook(item);
        onClose();
      }}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri: item.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=23232a&color=FFA94D&size=128`
        }}
        style={styles.bookCover}
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookDetails}>
          {item.chapters ? `${item.chapters} chapitres` : 'Nouveau livre'}
        </Text>
        {item.status && (
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'published' ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'published' ? 'Publié' : 'Brouillon'}
            </Text>
          </View>
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 2 && (
              <Text style={styles.moreTagsText}>+{item.tags.length - 2}</Text>
            )}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFA94D" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un livre..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={handleSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Liste des livres */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFA94D" />
              <Text style={styles.loadingText}>Chargement de vos livres...</Text>
            </View>
          ) : filteredBooks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color="#666" />
              <Text style={styles.emptyTitle}>
                {searchText ? 'Aucun livre trouvé' : 'Aucun livre disponible'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchText 
                  ? 'Essayez une autre recherche'
                  : 'Créez d\'abord un livre pour pouvoir y ajouter des chapitres'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredBooks}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              style={styles.booksList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18191c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  booksList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  bookCover: {
    width: 50,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 15,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookDetails: {
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#FFA94D20',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  tagText: {
    color: '#FFA94D',
    fontSize: 10,
    fontWeight: '600',
  },
  moreTagsText: {
    color: '#888',
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    color: '#888',
    marginTop: 15,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default BookSelector;