import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, getDocs, where, query as fsQuery, onSnapshot, collection, getCountFromServer } from 'firebase/firestore';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORIES = [
  { name: "Roman d'amour", icon: "heart-circle", emoji: "💕", color: ["#FF6B9D", "#FFA94D"] as const, description: "Histoires romantiques" },
  { name: "Fanfiction", icon: "star-half", emoji: "✨", color: ["#6DD5FA", "#2980B9"] as const, description: "Univers alternatifs" },
  { name: "Fiction générale", icon: "book", emoji: "📚", color: ["#F7971E", "#FFD200"] as const, description: "Tous les genres" },
  { name: "Roman pour adolescents", icon: "school", emoji: "🎓", color: ["#F857A6", "#FF5858"] as const, description: "Jeune adulte" },
  { name: "Aléatoire", icon: "shuffle", emoji: "🎲", color: ["#43CEA2", "#185A9D"] as const, description: "Discussions libres" },
  { name: "Action", icon: "flash", emoji: "⚡", color: ["#FF5858", "#FBCA1F"] as const, description: "Aventure intense" },
  { name: "Aventure", icon: "compass", emoji: "🧭", color: ["#36D1C4", "#1E5799"] as const, description: "Explorez le monde" },
  { name: "Nouvelles", icon: "newspaper", emoji: "📰", color: ["#B06AB3", "#4568DC"] as const, description: "Courtes histoires" },
  { name: "Fantasy", icon: "planet", emoji: "🔮", color: ["#F7971E", "#FFD200"] as const, description: "Magie & dragons" },
  { name: "Non-Fiction", icon: "reader", emoji: "📖", color: ["#43CEA2", "#185A9D"] as const, description: "Histoires vraies" },
  { name: "Fantastique", icon: "rocket", emoji: "🚀", color: ["#F857A6", "#FF5858"] as const, description: "Science-fiction" },
  { name: "Mystère", icon: "eye", emoji: "🕵️", color: ["#6DD5FA", "#2980B9"] as const, description: "Énigmes & suspense" },
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
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  // Animation d'entrée
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Background gradient animé */}
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface, theme.colors.surface]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Header Hero Section */}
        <Animated.View style={[styles.heroContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={[`${theme.colors.primary}26`, 'transparent']}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.secondary]}
                  style={styles.heroIconGradient}
                >
                  <MaterialCommunityIcons name="account-group" size={32} color={theme.colors.background} />
                </LinearGradient>
              </View>
              <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Communauté</Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>Connectez-vous avec des passionnés d'écriture</Text>
              
              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{popularGroups.length > 0 ? popularGroups.reduce((sum, g) => sum + g.memberCount, 0) : '0'}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Membres</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: `${theme.colors.primary}33` }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{CATEGORIES.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Catégories</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: `${theme.colors.primary}33` }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{myGroups.length}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Mes Groupes</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Section: Groupes populaires */}
        <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: `${theme.colors.primary}26` }]}>
                <Ionicons name="flame" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Groupes Populaires</Text>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Chargement...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {popularGroups.length > 0 ? (
                popularGroups.map((group, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.popularCard, { backgroundColor: theme.colors.surface, borderColor: `${theme.colors.primary}26` }]}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: `/community/[category]`, params: { category: group.name } })}
                  >
                    <Image
                      source={{ uri: group.cover }}
                      style={styles.popularCardImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.95)']}
                      style={styles.popularCardGradient}
                    >
                      <BlurView intensity={10} tint="dark" style={styles.popularCardBlur}>
                        <View style={styles.popularCardContent}>
                          <Text style={[styles.popularCardTitle, { color: theme.colors.text }]} numberOfLines={2}>{group.name}</Text>
                          <View style={styles.membersBadge}>
                            <MaterialCommunityIcons name="account-multiple" size={14} color={theme.colors.primary} />
                            <Text style={styles.membersText}>{group.members}</Text>
                          </View>
                        </View>
                      </BlurView>
                    </LinearGradient>
                    
                    {/* Glow effect */}
                    <View style={styles.cardGlow} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="chat-alert-outline" size={48} color="#333" />
                  <Text style={styles.emptyText}>Aucun groupe disponible</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>

        {/* Section: Mes groupes */}
        {myGroups.length > 0 && (
          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconContainer, { backgroundColor: `${theme.colors.primary}26` }]}>
                  <MaterialCommunityIcons name="account-group" size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mes Groupes</Text>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {myGroups.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.myGroupCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.groupId } })}
                >
                  <BlurView intensity={20} tint="dark" style={styles.myGroupBlur}>
                    <LinearGradient
                      colors={[`${theme.colors.primary}26`, `${theme.colors.secondary}0D`]}
                      style={styles.myGroupGradient}
                    >
                      <View style={styles.myGroupIcon}>
                        <MaterialCommunityIcons name="library" size={28} color={theme.colors.primary} />
                      </View>
                      <Text style={[styles.myGroupTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.groupId}</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} style={styles.myGroupArrow} />
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Section: Catégories */}
        <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: `${theme.colors.primary}26` }]}>
                <MaterialCommunityIcons name="view-grid" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Explorer</Text>
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
                  colors={[...cat.color, cat.color[1] + 'DD']}
                  style={styles.categoryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <BlurView intensity={15} tint="dark" style={styles.categoryBlur}>
                    <View style={styles.categoryContent}>
                      <View style={styles.categoryTop}>
                        <View style={styles.categoryIconCircle}>
                          <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
                      </View>
                      <View style={styles.categoryBottom}>
                        <Text style={styles.categoryTitle} numberOfLines={2}>{cat.name}</Text>
                        <Text style={styles.categoryDescription} numberOfLines={1}>{cat.description}</Text>
                      </View>
                    </View>
                  </BlurView>
                  
                  {/* Shine effect */}
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.categoryShine}
                  />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollView: {
    flex: 1,
  },
  
  // Hero Section
  heroContainer: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.1)',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: 16,
  },
  heroIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#999',
    fontSize: 15,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 169, 77, 0.05)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
  },
  
  // Sections
  sectionContainer: {
    marginBottom: 32,
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
    gap: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
  },
  seeAllText: {
    color: '#FFA94D',
    fontSize: 13,
    fontWeight: '700',
  },
  horizontalList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  
  // Popular Cards
  popularCard: {
    width: 180,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.15)',
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
    height: '50%',
  },
  popularCardBlur: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  popularCardContent: {
    gap: 8,
  },
  popularCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  membersText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '700',
  },
  cardGlow: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    right: -20,
    height: 60,
    backgroundColor: '#FFA94D',
    opacity: 0.15,
    borderRadius: 40,
    transform: [{ scaleX: 0.8 }],
  },
  
  // My Group Cards
  myGroupCard: {
    width: 160,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 169, 77, 0.2)',
  },
  myGroupBlur: {
    flex: 1,
  },
  myGroupGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myGroupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 169, 77, 0.3)',
  },
  myGroupTitle: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  myGroupArrow: {
    marginTop: 8,
    opacity: 0.6,
  },
  
  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryGradient: {
    flex: 1,
  },
  categoryBlur: {
    flex: 1,
    padding: 16,
  },
  categoryContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryBottom: {
    gap: 4,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  categoryDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryShine: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: 0,
    height: '100%',
    width: 100,
    opacity: 0.5,
  },
  
  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});