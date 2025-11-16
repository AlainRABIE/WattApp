import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, StatusBar, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import FollowService from '../../services/FollowService';

const AuthorProfileScreen = () => {
  const router = useRouter();
  const { authorId } = useLocalSearchParams();
  const [author, setAuthor] = useState<any>(null);
  const [authorBooks, setAuthorBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        setIsOwner(user && user.uid === authorId);
        // Auteur
        const authorRef = doc(db, 'users', authorId as string);
        const authorSnap = await getDoc(authorRef);
        if (authorSnap.exists()) {
          setAuthor(authorSnap.data());
          setIsPrivate(authorSnap.data().isPrivate || false);
        }
        // Livres
        const booksQuery = query(collection(db, 'books'), where('authorId', '==', authorId));
        const booksSnap = await getDocs(booksQuery);
        const booksArr: any[] = [];
        booksSnap.forEach((doc) => booksArr.push({ ...doc.data(), id: doc.id }));
        setAuthorBooks(booksArr);
        // Followers
        const followersSnap = await getDocs(collection(db, 'users', authorId as string, 'followers'));
        setFollowersCount(followersSnap.size);
        // Suivi
        if (user && user.uid !== authorId) {
          const follow = await FollowService.isFollowing(user.uid, authorId as string);
          setIsFollowing(follow);
        }
      } catch (e) {
        // erreur silencieuse
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const totalBooks = authorBooks.length;
  const totalReads = authorBooks.reduce((sum, b) => sum + (b.reads || 0), 0);

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
        {/* DASHBOARD STATS AUTEUR (visible seulement pour l'auteur) */}
        {isOwner && (
          <View style={styles.dashboardContainer}>
            <Text style={styles.dashboardTitle}>Mon Dashboard</Text>
            <View style={styles.dashboardStatsRow}>
              <View style={styles.dashboardStatBox}>
                <Ionicons name="book" size={22} color="#FFA94D" style={{ marginBottom: 4 }} />
                <Text style={styles.dashboardStatNumber}>{totalBooks}</Text>
                <Text style={styles.dashboardStatLabel}>Livres</Text>
              </View>
              <View style={styles.dashboardStatBox}>
                <Ionicons name="eye" size={22} color="#4FC3F7" style={{ marginBottom: 4 }} />
                <Text style={styles.dashboardStatNumber}>{totalReads}</Text>
                <Text style={styles.dashboardStatLabel}>Vues</Text>
              </View>
              <View style={styles.dashboardStatBox}>
                <Ionicons name="heart" size={22} color="#FF5A5F" style={{ marginBottom: 4 }} />
                <Text style={styles.dashboardStatNumber}>{authorBooks.reduce((sum, b) => sum + (b.likes || 0), 0)}</Text>
                <Text style={styles.dashboardStatLabel}>Likes</Text>
              </View>
            </View>
          </View>
        )}
        {/* Section profil */}
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
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.bookItem} onPress={() => router.push(`/book/${item.id}`)} activeOpacity={0.8}>
                  {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={styles.bookCover} />
                  ) : (
                    <View style={[styles.bookCover, styles.bookCoverPlaceholder]}>
                      <Ionicons name="book" size={24} color="#888" />
                    </View>
                  )}
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.bookGenre} numberOfLines={1}>{Array.isArray(item.tags) && item.tags.length > 0 ? item.tags[0] : 'Livre'}</Text>
                    <View style={styles.bookStats}>
                      <View style={styles.bookStat}>
                        <Ionicons name="eye-outline" size={14} color="#888" />
                        <Text style={styles.bookStatText}>{item.reads || 0}</Text>
                      </View>
                      <View style={styles.bookStat}>
                        <Ionicons name="heart-outline" size={14} color="#FF5A5F" />
                        <Text style={styles.bookStatText}>{item.likes || 0}</Text>
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
              )}
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
  container: { flex: 1, backgroundColor: '#181818' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 12, backgroundColor: '#181818' },
  headerTitle: { color: '#FFA94D', fontSize: 20, fontWeight: 'bold' },
  backButton: { padding: 4 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818' },
  loadingText: { color: '#fff', fontSize: 18 },
  profileSection: { alignItems: 'center', padding: 20 },
  avatarContainer: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#232323' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFA94D', fontSize: 32, fontWeight: 'bold' },
  authorName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  authorBio: { color: '#aaa', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  statsContainer: { flexDirection: 'row', marginTop: 8 },
  statItem: { alignItems: 'center', marginHorizontal: 12 },
  statNumber: { color: '#FFA94D', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#aaa', fontSize: 12 },
  actionButtons: { flexDirection: 'row', marginTop: 16 },
  followButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFA94D', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18, marginRight: 10 },
  followingButton: { backgroundColor: '#fff' },
  followButtonText: { color: '#181818', fontWeight: 'bold', fontSize: 15 },
  followingButtonText: { color: '#FFA94D' },
  messageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#232323', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18 },
  messageButtonText: { color: '#4FC3F7', fontWeight: 'bold', fontSize: 15 },
  dashboardContainer: { backgroundColor: '#232323', borderRadius: 12, padding: 18, margin: 18, marginBottom: 0 },
  dashboardTitle: { color: '#FFA94D', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  dashboardStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dashboardStatBox: { alignItems: 'center', flex: 1 },
  dashboardStatNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  dashboardStatLabel: { color: '#aaa', fontSize: 13 },
  booksSection: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { color: '#FFA94D', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyState: { alignItems: 'center', marginTop: 32 },
  emptyStateText: { color: '#aaa', marginTop: 8 },
  bookRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  bookItem: { backgroundColor: '#232323', borderRadius: 10, padding: 10, margin: 6, flex: 1, minWidth: 150, maxWidth: '48%' },
  bookCover: { width: '100%', height: 120, borderRadius: 8, marginBottom: 8, backgroundColor: '#333' },
  bookCoverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  bookInfo: {},
  bookTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  bookGenre: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  bookStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bookStat: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  bookStatText: { color: '#aaa', marginLeft: 4 },
});

export default AuthorProfileScreen;