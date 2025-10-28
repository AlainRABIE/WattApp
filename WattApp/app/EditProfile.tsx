import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuth, updateProfile } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const EditProfile: React.FC = () => {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) return;
        setDisplayName(user.displayName || '');
        // Charger la bio et la photo depuis Firestore
        const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
        const snapUser = await getDocs(qUser);
        if (!snapUser.empty) {
          const d = snapUser.docs[0].data();
          setBio(d.bio || '');
          setPhotoURL(d.photoURL || null);
        }
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de charger le profil');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non authentifié');
      // Met à jour le displayName dans Auth
      await updateProfile(user, { displayName });
      // Met à jour la bio et la photo dans Firestore
      const qUser = query(collection(db, 'users'), where('uid', '==', user.uid));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        const userDocRef = doc(db, 'users', snapUser.docs[0].id);
        await updateDoc(userDocRef, { bio, photoURL });
      }
      Alert.alert('Succès', 'Profil mis à jour !');
      router.back();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setSaving(false);
    }
  };

  // Sélection d'une nouvelle photo de profil
  const pickProfilePhoto = async () => {
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour changer la photo de profil.');
        setPicking(false);
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: true, aspect: [1, 1] });
      if (res.canceled) { setPicking(false); return; }
      const asset = res.assets && res.assets[0];
      const uri = asset?.uri;
      if (!uri) { setPicking(false); return; }
      // Resize & compress
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      const finalUri = manipResult.uri;
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: 'base64' });
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      // Check size
      const approxBytes = Math.floor((dataUrl.length - 22) * 3 / 4);
      const MAX_BYTES = 900000;
      if (approxBytes > MAX_BYTES) {
        Alert.alert('Image trop lourde', 'Choisis une image plus petite ou réduis la qualité.');
        setPicking(false);
        return;
      }
      // Save in Firestore user doc
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
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sélectionner la photo.');
    } finally {
      setPicking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA94D" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#23232a", "#181818"]} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Éditer le profil</Text>
        </View>
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={pickProfilePhoto} style={styles.avatarContainer} disabled={picking}>
            <Image
              source={{ uri: photoURL || 'https://ui-avatars.com/api/?name=User&background=FFA94D&color=181818&size=128' }}
              style={styles.avatar}
            />
            <View style={styles.avatarEditIcon}>
              <Ionicons name="camera" size={18} color="#FFA94D" />
            </View>
          </TouchableOpacity>
          <Text style={styles.displayNamePreview}>{displayName || 'Nom d\'utilisateur'}</Text>
          <Text style={styles.bioPreview}>{bio ? bio : 'Ajoute une biographie pour te présenter.'}</Text>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>Nom d'affichage</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="#888"
          />
          <Text style={styles.label}>Biographie</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Parle un peu de toi..."
            placeholderTextColor="#888"
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#181818" />
            ) : (
              <Text style={styles.saveBtnText}>Sauvegarder</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  profileCard: {
    backgroundColor: '#23232a',
    borderRadius: 22,
    alignItems: 'center',
    padding: 28,
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 12,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FFA94D',
    overflow: 'hidden',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#333',
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  displayNamePreview: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  bioPreview: {
    color: '#ccc',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 0,
    maxWidth: 260,
  },
  formCard: {
    backgroundColor: '#18191c',
    borderRadius: 18,
    padding: 22,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
    borderRadius: 8,
  },
  headerTitle: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 22,
    flex: 1,
    textAlign: 'center',
    marginRight: 34, // pour centrer visuellement avec le bouton retour
  },
  container: {
    flex: 1,
    backgroundColor: '#181818',
    padding: 24,
  },
  label: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 18,
  },
  input: {
    backgroundColor: '#23232a',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#FFA94D',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  saveBtnText: {
    color: '#181818',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818',
  },
});

export default EditProfile;
