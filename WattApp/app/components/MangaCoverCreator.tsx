import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

interface MangaCoverCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSaveCover: (coverData: { type: 'drawn' | 'imported'; uri: string; title?: string }) => void;
  initialTitle?: string;
}

interface DrawingPath {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
}

const MangaCoverCreator: React.FC<MangaCoverCreatorProps> = ({
  visible,
  onClose,
  onSaveCover,
  initialTitle = ''
}) => {
  const [coverType, setCoverType] = useState<'draw' | 'import' | null>(null);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser'>('pen');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [importedImage, setImportedImage] = useState<string | null>(null);
  const [coverTitle, setCoverTitle] = useState(initialTitle);
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  
  const coverRef = useRef<ViewShot>(null);

  const coverWidth = width * 0.8;
  const coverHeight = coverWidth * 1.4; // Ratio manga typique

  // Couleurs prédéfinies
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ];

  const backgroundColors = [
    '#FFFFFF', '#F0F0F0', '#FFE4E1', '#E0FFFF', '#F0FFF0',
    '#FFF8DC', '#FFFACD', '#E6E6FA', '#FFE4B5', '#FFEFD5'
  ];

  const strokeWidths = [1, 2, 3, 5, 8, 12];

  const resetCover = () => {
    setPaths([]);
    setCurrentPath('');
    setImportedImage(null);
    setCoverTitle(initialTitle);
    setCoverType(null);
  };

  const handleClose = () => {
    resetCover();
    onClose();
  };

  // Gestion du dessin
  const onTouchStart = (x: number, y: number) => {
    if (!isDrawing || coverType !== 'draw') return;
    
    setCurrentPath(`M${x},${y}`);
  };

  const onTouchMove = (x: number, y: number) => {
    if (!isDrawing || coverType !== 'draw') return;
    
    setCurrentPath(prev => `${prev} L${x},${y}`);
  };

  const onTouchEnd = () => {
    if (!isDrawing || !currentPath || coverType !== 'draw') return;

    const newPath: DrawingPath = {
      id: Date.now().toString(),
      d: currentPath,
      stroke: selectedTool === 'eraser' ? backgroundColor : strokeColor,
      strokeWidth: selectedTool === 'eraser' ? strokeWidth * 2 : strokeWidth,
    };

    setPaths(prev => [...prev, newPath]);
    setCurrentPath('');
  };

  // Import d'image
  const handleImageImport = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4.2], // Ratio manga
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImportedImage(result.assets[0].uri);
      setCoverType('import');
    }
  };

  // Capture de la couverture
  const captureCover = async () => {
    if (!coverRef.current) return;

    try {
      const uri = await coverRef.current.capture();
      
      const coverData = {
        type: coverType === 'draw' ? 'drawn' as const : 'imported' as const,
        uri,
        title: coverTitle
      };

      onSaveCover(coverData);
      handleClose();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la couverture');
    }
  };

  // Annuler le dernier tracé
  const undoLastPath = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const renderDrawingTools = () => (
    <View style={styles.toolsContainer}>
      {/* Outils de dessin */}
      <View style={styles.toolsSection}>
        <Text style={styles.toolsSectionTitle}>Outils</Text>
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'pen' && styles.toolButtonActive]}
            onPress={() => setSelectedTool('pen')}
          >
            <Ionicons name="brush-outline" size={20} color={selectedTool === 'pen' ? '#fff' : '#FFA94D'} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'eraser' && styles.toolButtonActive]}
            onPress={() => setSelectedTool('eraser')}
          >
            <Ionicons name="remove-outline" size={20} color={selectedTool === 'eraser' ? '#fff' : '#FFA94D'} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolButton} onPress={undoLastPath}>
            <Ionicons name="arrow-undo-outline" size={20} color="#FFA94D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tailles de pinceau */}
      <View style={styles.toolsSection}>
        <Text style={styles.toolsSectionTitle}>Taille</Text>
        <View style={styles.toolsRow}>
          {strokeWidths.map(width => (
            <TouchableOpacity
              key={width}
              style={[styles.sizeButton, strokeWidth === width && styles.sizeButtonActive]}
              onPress={() => setStrokeWidth(width)}
            >
              <View style={[styles.sizeDot, { width: width * 2, height: width * 2 }]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Couleurs */}
      <View style={styles.toolsSection}>
        <Text style={styles.toolsSectionTitle}>Couleurs</Text>
        <View style={styles.colorGrid}>
          {colors.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton, 
                { backgroundColor: color },
                strokeColor === color && styles.colorButtonActive
              ]}
              onPress={() => setStrokeColor(color)}
            />
          ))}
        </View>
      </View>

      {/* Couleurs de fond */}
      <View style={styles.toolsSection}>
        <Text style={styles.toolsSectionTitle}>Arrière-plan</Text>
        <View style={styles.colorGrid}>
          {backgroundColors.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton, 
                { backgroundColor: color },
                backgroundColor === color && styles.colorButtonActive
              ]}
              onPress={() => setBackgroundColor(color)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const renderCoverPreview = () => (
    <ViewShot ref={coverRef} style={styles.coverContainer}>
      <View style={[styles.cover, { backgroundColor }]}>
        {/* Image importée en arrière-plan */}
        {importedImage && (
          <Image source={{ uri: importedImage }} style={styles.coverImage} />
        )}

        {/* Zone de dessin */}
        {coverType === 'draw' && (
          <View
            style={styles.drawingArea}
            onTouchStart={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              onTouchStart(locationX, locationY);
            }}
            onTouchMove={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              onTouchMove(locationX, locationY);
            }}
            onTouchEnd={onTouchEnd}
          >
            <Svg width={coverWidth} height={coverHeight - 60}>
              {/* Tracés existants */}
              {paths.map(path => (
                <Path
                  key={path.id}
                  d={path.d}
                  stroke={path.stroke}
                  strokeWidth={path.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              
              {/* Tracé en cours */}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={selectedTool === 'eraser' ? backgroundColor : strokeColor}
                  strokeWidth={selectedTool === 'eraser' ? strokeWidth * 2 : strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>
        )}

        {/* Titre */}
        <View style={styles.titleContainer}>
          <TextInput
            style={styles.titleInput}
            value={coverTitle}
            onChangeText={setCoverTitle}
            placeholder="Titre du manga"
            placeholderTextColor="#888"
            multiline
            textAlign="center"
          />
        </View>
      </View>
    </ViewShot>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient
          colors={['#181818', '#2a2a2a']}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Créer une couverture</Text>
            <TouchableOpacity onPress={captureCover} disabled={!coverType}>
              <Ionicons name="checkmark" size={24} color={coverType ? '#4CAF50' : '#666'} />
            </TouchableOpacity>
          </View>

          {/* Sélection du type si pas encore choisi */}
          {!coverType && (
            <View style={styles.typeSelector}>
              <Text style={styles.typeSelectorTitle}>Comment créer votre couverture ?</Text>
              
              <TouchableOpacity
                style={styles.typeCard}
                onPress={() => {
                  setCoverType('draw');
                  setIsDrawing(true);
                }}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF8A80']}
                  style={styles.typeCardGradient}
                >
                  <Ionicons name="brush-outline" size={32} color="#fff" />
                  <Text style={styles.typeCardTitle}>Dessiner</Text>
                  <Text style={styles.typeCardDescription}>
                    Créez votre couverture en dessinant directement
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeCard}
                onPress={handleImageImport}
              >
                <LinearGradient
                  colors={['#4CAF50', '#66BB6A']}
                  style={styles.typeCardGradient}
                >
                  <Ionicons name="image-outline" size={32} color="#fff" />
                  <Text style={styles.typeCardTitle}>Importer</Text>
                  <Text style={styles.typeCardDescription}>
                    Utilisez une image de votre galerie
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Interface de création */}
          {coverType && (
            <View style={styles.creationInterface}>
              {/* Aperçu de la couverture */}
              <View style={styles.previewSection}>
                {renderCoverPreview()}
              </View>

              {/* Outils de dessin */}
              {coverType === 'draw' && renderDrawingTools()}

              {/* Actions */}
              <View style={styles.actionsSection}>
                {coverType === 'import' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleImageImport}
                  >
                    <Ionicons name="refresh" size={20} color="#FFA94D" />
                    <Text style={styles.actionButtonText}>Changer d'image</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={resetCover}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>Recommencer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Sélecteur de type
  typeSelector: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  typeSelectorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  typeCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  typeCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  typeCardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  typeCardDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
  },

  // Interface de création
  creationInterface: {
    flex: 1,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  coverContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cover: {
    width: width * 0.6,
    height: width * 0.6 * 1.4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  drawingArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 8,
  },
  titleInput: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Outils de dessin
  toolsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  toolsSection: {
    marginBottom: 16,
  },
  toolsSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolButtonActive: {
    backgroundColor: '#FFA94D',
  },
  sizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeButtonActive: {
    backgroundColor: '#FFA94D',
  },
  sizeDot: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: '#FFA94D',
    borderWidth: 3,
  },

  // Actions
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MangaCoverCreator;