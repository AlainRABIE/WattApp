
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, getDocs, where, query as fsQuery, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useTheme';

const CATEGORIES = [
  { name: "Romance", color: "#FF6B9D", icon: "heart-outline", emoji: "💕" },
  { name: "Fanfiction", color: "#A78BFA", icon: "star-outline", emoji: "⭐" },
  { name: "Fiction", color: "#60A5FA", icon: "book-outline", emoji: "📚" },
  { name: "Ados", color: "#F472B6", icon: "school-outline", emoji: "🎓" },
  { name: "Action", color: "#EF4444", icon: "flash-outline", emoji: "⚡" },
  { name: "Aventure", color: "#10B981", icon: "compass-outline", emoji: "🌍" },
  { name: "Fantasy", color: "#8B5CF6", icon: "planet-outline", emoji: "🔮" },
  { name: "Mystère", color: "#3B82F6", icon: "eye-outline", emoji: "🔍" },
  { name: "Horreur", color: "#6366F1", icon: "skull-outline", emoji: "👻" },
  { name: "SF", color: "#06B6D4", icon: "rocket-outline", emoji: "🚀" },
  { name: "Poésie", color: "#EC4899", icon: "flower-outline", emoji: "🌸" },
  { name: "Humour", color: "#F59E0B", icon: "happy-outline", emoji: "😄" },
];

const { width } = Dimensions.get('window');


export default function CommunityIndex() {
  const { theme } = useTheme();
  const [myGroups, setMyGroups] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const router = useRouter();

  const popularGroups = [
    { name: 'Écrivains Passionnés', members: 1234, cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80' },
    { name: 'Critiques Littéraires', members: 856, cover: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' },
    { name: 'Créateurs de Manga', members: 2341, cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
    { name: 'Poètes Modernes', members: 567, cover: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80' },
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

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Communauté</Text>
          <Text style={styles.headerSubtitle}>Découvrez et rejoignez des groupes passionnants</Text>
          
          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une catégorie..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Groupes populaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="flame" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Groupes Populaires</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {popularGroups.map((group, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.popularCard}
                onPress={() => router.push({ pathname: `/community/[category]`, params: { category: group.name } })}
                activeOpacity={0.9}
              >
                <Image source={{ uri: group.cover }} style={styles.popularCardImage} />
                <View style={styles.popularCardOverlay}>
                  <Text style={styles.popularCardTitle}>{group.name}</Text>
                  <View style={styles.popularCardInfo}>
                    <Ionicons name="people" size={14} color={theme.colors.primary} />
                    <Text style={styles.popularCardMembers}>{group.members} membres</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mes groupes */}
        {myGroups.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="people-circle" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Mes Groupes</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/community/my-groups')}>
                <Text style={styles.seeAllText}>Gérer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {myGroups.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.myGroupCard}
                  onPress={() => router.push({ pathname: `/community/[category]`, params: { category: item.groupId } })}
                  activeOpacity={0.9}
                >
                  <View style={styles.myGroupCardContent}>
                    <Ionicons name="people" size={32} color={theme.colors.primary} />
                    <Text style={styles.myGroupCardTitle}>{item.groupId}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Catégories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="grid" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Catégories</Text>
            </View>
          </View>

          <View style={styles.categoriesGrid}>
            {filteredCategories.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.categoryCard}
                onPress={() => router.push({ pathname: `/community/[category]`, params: { category: cat.name } })}
                activeOpacity={0.9}
              >
                <View style={styles.categoryContent}>
                  <View style={styles.categoryRow}>
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <View style={[styles.categoryIconContainer, { backgroundColor: cat.color + '20' }]}>
                      <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                  </View>
                  <Text style={styles.categoryTitle}>{cat.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 16,
  },
  popularCard: {
    width: 240,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  popularCardImage: {
    width: '100%',
    height: '100%',
  },
  popularCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  popularCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  popularCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popularCardMembers: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  myGroupCard: {
    width: 160,
    height: 100,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  myGroupCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  myGroupCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    gap: 8,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryEmoji: {
    fontSize: 24,
  },
});