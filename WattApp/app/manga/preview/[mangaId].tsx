// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  Alert,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { mangaService, MangaProject, MangaPage } from '../../../services/MangaService';
import MangaDrawingModal from '../../components/MangaDrawingModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MangaPreview: React.FC = () => {
  const router = useRouter();
  const { mangaId } = useLocalSearchParams();
  
  const [manga, setManga] = useState<MangaProject | null>(null);
  const [previewPages, setPreviewPages] = useState<MangaPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // État pour le modal de dessin
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<any>(null);
  const [currentPageImage, setCurrentPageImage] = useState<string>('');

  useEffect(() => {
    if (mangaId) {
      loadMangaPreview();
    }
  }, [mangaId]);

  const loadMangaPreview = async () => {
    try {
      setLoading(true);
      const mangaData = await mangaService.getMangaProject(mangaId as string);
      if (mangaData) {
        setManga(mangaData);
        // Get only preview pages
        const preview = mangaData.pages
          .filter(page => page.isPreview)
          .slice(0, mangaData.previewPages);
        setPreviewPages(preview);
      }
    } catch (error) {
      console.error('Error loading manga preview:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'aperçu du manga');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!manga) return;
    
    if (manga.isFree) {
      router.push(`/(tabs)/manga/reader/${manga.id}` as any);
    } else {
      router.push(`/payment/${manga.id}` as any);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Gratuit';
    return `${price.toFixed(2)} ${currency}`;
  };

  // Générer des panneaux factices pour les tests
  const generateMangaPanels = (pageIndex: number) => {
    const panels = [
      { id: 'panel-1', x: 20, y: 100, width: screenWidth * 0.4, height: 200 },
      { id: 'panel-2', x: screenWidth * 0.5, y: 100, width: screenWidth * 0.4, height: 200 },
      { id: 'panel-3', x: 20, y: 320, width: screenWidth * 0.85, height: 150 },
      { id: 'panel-4', x: 20, y: 490, width: screenWidth * 0.4, height: 180 },
      { id: 'panel-5', x: screenWidth * 0.5, y: 490, width: screenWidth * 0.4, height: 180 },
    ];
    return panels;
  };

  const handlePanelPress = (panel: any, pageImage: string) => {
    setSelectedPanel(panel);
    setCurrentPageImage(pageImage);
    setShowDrawingModal(true);
  };

  const handleSaveDrawing = (drawingData: any) => {
    console.log('Dessin sauvegardé:', drawingData);
    // Ici vous pouvez sauvegarder le dessin dans votre base de données
  };

  const renderPreviewPage = ({ item, index }: { item: MangaPage; index: number }) => {
    const panels = generateMangaPanels(index);
    
    return (
      <View style={styles.pageContainer as any}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.pageImage as any}
          resizeMode="contain"
        />
        
        {/* Panneaux de manga cliquables */}
        {panels.map((panel) => (
          <TouchableOpacity
            key={panel.id}
            style={[
              styles.mangaPanel,
              {
                position: 'absolute',
                left: panel.x,
                top: panel.y,
                width: panel.width,
                height: panel.height,
              }
            ]}
            onPress={() => handlePanelPress(panel, item.imageUrl)}
            activeOpacity={0.7}
          >
            <View style={styles.panelOverlay}>
              <Ionicons name="brush-outline" size={24} color="#fff" />
              <Text style={styles.panelText}>Dessiner ici</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Page number */}
        <View style={styles.pageIndicator as any}>
          <Text style={styles.pageNumber as any}>
            Aperçu {index + 1} / {previewPages.length}
          </Text>
        </View>
        
        {/* Preview watermark */}
        <View style={styles.watermark as any}>
          <Text style={styles.watermarkText as any}>APERÇU</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered] as any}>
        <StatusBar hidden />
        <Text style={styles.loadingText as any}>Chargement de l'aperçu...</Text>
      </View>
    );
  }

  if (!manga || previewPages.length === 0) {
    return (
      <View style={[styles.container, styles.centered] as any}>
        <StatusBar hidden />
        <Ionicons name="eye-off-outline" size={48} color="#666" />
        <Text style={styles.errorText as any}>Aucun aperçu disponible</Text>
        <TouchableOpacity style={styles.backButton as any} onPress={() => router.back()}>
          <Text style={styles.backButtonText as any}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.mangaTitle} numberOfLines={1}>
            {manga.title} - Aperçu
          </Text>
          <Text style={styles.pageProgress}>
            {previewPages.length} pages gratuites sur {manga.totalPages}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => router.push(`/manga/${manga.id}`)}>
          <Ionicons name="information-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Preview Pages */}
      <FlatList
        data={previewPages}
        renderItem={renderPreviewPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const newPage = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          setCurrentPage(newPage);
        }}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentPage + 1) / previewPages.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentPage + 1} / {previewPages.length}
          </Text>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Vous aimez ce que vous voyez ?</Text>
            <Text style={styles.ctaSubtitle}>
              {manga.isFree 
                ? `Lisez les ${manga.totalPages - previewPages.length} pages restantes gratuitement !`
                : `Achetez maintenant pour lire les ${manga.totalPages - previewPages.length} pages restantes`
              }
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {formatPrice(manga.price, manga.currency)}
              </Text>
              {!manga.isFree && (
                <View style={styles.savingsContainer}>
                  <Text style={styles.originalPrice}>4.99 EUR</Text>
                  <Text style={styles.savings}>Économisez 20%</Text>
                </View>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.purchaseButton}
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
                {manga.isFree ? 'Lire gratuitement' : 'Acheter maintenant'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="download-outline" size={16} color="#FFA94D" />
            <Text style={styles.featureText}>Téléchargement illimité</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="phone-portrait-outline" size={16} color="#FFA94D" />
            <Text style={styles.featureText}>Lecture hors ligne</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#FFA94D" />
            <Text style={styles.featureText}>Qualité HD</Text>
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
            onPress={() => {
              if (currentPage > 0) {
                setCurrentPage(currentPage - 1);
              }
            }}
            disabled={currentPage === 0}
          >
            <Ionicons 
              name="chevron-back" 
              size={20} 
              color={currentPage === 0 ? "#444" : "#fff"} 
            />
            <Text style={[
              styles.navButtonText, 
              currentPage === 0 && styles.navButtonTextDisabled
            ]}>
              Précédent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton, 
              currentPage === previewPages.length - 1 && styles.navButtonDisabled
            ]}
            onPress={() => {
              if (currentPage < previewPages.length - 1) {
                setCurrentPage(currentPage + 1);
              } else {
                // Show purchase prompt at the end
                Alert.alert(
                  'Fin de l\'aperçu',
                  `Voulez-vous ${manga.isFree ? 'lire' : 'acheter'} le manga complet ?`,
                  [
                    { text: 'Plus tard', style: 'cancel' },
                    { 
                      text: manga.isFree ? 'Lire' : 'Acheter', 
                      onPress: handlePurchase 
                    }
                  ]
                );
              }
            }}
          >
            <Text style={[
              styles.navButtonText, 
              currentPage === previewPages.length - 1 && styles.navButtonTextDisabled
            ]}>
              {currentPage === previewPages.length - 1 ? 'Acheter' : 'Suivant'}
            </Text>
            <Ionicons 
              name={currentPage === previewPages.length - 1 ? "card-outline" : "chevron-forward"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de dessin */}
      <MangaDrawingModal
        visible={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        backgroundImage={currentPageImage}
        panelData={selectedPanel}
        onSaveDrawing={handleSaveDrawing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    gap: 16,
  },
  titleContainer: {
    flex: 1,
  },
  mangaTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pageProgress: {
    color: '#888',
    fontSize: 12,
  },
  
  // Pages
  pageContainer: {
    width: screenWidth,
    height: screenHeight - 200, // Space for bottom section
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pageImage: {
    width: screenWidth * 0.9,
    height: '100%',
  },
  pageIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pageNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -15 }],
    backgroundColor: 'rgba(255, 169, 77, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watermarkText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Panneaux de manga
  mangaPanel: {
    borderWidth: 2,
    borderColor: 'rgba(255, 169, 77, 0.8)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelOverlay: {
    alignItems: 'center',
    gap: 4,
  },
  panelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Bottom Section
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(24, 24, 24, 0.95)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  
  // Progress
  progressContainer: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFA94D',
    borderRadius: 2,
  },
  progressText: {
    color: '#888',
    fontSize: 12,
  },
  
  // CTA
  ctaContainer: {
    marginBottom: 16,
  },
  ctaContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: 'center',
    gap: 4,
  },
  price: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  savings: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  purchaseButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
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
  
  // Features
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  feature: {
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    color: '#888',
    fontSize: 10,
  },
  
  // Navigation
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  navButtonDisabled: {
    backgroundColor: 'transparent',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#444',
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
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFA94D',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#000',
    fontWeight: '600',
  },
});

export default MangaPreview;