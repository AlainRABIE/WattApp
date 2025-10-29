import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Image, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home-outline', route: '/home/home' },
  { id: 'explore', label: 'Explore', icon: 'search-outline', route: '/explore' },
  { id: 'short', label: 'Short', icon: 'flash-outline', route: '/short' },
  { id: 'community', label: 'Communauté', icon: 'people-outline', route: '/community' },
  { id: 'library', label: 'Bibliothèques', icon: 'book-outline', route: '/library' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', route: '/profile' },
];

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0);

export default function BottomNav() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname() || '';
  const active = segments[segments.length - 1] || '';

  const handlePress = (route: string) => {
    // Si déjà sur la page, ne rien faire (pour tous les boutons)
    if (
      pathname === route ||
      (route === '/home/home' && pathname === '/home/home') ||
      (route === '/explore' && pathname === '/explore') ||
      (route === '/write' && pathname === '/write') ||
      (route === '/library' && (pathname === '/library' || pathname === '/library/Library')) ||
      (route === '/profile' && pathname === '/profile')
    ) return;
    try {
      if (route === '/library') {
        router.push({ pathname: '/library/Library' } as any);
      } else if (route.endsWith('/index')) {
        router.push({ pathname: route } as any);
      } else {
        router.push(route as any);
      }
    } catch (e) {
      router.replace(route as any);
    }
  };

  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // animated values for bubble press
  const scalesRef = useRef<Record<string, Animated.Value>>({} as any);
  useEffect(() => {
    TABS.forEach(t => {
      if (!scalesRef.current[t.id]) scalesRef.current[t.id] = new Animated.Value(1);
    });
  }, []);

  const animateIn = (id: string) => {
    const v = scalesRef.current[id];
    if (!v) return;
    Animated.spring(v, { toValue: 0.92, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };
  const animateOut = (id: string) => {
    const v = scalesRef.current[id];
    if (!v) return;
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  };

  // hide on index/register
  if (pathname === '/' || pathname.endsWith('/index') || pathname.startsWith('/register')) return null;

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        setPhotoURL(null);
        setDisplayName(null);
        setEmail(null);
        return;
      }
      setDisplayName(user.displayName || null);
      setEmail(user.email || null);
      if (user.photoURL) {
        setPhotoURL(user.photoURL);
        return;
      }
      try {
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          if (data && data.photoURL) {
            setPhotoURL(data.photoURL as string);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      setPhotoURL(null);
    });
    return () => unsub();
  }, []);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.container}>
        <BlurView intensity={40} tint="dark" style={styles.pill}>
          {TABS.map(tab => {
            const isActive = active === tab.id || active === tab.route.replace('/', '');
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tab}
                onPress={() => handlePress(tab.route)}
                activeOpacity={0.9}
                onPressIn={() => animateIn(tab.id)}
                onPressOut={() => animateOut(tab.id)}
              >
                <Animated.View style={[{ transform: [{ scale: scalesRef.current[tab.id] || new Animated.Value(1) }] }]}> 
                  <View style={styles.iconWrap}>
                    {isActive ? (
                      <BlurView intensity={60} tint="light" style={styles.activeBubble}>
                        <View style={styles.bubbleContent}>
                          <Ionicons name={
                            tab.id === 'profile' ? 'person-outline' :
                            tab.id === 'home' ? 'home-outline' :
                            tab.id === 'library' ? 'book-outline' :
                            tab.id === 'short' ? 'flash-outline' :
                            (tab.icon as any)
                          } size={26} color={'#181818'} />
                        </View>
                      </BlurView>
                    ) : (
                      <Ionicons name={
                        tab.id === 'profile' ? 'person-outline' :
                        tab.id === 'home' ? 'home-outline' :
                        tab.id === 'library' ? 'book-outline' :
                        tab.id === 'short' ? 'flash-outline' :
                        (tab.icon as any)
                      } size={26} color={'#F5E9DA'} />
                    )}
                  </View>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    alignItems: 'center',
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingTop: STATUSBAR_HEIGHT + 8,
    paddingBottom: 6,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    width: '56%',
    maxWidth: 720,
    backgroundColor: 'rgba(35,35,35,0.6)',
    borderRadius: 999,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconWrap: {
    padding: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBubble: {
    backgroundColor: '#FFA94D',
    width: 54,
    height: 54,
    borderRadius: 999,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContent: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  profileActive: {
    borderColor: '#FFA94D',
    borderWidth: 3,
  },
});
