import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Linking, Modal, Share, Platform, useWindowDimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAuth, updateProfile } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeSelector } from './components/ThemeSelector';
import { useTheme } from '../contexts/ThemeContext';
import { OpenSourceBooksService } from '../services/OpenSourceBooksService';

const Profile: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Support Dynamic Island
  const { width: screenWidth } = useWindowDimensions();
  const isPhone = screenWidth < 768;
  const openSourceBooksService = OpenSourceBooksService.getInstance();
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [worksCount, setWorksCount] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [bannerURL, setBannerURL] = useState<string | null>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [recentReads, setRecentReads] = useState<any[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { theme } = useTheme();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, bookTitle: '' });
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'playlists' | 'bookmarks'>('grid');
  const scrollViewRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => await loadProfile();
    load();
  }, []);

  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      loadProfile();
    }
  }, [isFocused]);

  async function loadProfile() {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return router.push('/register');
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPhotoURL(user.photoURL || null);

      // Compter les oeuvres
      const qWorks = query(collection(db, 'books'), where('authorUid', '==', user.uid));
      const snapWorks = await getDocs(qWorks);
      const worksArr = snapWorks.docs.map(d => ({ id: d.id, ...d.data() }));
      const uniqueWorks = worksArr.filter((w, idx, arr) => arr.findIndex(x => x.id === w.id) === idx);
      setWorks(uniqueWorks);
      setWorksCount(uniqueWorks.length);

      // Followers/friends
      const qFollowers = query(collection(db, 'followers'), where('toUid', '==', user.uid));
      const snapFollowers = await getDocs(qFollowers);
      setFollowersCount(snapFollowers.size);

      const qFriends = query(collection(db, 'friends'), where('uids', 'array-contains', user.uid));
      const snapFriends = await getDocs(qFriends);
      setFriendsCount(snapFriends.size);

      // User doc pour bio, photo, bannière, privé
      const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        const d = snapUser.docs[0].data();
        if (d.bio) setBio(d.bio);
        if (d.photoURL) setPhotoURL(d.photoURL);
        if (d.bannerURL) setBannerURL(d.bannerURL);
        if (typeof d.isPrivate !== 'undefined') setIsPrivate(!!d.isPrivate);
      }

      // Lectures récentes
      try {
        const qReads = query(collection(db, 'reads'), where('uid', '==', user.uid));
        const snapReads = await getDocs(qReads);
        setRecentReads(snapReads.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {}

      // Playlists
      try {
        const qPlaylists = query(collection(db, 'playlists'), where('uid', '==', user.uid));
        const snapPlaylists = await getDocs(qPlaylists);
        setPlaylists(snapPlaylists.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {}

      // Livres de la bibliothèque
      try {
        const qLibrary = query(collection(db, 'users', user.uid, 'library'));
        const snapLibrary = await getDocs(qLibrary);
        
        // Charger les livres avec ownerUid (livres de la bibliothèque - ancien système)
        const qBooks = query(collection(db, 'books'), where('ownerUid', '==', user.uid));
        const snapBooks = await getDocs(qBooks);
        
        // Combiner les livres de la bibliothèque (nouveau système + ancien système)
        const libraryBooksNew: any[] = snapLibrary.docs.map((d: any) => ({ 
          id: d.data().bookId || d.id, 
          ...(d.data() as any) 
        }));
        
        const oldBooks: any[] = snapBooks.docs.map((d: any) => ({ 
          id: d.id, 
          ...(d.data() as any) 
        }));
        
        // Fusionner en évitant les doublons
        const allLibraryBooks = [...libraryBooksNew];
        oldBooks.forEach(book => {
          if (!allLibraryBooks.find(b => b.id === book.id)) {
            allLibraryBooks.push(book);
          }
        });
        
        setLibraryBooks(allLibraryBooks);
      } catch (e) {
        console.warn('Library load error', e);
      }
    } catch (err) {
      console.warn('Profile load error', err);
    }
  }

  const renderWork = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.workCard} key={String(item.id)} onPress={() => router.push(`../book/${item.id}`)}>
      {(item.coverImageUrl || item.coverImage) ? (
        <Image source={{ uri: item.coverImageUrl || item.coverImage }} style={styles.workCover} />
      ) : (
        <View style={[styles.workCover, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#888', fontSize: 12 }}>Pas d'image</Text>
        </View>
      )}
      <Text style={styles.workTitle} numberOfLines={2}>{item.title ? item.title : 'Sans titre'}</Text>
    </TouchableOpacity>
  );

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'spotify': return '#1DB954';
      case 'apple': return '#FA243C';
      case 'youtube': return '#FF0000';
      case 'deezer': return '#A238FF';
      default: return '#FFA94D';
    }
  };

  const renderPlatformIcon = (platform: string, iconName: string) => {
    if (platform === 'apple' || platform === 'spotify' || platform === 'youtube' || platform === 'deezer') {
      return (
        <Image
          source={{ uri: iconName }}
          style={styles.playlistIconImage}
          resizeMode="contain"
        />
      );
    } else {
      return (
        <Ionicons
          name={iconName as any}
          size={32}
          color="#FFA94D"
          style={styles.playlistIconImage}
        />
      );
    }
  };

  const openPlaylist = async (playlist: any) => {
    try {
      const supported = await Linking.canOpenURL(playlist.url);
      if (supported) {
        await Linking.openURL(playlist.url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir cette playlist.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir cette playlist.');
    }
  };

  const deletePlaylist = (playlistId: string) => {
    Alert.alert(
      'Supprimer la playlist',
      'Êtes-vous sûr de vouloir supprimer cette playlist ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'playlists', playlistId), { deleted: true });
              setPlaylists(playlists.filter(p => p.id !== playlistId));
              Alert.alert('Succès', 'Playlist supprimée !');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la playlist.');
            }
          }
        }
      ]
    );
  };

  const togglePlaylistVisibility = async (playlistId: string, currentPrivateState: boolean) => {
    try {
      await updateDoc(doc(db, 'playlists', playlistId), {
        isPrivate: !currentPrivateState
      });
      setPlaylists(playlists.map(p =>
        p.id === playlistId
          ? { ...p, isPrivate: !currentPrivateState }
          : p
      ));
      const statusText = !currentPrivateState ? 'privée' : 'publique';
      Alert.alert('Succès', `Playlist maintenant ${statusText} !`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier la visibilité.');
    }
  };

  const handleShareProfile = async (type: string) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;

      const profileUrl = `https://wattapp.com/profile/${user.uid}`;
      const message = `Découvrez mon profil ${displayName || 'sur WattApp'} ! ${profileUrl}`;

      if (type === 'copy') {
        // Utiliser Share pour afficher l'URL que l'utilisateur peut copier
        await Share.share({
          message: profileUrl,
          title: 'Lien du profil',
        });
        setShowShareModal(false);
      } else if (type === 'general') {
        const result = await Share.share({
          message: message,
          url: profileUrl,
          title: `Profil de ${displayName || 'WattApp'}`,
        });
        
        if (result.action === Share.sharedAction) {
          setShowShareModal(false);
        }
      } else if (type === 'instagram') {
        // Instagram Stories partage
        const instagramUrl = `instagram://story-camera`;
        const canOpen = await Linking.canOpenURL(instagramUrl);
        if (canOpen) {
          await Linking.openURL(instagramUrl);
          setShowShareModal(false);
        } else {
          Alert.alert('Instagram non disponible', 'Instagram n\'est pas installé sur cet appareil');
        }
      } else if (type === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          setShowShareModal(false);
        } else {
          Alert.alert('WhatsApp non disponible', 'WhatsApp n\'est pas installé sur cet appareil');
        }
      } else if (type === 'twitter') {
        const twitterUrl = `twitter://post?message=${encodeURIComponent(message)}`;
        const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(twitterUrl);
        if (canOpen) {
          await Linking.openURL(twitterUrl);
        } else {
          await Linking.openURL(twitterWebUrl);
        }
        setShowShareModal(false);
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le profil');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* Header avec engrenage en haut à droite */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingTop: Math.max(insets.top, 10) + 10, // Support Dynamic Island
        paddingBottom: 12, 
        backgroundColor: 'transparent',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="settings-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner avec bouton de modification */}
        <View style={styles.bannerContainer}>
          <Image source={{ uri: bannerURL || 'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=60' }} style={styles.banner} />
          <TouchableOpacity style={styles.bannerEditBtn} onPress={async () => {
            try {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!(permission.granted || permission.status === 'granted')) {
                Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour changer la bannière.');
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.9,
                allowsEditing: true,
                aspect: [16, 5],
              });
              if (res.canceled) return;
              const asset = res.assets && res.assets[0];
              const uri = asset?.uri;
              if (!uri) {
                Alert.alert('Erreur', 'Impossible de récupérer l\'image.');
                return;
              }
              setUploading(true);
              const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
              );
              const finalUri = manipResult.uri;
              const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
              const dataUrl = `data:image/jpeg;base64,${base64}`;
              const approxBytes = Math.floor((dataUrl.length - 22) * 3 / 4);
              const MAX_BYTES = 1800000;
              if (approxBytes > MAX_BYTES) {
                Alert.alert('Image trop lourde', 'Choisis une image plus petite ou réduis la qualité.');
                setUploading(false);
                return;
              }
              const auth = getAuth(app);
              const user = auth.currentUser;
              if (!user) throw new Error('Utilisateur non authentifié');
              const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
              const snapUser = await getDocs(qUser);
              if (!snapUser.empty) {
                const userDocRef = doc(db, 'users', snapUser.docs[0].id);
                await updateDoc(userDocRef, { bannerURL: dataUrl });
              }
              setBannerURL(dataUrl);
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de sélectionner la bannière.');
            } finally {
              setUploading(false);
            }
          }}>
            <Ionicons name="camera" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Avatar overlapping banner - Style Instagram */}
        <View style={styles.metaRow}>
          <TouchableOpacity onPress={async () => {
            try {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!(permission.granted || permission.status === 'granted')) {
                Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour changer la photo de profil.');
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: true, aspect: [1, 1] });
              if (res.canceled) return;
              const asset = res.assets && res.assets[0];
              const uri = asset?.uri;
              if (!uri) {
                Alert.alert('Erreur', 'Impossible de récupérer l\'image.');
                return;
              }
              setUploading(true);
              const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
              );
              const finalUri = manipResult.uri;
              const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
              const dataUrl = `data:image/jpeg;base64,${base64}`;
              const approxBytes = Math.floor((dataUrl.length - 22) * 3 / 4);
              const MAX_BYTES = 900000;
              if (approxBytes > MAX_BYTES) {
                Alert.alert('Image trop lourde', 'Choisis une image plus petite ou réduis la qualité.');
                setUploading(false);
                return;
              }
              const auth = getAuth(app);
              const user = auth.currentUser;
              if (!user) throw new Error('Utilisateur non authentifié');
              const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
              const snapUser = await getDocs(qUser);
              if (!snapUser.empty) {
                const userDocRef = doc(db, 'users', snapUser.docs[0].id);
                await updateDoc(userDocRef, { photoURL: dataUrl });
              }
              setPhotoURL(dataUrl);
              Alert.alert('Succès', 'Photo convertie et enregistrée (base64) dans votre profil.');
            } catch (e: any) {
              Alert.alert('Erreur', `Impossible de sauvegarder la photo: ${e?.message ?? String(e)}`);
            } finally {
              setUploading(false);
            }
          }}>
            {(() => {
              const name = (displayName || email || 'User') as string;
              const len = name.trim().includes(' ') ? 2 : 1;
              return (
                <Image source={{ uri: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&length=${String(len)}&background=FFA94D&color=181818&size=128` }} style={styles.avatarLarge} />
              );
            })()}
          </TouchableOpacity>
          <View style={styles.metaText}>
            <Text style={styles.nameLarge}>{displayName || 'Utilisateur'}</Text>
            <Text style={styles.email}>{email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, justifyContent: 'center' }}>
              {isPrivate ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="lock-closed" size={14} color="#888" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#888', fontSize: 12 }}>Privé</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="earth" size={14} color="#888" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#888', fontSize: 12 }}>Public</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* bio */}
        {bio ? (
          <View style={styles.bioBubble}>
            <Text style={styles.bioBubbleText}>{bio}</Text>
          </View>
        ) : null}

        {/* Stats + actions */}
        <View style={styles.rowBetween}>
          <View style={styles.statsRowSmall}>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statNumber}>{String(worksCount ?? '-')}</Text>
              <Text style={styles.statLabel}>Œuvres</Text>
            </View>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statNumber}>{String(followersCount ?? '-')}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statNumber}>{String(friendsCount ?? '-')}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionColumnSingle}>
          <TouchableOpacity style={styles.primaryButtonSingle} onPress={() => router.push('/EditProfile')}>
            <Text style={styles.primaryText}>Éditer le profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButtonSmall} onPress={async () => {
            try {
              const auth = getAuth(app);
              const user = auth.currentUser;
              if (!user) return;

              const profileUrl = `https://wattapp.com/profile/${user.uid}`;
              const message = `Découvrez mon profil ${displayName || 'sur WattApp'} !\n${profileUrl}`;

              await Share.share({
                message: message,
                url: profileUrl,
                title: `Profil de ${displayName || 'WattApp'}`,
              });
            } catch (error) {
              console.error('Erreur partage:', error);
            }
          }}>
            <Text style={styles.secondaryText}>Partager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.themeButtonSmall} onPress={() => router.push('/settings')}>
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Sections avec onglets */}
        <View style={styles.section}>
          <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 0 }}>
              <TouchableOpacity 
                style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}
                onPress={() => {
                  setActiveTab('grid');
                  scrollViewRef.current?.scrollTo({ x: 0, animated: true });
                }}
              >
                <Ionicons name="grid-outline" size={24} color={activeTab === 'grid' ? '#FFFFFF' : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}
                onPress={() => {
                  setActiveTab('playlists');
                  scrollViewRef.current?.scrollTo({ x: screenWidth, animated: true });
                }}
              >
                <Ionicons name="musical-notes-outline" size={24} color={activeTab === 'playlists' ? '#FFFFFF' : '#555'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}
                onPress={() => {
                  setActiveTab('bookmarks');
                  scrollViewRef.current?.scrollTo({ x: screenWidth * 2, animated: true });
                }}
              >
                <Ionicons name="bookmark-outline" size={24} color={activeTab === 'bookmarks' ? '#FFFFFF' : '#555'} />
              </TouchableOpacity>
            </View>
            {/* Barre animée */}
            <Animated.View
              style={{
                height: 1,
                backgroundColor: '#FFFFFF',
                width: `${100 / 3}%`,
                transform: [{
                  translateX: scrollX.interpolate({
                    inputRange: [0, screenWidth, screenWidth * 2],
                    outputRange: [0, screenWidth / 3, (screenWidth / 3) * 2],
                    extrapolate: 'clamp'
                  })
                }]
              }}
            />
          </View>

          {/* ScrollView horizontal avec swipe */}
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const page = Math.round(offsetX / screenWidth);
              if (page === 0) setActiveTab('grid');
              else if (page === 1) setActiveTab('playlists');
              else if (page === 2) setActiveTab('bookmarks');
            }}
            scrollEventThrottle={16}
          >
            {/* Page 1: Grid */}
            <View style={{ width: screenWidth }}>
              {(works && works.length) === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={80} color="#222" />
                  <Text style={styles.emptyStateText}>Aucune œuvre</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>Créez votre première œuvre</Text>
                </View>
              ) : (
                <View style={styles.gridContainer}>
                  {works.map((item, index) => (
                    <TouchableOpacity 
                      key={String(item.id)} 
                      style={styles.gridItem}
                      onPress={() => router.push(`../book/${item.id}`)}
                    >
                      {(item.coverImageUrl || item.coverImage) ? (
                        <Image source={{ uri: item.coverImageUrl || item.coverImage }} style={styles.gridImage} />
                      ) : (
                        <View style={[styles.gridImage, styles.gridPlaceholder]}>
                          <Ionicons name="book" size={32} color="#333" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Page 2: Playlists */}
            <View style={{ width: screenWidth }}>
              {playlists.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="musical-notes-outline" size={80} color="#222" />
                  <Text style={styles.emptyStateText}>Aucune playlist</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>Ajoutez vos playlists favorites</Text>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                  {playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#1A1A1A',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#2A2A2A',
                      }}
                      onPress={() => openPlaylist(playlist)}
                      onLongPress={() => deletePlaylist(playlist.id)}
                    >
                      <View style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        backgroundColor: getPlatformColor(playlist.platform),
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        {renderPlatformIcon(playlist.platform, playlist.icon)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>
                          {playlist.name}
                        </Text>
                        <Text style={{ color: '#888', fontSize: 13 }}>
                          {playlist.platform.toUpperCase()} • {playlist.isPrivate ? 'Privée' : 'Publique'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: 'rgba(255, 169, 77, 0.2)',
                          borderRadius: 18,
                          width: 36,
                          height: 36,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#FFA94D',
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          togglePlaylistVisibility(playlist.id, playlist.isPrivate);
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>
                          {playlist.isPrivate ? '🔒' : '🌐'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Page 3: Bookmarks */}
            <View style={{ width: screenWidth }}>
              {(libraryBooks && libraryBooks.length) === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={80} color="#222" />
                  <Text style={styles.emptyStateText}>Aucun livre enregistré</Text>
                  <Text style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>Enregistrez vos livres préférés dans votre bibliothèque</Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingRight: 40 }}
                >
                  {libraryBooks.map((item, index) => (
                    <View key={String(item.id)} style={{
                      width: isPhone ? 120 : 140,
                      marginRight: isPhone ? 12 : 16,
                      backgroundColor: '#232323',
                      borderRadius: isPhone ? 10 : 12,
                      padding: isPhone ? 10 : 12,
                      borderWidth: 1,
                      borderColor: '#333',
                    }}>
                      <TouchableOpacity onPress={() => router.push(`../book/${item.id}`)}>
                        {(item.coverImageUrl || item.coverImage) ? (
                          <Image 
                            source={{ uri: item.coverImageUrl || item.coverImage }} 
                            style={{ width: '100%', height: isPhone ? 140 : 160, borderRadius: 8, backgroundColor: '#181818', marginBottom: 8 }}
                          />
                        ) : (
                          <View style={{ width: '100%', height: isPhone ? 140 : 160, borderRadius: 8, backgroundColor: '#181818', marginBottom: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="book" size={isPhone ? 40 : 48} color="#333" />
                          </View>
                        )}
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: '#FFA94D', fontSize: isPhone ? 13 : 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 }} numberOfLines={2}>
                            {item.title || item.titre || 'Sans titre'}
                          </Text>
                          <Text style={{ color: '#ccc', fontSize: isPhone ? 11 : 12, textAlign: 'center' }} numberOfLines={1}>
                            par {item.author || item.auteur || 'Auteur inconnu'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </Animated.ScrollView>
        </View>

        {/* Bouton de déconnexion */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFA94D',
            padding: 16,
            borderRadius: 16,
            alignItems: 'center',
            marginHorizontal: 24,
            marginTop: 32,
            marginBottom: 32,
            shadowColor: '#FFA94D',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
          onPress={async () => {
            try {
              const auth = getAuth(app);
              await auth.signOut();
              router.replace('../index');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            }
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#0F0F0F" style={{ marginRight: 10 }} />
          <Text style={{ color: '#0F0F0F', fontWeight: '800', fontSize: 16 }}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
        <ThemeSelector
          visible={showThemeSelector}
          onClose={() => setShowThemeSelector(false)}
        />

        {/* Modal de Partage du Profil */}
        <Modal
          visible={showShareModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            justifyContent: 'flex-end',
          }}>
            <View style={{
              backgroundColor: '#1A1A1A',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
            }}>
              {/* Handle bar */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: '#444',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 20,
              }} />

              <Text style={{
                color: '#FFFFFF',
                fontSize: 20,
                fontWeight: '700',
                marginBottom: 20,
                textAlign: 'center',
              }}>Partager le profil</Text>

              {/* Options de partage */}
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#2A2A2A',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => handleShareProfile('copy')}
                >
                  <Ionicons name="link-outline" size={24} color="#FFA94D" />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, marginLeft: 16, fontWeight: '600' }}>
                    Copier le lien du profil
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#2A2A2A',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => handleShareProfile('instagram')}
                >
                  <Ionicons name="logo-instagram" size={24} color="#E1306C" />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, marginLeft: 16, fontWeight: '600' }}>
                    Partager sur Instagram
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#2A2A2A',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => handleShareProfile('twitter')}
                >
                  <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, marginLeft: 16, fontWeight: '600' }}>
                    Partager sur Twitter
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#2A2A2A',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => handleShareProfile('whatsapp')}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, marginLeft: 16, fontWeight: '600' }}>
                    Partager sur WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#2A2A2A',
                    padding: 16,
                    borderRadius: 12,
                  }}
                  onPress={() => handleShareProfile('general')}
                >
                  <Ionicons name="share-social-outline" size={24} color="#FFA94D" />
                  <Text style={{ color: '#FFFFFF', fontSize: 16, marginLeft: 16, fontWeight: '600' }}>
                    Plus d'options
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: '#444',
                  padding: 14,
                  borderRadius: 12,
                  marginTop: 16,
                }}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center',
                }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Import Livres Open Source */}
        {showImportModal && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            zIndex: 1000,
          }}>
            <View style={{
              backgroundColor: '#232323',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
              maxHeight: '80%',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: '#FFA94D', fontSize: 20, fontWeight: 'bold' }}>
                  📚 Livres gratuits
                </Text>
                <TouchableOpacity onPress={() => setShowImportModal(false)} disabled={importing}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#999', fontSize: 14, marginBottom: 20 }}>
                Importez des classiques du domaine public pour tester l'application
              </Text>

              {importing ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#FFA94D" />
                  <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>
                    Import en cours... {importProgress.current}/{importProgress.total}
                  </Text>
                  {importProgress.bookTitle && (
                    <Text style={{ color: '#999', marginTop: 8, fontSize: 14, textAlign: 'center' }}>
                      {importProgress.bookTitle}
                    </Text>
                  )}
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 400 }}>
                  {openSourceBooksService.getAvailableBooks().map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      style={{
                        backgroundColor: '#2a2a2a',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: '#333',
                      }}
                      onPress={async () => {
                        Alert.alert(
                          book.title,
                          `Importer "${book.title}" de ${book.author} ?\n\nCe livre sera ajouté à votre bibliothèque avec sa couverture.`,
                          [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Importer',
                              onPress: async () => {
                                try {
                                  setImporting(true);
                                  setImportProgress({ current: 1, total: 1, bookTitle: book.title });

                                  const bookId = await openSourceBooksService.importBook(
                                    book,
                                    (message, progress) => {
                                      console.log(`${message} - ${progress}%`);
                                    }
                                  );

                                  setImporting(false);
                                  setShowImportModal(false);
                                  Alert.alert(
                                    '✅ Succès !',
                                    `"${book.title}" a été importé avec succès !`,
                                    [
                                      {
                                        text: 'Voir le livre',
                                        onPress: () => router.push(`/book/${bookId}`),
                                      },
                                      { text: 'OK' },
                                    ]
                                  );
                                  loadProfile(); // Recharger le profil
                                } catch (error) {
                                  setImporting(false);
                                  Alert.alert('Erreur', `Impossible d'importer: ${error}`);
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 32, marginRight: 12 }}>📖</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#FFA94D', fontSize: 16, fontWeight: 'bold' }}>
                            {book.title}
                          </Text>
                          <Text style={{ color: '#999', fontSize: 14, marginTop: 4 }}>
                            {book.author}
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                            {book.genres.slice(0, 2).map((genre, idx) => (
                              <View key={idx} style={{
                                backgroundColor: '#333',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 8,
                                marginRight: 6,
                                marginBottom: 4,
                              }}>
                                <Text style={{ color: '#FFA94D', fontSize: 11 }}>{genre}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {!importing && (
                <View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#4CAF50',
                      padding: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginTop: 20,
                    }}
                    onPress={async () => {
                      Alert.alert(
                        'Importer tous les livres',
                        `Importer ${openSourceBooksService.getAvailableBooks().length} livres ?\n\nCela peut prendre plusieurs minutes.`,
                        [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Importer tout',
                            onPress: async () => {
                              try {
                                setImporting(true);
                                const books = openSourceBooksService.getAvailableBooks();
                                setImportProgress({ current: 0, total: books.length, bookTitle: '' });

                                const bookIds = books.map(b => b.id);
                                const { success, failed } = await openSourceBooksService.importMultipleBooks(
                                  bookIds,
                                  (current, total, bookTitle) => {
                                    setImportProgress({ current, total, bookTitle });
                                  }
                                );

                                setImporting(false);
                                setShowImportModal(false);
                                Alert.alert(
                                  '✅ Import terminé !',
                                  `${success.length} livres importés avec succès${failed.length > 0 ? `\n${failed.length} erreurs` : ''}`,
                                );
                              loadProfile();
                            } catch (error) {
                              setImporting(false);
                              Alert.alert('Erreur', `Erreur d'import: ${error}`);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    📥 Tout importer ({openSourceBooksService.getAvailableBooks().length} livres)
                  </Text>
                </TouchableOpacity>

                {/* Nouveau bouton pour les livres étendus */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#2196F3',
                    padding: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                  onPress={async () => {
                    Alert.alert(
                      'Importer plus de livres',
                      `Importer ${openSourceBooksService.getExtendedBooks().length} livres supplémentaires ?\n\n📚 Jules Verne, Victor Hugo, Dickens, H.G. Wells et bien d'autres!\n\nCela peut prendre 10-15 minutes.`,
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Importer',
                          onPress: async () => {
                            try {
                              setImporting(true);
                              const books = openSourceBooksService.getExtendedBooks();
                              setImportProgress({ current: 0, total: books.length, bookTitle: '' });

                              const bookIds = books.map(b => b.id);
                              const { success, failed } = await openSourceBooksService.importMultipleBooks(
                                bookIds,
                                (current, total, bookTitle) => {
                                  setImportProgress({ current, total, bookTitle });
                                }
                              );

                              setImporting(false);
                              Alert.alert(
                                'Import terminé !',
                                `✅ ${success.length} livres importés\n${failed.length > 0 ? `❌ ${failed.length} échecs` : ''}`
                              );
                              loadProfile();
                            } catch (error) {
                              setImporting(false);
                              Alert.alert('Erreur', `Erreur d'import: ${error}`);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    🌟 Importer + de livres ({openSourceBooksService.getExtendedBooks().length} livres)
                  </Text>
                  <Text style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>
                    Jules Verne, Victor Hugo, Dickens, H.G. Wells...
                  </Text>
                </TouchableOpacity>

                {/* Nouveau bouton MEGA COLLECTION */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#9C27B0',
                    padding: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 12,
                    borderWidth: 2,
                    borderColor: '#FFD700',
                  }}
                  onPress={async () => {
                    Alert.alert(
                      '🎉 MÉGA COLLECTION',
                      `Importer ${openSourceBooksService.getMegaCollection().length} livres INCONTOURNABLES ?\n\n📚 Inclus:\n• Dostoïevski, Zola, Balzac, Maupassant\n• Shakespeare, Dickens, Jane Austen\n• Lovecraft, Edgar Allan Poe\n• Contes de Grimm, Andersen, Perrault\n• Philosophie: Platon, Machiavel\n• Poésie: Baudelaire, Hugo\n\n⚠️ Temps estimé: 20-30 minutes`,
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: '🚀 IMPORTER TOUT',
                          onPress: async () => {
                            try {
                              setImporting(true);
                              const books = openSourceBooksService.getMegaCollection();
                              setImportProgress({ current: 0, total: books.length, bookTitle: '' });

                              const bookIds = books.map(b => b.id);
                              const { success, failed } = await openSourceBooksService.importMultipleBooks(
                                bookIds,
                                (current, total, bookTitle) => {
                                  setImportProgress({ current, total, bookTitle });
                                }
                              );

                              setImporting(false);
                              Alert.alert(
                                '🎊 Import terminé !',
                                `✅ ${success.length} chefs-d'œuvre importés!\n${failed.length > 0 ? `❌ ${failed.length} échecs` : ''}\n\n📚 Ta bibliothèque est maintenant ÉNORME!`
                              );
                              loadProfile();
                            } catch (error) {
                              setImporting(false);
                              Alert.alert('Erreur', `Erreur d'import: ${error}`);
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 18 }}>
                    👑 MÉGA COLLECTION 👑
                  </Text>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 4 }}>
                    {openSourceBooksService.getMegaCollection().length} CHEFS-D'ŒUVRE
                  </Text>
                  <Text style={{ color: '#E1BEE7', fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                    Dostoïevski • Zola • Shakespeare • Lovecraft • Dickens
                  </Text>
                </TouchableOpacity>
              </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#000000',
    minHeight: '100%',
  },
  bannerContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    marginBottom: -40,
  },
  banner: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  bannerEditBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
    padding: 8,
    zIndex: 2,
    backdropFilter: 'blur(10px)',
  },
  bannerEditIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#000000',
    marginBottom: 8,
    backgroundColor: '#1A1A1A',
  },
  metaText: { 
    width: '100%',
    alignItems: 'center',
  },
  nameLarge: { 
    color: '#FFFFFF', 
    fontSize: 17, 
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  email: { 
    color: '#888', 
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
  bio: { color: '#fff', paddingHorizontal: 20, marginTop: 12, lineHeight: 20 },
  bioBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 10,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bioBubbleText: {
    color: '#E0E0E0',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  rowBetween: { 
    width: '100%', 
    paddingHorizontal: 12, 
    marginBottom: 10,
  },
  statsRowSmall: { 
    flexDirection: 'row', 
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    paddingVertical: 10,
    justifyContent: 'space-around',
    borderWidth: 0,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statBoxSmall: { 
    alignItems: 'center',
    flex: 1,
  },
  statNumber: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: { 
    color: '#888', 
    fontSize: 10,
    fontWeight: '400',
  },
  actionColumn: { flexDirection: 'column' },
  actionColumnSingle: { 
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButton: { 
    backgroundColor: '#FFFFFF', 
    padding: 8, 
    borderRadius: 6, 
    alignItems: 'center', 
    marginBottom: 6, 
    minWidth: 80 
  },
  primaryText: { 
    color: '#000000', 
    fontWeight: '700',
    fontSize: 13,
  },
  primaryButtonSingle: { 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  secondaryButton: { 
    borderColor: 'rgba(255, 255, 255, 0.3)', 
    borderWidth: 1, 
    padding: 6, 
    borderRadius: 6, 
    alignItems: 'center', 
    minWidth: 80 
  },
  secondaryText: { 
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryButtonSmall: { 
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  tabsRow: { width: '100%', flexDirection: 'row', paddingHorizontal: 10, marginTop: 18 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FFA94D' },
  tabText: { color: '#fff' },
  tabTextActive: { color: '#FFA94D', fontWeight: '700' },
  section: { 
    width: '100%', 
    marginTop: 32, 
    paddingHorizontal: 0,
  },
  sectionTitle: { 
    color: '#FFFFFF', 
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 12,
    letterSpacing: 0.3,
    paddingHorizontal: 16
  },
  placeholder: { 
    color: '#555', 
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    gap: 1,
  },
  gridItem: {
    width: '33.33%',
    aspectRatio: 0.7,
    padding: 0.5,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0A0A',
  },
  gridPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  gridTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 6,
    fontWeight: '600',
  },
  emptyStateButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  workCard: { 
    width: 120, 
    marginRight: 12,
  },
  workCover: { 
    width: 120, 
    height: 180, 
    borderRadius: 8, 
    backgroundColor: '#1A1A1A',
  },
  workTitle: { 
    color: '#E0E0E0', 
    fontSize: 13, 
    marginTop: 8, 
    textAlign: 'left',
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addPlaylistBtn: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addPlaylistText: {
    color: '#0F0F0F',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyPlaylistContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  placeholderSubtext: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 19,
  },
  playlistsContainer: {
    paddingVertical: 8,
  },
  playlistCard: {
    width: 160,
    marginRight: 16,
  },
  playlistMain: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  playlistIconContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  playlistIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  playlistIconImage: {
    width: 40,
    height: 40,
    marginBottom: 8,
    alignSelf: 'center',
  },
  platformBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    position: 'absolute',
    bottom: -8,
    right: -20,
  },
  platformText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playlistName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  playlistPlatform: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
  },
  playlistHeader: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  lockButton: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFA94D',
  },
  lockIcon: {
    fontSize: 16,
  },
  themeButtonSmall: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Profile;