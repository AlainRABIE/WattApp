import React, { useState, useEffect } from 'react';
// Imports uniques déjà présents plus haut
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import FollowService from '../../services/FollowService';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
const AuthorProfileScreen: React.FC = () => {
  const { authorId } = useLocalSearchParams();
  const router = useRouter();
  const [author, setAuthor] = useState<any>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [authorBooks, setAuthorBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalReads, setTotalReads] = useState(0);

  useEffect(() => {
    async function loadAll() {
      if (!authorId || typeof authorId !== 'string') {
        Alert.alert('Erreur', 'ID auteur invalide');
        router.back();
        return;
      }
      try {
        // Profil
        const authorRef = doc(db, 'users', authorId as string);
        const authorDoc = await getDoc(authorRef);
        if (authorDoc.exists()) {
          const authorData = { id: authorDoc.id, ...authorDoc.data() };
          setAuthor(authorData);
          setIsPrivate(!!(authorData as any).isPrivate);
          // Propriétaire ?
          const auth = getAuth(app);
          const currentUser = auth.currentUser;
          setIsOwner(currentUser && currentUser.uid === authorId);
          // Stats
          const statsRef = doc(db, 'userStats', authorId as string);
          const statsDoc = await getDoc(statsRef);
          if (statsDoc.exists()) {
            const stats = statsDoc.data();
            setFollowingCount(stats.followingCount || 0);
          }
        } else {
          Alert.alert('Erreur', 'Auteur introuvable');
          router.back();
        }
        // Livres
        const booksQuery = query(
          collection(db, 'books'),
          where('authorUid', '==', authorId),
          where('status', '==', 'published')
        );
        const booksSnapshot = await getDocs(booksQuery);
        let books = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        books = books.sort((a: any, b: any) => {
          const aDate = a.publishedAt?.toDate?.() || a.publishedAt || new Date(0);
          const bDate = b.publishedAt?.toDate?.() || b.publishedAt || new Date(0);
          return bDate - aDate;
        });
        setAuthorBooks(books);
        setTotalBooks(books.length);
        const totalReadsCount = books.reduce((sum, book: any) => sum + (book.reads || 0), 0);
        setTotalReads(totalReadsCount);
        // Suivi
        const auth = getAuth(app);
        const currentUser = auth.currentUser;
        if (currentUser) {
          const isFollowingUser = await FollowService.isFollowing(currentUser.uid, authorId as string);
          setIsFollowing(isFollowingUser);
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger le profil.');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    // Ecoute le nombre d'abonnés
    const followersQuery = query(
      collection(db, 'follows'),
      where('followedUserId', '==', authorId)
    );
    const unsubscribe = onSnapshot(followersQuery, (snapshot) => {
      setFollowersCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [authorId]);

  const handleFollow = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Connexion requise', 'Vous devez être connecté pour suivre un auteur');
        return;
      }
      if (user.uid === authorId) {
        Alert.alert('Action impossible', 'Vous ne pouvez pas vous suivre vous-même');
        return;
      }
      if (isFollowing) {
        await FollowService.unfollowUser(user.uid, authorId as string);
        setIsFollowing(false);
        Alert.alert('✅', `Vous ne suivez plus ${author?.displayName || author?.email || 'cet auteur'}`);
      } else {
        const followerName = user.displayName || user.email || 'Utilisateur';
        const followedName = author?.displayName || author?.email || 'Auteur';
        await FollowService.followUser(user.uid, followerName, authorId as string, followedName);
        setIsFollowing(true);
        Alert.alert('🎉', `Vous suivez maintenant ${author?.displayName || author?.email || 'cet auteur'} !`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le suivi');
    }
  };

  const sendMessage = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Connexion requise', 'Vous devez être connecté pour envoyer un message');
        return;
      }
      if (user.uid === authorId) {
        Alert.alert('Action impossible', 'Vous ne pouvez pas vous envoyer un message');
        return;
      }
      const chatId = [user.uid, authorId].sort().join('_');
      router.push(`/chat/${chatId}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la conversation');
    }
  };

  const renderBookItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.bookItem}
      onPress={() => router.push(`/book/${item.id}`)}
      activeOpacity={0.8}
    >
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.bookCover} />
      ) : (
        <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
          <Ionicons name="book" size={24} color="#888" />
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookGenre} numberOfLines={1}>
          {Array.isArray(item.tags) && item.tags.length > 0 ? item.tags[0] : 'Livre'}
        </Text>
        <View style={styles.bookStats}>
          <View style={styles.bookStat}>
            <Ionicons name="eye-outline" size={14} color="#888" />
            <Text style={styles.bookStatText}>{item.reads || 0}</Text>
          </View>
          {item.price && item.price > 0 && (
            <View style={styles.bookStat}>
              <Ionicons name="pricetag-outline" size={14} color="#FFA94D" />
              <Text style={styles.bookStatText}>{item.price.toFixed(2)}€</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFA94D" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!author) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Auteur introuvable</Text>
      </View>
    );
  }

  // Si le compte est privé et ce n'est pas le propriétaire, masquer les infos
  if (isPrivate && !isOwner) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Auteur</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.profileSection, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>  
          <View style={styles.avatarContainer}>
            {author.photoURL ? (
              <Image source={{ uri: author.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(author.displayName || author.email || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.authorName}>{author.displayName || author.email || 'Auteur'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name="lock-closed" size={16} color="#FFA94D" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFA94D', fontWeight: 'bold' }}>Ce compte est privé</Text>
          </View>
          <Text style={{ color: '#aaa', marginTop: 16, textAlign: 'center', fontStyle: 'italic' }}>
            Vous devez suivre cette personne pour voir son profil et ses œuvres.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Auteur</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {author.photoURL ? (
              <Image source={{ uri: author.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(author.displayName || author.email || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.authorName}>{author.displayName || author.email || 'Auteur'}</Text>
          {author.bio && (
            <Text style={styles.authorBio}>{author.bio}</Text>
          )}
          <View style={[styles.statsContainer, { alignItems: 'center' }]}>  
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalBooks}</Text>
              <Text style={styles.statLabel}>Livres</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalReads}</Text>
              <Text style={styles.statLabel}>Lectures</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Ionicons name={isPrivate ? 'lock-closed' : 'earth'} size={16} color={isPrivate ? '#FFA94D' : '#4FC3F7'} style={{ marginRight: 4 }} />
              <Text style={{ color: isPrivate ? '#FFA94D' : '#4FC3F7', fontWeight: 'bold', fontSize: 12 }}>
                {isPrivate ? 'Compte privé' : 'Compte public'}
              </Text>
            </View>
          </View>
          {!isOwner && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={isFollowing ? "checkmark" : "person-add"} 
                  size={20} 
                  color={isFollowing ? "#181818" : "#FFA94D"} 
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Suivi' : 'Suivre'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={sendMessage}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#4FC3F7" style={{ marginRight: 8 }} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.booksSection}>
          <Text style={styles.sectionTitle}>Livres publiés ({totalBooks})</Text>
          {authorBooks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#888" />
              <Text style={styles.emptyStateText}>Aucun livre publié</Text>
            </View>
          ) : (
            <FlatList
              data={authorBooks}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.bookRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Auteur</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section profil */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {author.photoURL ? (
              <Image source={{ uri: author.photoURL }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(author.displayName || author.email || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Nom et bio */}
          <Text style={styles.authorName}>
            {author.displayName || author.email || 'Auteur'}
          </Text>
          
          {author.bio && (
            <Text style={styles.authorBio}>{author.bio}</Text>
          )}


          {/* Statistiques + badge privé/public */}
          <View style={[styles.statsContainer, { alignItems: 'center' }]}>  
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalBooks}</Text>
              <Text style={styles.statLabel}>Livres</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalReads}</Text>
              <Text style={styles.statLabel}>Lectures</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Ionicons name={isPrivate ? 'lock-closed' : 'earth'} size={16} color={isPrivate ? '#FFA94D' : '#4FC3F7'} style={{ marginRight: 4 }} />
              <Text style={{ color: isPrivate ? '#FFA94D' : '#4FC3F7', fontWeight: 'bold', fontSize: 12 }}>
                {isPrivate ? 'Compte privé' : 'Compte public'}
              </Text>
            </View>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isFollowing ? "checkmark" : "person-add"} 
                size={20} 
                color={isFollowing ? "#181818" : "#FFA94D"} 
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Suivi' : 'Suivre'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.messageButton}
              onPress={sendMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#4FC3F7" style={{ marginRight: 8 }} />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section livres */}
        <View style={styles.booksSection}>
          <Text style={styles.sectionTitle}>Livres publiés ({totalBooks})</Text>
          
          {authorBooks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#888" />
              <Text style={styles.emptyStateText}>Aucun livre publié</Text>
            </View>
          ) : (
            <FlatList
              data={authorBooks}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.bookRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFA94D',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#181818',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#23232a',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA94D',
  },
  avatarText: {
    color: '#181818',
    fontSize: 36,
    fontWeight: 'bold',
  },
  authorName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  authorBio: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    maxWidth: 300,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFA94D',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  followingButton: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  followButtonText: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 16,
  },
  followingButtonText: {
    color: '#181818',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  messageButtonText: {
    color: '#4FC3F7',
    fontWeight: 'bold',
    fontSize: 16,
  },
  booksSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bookRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bookItem: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 12,
    width: '48%',
  },
  bookCover: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookGenre: {
    color: '#FFA94D',
    fontSize: 12,
    marginBottom: 8,
  },
  bookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookStatText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
});

export default AuthorProfileScreen;