// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { mangaService, MangaProject } from '../../services/MangaService';

const { width: screenWidth } = Dimensions.get('window');

const MangaDetail: React.FC = () => {
  const router = useRouter();
  const { mangaId } = useLocalSearchParams();
  
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#FFD700" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#666" />
      );
    }
    
    return stars;
  };

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
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails</Text>
        <TouchableOpacity onPress={() => setIsLiked(!isLiked)}>
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? "#FF6B6B" : "#FFA94D"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover and Basic Info */}
        <View style={styles.topSection}>
          <View style={styles.coverContainer}>
            {manga.coverImageUrl ? (
              <Image source={{ uri: manga.coverImageUrl }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book-outline" size={60} color="#666" />
              </View>
            )}
          </View>
          
          <View style={styles.basicInfo}>
            <Text style={styles.title}>{manga.title}</Text>
            <Text style={styles.author}>par {manga.author}</Text>
            
            {/* Rating */}
            {manga.rating_average > 0 && (
              <View style={styles.ratingContainer}>
                <View style={styles.stars}>
                  {renderStars(manga.rating_average)}
                </View>
                <Text style={styles.ratingText}>
                  {manga.rating_average.toFixed(1)} ({manga.rating_count} avis)
                </Text>
              </View>
            )}
            
            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {formatPrice(manga.price, manga.currency)}
              </Text>
              {!manga.isFree && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-20%</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={20} color="#FFA94D" />
            <Text style={styles.statValue}>{manga.views || 0}</Text>
            <Text style={styles.statLabel}>Vues</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="download-outline" size={20} color="#FFA94D" />
            <Text style={styles.statValue}>{manga.downloads || 0}</Text>
            <Text style={styles.statLabel}>Téléchargements</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={20} color="#FFA94D" />
            <Text style={styles.statValue}>{manga.likes || 0}</Text>
            <Text style={styles.statLabel}>J'aime</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={20} color="#FFA94D" />
            <Text style={styles.statValue}>{manga.totalPages}</Text>
            <Text style={styles.statLabel}>Pages</Text>
          </View>
        </View>

        {/* Synopsis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.synopsis} numberOfLines={showFullDescription ? undefined : 4}>
            {manga.synopsis}
          </Text>
          {manga.synopsis.length > 200 && (
            <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
              <Text style={styles.showMoreText}>
                {showFullDescription ? 'Voir moins' : 'Voir plus'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {manga.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{manga.description}</Text>
          </View>
        )}

        {/* Genres and Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genres</Text>
          <View style={styles.genresContainer}>
            {manga.genre.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreTagText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {manga.tags.map((tag, index) => (
              <View key={index} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Catégorie:</Text>
              <Text style={styles.infoValue}>{manga.category}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Public:</Text>
              <Text style={styles.infoValue}>
                {manga.targetAudience === 'all' ? 'Tout public' : manga.targetAudience}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Classification:</Text>
              <Text style={styles.infoValue}>{manga.rating}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Langue:</Text>
              <Text style={styles.infoValue}>{manga.language}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Statut:</Text>
              <Text style={styles.infoValue}>{manga.status || 'En cours'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Publié le:</Text>
              <Text style={styles.infoValue}>
                {new Date(manga.publishDate).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Copyright */}
        {manga.copyrightInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Copyright</Text>
            <Text style={styles.copyrightText}>{manga.copyrightInfo}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => router.push(`/(tabs)/manga/preview/${manga.id}` as any)}
          >
            <Ionicons name="eye-outline" size={20} color="#FFA94D" />
            <Text style={styles.previewButtonText}>
              Aperçu ({manga.previewPages} pages)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.purchaseButton, manga.isFree && styles.freeButton]}
            onPress={handlePurchase}
          >
            <LinearGradient
              colors={manga.isFree ? ['#4CAF50', '#66BB6A'] : ['#FFA94D', '#FF8A65']}
              style={styles.purchaseGradient}
            >
              <Ionicons 
                name={manga.isFree ? "play-outline" : "card-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.purchaseButtonText}>
                {manga.isFree ? 'Lire gratuitement' : `Acheter ${formatPrice(manga.price, manga.currency)}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  content: {
    flex: 1,
  },
  
  // Top Section
  topSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  coverContainer: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
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
  basicInfo: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  author: {
    color: '#888',
    fontSize: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    color: '#888',
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  discountBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Stats
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#23232a',
    marginHorizontal: 20,
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
  },
  
  // Sections
  section: {
    padding: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  synopsis: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  showMoreText: {
    color: '#FFA94D',
    fontSize: 14,
    marginTop: 8,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Genres and Tags
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  genreTagText: {
    color: '#181818',
    fontSize: 12,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagChipText: {
    color: '#888',
    fontSize: 11,
  },
  
  // Info
  infoContainer: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
  },
  copyrightText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  
  // Actions
  actionsSection: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#FFA94D',
    gap: 8,
  },
  previewButtonText: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  freeButton: {},
  purchaseGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Loading/Error
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFA94D',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#181818',
    fontWeight: '600',
  },
});

export default MangaDetail;