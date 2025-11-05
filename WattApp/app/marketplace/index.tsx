import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { mangaService, MangaProject } from '../../services/MangaService';

const MangaMarketplace: React.FC = () => {
  const router = useRouter();
  
  const [manga, setManga] = useState<MangaProject[]>([]);
  const [filteredManga, setFilteredManga] = useState<MangaProject[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'publishDate' | 'views' | 'rating_average'>('publishDate');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    'all', 'Shonen', 'Shojo', 'Seinen', 'Josei', 'Kodomomuke',
    'Action', 'Aventure', 'Comédie', 'Drame', 'Fantasy',
    'Horreur', 'Romance', 'Science-Fiction', 'Slice of Life',
    'Sports', 'Thriller', 'Historique', 'Surnaturel'
  ];

  const genres = [
    'all', 'Action', 'Aventure', 'Comédie', 'Drame', 'Ecchi',
    'Fantasy', 'Horreur', 'Josei', 'Mecha', 'Musique',
    'Mystère', 'Psychologique', 'Romance', 'École',
    'Science-Fiction', 'Seinen', 'Shojo', 'Shonen',
    'Slice of Life', 'Sports', 'Surnaturel', 'Thriller'
  ];

  const sortOptions = [
    { key: 'publishDate', label: 'Plus récents' },
    { key: 'views', label: 'Plus vus' },
    { key: 'rating_average', label: 'Mieux notés' },
  ];

  useEffect(() => {
    loadManga();
  }, [selectedCategory, selectedGenre, sortBy]);

  useEffect(() => {
    filterManga();
  }, [manga, searchText]);

  const loadManga = async () => {
    try {
      setLoading(true);
      const publishedManga = await mangaService.getPublishedManga(
        selectedCategory === 'all' ? undefined : selectedCategory,
        selectedGenre === 'all' ? undefined : selectedGenre,
        50,
        sortBy
      );
      setManga(publishedManga);
    } catch (error) {
      console.error('Error loading manga:', error);
      Alert.alert('Erreur', 'Impossible de charger les mangas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadManga();
    setRefreshing(false);
  };

  const filterManga = () => {
    let filtered = manga;
    
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = manga.filter(m => 
        m.title.toLowerCase().includes(search) ||
        m.author.toLowerCase().includes(search) ||
        m.synopsis.toLowerCase().includes(search) ||
        m.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    setFilteredManga(filtered);
  };

  const handleMangaPress = (mangaItem: MangaProject) => {
    // Increment views
    mangaService.incrementViews(mangaItem.id);
    
    // For now, navigate to detail page using book route structure
    router.push(`/book/${mangaItem.id}`);
  };

  const handlePurchase = async (mangaItem: MangaProject) => {
    if (mangaItem.isFree) {
      // For free manga, just show success message for now
      await mangaService.incrementDownloads(mangaItem.id);
      Alert.alert('Succès', 'Lecture gratuite activée !');
    } else {
      // For paid manga, navigate to existing payment system
      router.push(`/payment/${mangaItem.id}`);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Gratuit';
    return `${price.toFixed(2)} ${currency}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={12} color="#FFD700" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#FFD700" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#666" />
      );
    }
    
    return stars;
  };

  const renderMangaCard = ({ item }: { item: MangaProject }) => (
    <TouchableOpacity
      style={styles.mangaCard}
      onPress={() => handleMangaPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.mangaCover}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book-outline" size={40} color="#666" />
          </View>
        )}
        
        {/* Free/Paid badge */}
        <View style={[styles.priceBadge, item.isFree ? styles.freeBadge : styles.paidBadge]}>
          <Text style={styles.priceBadgeText}>
            {item.isFree ? 'GRATUIT' : formatPrice(item.price, item.currency)}
          </Text>
        </View>
        
        {/* Rating badge */}
        {item.rating_average > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingBadgeText}>{item.rating_average.toFixed(1)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.mangaInfo}>
        <Text style={styles.mangaTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.mangaAuthor} numberOfLines={1}>par {item.author}</Text>
        <Text style={styles.mangaSynopsis} numberOfLines={3}>{item.synopsis}</Text>
        
        <View style={styles.mangaStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={14} color="#888" />
            <Text style={styles.statText}>{item.views || 0}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="download-outline" size={14} color="#888" />
            <Text style={styles.statText}>{item.downloads || 0}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={14} color="#888" />
            <Text style={styles.statText}>{item.likes || 0}</Text>
          </View>
        </View>
        
        <View style={styles.mangaGenres}>
          {item.genre.slice(0, 3).map((genre, index) => (
            <View key={index} style={styles.genreTag}>
              <Text style={styles.genreTagText}>{genre}</Text>
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, item.isFree ? styles.freeButton : styles.buyButton]}
          onPress={() => handlePurchase(item)}
        >
          <Ionicons 
            name={item.isFree ? "play-outline" : "card-outline"} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.actionButtonText}>
            {item.isFree ? 'Lire' : 'Acheter'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterRow}>
          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={styles.filterLabel}>Trier par:</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.sortOptionSelected
                ]}
                onPress={() => setSortBy(option.key as any)}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.key && styles.sortOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipSelected
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextSelected
            ]}>
              {category === 'all' ? 'Tous' : category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Genres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
        {genres.map((genre) => (
          <TouchableOpacity
            key={genre}
            style={[
              styles.genreChip,
              selectedGenre === genre && styles.genreChipSelected
            ]}
            onPress={() => setSelectedGenre(genre)}
          >
            <Text style={[
              styles.genreChipText,
              selectedGenre === genre && styles.genreChipTextSelected
            ]}>
              {genre === 'all' ? 'Tous' : genre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace Manga</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Rechercher des mangas..."
            placeholderTextColor="#666"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Results Count */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {filteredManga.length} manga{filteredManga.length > 1 ? 's' : ''} trouvé{filteredManga.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Manga Grid */}
      <FlatList
        data={filteredManga}
        renderItem={renderMangaCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.mangaGrid}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFA94D"
            colors={['#FFA94D']}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color="#666" />
              <Text style={styles.emptyStateText}>Aucun manga trouvé</Text>
              <Text style={styles.emptyStateSubtext}>
                Essayez de modifier vos critères de recherche
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  
  // Filters
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  sortOptionSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  sortOptionText: {
    color: '#888',
    fontSize: 12,
  },
  sortOptionTextSelected: {
    color: '#181818',
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#333',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryChipSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  categoryChipText: {
    color: '#888',
    fontSize: 12,
  },
  categoryChipTextSelected: {
    color: '#181818',
    fontWeight: '600',
  },
  genreScroll: {},
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#333',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#444',
  },
  genreChipSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  genreChipText: {
    color: '#888',
    fontSize: 10,
  },
  genreChipTextSelected: {
    color: '#181818',
    fontWeight: '600',
  },
  
  // Results
  resultsInfo: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultsText: {
    color: '#888',
    fontSize: 14,
  },
  
  // Manga Grid
  mangaGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  mangaCard: {
    width: '48%',
    backgroundColor: '#23232a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mangaCover: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  paidBadge: {
    backgroundColor: 'rgba(255, 169, 77, 0.9)',
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Manga Info
  mangaInfo: {
    padding: 12,
  },
  mangaTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mangaAuthor: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  mangaSynopsis: {
    color: '#ccc',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  mangaStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#888',
    fontSize: 10,
  },
  mangaGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  genreTag: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genreTagText: {
    color: '#888',
    fontSize: 9,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  freeButton: {
    backgroundColor: '#4CAF50',
  },
  buyButton: {
    backgroundColor: '#FFA94D',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MangaMarketplace;