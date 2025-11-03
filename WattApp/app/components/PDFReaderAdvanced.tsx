import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type PDFReaderAdvancedProps = {
  source: { uri: string };
  title?: string;
  totalPages?: number; // Peut être fourni de l'extérieur
};

export default function PDFReaderAdvanced({ 
  source, 
  title = 'Lecture PDF',
  totalPages: providedTotalPages 
}: PDFReaderAdvancedProps) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(providedTotalPages || 1);
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Simulation : dans une vraie implémentation, vous auriez un tableau d'URIs de pages
  const [pages] = useState<string[]>([
    source.uri, // Page 1 (le PDF original)
    source.uri, // Page 2 (même URI pour la simulation)
    source.uri, // Page 3
    source.uri, // Page 4
    source.uri, // Page 5
  ]);

  useEffect(() => {
    if (providedTotalPages) {
      setTotalPages(providedTotalPages);
    } else {
      // Auto-détection simulée du nombre de pages
      setTotalPages(pages.length);
    }
  }, [providedTotalPages, pages.length]);

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
      setShowPageInput(false);
      setPageInputValue('');
    } else {
      Alert.alert('Erreur', `La page doit être entre 1 et ${totalPages}`);
    }
  };

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum)) {
      goToPage(pageNum);
    } else {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de page valide');
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const retryLoad = () => {
    setIsLoading(true);
    setHasError(false);
  };

  // Obtenir l'URI de la page actuelle
  const getCurrentPageUri = () => {
    if (pages[currentPage - 1]) {
      return pages[currentPage - 1];
    }
    return source.uri;
  };

  if (hasError) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#181818" />
        
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
      
      {/* Header avec navigation */}
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
              setPageInputValue(currentPage.toString());
              setShowPageInput(true);
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

      {/* Contenu PDF */}
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
              key={`page-${currentPage}`} // Force re-render pour chaque page
              source={{ uri: getCurrentPageUri() }}
              style={[styles.pdfImage, { width: width - 40, height: height * 1.2 }]}
              contentFit="contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Indicateur de page */}
            <View style={styles.pageNumberOverlay}>
              <Text style={styles.pageNumberText}>Page {currentPage}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Boutons de navigation flottants */}
        {!isLoading && (
          <>
            {currentPage > 1 && (
              <TouchableOpacity 
                style={[styles.floatingNavButton, styles.leftNavButton]} 
                onPress={handlePreviousPage}
              >
                <Ionicons name="chevron-back" size={24} color="#FFA94D" />
              </TouchableOpacity>
            )}
            
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
              setPageInputValue(currentPage.toString());
              setShowPageInput(true);
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

      {/* Modal pour aller à une page spécifique */}
      <Modal
        visible={showPageInput}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPageInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Aller à la page</Text>
            <TextInput
              style={styles.pageInput}
              value={pageInputValue}
              onChangeText={setPageInputValue}
              placeholder={`1 à ${totalPages}`}
              placeholderTextColor="#888"
              keyboardType="numeric"
              autoFocus={true}
              onSubmitEditing={handlePageInputSubmit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowPageInput(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]} 
                onPress={handlePageInputSubmit}
              >
                <Text style={styles.confirmButtonText}>Aller</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFA94D" />
          <Text style={styles.loadingText}>Chargement de la page {currentPage}...</Text>
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
    position: 'relative',
  },
  pdfImage: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  pageNumberOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pageNumberText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: 'bold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pageInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 120,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  confirmButton: {
    backgroundColor: '#FFA94D',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
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