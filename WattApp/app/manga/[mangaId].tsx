// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { mangaService, MangaProject } from '../../services/MangaService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MangaDetail: React.FC = () => {
  const router = useRouter();
  const { mangaId } = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const [manga, setManga] = useState<MangaProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (mangaId) {
      loadMangaDetail();
    }
  }, [mangaId]);

  const loadMangaDetail = async () => {
    try {
      setLoading(true);
      const mangaData = await mangaService.getMangaProject(mangaId as string);
      setManga(mangaData);
    } catch (error) {
      console.error('Error loading manga:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du manga');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!manga) return;
    
    if (manga.isFree) {
      await mangaService.incrementDownloads(manga.id);
      router.push(`/(tabs)/manga/reader/${manga.id}` as any);
    } else {
      router.push(`/payment/${manga.id}` as any);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Gratuit';
    return `${price.toFixed(2)} ${currency}`;
  };

  const handleLike = async () => {
    setIsLiked(!isLiked);
    // TODO: Implement like functionality
  };

  // Animations pour le header
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!manga) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color="#666" />
        <Text style={styles.errorText}>Manga introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={80} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {manga?.title || ''}
            </Text>
            <TouchableOpacity onPress={handleLike} style={styles.headerButton}>
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={isLiked ? "#FF3B30" : "#fff"} 
              />
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {/* Floating Back Button */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLike} style={styles.floatingButton}>
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? "#FF3B30" : "#fff"} 
          />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hero Image with Parallax */}
        <Animated.View style={[styles.heroContainer, { transform: [{ translateY: imageTranslateY }] }]}>
          <Animated.Image
            source={{ uri: manga?.coverImageUrl || 'https://via.placeholder.com/400x600' }}
            style={[styles.heroImage, { transform: [{ scale: imageScale }] }]}
          />
          <LinearGradient
            colors={['transparent', 'rgba(24, 24, 24, 0.7)', '#181818']}
            style={styles.heroGradient}
          />
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>{manga?.title}</Text>
            <Text style={styles.authorName}>by {manga?.author}</Text>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={18} color="#FFD700" />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {manga?.rating_average ? manga.rating_average.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Note</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="eye" size={18} color="#4A90E2" />
              </View>
              <View>
                <Text style={styles.statValue}>{manga?.views || 0}</Text>
                <Text style={styles.statLabel}>Vues</Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="book" size={18} color="#FFA94D" />
              </View>
              <View>
                <Text style={styles.statValue}>{manga?.totalPages || 0}</Text>
                <Text style={styles.statLabel}>Pages</Text>
              </View>
            </View>
          </View>

          {/* Price Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceContent}>
              <Text style={styles.priceLabel}>Prix</Text>
              <Text style={styles.priceValue}>
                {manga ? formatPrice(manga.price, manga.currency) : '...'}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Ionicons name={manga?.isFree ? "gift" : "card"} size={20} color="#FFA94D" />
            </View>
          </View>

          {/* Genres */}
          {manga?.genre && manga.genre.length > 0 && (
            <View style={styles.genresSection}>
              <Text style={styles.sectionTitle}>Genres</Text>
              <View style={styles.genresGrid}>
                {manga.genre.slice(0, 4).map((genre, index) => (
                  <View key={index} style={styles.genreChip}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Synopsis */}
          <View style={styles.synopsisSection}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <View style={styles.synopsisCard}>
              <Text 
                style={styles.synopsisText} 
                numberOfLines={showFullDescription ? undefined : 5}
              >
                {manga?.synopsis || 'Aucune description disponible.'}
              </Text>
              {manga?.synopsis && manga.synopsis.length > 200 && (
                <TouchableOpacity 
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  style={styles.readMoreButton}
                >
                  <Text style={styles.readMoreText}>
                    {showFullDescription ? 'Voir moins' : 'Lire plus'}
                  </Text>
                  <Ionicons 
                    name={showFullDescription ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#FFA94D" 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push(`/(tabs)/manga/preview/${manga?.id}` as any)}
            >
              <Ionicons name="eye-outline" size={22} color="#FFA94D" />
              <Text style={styles.secondaryButtonText}>Aperçu gratuit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePurchase}
            >
              <LinearGradient
                colors={manga?.isFree ? ['#00C853', '#00E676'] : ['#FFA94D', '#FF6B35']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Ionicons 
                  name={manga?.isFree ? "book-outline" : "cart-outline"} 
                  size={22} 
                  color="#fff" 
                />
                <Text style={styles.primaryButtonText}>
                  {manga?.isFree ? 'Lire maintenant' : 'Acheter'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  
  // Animated Header
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBlur: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  
  // Floating Buttons
  floatingButtons: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 99,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  
  // Hero Section
  heroContainer: {
    width: screenWidth,
    height: screenHeight * 0.55,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  
  // Main Content
  mainContent: {
    marginTop: -40,
    paddingHorizontal: 20,
  },
  
  // Title Section
  titleSection: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 38,
    marginBottom: 8,
  },
  authorName: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#232329',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  
  // Price Card
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#232329',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2a2a30',
  },
  priceContent: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFA94D',
  },
  priceBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Genres Section
  genresSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  genreText: {
    color: '#181818',
    fontSize: 13,
    fontWeight: '700',
  },
  
  // Synopsis Section
  synopsisSection: {
    marginBottom: 24,
  },
  synopsisCard: {
    backgroundColor: '#232329',
    borderRadius: 16,
    padding: 20,
  },
  synopsisText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#ccc',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a30',
    gap: 6,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA94D',
  },
  
  // Actions
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#232329',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFA94D',
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  
  // Loading/Error States
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFA94D',
    borderRadius: 25,
  },
  backButtonText: {
    color: '#181818',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default MangaDetail;