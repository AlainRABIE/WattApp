import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// use legacy API for readAsStringAsync fallback (avoids the runtime deprecation error on SDK54)
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAuth, updateProfile } from 'firebase/auth';
import app, { db, storage } from '../constants/firebaseConfig';
import { collection, query, where, getDocs, getCountFromServer, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

const Profile: React.FC = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [worksCount, setWorksCount] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [recentReads, setRecentReads] = useState<any[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  // Exemples en dur pour preview
  const sampleWorks = [
    { id: 's1', titre: 'Le Voyageur des Étoiles', couverture: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80' },
    { id: 's2', titre: 'La Forêt des Secrets', couverture: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' },
    { id: 's3', titre: 'Manga: Légende du Vent', couverture: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
    { id: 's4', titre: 'La Valse des Maudits', couverture: 'https://images.unsplash.com/photo-1465101178521-c1a4c8a16d78?auto=format&fit=crop&w=400&q=80' },
  ];
  const sampleReads = [
    { id: 'r1', titre: 'Pretty Boy', couverture: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80' },
    { id: 'r2', titre: 'La Protégée du Diable', couverture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
    { id: 'r3', titre: 'L’Histoire de Soumaya', couverture: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' },
  ];

  useEffect(() => {
    // refactored: loadProfile called on mount and on focus
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

      // Compter les oeuvres (ex: collection 'books' with field authorUid)
      const qWorks = query(collection(db, 'books'), where('authorUid', '==', user.uid));
      const snapWorks = await getDocs(qWorks);
      setWorksCount(snapWorks.size);
      // charge les oeuvres récentes (max 8)
      setWorks(snapWorks.docs.slice(0, 8).map(d => ({ id: d.id, ...d.data() })));

      // Compter les followers/friends
      const qFollowers = query(collection(db, 'followers'), where('toUid', '==', user.uid));
      const snapFollowers = await getDocs(qFollowers);
      setFollowersCount(snapFollowers.size);

      const qFriends = query(collection(db, 'friends'), where('uids', 'array-contains', user.uid));
      const snapFriends = await getDocs(qFriends);
      setFriendsCount(snapFriends.size);

      // Lecture du doc user pour bio (si présent)
      const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        const d = snapUser.docs[0].data();
        if (d.bio) setBio(d.bio);
        if (d.photoURL) setPhotoURL(d.photoURL);
      }

      // Récupère les lectures récentes (collection 'reads' attendu)
      try {
        const qReads = query(collection(db, 'reads'), where('uid', '==', user.uid));
        const snapReads = await getDocs(qReads);
        setRecentReads(snapReads.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('No reads collection or failed to load reads', e);
      }
    } catch (err) {
      console.warn('Profile load error', err);
    }
  }

  const renderWork = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.workCard} key={item.id} onPress={() => router.push(`../book/${item.id}`)}>
      <Image source={{ uri: item.couverture || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }} style={styles.workCover} />
      <Text style={styles.workTitle} numberOfLines={2}>{item.titre || 'Titre'}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Banner */}
      <Image source={{ uri: 'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=60' }} style={styles.banner} />

      {/* Avatar overlapping banner */}
      <View style={styles.metaRow}>
        <TouchableOpacity onPress={async () => {
          // Flow B: pick image, resize/compress, convert to base64 and store data URL in Firestore
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

            // Resize & compress the image to reduce size
            const manipResult = await ImageManipulator.manipulateAsync(
              uri,
              [{ resize: { width: 800 } }],
              { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
            );
            const finalUri = manipResult.uri;

            // Read final file as base64
            const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
            const dataUrl = `data:image/jpeg;base64,${base64}`;

            // Check approximate size (base64 length -> bytes = length * 3/4)
            const approxBytes = Math.floor((dataUrl.length - 22) * 3 / 4); // remove data:... prefix roughly
            const MAX_BYTES = 900000; // ~900 KB
            if (approxBytes > MAX_BYTES) {
              Alert.alert('Image trop lourde', 'Choisis une image plus petite ou réduis la qualité.');
              setUploading(false);
              return;
            }

            const auth = getAuth(app);
            const user = auth.currentUser;
            if (!user) throw new Error('Utilisateur non authentifié');

            // Save data URL in Firestore user doc
            const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
            const snapUser = await getDocs(qUser);
            if (!snapUser.empty) {
              const userDocRef = doc(db, 'users', snapUser.docs[0].id);
              await updateDoc(userDocRef, { photoURL: dataUrl });
            } else {
              console.warn('No user doc to update, photoURL stored only locally');
            }

            // Update local state to display
            setPhotoURL(dataUrl);
            Alert.alert('Succès', 'Photo convertie et enregistrée (base64) dans votre profil.');
          } catch (e: any) {
            console.warn('Save avatar dataURL failed', e);
            Alert.alert('Erreur', `Impossible de sauvegarder la photo: ${e?.message ?? String(e)}`);
          } finally {
            setUploading(false);
          }
        }}>
          {(() => {
            const name = (displayName || email || 'User') as string;
            const len = name.trim().includes(' ') ? 2 : 1;
            return (
              <Image source={{ uri: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&length=${len}&background=FFA94D&color=181818&size=128` }} style={styles.avatarLarge} />
            );
          })()}
        </TouchableOpacity>
        {uploading ? <ActivityIndicator style={{ marginLeft: 12 }} color="#FFA94D" /> : null}
        <View style={styles.metaText}>
          <Text style={styles.nameLarge}>{displayName || 'Utilisateur'}</Text>
          <Text style={styles.email}>{email}</Text>
          {/* debug info removed for production */}
        </View>
      </View>

      {/* bio */}
      {bio ? <Text style={styles.bio}>{bio}</Text> : null}

      {/* Stats + actions */}
      <View style={styles.rowBetween}>
        <View style={styles.statsRowSmall}>
          <View style={styles.statBoxSmall}>
            <Text style={styles.statNumber}>{worksCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Œuvres</Text>
          </View>
          <View style={styles.statBoxSmall}>
            <Text style={styles.statNumber}>{followersCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </View>
          <View style={styles.statBoxSmall}>
            <Text style={styles.statNumber}>{friendsCount ?? '-'}</Text>
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
        </View>
      </View>

      {/* Œuvres */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes œuvres</Text>
        {((works && works.length) || sampleWorks.length) === 0 ? (
          <Text style={styles.placeholder}>Tu n'as pas encore d'œuvres publiées.</Text>
        ) : (
          <FlatList
            horizontal
            data={works && works.length ? works : sampleWorks}
            keyExtractor={(i) => i.id}
            renderItem={renderWork}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}
      </View>

      {/* Continuez à lire */}
      <View style={[styles.section, { marginTop: 10 }]}>
        <Text style={styles.sectionTitle}>Continuez à lire</Text>
        {((recentReads && recentReads.length) || sampleReads.length) === 0 ? (
          <Text style={styles.placeholder}>Aucune lecture récente.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(recentReads && recentReads.length ? recentReads : sampleReads).map(r => (
              <View key={r.id} style={styles.workCard}>
                <Image source={{ uri: r.couverture || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }} style={styles.workCover} />
                <Text style={styles.workTitle} numberOfLines={2}>{r.titre || 'Titre'}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {/* Bouton de déconnexion */}
      <TouchableOpacity
        style={{
          backgroundColor: '#FFA94D',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          margin: 24,
        }}
        onPress={async () => {
          try {
            const auth = getAuth(app);
            await auth.signOut();
            router.replace('/register');
          } catch (e) {
            Alert.alert('Erreur', 'Impossible de se déconnecter.');
          }
        }}
      >
        <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 16 }}>Se déconnecter</Text>
      </TouchableOpacity>
      {/* Espace pour éviter le chevauchement avec la barre de navigation */}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#181818',
    minHeight: '100%',
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
    marginBottom: -40,
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
});

export default Profile;
