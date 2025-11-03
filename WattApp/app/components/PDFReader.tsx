import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type PDFReaderProps = {
  source: { uri: string };
  title?: string;
  pagesImagePaths?: string[]; // URIs des pages extraites
  totalPages?: number; // Nombre total de pages
};

export default function PDFReader({ 
  source, 
  title = 'Lecture PDF', 
  pagesImagePaths,
  totalPages: initialTotalPages 
}: PDFReaderProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages || pagesImagePaths?.length || 1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Détermine si on utilise les pages extraites ou le PDF original
  const usePagesImages = pagesImagePaths && pagesImagePaths.length > 0;
  
  // Source de l'image à afficher
  const getCurrentImageSource = () => {
    if (usePagesImages && pagesImagePaths) {
      const pageIndex = currentPage - 1;
      return { uri: pagesImagePaths[pageIndex] };
    }
    return source; // Fallback sur le PDF original
  };

  const handleBack = () => {
    router.back();
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.25, 3);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    setZoom(newZoom);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    // Simuler la détection du nombre de pages (en réalité, expo-image ne peut pas déterminer cela automatiquement)
    // Pour l'instant, on simule 5 pages par défaut
    setTotalPages(5);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
  };

  if (hasError) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#181818" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFA94D" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={80} color="#666" />
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>
            Impossible de charger le PDF. Vérifiez votre connexion internet et réessayez.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={retryLoad}>
            <Text style={styles.errorButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.pageInfo}>
            Page {currentPage} sur {totalPages} • Zoom: {Math.round(zoom * 100)}%
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handlePreviousPage} 
            style={[styles.headerButton, { opacity: currentPage > 1 ? 1 : 0.3 }]}
            disabled={currentPage <= 1}
          >
            <Ionicons name="chevron-back" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              // Optionnel : menu pour aller directement à une page
            }}
            style={styles.pageIndicator}
          >
            <Text style={styles.pageText}>{currentPage}/{totalPages}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleNextPage} 
            style={[styles.headerButton, { opacity: currentPage < totalPages ? 1 : 0.3 }]}
            disabled={currentPage >= totalPages}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity onPress={handleZoomOut} style={styles.headerButton}>
            <Ionicons name="remove" size={20} color="#FFA94D" />
          </TouchableOpacity>
          
          <View style={styles.zoomIndicator}>
            <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
          </View>
          
          <TouchableOpacity onPress={handleZoomIn} style={styles.headerButton}>
            <Ionicons name="add" size={20} color="#FFA94D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.pdfContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={true}
          maximumZoomScale={3}
          minimumZoomScale={0.5}
          bounces={false}
        >
          <View style={[styles.imageContainer, { transform: [{ scale: zoom }] }]}>
            <Image
              source={getCurrentImageSource()}
              style={[styles.pdfImage, { width: width - 40, height: height * 1.2 }]}
              contentFit="contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {/* Overlay pour simuler différentes pages - seulement si on n'a pas de pages extraites */}
            {!usePagesImages && currentPage > 1 && (
              <View style={styles.pageOverlay}>
                <Text style={styles.pageOverlayText}>
                  Simulation Page {currentPage}
                </Text>
                <Text style={styles.pageOverlaySubtext}>
                  (En réalité, expo-image affiche seulement la première page du PDF)
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Boutons de navigation flottants */}
        {!isLoading && (
          <>
            {/* Bouton page précédente */}
            {currentPage > 1 && (
              <TouchableOpacity 
                style={[styles.floatingNavButton, styles.leftNavButton]} 
                onPress={handlePreviousPage}
              >
                <Ionicons name="chevron-back" size={24} color="#FFA94D" />
              </TouchableOpacity>
            )}
            
            {/* Bouton page suivante */}
            {currentPage < totalPages && (
              <TouchableOpacity 
                style={[styles.floatingNavButton, styles.rightNavButton]} 
                onPress={handleNextPage}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFA94D" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Barre de navigation en bas */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          onPress={handlePreviousPage} 
          style={[styles.navButton, { opacity: currentPage > 1 ? 1 : 0.3 }]}
          disabled={currentPage <= 1}
        >
          <Ionicons name="chevron-back" size={24} color="#FFA94D" />
          <Text style={styles.navButtonText}>Précédent</Text>
        </TouchableOpacity>
        
        <View style={styles.pageIndicatorLarge}>
          <TouchableOpacity 
            onPress={() => {
              // Optionnel : ouvrir un modal pour saisir le numéro de page
            }}
          >
            <Text style={styles.pageTextLarge}>{currentPage}</Text>
            <Text style={styles.pageTotalText}>sur {totalPages}</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={handleNextPage} 
          style={[styles.navButton, { opacity: currentPage < totalPages ? 1 : 0.3 }]}
          disabled={currentPage >= totalPages}
        >
          <Ionicons name="chevron-forward" size={24} color="#FFA94D" />
          <Text style={styles.navButtonText}>Suivant</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFA94D" />
          <Text style={styles.loadingText}>Chargement du PDF...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  title: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pageInfo: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  pageIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  pageText: {
    color: '#FFA94D',
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#444',
    marginHorizontal: 8,
  },
  zoomIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  zoomText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 35,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfImage: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  pageOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.9)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  pageOverlayText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pageOverlaySubtext: {
    color: '#181818',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  floatingNavButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
  },
  leftNavButton: {
    left: 20,
  },
  rightNavButton: {
    right: 20,
  },
  bottomNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#232323',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  pageIndicatorLarge: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pageTextLarge: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageTotalText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(24, 24, 24, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFA94D',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
