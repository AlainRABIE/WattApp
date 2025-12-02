import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import WishlistBasketAnimation from './components/WishlistBasketAnimation';
import TrashAnimation from './components/TrashAnimation';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function ShortScreen() {
  const { theme } = useTheme();
  // Animation pour le drag
  const pan = useRef(new Animated.ValueXY()).current;

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: pan.x,
          translationY: pan.y,
        },
      },
    ],
    { useNativeDriver: true }
  );

  // Pour l'effet de bascule (rotation)
  const tilt = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [wishlistAnim, setWishlistAnim] = useState(false);
  const [trashAnim, setTrashAnim] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'books'));
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    })();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right') => {
    // Animation façon Tinder : la page part sur le côté avec rotation
    const toValue = direction === 'right' ? { x: -width, y: 0 } : { x: width, y: 0 };
    Animated.timing(pan, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      // Après l'animation, on passe au livre suivant et on remet la page au centre
      if (direction === 'left') {
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          if (user && books[current]) {
            await addDoc(collection(db, 'wishlist'), {
              uid: user.uid,
              bookId: books[current].id,
              addedAt: serverTimestamp(),
            });
            setWishlistAnim(true); // Déclenche l'animation panier
            setWishlistCount(c => c + 1); // Incrémente le compteur
          }
        } catch (e) {}
      }
      if (direction === 'right') {
        setTrashAnim(true); // Déclenche l'animation corbeille
      }
      setCurrent(c => Math.min(c + 1, books.length - 1));
      pan.setValue({ x: 0, y: 0 });
    });
  };

  if (loading) return (
    <View style={getStyles(theme).center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
  );
  if (!books.length) return (
    <View style={getStyles(theme).center}><Text style={{ color: theme.colors.text }}>Aucun synopsis à afficher.</Text></View>
  );

  const book = books[current];
  const styles = getStyles(theme);

  return (
    <>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.END) {
            if (nativeEvent.translationX < -60) handleSwipe('right');
            else if (nativeEvent.translationX > 60) handleSwipe('left');
            else {
              // Si pas de swipe, on remet la page au centre
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
              }).start();
            }
          }
        }}
      >
        <View style={styles.pageBg}>
          <Animated.View style={[styles.paperRect, { transform: [...pan.getTranslateTransform(), { rotate: tilt }] }]}> 
            <Text style={styles.pageTitle}>{book.title || 'Sans titre'}</Text>
            <View style={styles.pageContentWrapper}>
              <Text style={styles.pageSynopsis}>{book.synopsis || book.content?.slice(0, 200) || 'Pas de synopsis.'}</Text>
            </View>
          </Animated.View>
        </View>
      </PanGestureHandler>
      <WishlistBasketAnimation trigger={wishlistAnim} onEnd={() => setWishlistAnim(false)} count={wishlistCount} />
      <TrashAnimation trigger={trashAnim} onEnd={() => setTrashAnim(false)} />
    </>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  card: { width: width * 0.9, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 20, alignItems: 'center', elevation: 4 },
  pageBg: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  paperRect: {
    width: width * 0.5, 
    minHeight: 680, 
    backgroundColor: theme.colors.surface, 
    borderRadius: 24,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    marginVertical: 40,
  },
  pageContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
    fontFamily: 'serif',
  },
  pageContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pageSynopsis: {
    color: theme.colors.text,
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '400',
    fontFamily: 'serif',
  },
  // ...
});
