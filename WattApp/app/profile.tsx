import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Linking, Modal, TextInput, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAuth, updateProfile } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';

const Profile: React.FC = () => {
  const router = useRouter();
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
  const [uploading, setUploading] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const { theme } = useTheme();

  // États pour le modal d'ajout de playlist
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistURL, setNewPlaylistURL] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'spotify' | 'apple' | 'youtube' | 'deezer' | 'other'>('spotify');
  const [newPlaylistPrivate, setNewPlaylistPrivate] = useState(false);
  const [addingPlaylist, setAddingPlaylist] = useState(false);

  const PLATFORMS = [
    { id: 'spotify', name: 'Spotify', icon: 'logo-spotify', color: '#1DB954' },
    { id: 'apple', name: 'Apple Music', icon: 'logo-apple', color: '#FA243C' },
    { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
    { id: 'deezer', name: 'Deezer', icon: 'disc', color: '#A238FF' },
    { id: 'other', name: 'Autre', icon: 'musical-notes', color: '#FFA94D' },
  ];

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
    } catch (err) {
      console.warn('Profile load error', err);
    }
  }

  const renderWork = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.workCard} key={String(item.id)} onPress={() => router.push(`../book/${item.id}`)}>
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.workCover} />
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

  const getPlatformIcon = (platform: string, iconName?: string): string => {
    // Mapping des plateformes vers leurs icônes valides Ionicons
    const platformIcons: Record<string, string> = {
      'spotify': 'logo-spotify',
      'apple': 'logo-apple',
      'youtube': 'logo-youtube',
      'deezer': 'disc',
      'other': 'musical-notes'
    };

    // Si l'icône fournie est invalide (emoji ou caractère spécial), utiliser l'icône de la plateforme
    if (iconName && !/^[a-z-]+$/.test(iconName)) {
      // Les noms d'icônes Ionicons contiennent uniquement des lettres minuscules et des tirets
      return platformIcons[platform] || 'musical-notes';
    }

    return iconName || platformIcons[platform] || 'musical-notes';
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

  const addPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de playlist.');
      return;
    }
    if (!newPlaylistURL.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un lien de playlist.');
      return;
    }

    try {
      setAddingPlaylist(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non authentifié');

      const platform = PLATFORMS.find(p => p.id === selectedPlatform);
      
      await addDoc(collection(db, 'playlists'), {
        uid: user.uid,
        name: newPlaylistName.trim(),
        url: newPlaylistURL.trim(),
        platform: selectedPlatform,
        icon: platform?.icon || 'musical-notes',
        isPrivate: newPlaylistPrivate,
        createdAt: serverTimestamp(),
      });

      // Recharger les playlists
      const qPlaylists = query(collection(db, 'playlists'), where('uid', '==', user.uid));
      const snapPlaylists = await getDocs(qPlaylists);
      setPlaylists(snapPlaylists.docs.map(d => ({ id: d.id, ...d.data() })));

      // Réinitialiser le formulaire
      setNewPlaylistName('');
      setNewPlaylistURL('');
      setSelectedPlatform('spotify');
      setNewPlaylistPrivate(false);
      setShowAddPlaylistModal(false);

      Alert.alert('Succès', 'Playlist ajoutée !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la playlist.');
      console.error(error);
    } finally {
      setAddingPlaylist(false);
    }
  };

  const sharePlaylist = async (playlist: any) => {
    try {
      const message = `🎵 ${playlist.name}\n\nÉcoute ma playlist sur ${playlist.platform.toUpperCase()} :\n${playlist.url}`;
      
      await Share.share({
        message: message,
        title: playlist.name,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const copyPlaylistLink = async (playlist: any) => {
    try {
      await Clipboard.setStringAsync(playlist.url);
      Alert.alert('Copié !', 'Le lien a été copié dans le presse-papier.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier le lien.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header minimaliste */}
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.push('/dashboard')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="stats-chart-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Profil</Text>
        <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Avatar centré minimaliste */}
        <View style={styles.profileSection}>
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
                <View style={styles.avatarContainer}>
                  <Image source={{ uri: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&length=${String(len)}&background=${theme.colors.primary.replace('#', '')}&color=${theme.colors.background.replace('#', '')}&size=200` }} style={[styles.avatar, { borderColor: theme.colors.primary }]} />
                  {uploading ? (
                    <View style={[styles.editBadge, { backgroundColor: theme.colors.surface }]}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                  ) : (
                    <View style={[styles.editBadge, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="camera" size={18} color={theme.colors.background} />
                    </View>
                  )}
                </View>
              );
            })()}
          </TouchableOpacity>

          {/* Nom et email centrés */}
          <Text style={[styles.name, { color: theme.colors.text }]}>{displayName || 'Utilisateur'}</Text>
          <Text style={[styles.emailText, { color: theme.colors.textSecondary }]}>{email}</Text>
          
          {/* Badge compte privé/public minimaliste */}
          <View style={[styles.privacyBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons 
              name={isPrivate ? "lock-closed" : "globe-outline"} 
              size={14} 
              color={theme.colors.primary} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              {isPrivate ? 'Privé' : 'Public'}
            </Text>
          </View>
        </View>

        {/* Bio minimaliste */}
        {bio ? (
          <View style={[styles.bioContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.bioText, { color: theme.colors.textSecondary }]}>{bio}</Text>
          </View>
        ) : null}

        {/* Stats en cartes minimalistes */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{String(worksCount ?? '0')}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Œuvres</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{String(followersCount ?? '0')}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Abonnés</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{String(friendsCount ?? '0')}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Amis</Text>
          </View>
        </View>

        {/* Actions minimalistes */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]} 
            onPress={() => router.push('/EditProfile')}
          >
            <Ionicons name="create-outline" size={18} color={theme.colors.background} style={{ marginRight: 6 }} />
            <Text style={[styles.primaryBtnText, { color: theme.colors.background }]}>Éditer profil</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} 
            onPress={() => router.push('/write')}
          >
            <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryBtnText, { color: theme.colors.primary }]}>Écrire</Text>
          </TouchableOpacity>
        </View>

        {/* Œuvres */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mes œuvres</Text>
          {(works && works.length) === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="book-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Aucune œuvre publiée</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {works.map((item) => (
                <TouchableOpacity key={String(item.id)} style={styles.bookCard} onPress={() => router.push(`../book/${item.id}`)}>
                  {item.coverImage ? (
                    <Image source={{ uri: item.coverImage }} style={[styles.bookCover, { borderColor: theme.colors.border }]} />
                  ) : (
                    <View style={[styles.bookCover, styles.bookCoverPlaceholder, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <Ionicons name="book" size={28} color={theme.colors.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.bookTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title || 'Sans titre'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Continuez à lire */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Continuez à lire</Text>
          {(recentReads && recentReads.length) === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="time-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Aucune lecture récente</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentReads.map(r => (
                <View key={String(r.id)} style={styles.bookCard}>
                  <Image source={{ uri: r.couverture || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }} style={[styles.bookCover, { borderColor: theme.colors.border }]} />
                  <Text style={[styles.bookTitle, { color: theme.colors.text }]} numberOfLines={2}>{r.titre || 'Titre'}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section Playlists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Playlists</Text>
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} 
              onPress={() => setShowAddPlaylistModal(true)}
            >
              <Ionicons name="add" size={18} color={theme.colors.background} />
            </TouchableOpacity>
          </View>
          {playlists.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="musical-notes-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Aucune playlist</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={[styles.playlistCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => openPlaylist(playlist)}
                >
                  <View style={styles.playlistTop}>
                    <TouchableOpacity
                      style={[styles.playlistLock, { backgroundColor: theme.colors.background }]}
                      onPress={() => togglePlaylistVisibility(playlist.id, playlist.isPrivate)}
                    >
                      <Ionicons 
                        name={playlist.isPrivate ? "lock-closed" : "globe-outline"} 
                        size={12} 
                        color={theme.colors.primary} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.playlistShare, { backgroundColor: theme.colors.background }]}
                      onPress={() => sharePlaylist(playlist)}
                    >
                      <Ionicons name="share-outline" size={12} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.playlistContent}>
                    <Ionicons 
                      name={getPlatformIcon(playlist.platform, playlist.icon) as any} 
                      size={40} 
                      color={getPlatformColor(playlist.platform)} 
                    />
                    <View style={[styles.platformTag, { backgroundColor: getPlatformColor(playlist.platform) }]}>
                      <Text style={styles.platformLabel}>{playlist.platform.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.playlistTitle, { color: theme.colors.text }]} numberOfLines={2}>{playlist.name}</Text>
                  
                  <View style={styles.playlistActions}>
                    <TouchableOpacity 
                      style={styles.playlistActionBtn}
                      onPress={() => copyPlaylistLink(playlist)}
                    >
                      <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.playlistActionBtn}
                      onPress={() => deletePlaylist(playlist.id)}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Bouton de déconnexion minimaliste */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error }]}
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
          <Ionicons name="log-out-outline" size={18} color={theme.colors.error} style={{ marginRight: 6 }} />
          <Text style={[styles.logoutText, { color: theme.colors.error }]}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Modal d'ajout de playlist */}
      <Modal
        visible={showAddPlaylistModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPlaylistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Ajouter une playlist</Text>
              <TouchableOpacity onPress={() => setShowAddPlaylistModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Sélection de plateforme */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Plateforme</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformSelector}>
                {PLATFORMS.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    style={[
                      styles.platformOption,
                      { 
                        backgroundColor: selectedPlatform === platform.id ? platform.color : theme.colors.surface,
                        borderColor: selectedPlatform === platform.id ? platform.color : theme.colors.border,
                      }
                    ]}
                    onPress={() => setSelectedPlatform(platform.id as any)}
                  >
                    <Ionicons 
                      name={platform.icon as any} 
                      size={24} 
                      color={selectedPlatform === platform.id ? '#fff' : theme.colors.text} 
                    />
                    <Text style={[
                      styles.platformOptionText,
                      { color: selectedPlatform === platform.id ? '#fff' : theme.colors.text }
                    ]}>
                      {platform.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Nom de la playlist */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Nom de la playlist</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Ma playlist préférée"
                placeholderTextColor={theme.colors.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                maxLength={50}
              />

              {/* URL de la playlist */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Lien de la playlist</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="https://..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newPlaylistURL}
                onChangeText={setNewPlaylistURL}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              {/* Visibilité */}
              <TouchableOpacity 
                style={[styles.privacyToggle, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border 
                }]}
                onPress={() => setNewPlaylistPrivate(!newPlaylistPrivate)}
              >
                <View style={styles.privacyToggleLeft}>
                  <Ionicons 
                    name={newPlaylistPrivate ? "lock-closed" : "globe-outline"} 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <View style={styles.privacyToggleText}>
                    <Text style={[styles.privacyToggleTitle, { color: theme.colors.text }]}>
                      {newPlaylistPrivate ? 'Playlist privée' : 'Playlist publique'}
                    </Text>
                    <Text style={[styles.privacyToggleSubtitle, { color: theme.colors.textSecondary }]}>
                      {newPlaylistPrivate ? 'Visible uniquement par vous' : 'Visible sur votre profil'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.switch,
                  { backgroundColor: newPlaylistPrivate ? theme.colors.primary : theme.colors.border }
                ]}>
                  <View style={[
                    styles.switchThumb,
                    { 
                      backgroundColor: theme.colors.background,
                      transform: [{ translateX: newPlaylistPrivate ? 18 : 2 }]
                    }
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Boutons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { 
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border 
                  }]}
                  onPress={() => setShowAddPlaylistModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={addPlaylist}
                  disabled={addingPlaylist}
                >
                  {addingPlaylist ? (
                    <ActivityIndicator color={theme.colors.background} size="small" />
                  ) : (
                    <Text style={[styles.modalSubmitText, { color: theme.colors.background }]}>Ajouter</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    letterSpacing: 0.3,
  },
  emailText: {
    fontSize: 14,
    marginTop: 4,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bioContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  bookCard: {
    width: 110,
    marginRight: 16,
  },
  bookCover: {
    width: 110,
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
  },
  bookCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 18,
  },
  playlistCard: {
    width: 140,
    marginRight: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  playlistTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playlistLock: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistShare: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistContent: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  playlistIconImage: {
    width: 40,
    height: 40,
  },
  platformTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  platformLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  playlistTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  playlistActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
  },
  playlistActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  workCard: {
    width: 110,
    marginRight: 16,
  },
  workCover: {
    width: 110,
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
  },
  workTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 18,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  platformSelector: {
    marginBottom: 8,
  },
  platformOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  platformOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  privacyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  privacyToggleText: {
    flex: 1,
  },
  privacyToggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  privacyToggleSubtitle: {
    fontSize: 12,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Profile;