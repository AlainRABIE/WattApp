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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { mangaService, MangaProject, MangaPage } from '../../../services/MangaService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MangaReader: React.FC = () => {
  const router = useRouter();
  const { mangaId } = useLocalSearchParams();
  
  const [manga, setManga] = useState<MangaProject | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [readingMode, setReadingMode] = useState<'page' | 'scroll'>('page');

  useEffect(() => {
    if (mangaId) {
      loadManga();
    }
  }, [mangaId]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  const loadManga = async () => {
    try {
      setLoading(true);
      const mangaData = await mangaService.getMangaProject(mangaId as string);
      setManga(mangaData);
    } catch (error) {
      console.error('Error loading manga:', error);
      Alert.alert('Erreur', 'Impossible de charger le manga');
    } finally {
      setLoading(false);
    }
  };

  const handlePagePress = () => {
    setShowControls(!showControls);
  };

  const goToNextPage = () => {
    if (manga && currentPage < manga.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderPage = ({ item, index }: { item: MangaPage; index: number }) => (
    <TouchableOpacity
      style={styles.pageContainer}
      activeOpacity={1}
      onPress={handlePagePress}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.pageImage}
        resizeMode="contain"
      />
      
      {/* Page number indicator */}
      <View style={styles.pageIndicator}>
        <Text style={styles.pageNumber}>{index + 1} / {manga?.pages.length}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderScrollPage = ({ item, index }: { item: MangaPage; index: number }) => (
    <View style={styles.scrollPageContainer}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.scrollPageImage}
        resizeMode="contain"
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar hidden />
        <Text style={styles.loadingText}>Chargement du manga...</Text>
      </View>
    );
  }

  if (!manga || manga.pages.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar hidden />
        <Ionicons name="alert-circle-outline" size={48} color="#666" />
        <Text style={styles.errorText}>Aucune page disponible</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {readingMode === 'page' ? (
        <FlatList
          data={manga.pages}
          renderItem={renderPage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentPage}
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
      ) : (
        <FlatList
          data={manga.pages}
          renderItem={renderScrollPage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Controls Overlay */}
      {showControls && (
        <View style={styles.controlsOverlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.mangaTitle} numberOfLines={1}>
                {manga.title}
              </Text>
              <Text style={styles.pageProgress}>
                Page {currentPage + 1} sur {manga.pages.length}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => setReadingMode(readingMode === 'page' ? 'scroll' : 'page')}
            >
              <Ionicons 
                name={readingMode === 'page' ? "list-outline" : "document-outline"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Bar (only in page mode) */}
          {readingMode === 'page' && (
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
                onPress={goToPrevPage}
                disabled={currentPage === 0}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={24} 
                  color={currentPage === 0 ? "#444" : "#fff"} 
                />
                <Text style={[
                  styles.navButtonText, 
                  currentPage === 0 && styles.navButtonTextDisabled
                ]}>
                  Précédent
                </Text>
              </TouchableOpacity>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${((currentPage + 1) / manga.pages.length) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.round(((currentPage + 1) / manga.pages.length) * 100)}%
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.navButton, 
                  currentPage === manga.pages.length - 1 && styles.navButtonDisabled
                ]}
                onPress={goToNextPage}
                disabled={currentPage === manga.pages.length - 1}
              >
                <Text style={[
                  styles.navButtonText, 
                  currentPage === manga.pages.length - 1 && styles.navButtonTextDisabled
                ]}>
                  Suivant
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={currentPage === manga.pages.length - 1 ? "#444" : "#fff"} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Page Navigation Areas (invisible touch zones) */}
      {readingMode === 'page' && !showControls && (
        <>
          <TouchableOpacity
            style={[styles.navZone, styles.leftNavZone]}
            onPress={goToPrevPage}
            activeOpacity={0}
          />
          <TouchableOpacity
            style={[styles.navZone, styles.rightNavZone]}
            onPress={goToNextPage}
            activeOpacity={0}
          />
        </>
      )}
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
  
  // Page Mode
  pageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: {
    width: screenWidth,
    height: screenHeight,
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
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
  
  // Scroll Mode
  scrollPageContainer: {
    width: screenWidth,
    marginBottom: 8,
  },
  scrollPageImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 0.7, // Typical manga page ratio
  },
  
  // Controls
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
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
    color: '#fff',
    fontSize: 10,
  },
  
  // Navigation Zones
  navZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: screenWidth * 0.3,
  },
  leftNavZone: {
    left: 0,
  },
  rightNavZone: {
    right: 0,
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

export default MangaReader;