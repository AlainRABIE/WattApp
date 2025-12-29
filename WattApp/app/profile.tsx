import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAuth, updateProfile } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { ThemeSelector } from './components/ThemeSelector';
import { useTheme } from '../hooks/useTheme';
import OpenSourceBooksService from '../services/OpenSourceBooksService';

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
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { theme } = useTheme();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, bookTitle: '' });

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

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      {/* Header avec engrenage en haut à droite */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 12, backgroundColor: '#181818' }}>
        <View />
        <Text style={{ color: '#FFA94D', fontSize: 20, fontWeight: 'bold' }}>Mon profil</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/dashboard')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 8 }}>
            <Ionicons name="stats-chart-outline" size={28} color="#4FC3F7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="settings" size={28} color="#FFA94D" />
          </TouchableOpacity>
        </View>
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
            <View style={styles.bannerEditIcon}>
              <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/FFA94D/camera.png' }} style={{ width: 22, height: 22, tintColor: '#FFA94D' }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Avatar overlapping banner */}
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
          {uploading ? <ActivityIndicator style={{ marginLeft: 12 }} color="#FFA94D" /> : null}
          <View style={styles.metaText}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.nameLarge}>{displayName || 'Utilisateur'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                {isPrivate ? (
                  <>
                    <Ionicons name="lock-closed" size={16} color="#FFA94D" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 12 }}>Compte privé</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="earth" size={16} color="#4FC3F7" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#4FC3F7', fontWeight: 'bold', fontSize: 12 }}>Compte public</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={styles.email}>{email}</Text>
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

          <View style={styles.actionColumnSingle}>
            <TouchableOpacity style={styles.primaryButtonSingle} onPress={() => router.push('/EditProfile')}>
              <Text style={styles.primaryText}>Éditer le profil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButtonSmall} onPress={() => router.push('/write')}>
              <Text style={styles.secondaryText}>Commencer à écrire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.themeButtonSmall} onPress={() => setShowThemeSelector(true)}>
              <Ionicons name="color-palette" size={16} color="#FFA94D" style={{ marginRight: 8 }} />
              <Text style={styles.themeButtonText}>Thèmes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.themeButtonSmall} onPress={() => router.push('/settings')}>
              <Ionicons name="settings" size={16} color="#FFA94D" style={{ marginRight: 8 }} />
              <Text style={styles.themeButtonText}>Réglages</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Œuvres */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes œuvres</Text>
          {(works && works.length) === 0 ? (
            <Text style={styles.placeholder}>Tu n'as pas encore d'œuvres publiées.</Text>
          ) : (
            <FlatList
              horizontal
              data={works}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderWork}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          )}
        </View>

        {/* Continuez à lire */}
        <View style={[styles.section, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Continuez à lire</Text>
          {(recentReads && recentReads.length) === 0 ? (
            <Text style={styles.placeholder}>Aucune lecture récente.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentReads.map(r => (
                <View key={String(r.id)} style={styles.workCard}>
                  <Image source={{ uri: r.couverture || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }} style={styles.workCover} />
                  <Text style={styles.workTitle} numberOfLines={2}>{r.titre || 'Titre'}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section Playlists */}
        <View style={[styles.section, { marginTop: 15 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes playlists</Text>
            <TouchableOpacity style={styles.addPlaylistBtn} onPress={() => Alert.alert('Ajout playlist', 'Ajout de playlist non implémenté ici.')}>
              <Text style={styles.addPlaylistText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>
          {playlists.length === 0 ? (
            <View style={styles.emptyPlaylistContainer}>
              <Text style={styles.placeholder}>Aucune playlist ajoutée.</Text>
              <Text style={styles.placeholderSubtext}>
                Ajoutez vos playlists Spotify, Apple Music, YouTube Music ou Deezer pour les écouter pendant la lecture.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playlistsContainer}>
              {playlists.map((playlist) => (
                <View key={playlist.id} style={styles.playlistCard}>
                  <TouchableOpacity
                    style={styles.playlistMain}
                    onPress={() => openPlaylist(playlist)}
                    onLongPress={() => deletePlaylist(playlist.id)}
                  >
                    <View style={styles.playlistHeader}>
                      <TouchableOpacity
                        style={styles.lockButton}
                        onPress={() => togglePlaylistVisibility(playlist.id, playlist.isPrivate)}
                      >
                        <Text style={styles.lockIcon}>
                          {playlist.isPrivate ? '🔒' : '🌐'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.playlistIconContainer}>
                      {renderPlatformIcon(playlist.platform, playlist.icon)}
                      <View style={[styles.platformBadge, { backgroundColor: getPlatformColor(playlist.platform) }]}>
                        <Text style={styles.platformText}>{playlist.platform.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>
                    <Text style={styles.playlistPlatform}>
                      {playlist.isPrivate ? 'Privée' : 'Publique'} • Appuyez pour ouvrir
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Bouton Import Livres Open Source */}
        <TouchableOpacity
          style={{
            backgroundColor: '#4CAF50',
            padding: 14,
            borderRadius: 8,
            alignItems: 'center',
            marginHorizontal: 24,
            marginTop: 24,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
          onPress={() => setShowImportModal(true)}
        >
          <Ionicons name="book-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Importer des livres gratuits (Test)</Text>
        </TouchableOpacity>

        {/* Bouton pour migrer la photo de profil */}
        <TouchableOpacity
          style={{
            backgroundColor: '#8B5CF6',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginHorizontal: 24,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
          onPress={async () => {
            try {
              Alert.alert('Migration', 'Migration de votre photo de profil en cours...');
              const ProfileMigrationService = (await import('../services/ProfileMigrationService')).default;
              const newURL = await ProfileMigrationService.migrateCurrentUserPhoto();
              if (newURL) {
                Alert.alert('✅ Succès', 'Photo de profil migrée vers Firebase Storage!');
                // Recharger la page pour voir la nouvelle photo
                const auth = getAuth(app);
                const user = auth.currentUser;
                if (user) {
                  const q = query(collection(db, 'users'), where('uid', '==', user.uid));
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    const data = snap.docs[0].data();
                    if (data?.photoURL) {
                      setPhotoURL(data.photoURL);
                    }
                  }
                }
              } else {
                Alert.alert('Info', 'Aucune migration nécessaire.');
              }
            } catch (error) {
              console.error('Erreur migration:', error);
              Alert.alert('Erreur', 'Impossible de migrer la photo de profil.');
            }
          }}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Migrer photo vers Storage</Text>
        </TouchableOpacity>

        {/* Bouton de déconnexion */}
        <TouchableOpacity
          style={{
            backgroundColor: '#FFA94D',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginHorizontal: 24,
            marginBottom: 24,
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
          <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 16 }}>Se déconnecter</Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
        <ThemeSelector
          visible={showThemeSelector}
          onClose={() => setShowThemeSelector(false)}
        />

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
                  {OpenSourceBooksService.getAvailableBooks().map((book) => (
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

                                  const bookId = await OpenSourceBooksService.importBook(
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
                      `Importer ${OpenSourceBooksService.getAvailableBooks().length} livres ?\n\nCela peut prendre plusieurs minutes.`,
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Importer tout',
                          onPress: async () => {
                            try {
                              setImporting(true);
                              const books = OpenSourceBooksService.getAvailableBooks();
                              setImportProgress({ current: 0, total: books.length, bookTitle: '' });

                              const { success, failed } = await OpenSourceBooksService.importAllBooks(
                                (bookTitle, progress) => {
                                  setImportProgress(prev => ({ ...prev, bookTitle }));
                                },
                                (completed, total) => {
                                  setImportProgress({ current: completed, total, bookTitle: '' });
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
                    📥 Tout importer ({OpenSourceBooksService.getAvailableBooks().length} livres)
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: '#181818',
    minHeight: '100%',
    alignItems: 'center',
  },
  bannerContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
    marginBottom: -40,
  },
  banner: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  bannerEditBtn: {
    position: 'absolute',
    right: 18,
    bottom: 12,
    backgroundColor: 'rgba(24,24,24,0.85)',
    borderRadius: 18,
    padding: 6,
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  bannerEditIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    width: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -30,
  },
  avatarLarge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#181818',
    marginRight: 12,
    backgroundColor: '#232323',
  },
  metaText: { flex: 1 },
  nameLarge: { color: '#FFA94D', fontSize: 20, fontWeight: '700' },
  email: { color: '#fff', fontSize: 13, marginTop: 4 },
  bio: { color: '#fff', paddingHorizontal: 20, marginTop: 12, lineHeight: 20 },
  bioBubble: {
    backgroundColor: 'rgba(40, 40, 40, 0.85)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 2,
    alignSelf: 'stretch',
    minHeight: 38,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  bioBubbleText: {
    color: '#FFA94D',
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rowBetween: { width: '100%', paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  statsRowSmall: { flexDirection: 'row', alignItems: 'center' },
  statBoxSmall: { alignItems: 'center', marginRight: 18 },
  statNumber: { color: '#FFA94D', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#fff', fontSize: 12 },
  actionColumn: { flexDirection: 'column' },
  actionColumnSingle: { flexDirection: 'column', alignItems: 'flex-end' },
  primaryButton: { backgroundColor: '#FFA94D', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 8, minWidth: 100 },
  primaryText: { color: '#181818', fontWeight: '700' },
  primaryButtonSingle: { backgroundColor: '#FFA94D', padding: 12, borderRadius: 8, alignItems: 'center', minWidth: 160 },
  secondaryButton: { borderColor: '#FFA94D', borderWidth: 1, padding: 8, borderRadius: 8, alignItems: 'center', minWidth: 100 },
  secondaryText: { color: '#FFA94D' },
  secondaryButtonSmall: { borderColor: '#FFA94D', borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center', minWidth: 160, marginTop: 8 },
  tabsRow: { width: '100%', flexDirection: 'row', paddingHorizontal: 10, marginTop: 18 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#FFA94D' },
  tabText: { color: '#fff' },
  tabTextActive: { color: '#FFA94D', fontWeight: '700' },
  section: { width: '100%', marginTop: 12, paddingHorizontal: 20 },
  sectionTitle: { color: '#FFA94D', fontWeight: 'bold', marginBottom: 8 },
  placeholder: { color: '#888', fontStyle: 'italic' },
  workCard: { width: 120, marginRight: 12, alignItems: 'center' },
  workCover: { width: 100, height: 150, borderRadius: 8, backgroundColor: '#232323' },
  workTitle: { color: '#fff', fontSize: 13, marginTop: 6, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPlaylistBtn: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  addPlaylistText: {
    color: '#181818',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyPlaylistContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  placeholderSubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  playlistsContainer: {
    paddingVertical: 8,
  },
  playlistCard: {
    width: 160,
    marginRight: 15,
  },
  playlistMain: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  playlistIconContainer: {
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  playlistIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  playlistIconImage: {
    width: 32,
    height: 32,
    marginBottom: 8,
    alignSelf: 'center',
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    position: 'absolute',
    bottom: -5,
    right: -15,
  },
  platformText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  playlistName: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
  },
  playlistPlatform: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  playlistHeader: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  lockButton: {
    backgroundColor: 'rgba(24, 24, 24, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  lockIcon: {
    fontSize: 14,
  },
  themeButtonSmall: {
    borderColor: '#FFA94D',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    marginTop: 8,
    flexDirection: 'row',
  },
  themeButtonText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Profile;