
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, getDocs, where, query as fsQuery, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { name: "Roman d'amour", color: ["#FFB347", "#FFCC80"] },
  { name: "Fanfiction", color: ["#6DD5FA", "#2980B9"] },
  { name: "Fiction générale", color: ["#F7971E", "#FFD200"] },
  { name: "Roman pour adolescents", color: ["#F857A6", "#FF5858"] },
  { name: "Aléatoire", color: ["#43CEA2", "#185A9D"] },
  { name: "Action", color: ["#FF5858", "#FBCA1F"] },
  { name: "Aventure", color: ["#36D1C4", "#1E5799"] },
  { name: "Nouvelles", color: ["#B06AB3", "#4568DC"] },
  { name: "Fantasy", color: ["#F7971E", "#FFD200"] },
  { name: "Non-Fiction", color: ["#43CEA2", "#185A9D"] },
  { name: "Fantastique", color: ["#F857A6", "#FF5858"] },
  { name: "Mystère", color: ["#6DD5FA", "#2980B9"] },
];


const CARD_SIZE = 120;
const CARD_MARGIN = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;


export default function CommunityIndex() {
  const [myGroups, setMyGroups] = React.useState<any[]>([]);
  // Placeholder for popular groups (replace with Firestore data as needed)
  const popularGroups = [
    { name: 'Groupe A', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
    { name: 'Groupe B', cover: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' },
    { name: 'Groupe C', cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
    { name: 'Groupe D', cover: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80' },
  ];

  React.useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const q = collectionGroup(db, 'members');
    const unsubscribe = onSnapshot(fsQuery(q, where('uid', '==', user.uid)), (snap) => {
      const groups = snap.docs.map(doc => {
        const parent = doc.ref.parent.parent;
        return {
          ...doc.data(),
          groupId: parent?.id,
        };
      });
      setMyGroups(groups);
    });
    return () => unsubscribe();
  }, []);
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Communauté</Text>

      {/* Section: Groupes populaires */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>🔥 Groupes populaires</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {popularGroups.map((group, idx) => (
            <TouchableOpacity
              key={group.name + '-' + idx}
              style={[styles.cardModernWrapper, { width: CARD_SIZE, height: CARD_SIZE, marginRight: CARD_MARGIN }]}
              activeOpacity={0.93}
              onPress={() => router.push({ pathname: `/community/[category]`, params: { category: group.name } })}
            >
              <View style={styles.bookCard}>
                <View style={styles.bookImageBox}>
                  <Image
                    source={{ uri: group.cover }}
                    style={{ width: 80, height: 120, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.bookCardTitle} numberOfLines={2}>{group.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section: Mes groupes */}
      {myGroups.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>👥 Mes groupes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {myGroups.map((item, idx) => (
              <TouchableOpacity
                key={item.groupId + '-' + item.uid + '-' + idx}
                style={[styles.cardModernWrapper, { width: CARD_SIZE, height: CARD_SIZE, marginRight: CARD_MARGIN }]}
                activeOpacity={0.93}
                onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.groupId } })}
              >
                <View style={styles.bookCard}>
                  <View style={styles.bookImageBox}>
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80' }}
                      style={{ width: 80, height: 120, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.bookCardTitle} numberOfLines={2}>{item.groupId}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section: Catégories */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>📚 Catégories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {CATEGORIES.map((cat, idx) => (
            <TouchableOpacity
              key={cat.name}
              style={[styles.cardModernWrapper, { width: CARD_SIZE, height: CARD_SIZE, marginRight: CARD_MARGIN }]}
              onPress={() => router.push({ pathname: `/community/[category]`, params: { category: cat.name } })}
              activeOpacity={0.93}
            >
              <View style={styles.bookCard}>
                <View style={styles.bookImageBox}>
                  <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' }}
                    style={{ width: 80, height: 120, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.bookCardTitle} numberOfLines={2}>{cat.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    color: '#FFA94D',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 38,
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: 28,
    marginTop: 0,
    paddingLeft: 18,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 12,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  horizontalList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 18,
  },
  cardModernWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: 'transparent',
  },
  cardSimple: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: '#232323',
    borderWidth: 1.5,
    borderColor: '#FFA94D',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    overflow: 'hidden',
  },
  iconSimpleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  cardSimpleTitle: {
    color: '#FFA94D',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.1,
    marginTop: 2,
    fontFamily: undefined, // Laisse la police par défaut de l'app
  },
  // Badge lecture supprimé pour un design plus épuré
  iconModernCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#FFA94D',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardModernTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: '#0006',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
  },
  bookCard: {
    width: 80,
    marginRight: 14,
    backgroundColor: '#232323',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFA94D',
    alignItems: 'center',
    paddingBottom: 10,
    overflow: 'hidden',
  },
  bookImageBox: {
    width: 80,
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  bookCardTitle: {
    color: '#FFA94D',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 4,
    marginTop: 2,
  },
});