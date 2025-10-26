import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTablet = Math.max(width, height) >= 768;

  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, user => {
      setAuthUser(user);
      if (user) {
        setDisplayName(user.displayName || null);
        setEmail(user.email || null);
        // prefer Auth photoURL, but if missing look up Firestore users collection
        if (user.photoURL) {
          setPhotoURL(user.photoURL);
        } else {
          // Try to fetch user's profile from Firestore (may contain base64 data URL)
          (async () => {
            try {
              const q = query(collection(db, 'users'), where('uid', '==', user.uid));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const data = snap.docs[0].data() as any;
                if (data && data.photoURL) {
                  console.warn('Loaded user.photoURL from Firestore (tabs layout) — length:', String((data.photoURL as string).length).slice(0,6));
                  setPhotoURL(data.photoURL as string);
                  return;
                }
              }
            } catch (e) {
              console.warn('Failed to load user photo from Firestore', e);
            }
            setPhotoURL(null);
          })();
        }
      } else {
        setDisplayName(null);
        setEmail(null);
        setPhotoURL(null);
      }
    });
    return () => unsub();
  }, []);

  return (
    <View style={styles.wrapper}>
      <Tabs screenOptions={{ headerShown: false }} />

      {/* Fixed avatar overlay - shows user avatar if logged in, otherwise generic and links to register/login */}
      <View style={[styles.avatarOverlay, isTablet && styles.avatarOverlayTablet]}>
        <TouchableOpacity
          onPress={() => {
            if (authUser) router.push('/profile');
            else router.push('/register');
          }}
        >
        </TouchableOpacity>
        {/* Debug status: show if signed in or not (visible to developer) */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  avatarOverlay: {
    position: 'absolute',
    top: 36,
    right: 16,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 40,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarOverlayTablet: {
    top: 44,
    right: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFA94D',
    backgroundColor: '#181818',
  },
  avatarTablet: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  debugText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 8,
    opacity: 0.9,
  },
});
