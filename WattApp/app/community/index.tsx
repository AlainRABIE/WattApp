import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, getDocs, where, query as fsQuery, onSnapshot, collection, getCountFromServer } from 'firebase/firestore';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const CATEGORIES = [
  { name: "Roman d'amour", icon: "heart", color: ["#FF6B9D", "#FFA94D"] as const },
  { name: "Fanfiction", icon: "sparkles", color: ["#6DD5FA", "#2980B9"] as const },
  { name: "Fiction générale", icon: "book", color: ["#F7971E", "#FFD200"] as const },
  { name: "Roman pour adolescents", icon: "school", color: ["#F857A6", "#FF5858"] as const },
  { name: "Aléatoire", icon: "shuffle", color: ["#43CEA2", "#185A9D"] as const },
  { name: "Action", icon: "flash", color: ["#FF5858", "#FBCA1F"] as const },
  { name: "Aventure", icon: "compass", color: ["#36D1C4", "#1E5799"] as const },
  { name: "Nouvelles", icon: "newspaper", color: ["#B06AB3", "#4568DC"] as const },
  { name: "Fantasy", icon: "planet", color: ["#F7971E", "#FFD200"] as const },
  { name: "Non-Fiction", icon: "reader", color: ["#43CEA2", "#185A9D"] as const },
  { name: "Fantastique", icon: "rocket", color: ["#F857A6", "#FF5858"] as const },
  { name: "Mystère", icon: "eye", color: ["#6DD5FA", "#2980B9"] as const },
];

const CARD_WIDTH = 160;
const CARD_HEIGHT = 200;
const CARD_MARGIN = 16;
const SCREEN_WIDTH = Dimensions.get('window').width;


export default function CommunityIndex() {
  const [myGroups, setMyGroups] = React.useState<any[]>([]);
  const [popularGroups, setPopularGroups] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  // Fonction pour formater le nombre de membres
  const formatMemberCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Récupérer les groupes populaires avec le vrai nombre de membres
  React.useEffect(() => {
    const fetchPopularGroups = async () => {
      try {
        setLoading(true);
        const groupsRef = collection(db, 'groups');
        const groupsSnapshot = await getDocs(groupsRef);
        
        const groupsWithMembers = await Promise.all(
          groupsSnapshot.docs.map(async (groupDoc) => {
            const groupData = groupDoc.data();
            const membersRef = collection(db, 'groups', groupDoc.id, 'members');
            const memberCountSnapshot = await getCountFromServer(membersRef);
            
            return {
              id: groupDoc.id,
              name: groupData.name || groupDoc.id,
              cover: groupData.cover || 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80',
              memberCount: memberCountSnapshot.data().count,
              members: formatMemberCount(memberCountSnapshot.data().count),
            };
          })
        );

        // Trier par nombre de membres et prendre les 4 premiers
        const sorted = groupsWithMembers.sort((a, b) => b.memberCount - a.memberCount).slice(0, 4);
        setPopularGroups(sorted);
      } catch (error) {
        console.error('Erreur lors de la récupération des groupes populaires:', error);
        // Fallback avec données par défaut
        setPopularGroups([
          { id: '1', name: 'Écrivains en herbe', cover: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=400&q=80', members: '0', memberCount: 0 },
          { id: '2', name: 'Passionnés de SF', cover: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=400&q=80', members: '0', memberCount: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularGroups();
  }, []);

  // Récupérer les groupes de l'utilisateur
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={['#181818', '#2a2a2a']}
        style={styles.headerGradient}
      >
        <Text style={styles.header}>🌍 Communauté</Text>
        <Text style={styles.headerSubtitle}>Découvrez et rejoignez des groupes</Text>
      </LinearGradient>

      {/* Section: Groupes populaires */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="flame" size={24} color="#FFA94D" />
            <Text style={styles.sectionTitle}>Groupes populaires</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/community/my-groups')}>
            <Text style={styles.seeAllText}>Tout voir</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFA94D" />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {popularGroups.length > 0 ? (
              popularGroups.map((group, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.popularCard}
                  activeOpacity={0.9}
                  onPress={() => router.push({ pathname: `/community/[category]`, params: { category: group.name } })}
                >
                  <Image
                    source={{ uri: group.cover }}
                    style={styles.popularCardImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={styles.popularCardGradient}
                  >
                    <View style={styles.popularCardContent}>
                      <Text style={styles.popularCardTitle} numberOfLines={2}>{group.name}</Text>
                      <View style={styles.membersBadge}>
                        <Ionicons name="people" size={12} color="#FFA94D" />
                        <Text style={styles.membersText}>{group.members} membres</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun groupe disponible</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Section: Mes groupes */}
      {myGroups.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-circle" size={24} color="#FFA94D" />
              <Text style={styles.sectionTitle}>Mes groupes</Text>
            </View>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {myGroups.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.myGroupCard}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.groupId } })}
              >
                <View style={styles.myGroupIcon}>
                  <Ionicons name="library" size={28} color="#FFA94D" />
                </View>
                <Text style={styles.myGroupTitle} numberOfLines={2}>{item.groupId}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section: Catégories */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="grid" size={24} color="#FFA94D" />
            <Text style={styles.sectionTitle}>Catégories</Text>
          </View>
        </View>
        
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.categoryCard}
              onPress={() => router.push({ pathname: `/community/[category]`, params: { category: cat.name } })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={cat.color}
                style={styles.categoryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.categoryIconCircle}>
                  <Ionicons name={cat.icon as any} size={24} color="#fff" />
                </View>
                <Text style={styles.categoryTitle} numberOfLines={2}>{cat.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  header: {
    color: '#FFA94D',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#999',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  sectionContainer: {
    marginBottom: 32,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 0.2,
  },
  seeAllText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  // Cartes Groupes Populaires
  popularCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#232323',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  popularCardImage: {
    width: '100%',
    height: '100%',
  },
  popularCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 12,
  },
  popularCardContent: {
    gap: 8,
  },
  popularCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  membersText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  // Cartes Mes Groupes
  myGroupCard: {
    width: 140,
    height: 140,
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333',
    gap: 12,
  },
  myGroupIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myGroupTitle: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Grille de Catégories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  categoryGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
});