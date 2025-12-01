
import { getAuth } from 'firebase/auth';
import { db } from '../../constants/firebaseConfig';
import { collectionGroup, getDocs, where, query as fsQuery, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const CATEGORIES = [
  { name: "Roman d'amour", color: ["#FF6B9D", "#FF8E9E"], icon: "heart" },
  { name: "Fanfiction", color: ["#6DD5FA", "#2980B9"], icon: "star" },
  { name: "Fiction générale", color: ["#F7971E", "#FFD200"], icon: "book" },
  { name: "Roman pour adolescents", color: ["#F857A6", "#FF5858"], icon: "school" },
  { name: "Aléatoire", color: ["#43CEA2", "#185A9D"], icon: "shuffle" },
  { name: "Action", color: ["#FF5858", "#FBCA1F"], icon: "flash" },
  { name: "Aventure", color: ["#36D1C4", "#1E5799"], icon: "compass" },
  { name: "Nouvelles", color: ["#B06AB3", "#4568DC"], icon: "newspaper" },
  { name: "Fantasy", color: ["#F7971E", "#FFD200"], icon: "planet" },
  { name: "Non-Fiction", color: ["#43CEA2", "#185A9D"], icon: "library" },
  { name: "Fantastique", color: ["#F857A6", "#FF5858"], icon: "sparkles" },
  { name: "Mystère", color: ["#6DD5FA", "#2980B9"], icon: "eye" },
];

const { width } = Dimensions.get('window');


export default function CommunityIndex() {
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Communauté</Text>
          <Text style={styles.headerSubtitle}>Découvrez et rejoignez des groupes passionnants</Text>
          
          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une catégorie..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#888" />
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
              <Ionicons name="flame" size={24} color="#FFA94D" />
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
                    <Ionicons name="people" size={14} color="#FFA94D" />
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
                <Ionicons name="people-circle" size={24} color="#FFA94D" />
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
                    <Ionicons name="people" size={32} color="#FFA94D" />
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
              <Ionicons name="grid" size={24} color="#FFA94D" />
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
                <View style={[styles.categoryContent, { backgroundColor: cat.color[0] }]}>
                  <View style={styles.categoryIconContainer}>
                    <Ionicons name={cat.icon as any} size={28} color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerContent: {
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
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
    color: '#fff',
  },
  seeAllText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 16,
  },
  popularCard: {
    width: 280,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#232323',
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
    color: '#fff',
    marginBottom: 4,
  },
  popularCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popularCardMembers: {
    fontSize: 13,
    color: '#FFA94D',
    fontWeight: '600',
  },
  myGroupCard: {
    width: 160,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    color: '#fff',
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
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});