// @ts-nocheck
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MangaDrawingModalProps {
  visible: boolean;
  onClose: () => void;
  backgroundImage?: string;
  panelData?: {
    x: number;
    y: number;
    width: number;
    height: number;
    id: string;
    existingPaths?: any[];
  };
  onSaveDrawing?: (drawingData: any) => void;
}

const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'];
const SIZES = [2, 4, 6, 8, 12, 16];

export const MangaDrawingModal: React.FC<MangaDrawingModalProps> = ({
  visible,
  onClose,
  backgroundImage,
  panelData,
  onSaveDrawing,
}) => {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [showTools, setShowTools] = useState(true);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  // Charger les dessins existants quand le modal s'ouvre
  React.useEffect(() => {
    if (visible && panelData?.existingPaths) {
      setPaths(panelData.existingPaths);
    } else if (visible) {
      setPaths([]); // Réinitialiser si pas de dessins existants
    }
  }, [visible, panelData]);

  // PanResponder pour le dessin
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onShouldBlockNativeResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setIsDrawing(true);
      setCurrentPath(`M${locationX},${locationY}`);
    },

    onPanResponderMove: (evt) => {
      if (!isDrawing) return;
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
    },

    onPanResponderRelease: () => {
      if (!isDrawing || !currentPath) return;
      
      const newPath = {
        id: Date.now().toString(),
        d: currentPath,
        stroke: selectedColor,
        strokeWidth: brushSize,
      };

      setPaths(prev => [...prev, newPath]);
      setCurrentPath('');
      setIsDrawing(false);
    },

    onPanResponderEnd: (evt) => {
      // Gérer les taps simples
      if (!isDrawing && currentPath === '') {
        const { locationX, locationY } = evt.nativeEvent;
        const tapPath = `M${locationX},${locationY} L${locationX + 1},${locationY + 1}`;
        
        const newPath = {
          id: Date.now().toString(),
          d: tapPath,
          stroke: selectedColor,
          strokeWidth: brushSize,
        };

        setPaths(prev => [...prev, newPath]);
      }
    },
  });

  const handleSave = () => {
    if (onSaveDrawing) {
      onSaveDrawing({ paths, panelId: panelData?.id });
    }
    onClose();
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        
        {/* Drawing Canvas - Full screen avec fond blanc */}
        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
            {/* Background blanc */}
            <Rect width="100%" height="100%" fill="#FFFFFF" />
            
            {/* Dessins sauvegardés */}
            {paths.map((path) => (
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
            
            {/* Dessin en cours */}
            {isDrawing && currentPath && (
              <Path
                d={currentPath}
                stroke={selectedColor}
                strokeWidth={brushSize}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </View>

        {/* Tools Panel */}
        {showTools && (
          <View style={styles.toolsPanel}>
            <LinearGradient
              colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)']}
              style={styles.toolsGradient}
            >
              {/* Colors */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Couleurs</Text>
                <View style={styles.colorsRow}>
                  {COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColor
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </View>
              </View>

              {/* Brush Sizes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tailles</Text>
                <View style={styles.sizesRow}>
                  {SIZES.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeButton,
                        brushSize === size && styles.selectedSize
                      ]}
                      onPress={() => setBrushSize(size)}
                    >
                      <View style={[
                        styles.sizeDot,
                        { 
                          width: size,
                          height: size,
                          backgroundColor: selectedColor 
                        }
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton} onPress={handleClear}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionText}>Effacer</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => setShowTools(false)}>
                  <Ionicons name="eye-off-outline" size={20} color="#fff" />
                  <Text style={styles.actionText}>Masquer</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {!showTools && (
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setShowTools(true)}
            >
              <Ionicons name="brush-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              style={styles.saveGradient}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveText}>Sauvegarder</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Panel Info */}
        {panelData && (
          <View style={styles.panelInfo}>
            <Text style={styles.panelText}>
              Panneau {panelData.id} - Zone de dessin
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Fond blanc au lieu de noir
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Tools Panel
  toolsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 200,
  },
  toolsGradient: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  sizesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSize: {
    borderColor: '#fff',
  },
  sizeDot: {
    borderRadius: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
  },

  // Top Controls
  topControls: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Panel Info
  panelInfo: {
    position: 'absolute',
    top: 110,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  panelText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default MangaDrawingModal;