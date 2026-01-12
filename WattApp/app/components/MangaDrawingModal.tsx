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

const COLORS = [
  '#000000', '#333333', '#666666', '#FFFFFF',
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#00ACC1', '#00897B',
  '#43A047', '#7CB342', '#FDD835', '#FFB300',
  '#FB8C00', '#F4511E', '#6D4C41', '#546E7A'
];
const SIZES = [1, 2, 4, 6, 10, 16, 24, 32];
const TOOLS = [
  { id: 'pen', icon: 'create-outline', name: 'Stylo' },
  { id: 'brush', icon: 'brush-outline', name: 'Pinceau' },
  { id: 'eraser', icon: 'remove-outline', name: 'Gomme' },
];
const DRAWING_STYLES = [
  { id: 'freehand', icon: 'pencil', name: 'Croquis' },
  { id: 'sketch', icon: 'color-wand-outline', name: 'Esquisse' },
  { id: 'clean', icon: 'brush', name: 'Trait net' },
  { id: 'manga', icon: 'book-outline', name: 'Manga' },
  { id: 'comic', icon: 'sparkles-outline', name: 'Comic' },
];

export const MangaDrawingModal: React.FC<MangaDrawingModalProps> = ({
  visible,
  onClose,
  backgroundImage,
  panelData,
  onSaveDrawing,
}) => {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [selectedTool, setSelectedTool] = useState('pen');
  const [selectedStyle, setSelectedStyle] = useState('freehand');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  // Charger les dessins existants quand le modal s'ouvre
  React.useEffect(() => {
    if (visible && panelData?.existingPaths) {
      setPaths(panelData.existingPaths);
      setCanUndo(panelData.existingPaths.length > 0);
    } else if (visible) {
      setPaths([]);
      setCanUndo(false);
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
        stroke: selectedTool === 'eraser' ? '#FFFFFF' : selectedColor,
        strokeWidth: selectedTool === 'eraser' ? brushSize * 3 : brushSize,
        tool: selectedTool,
        style: selectedStyle,
      };

      setPaths(prev => [...prev, newPath]);
      setCurrentPath('');
      setIsDrawing(false);
      setCanUndo(true);
    },

    onPanResponderEnd: (evt) => {
      // Gérer les taps simples
      if (!isDrawing && currentPath === '') {
        const { locationX, locationY } = evt.nativeEvent;
        const tapPath = `M${locationX},${locationY} L${locationX + 1},${locationY + 1}`;
        
        const newPath = {
          id: Date.now().toString(),
          d: tapPath,
          tool: selectedTool,
          stroke: selectedTool === 'eraser' ? '#FFFFFF' : selectedColor,
          strokeWidth: selectedTool === 'eraser' ? brushSize * 3 : brushSize,
          style: selectedStyle,
        };

        setPaths(prev => [...prev, newPath]);
        setCanUndo(true);
      }
    },
  });

  const handleUndo = () => {
    if (paths.length > 0) {
      const newPaths = paths.slice(0, -1);
      setPaths(newPaths);
      setCanUndo(newPaths.length > 0);
    }
  };

  const handleSave = () => {
    if (onSaveDrawing) {
      onSaveDrawing({ paths, panelId: panelData?.id });
    }
    onClose();
  };

  const handleClear = () => {
    Alert.alert(
      'Effacer tout',
      'Voulez-vous vraiment effacer tout le dessin ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            setPaths([]);
            setCurrentPath('');
            setCanUndo(false);
          },
        },
      ]
    );
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
        
        {/* Top Bar - Professional */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.topButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.topCenter}>
            <Text style={styles.topTitle}>Dessin</Text>
            {paths.length > 0 && (
              <Text style={styles.strokeCount}>{paths.length} traits</Text>
            )}
          </View>
          
          <TouchableOpacity onPress={handleSave} style={styles.topButtonPrimary}>
            <Text style={styles.saveText}>Terminé</Text>
          </TouchableOpacity>
        </View>

        {/* Drawing Canvas - Full screen with white background */}
        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
            <Rect width="100%" height="100%" fill="#FFFFFF" />
            
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
            
            {isDrawing && currentPath && (
              <Path
                d={currentPath}
                stroke={selectedTool === 'eraser' ? '#FFFFFF' : selectedColor}
                strokeWidth={selectedTool === 'eraser' ? brushSize * 3 : brushSize}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </View>

        {/* Left Sidebar - Tools */}
        <View style={styles.leftSidebar}>
          <View style={styles.sidebarContent}>
            {TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={[
                  styles.toolButton,
                  selectedTool === tool.id && styles.toolButtonActive
                ]}
                onPress={() => setSelectedTool(tool.id)}
              >
                <Ionicons 
                  name={tool.icon as any} 
                  size={24} 
                  color={selectedTool === tool.id ? '#FFA94D' : '#FFFFFF'} 
                />
              </TouchableOpacity>
            ))}
            
            <View style={styles.toolDivider} />
            
            {/* Undo */}
            <TouchableOpacity
              style={[styles.toolButton, !canUndo && styles.toolButtonDisabled]}
              onPress={handleUndo}
              disabled={!canUndo}
            >
              <Ionicons 
                name="arrow-undo" 
                size={24} 
                color={canUndo ? '#FFFFFF' : '#666666'} 
              />
            </TouchableOpacity>
            
            {/* Clear */}
            <TouchableOpacity
              style={styles.toolButton}
              onPress={handleClear}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Sidebar - Color & Size */}
        <View style={styles.rightSidebar}>
          <View style={styles.sidebarContent}>
            
            {/* Drawing Style Display */}
            <TouchableOpacity 
              style={styles.currentStyleButton}
              onPress={() => setShowStylePicker(!showStylePicker)}
            >
              <Ionicons 
                name={DRAWING_STYLES.find(s => s.id === selectedStyle)?.icon as any} 
                size={24} 
                color="#FFA94D" 
              />
              <Ionicons 
                name={showStylePicker ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#999999" 
              />
            </TouchableOpacity>
            
            {/* Current Color Display */}
            <TouchableOpacity 
              style={styles.currentColorButton}
              onPress={() => {
                if (selectedTool !== 'eraser') {
                  setShowColorPicker(!showColorPicker);
                }
              }}
              disabled={selectedTool === 'eraser'}
            >
              <View style={[
                styles.currentColor, 
                { backgroundColor: selectedTool === 'eraser' ? '#999999' : selectedColor },
                selectedTool === 'eraser' && styles.disabledButton
              ]}>
                {selectedColor === '#FFFFFF' && selectedTool !== 'eraser' && <View style={styles.whiteBorder} />}
                {selectedTool === 'eraser' && (
                  <Ionicons name="ban" size={20} color="#FFFFFF" />
                )}
              </View>
              <Ionicons 
                name={showColorPicker ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#999999" 
              />
            </TouchableOpacity>

            {/* Brush Size Display */}
            <TouchableOpacity 
              style={styles.currentSizeButton}
              onPress={() => setShowSizePicker(!showSizePicker)}
            >
              <View style={styles.sizePreview}>
                <View style={[
                  styles.sizePreviewDot,
                  { 
                    width: Math.min(brushSize * 1.5, 32),
                    height: Math.min(brushSize * 1.5, 32),
                    backgroundColor: selectedTool === 'eraser' ? '#999999' : selectedColor,
                    borderRadius: Math.min(brushSize * 1.5, 32) / 2
                  }
                ]} />
              </View>
              <Ionicons 
                name={showSizePicker ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#999999" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Style Picker Popup */}
        {showStylePicker && (
          <View style={styles.stylePickerPopup}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Style de dessin</Text>
              <TouchableOpacity onPress={() => setShowStylePicker(false)}>
                <Ionicons name="close" size={20} color="#999999" />
              </TouchableOpacity>
            </View>
            <View style={styles.styleList}>
              {DRAWING_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.styleOption,
                    selectedStyle === style.id && styles.styleOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedStyle(style.id);
                    setShowStylePicker(false);
                  }}
                >
                  <Ionicons 
                    name={style.icon as any} 
                    size={24} 
                    color={selectedStyle === style.id ? '#FFA94D' : '#FFFFFF'} 
                  />
                  <Text style={[
                    styles.styleOptionText,
                    selectedStyle === style.id && styles.styleOptionTextSelected
                  ]}>
                    {style.name}
                  </Text>
                  {selectedStyle === style.id && (
                    <Ionicons name="checkmark" size={20} color="#FFA94D" style={styles.styleCheckmark} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Color Picker Popup */}
        {showColorPicker && (
          <View style={styles.colorPickerPopup}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Couleur</Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Ionicons name="close" size={20} color="#999999" />
              </TouchableOpacity>
            </View>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSwatchSelected
                  ]}
                  onPress={() => {
                    setSelectedColor(color);
                    setShowColorPicker(false);
                  }}
                >
                  {color === '#FFFFFF' && <View style={styles.whiteSwatchBorder} />}
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color={color === '#FFFFFF' ? '#000000' : '#FFFFFF'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Size Picker Popup */}
        {showSizePicker && (
          <View style={styles.sizePickerPopup}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Taille</Text>
              <TouchableOpacity onPress={() => setShowSizePicker(false)}>
                <Ionicons name="close" size={20} color="#999999" />
              </TouchableOpacity>
            </View>
            <View style={styles.sizeList}>
              {SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeOption,
                    brushSize === size && styles.sizeOptionSelected
                  ]}
                  onPress={() => {
                    setBrushSize(size);
                    setShowSizePicker(false);
                  }}
                >
                  <View style={[
                    styles.sizeOptionDot,
                    { 
                      width: Math.min(size * 2, 40),
                      height: Math.min(size * 2, 40),
                      backgroundColor: selectedColor,
                      borderRadius: Math.min(size * 2, 40) / 2
                    }
                  ]} />
                  <Text style={styles.sizeOptionText}>{size}px</Text>
                  {brushSize === size && (
                    <Ionicons name="checkmark" size={20} color="#FFA94D" style={styles.sizeCheckmark} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  
  // Top Bar
  topBar: {
    height: 60,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  strokeCount: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  topButtonPrimary: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: '#FFA94D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Canvas
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Left Sidebar
  leftSidebar: {
    position: 'absolute',
    left: 16,
    top: 80,
    bottom: 80,
    width: 60,
    justifyContent: 'center',
  },
  sidebarContent: {
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    backgroundColor: 'transparent',
  },
  toolButtonActive: {
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  toolButtonDisabled: {
    opacity: 0.3,
  },
  toolDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },

  // Right Sidebar
  rightSidebar: {
    position: 'absolute',
    right: 16,
    top: 80,
    width: 60,
  },
  currentStyleButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  currentColorButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  currentColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteBorder: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
  currentSizeButton: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sizePreview: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sizePreviewDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Color Picker Popup
  colorPickerPopup: {
    position: 'absolute',
    right: 88,
    top: 80,
    width: 280,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFA94D',
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  whiteSwatchBorder: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },

  // Style Picker Popup
  stylePickerPopup: {
    position: 'absolute',
    right: 88,
    top: 80,
    width: 240,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  styleList: {
    gap: 8,
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  styleOptionSelected: {
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  styleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  styleOptionTextSelected: {
    color: '#FFA94D',
  },
  styleCheckmark: {
    marginLeft: 8,
  },

  // Size Picker Popup
  sizePickerPopup: {
    position: 'absolute',
    right: 88,
    top: 224,
    width: 240,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sizeList: {
    gap: 8,
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sizeOptionSelected: {
    backgroundColor: 'rgba(255, 169, 77, 0.15)',
    borderWidth: 2,
    borderColor: '#FFA94D',
  },
  sizeOptionDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 12,
  },
  sizeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  sizeCheckmark: {
    marginLeft: 8,
  },
});

export default MangaDrawingModal;