import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Stroke {
  id: string;
  path: string;
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

interface PDFDrawingEditorProps {
  pdfUri: string;
  onSave: (strokes: Stroke[]) => void;
  onSaveDraft?: (strokes: Stroke[]) => void;
  onPublish?: (strokes: Stroke[]) => void;
}

export default function PDFDrawingEditor({ pdfUri, onSave, onSaveDraft, onPublish }: PDFDrawingEditorProps) {
  // États pour le dessin
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState('');
  
  // États pour les outils
  const [selectedTool, setSelectedTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [showToolbar, setShowToolbar] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(100); // Pourcentage de zoom
  
  // Modes d'interaction
  const [currentMode, setCurrentMode] = useState<'draw' | 'pan' | 'zoom'>('draw');

  // États pour le zoom et pan
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Références pour le dessin
  const pathRef = useRef('');
  const isDrawing = useSharedValue(false); // Utiliser useSharedValue au lieu de useRef

  // Couleurs et tailles disponibles
  const colors = [
    '#000000', '#FF0000', '#0066FF', '#00AA00', 
    '#FF9900', '#9900FF', '#FF1493', '#00FFFF',
    '#FFFF00', '#808080', '#FFFFFF'
  ];
  const penSizes = [1, 2, 3, 5, 8, 12];

  // Fonctions pour le dessin
  const addStroke = (path: string) => {
    const newStroke: Stroke = {
      id: Date.now().toString(),
      path,
      color: selectedTool === 'highlighter' ? `${penColor}80` : penColor,
      width: selectedTool === 'highlighter' ? penSize * 2 : penSize,
      tool: selectedTool,
    };
    setStrokes(prev => [...prev, newStroke]);
  };

  const startDrawing = (x: number, y: number) => {
    if (currentMode !== 'draw') return;
    isDrawing.value = true;
    pathRef.current = `M${x},${y}`;
    setCurrentStroke(pathRef.current);
  };

  const continueDrawing = (x: number, y: number) => {
    if (currentMode !== 'draw' || !isDrawing.value) return;
    pathRef.current += ` L${x},${y}`;
    setCurrentStroke(pathRef.current);
  };

  const endDrawing = () => {
    if (currentMode !== 'draw' || !isDrawing.value) return;
    if (pathRef.current) {
      runOnJS(addStroke)(pathRef.current);
    }
    isDrawing.value = false;
    setCurrentStroke('');
    pathRef.current = '';
  };

  // Gestionnaire de dessin avec PanResponder
  const drawingPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      // Seulement si en mode dessin et un seul doigt
      return currentMode === 'draw' && evt.nativeEvent.touches.length === 1;
    },
    onMoveShouldSetPanResponder: (evt) => {
      // Seulement si en mode dessin et déjà en train de dessiner
      return currentMode === 'draw' && isDrawing.value && evt.nativeEvent.touches.length === 1;
    },
    
    onPanResponderGrant: (evt) => {
      // Vérifier si c'est un seul touch (stylet/doigt) et en mode dessin
      if (currentMode === 'draw' && evt.nativeEvent.touches.length === 1) {
        const { locationX, locationY } = evt.nativeEvent;
        startDrawing(locationX, locationY);
      }
    },
    
    onPanResponderMove: (evt) => {
      // Continuer le dessin seulement si c'est un seul touch et en cours de dessin
      if (currentMode === 'draw' && evt.nativeEvent.touches.length === 1 && isDrawing.value) {
        const { locationX, locationY } = evt.nativeEvent;
        continueDrawing(locationX, locationY);
      }
    },
    
    onPanResponderRelease: (evt) => {
      // Terminer le dessin
      if (currentMode === 'draw' && isDrawing.value) {
        endDrawing();
      }
    },
    
    onPanResponderTerminationRequest: () => false, // Ne jamais interrompre le dessin
    onShouldBlockNativeResponder: () => true, // Bloquer les gestes natifs pendant le dessin
  });

  // Fonction pour contraindre la position dans les limites du PDF
  const constrainPosition = (x: number, y: number, currentScale: number) => {
    'worklet';
    
    // Si le zoom est <= 1, garder centré
    if (currentScale <= 1) {
      return { x: 0, y: 0 };
    }
    
    // Pour les zooms > 1, calculer les limites
    const scaledWidth = screenWidth * currentScale;
    const scaledHeight = screenHeight * currentScale;
    
    // Calculer les limites pour éviter de voir les bordures grises
    const maxTranslateX = Math.max(0, (scaledWidth - screenWidth) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - screenHeight) / 2);
    
    // Contraindre les valeurs
    const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, x));
    const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, y));
    
    return { x: constrainedX, y: constrainedY };
  };

  // Gestes pour zoom et pan
  const panGesture = Gesture.Pan()
    .enabled(currentMode === 'pan')
    .onStart(() => {
      // Ne pas commencer le pan si on est en train de dessiner
      if (isDrawing.value) return;
      
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      // Ne pas faire de pan si on est en train de dessiner
      if (isDrawing.value) return;
      
      const newX = savedTranslateX.value + event.translationX;
      const newY = savedTranslateY.value + event.translationY;
      
      // Contraindre la position
      const constrained = constrainPosition(newX, newY, scale.value);
      translateX.value = constrained.x;
      translateY.value = constrained.y;
    })
    .onEnd(() => {
      // Ne pas terminer le pan si on était en train de dessiner
      if (isDrawing.value) return;
      
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(true) // Toujours actif
    .onStart(() => {
      // Ne pas commencer le zoom si on est en train de dessiner
      if (isDrawing.value) return;
      
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event: any) => {
      // Ne pas zoomer si on est en train de dessiner
      if (isDrawing.value) return;
      
      const newScale = Math.max(0.5, Math.min(5, savedScale.value * event.scale)); // Limites plus raisonnables
      scale.value = newScale;
      
      // Mettre à jour l'affichage du zoom
      runOnJS(setCurrentZoom)(Math.round(newScale * 100));
      
      // Zoom depuis le centre de l'écran uniquement pour éviter de sortir du PDF
      // Pas de calcul de delta focal, on garde la position centrée
      
      // Contraindre la position pour rester dans le PDF
      const constrained = constrainPosition(savedTranslateX.value, savedTranslateY.value, newScale);
      translateX.value = constrained.x;
      translateY.value = constrained.y;
    })
    .onEnd(() => {
      // Ne pas terminer le zoom si on était en train de dessiner
      if (isDrawing.value) return;
      
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double-tap pour reset zoom (toujours actif)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(true) // Toujours actif
    .onEnd(() => {
      runOnJS(resetZoom)();
    });

  // Pan avec 2 doigts (toujours actif pour se balader dans le PDF)
  const twFingerPanGesture = Gesture.Pan()
    .minPointers(2) // Nécessite 2 doigts
    .maxPointers(2) // Maximum 2 doigts
    .enabled(true) // Toujours actif
    .onStart(() => {
      // Ne pas commencer le pan si on est en train de dessiner
      if (isDrawing.value) return;
      
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event: any) => {
      // Ne pas faire de pan si on est en train de dessiner
      if (isDrawing.value) return;
      
      const newX = savedTranslateX.value + event.translationX;
      const newY = savedTranslateY.value + event.translationY;
      
      // Contraindre la position
      const constrained = constrainPosition(newX, newY, scale.value);
      translateX.value = constrained.x;
      translateY.value = constrained.y;
    })
    .onEnd(() => {
      // Ne pas terminer le pan si on était en train de dessiner
      if (isDrawing.value) return;
      
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Gestes de navigation (conditionnels selon le mode)
  const drawingModeGestures = Gesture.Race(doubleTapGesture, pinchGesture, twFingerPanGesture);
  const navigationModeGestures = Gesture.Race(doubleTapGesture, pinchGesture, twFingerPanGesture, panGesture);
  
  // Choisir les gestes selon le mode
  const activeGestures = currentMode === 'draw' ? drawingModeGestures : navigationModeGestures;

  // Style animé
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  // Fonction pour annuler le dernier trait
  const undoLastStroke = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  // Fonction pour effacer tout
  const clearAll = () => {
    Alert.alert(
      'Effacer tout',
      'Êtes-vous sûr de vouloir effacer tous les dessins ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: () => setStrokes([])
        }
      ]
    );
  };

  // Fonction pour réinitialiser le zoom
  const resetZoom = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setCurrentZoom(100);
  };

  // Fonction pour zoomer
  const zoomIn = () => {
    const newScale = Math.min(5, scale.value * 1.5);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
    setCurrentZoom(Math.round(newScale * 100));
    
    // Contraindre la position après le zoom
    const constrained = constrainPosition(translateX.value, translateY.value, newScale);
    translateX.value = withSpring(constrained.x);
    translateY.value = withSpring(constrained.y);
    savedTranslateX.value = constrained.x;
    savedTranslateY.value = constrained.y;
  };

  // Fonction pour dézoomer
  const zoomOut = () => {
    const newScale = Math.max(0.5, scale.value / 1.5);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
    setCurrentZoom(Math.round(newScale * 100));
    
    // Contraindre la position après le dézoom
    const constrained = constrainPosition(translateX.value, translateY.value, newScale);
    translateX.value = withSpring(constrained.x);
    translateY.value = withSpring(constrained.y);
    savedTranslateX.value = constrained.x;
    savedTranslateY.value = constrained.y;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Barre d'outils supérieure */}
      {showToolbar && (
        <View style={styles.toolbar}>
          {/* Indicateur de mode */}
          <View style={styles.modeIndicator}>
            <Text style={styles.modeText}>
              {currentMode === 'draw' ? '✏️ Dessin' : 
               currentMode === 'pan' ? '🤚 Déplacement' : '🔍 Zoom'}
            </Text>
          </View>

          {/* Indicateur de zoom (toujours affiché si zoom ≠ 100%) */}
          {currentZoom !== 100 && (
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomText}>
                {currentZoom}%
              </Text>
            </View>
          )}

          {/* Modes d'interaction */}
          <View style={styles.toolSection}>
            {/* Mode Dessin */}
            <TouchableOpacity
              style={[styles.toolButton, currentMode === 'draw' && styles.selectedTool]}
              onPress={() => setCurrentMode('draw')}
            >
              <Text style={styles.toolIcon}>✏️</Text>
            </TouchableOpacity>

            {/* Mode Déplacement */}
            <TouchableOpacity
              style={[styles.toolButton, currentMode === 'pan' && styles.selectedTool]}
              onPress={() => setCurrentMode('pan')}
            >
              <Text style={styles.toolIcon}>🤚</Text>
            </TouchableOpacity>

            {/* Mode Zoom */}
            <TouchableOpacity
              style={[styles.toolButton, currentMode === 'zoom' && styles.selectedTool]}
              onPress={() => setCurrentMode('zoom')}
            >
              <Text style={styles.toolIcon}>🔍</Text>
            </TouchableOpacity>
          </View>

          {/* Outils de dessin (uniquement en mode dessin) */}
          {currentMode === 'draw' && (
            <View style={styles.toolSection}>
              <TouchableOpacity
                style={[
                  styles.toolButton, 
                  selectedTool === 'pen' && styles.selectedTool
                ]}
                onPress={() => setSelectedTool('pen')}
              >
                <Text style={styles.toolIcon}>🖊️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toolButton, 
                  selectedTool === 'highlighter' && styles.selectedTool
                ]}
                onPress={() => setSelectedTool('highlighter')}
              >
                <Text style={styles.toolIcon}>🖍️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toolButton, 
                  selectedTool === 'eraser' && styles.selectedTool
                ]}
                onPress={() => setSelectedTool('eraser')}
              >
                <Text style={styles.toolIcon}>🧹</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Palette de couleurs (uniquement en mode dessin) */}
          {currentMode === 'draw' && (
            <View style={styles.colorPalette}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    penColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setPenColor(color)}
                />
              ))}
            </View>
          )}

          {/* Tailles de stylo (uniquement en mode dessin) */}
          {currentMode === 'draw' && (
            <View style={styles.sizeSelector}>
              {penSizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    penSize === size && styles.selectedSize,
                  ]}
                  onPress={() => setPenSize(size)}
                >
                  <View style={[styles.sizeDot, { width: size * 2, height: size * 2 }]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Zone de dessin avec gestes */}
      <GestureDetector gesture={activeGestures}>
        <Animated.View style={[styles.drawingArea, animatedStyle]}>
          <View 
            style={styles.pdfContainer}
            {...drawingPanResponder.panHandlers}
          >
            {/* Image PDF */}
            <Image 
              source={{ uri: pdfUri }} 
              style={styles.pdfImage}
              contentFit="contain"
            />

            {/* SVG pour le dessin */}
            <Svg style={styles.svgLayer}>
              {/* Traits terminés */}
              {strokes.map((stroke) => (
                <Path
                  key={stroke.id}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={stroke.tool === 'highlighter' ? 0.6 : 1}
                />
              ))}
              
              {/* Trait en cours */}
              {currentStroke && (
                <Path
                  d={currentStroke}
                  stroke={selectedTool === 'highlighter' ? `${penColor}80` : penColor}
                  strokeWidth={selectedTool === 'highlighter' ? penSize * 2 : penSize}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={selectedTool === 'highlighter' ? 0.6 : 1}
                />
              )}
            </Svg>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Boutons d'action flottants */}
      <View style={styles.actionButtons}>
        {/* Boutons de zoom (affichés en mode pan ou zoom) */}
        {(currentMode === 'pan' || currentMode === 'zoom') && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={zoomIn}>
              <Text style={styles.actionButtonText}>🔍+</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={zoomOut}>
              <Text style={styles.actionButtonText}>🔍-</Text>
            </TouchableOpacity>
          </>
        )}
        
        <TouchableOpacity style={styles.actionButton} onPress={resetZoom}>
          <Text style={styles.actionButtonText}>🔄</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={undoLastStroke}>
          <Text style={styles.actionButtonText}>↶</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={clearAll}>
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de sauvegarde élégante en bas */}
      {(onSaveDraft || onPublish || (!onSaveDraft && !onPublish)) && (
        <View style={styles.saveToolbar}>
          <View style={styles.saveToolbarContainer}>
            {/* Bouton Brouillon */}
            {onSaveDraft && (
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={() => onSaveDraft(strokes)}
              >
                <View style={styles.saveButtonContent}>
                  <Text style={styles.saveButtonIcon}>📝</Text>
                  <Text style={styles.saveButtonText}>Brouillon</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Bouton Publier */}
            {onPublish && (
              <TouchableOpacity 
                style={[styles.saveButton, styles.publishButtonNew]} 
                onPress={() => onPublish(strokes)}
              >
                <View style={styles.saveButtonContent}>
                  <Text style={styles.saveButtonIcon}>🚀</Text>
                  <Text style={[styles.saveButtonText, styles.publishButtonTextNew]}>Publier</Text>
                </View>
              </TouchableOpacity>
            )}
            
            {/* Bouton générique */}
            {!onSaveDraft && !onPublish && (
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={() => onSave(strokes)}
              >
                <View style={styles.saveButtonContent}>
                  <Text style={styles.saveButtonIcon}>💾</Text>
                  <Text style={styles.saveButtonText}>Sauvegarder</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  toolbar: {
    backgroundColor: '#232323',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    zIndex: 1000,
  },
  modeIndicator: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 16,
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomIndicator: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 16,
  },
  zoomText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  toolSection: {
    flexDirection: 'row',
    marginRight: 16,
    gap: 8,
  },
  toolButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTool: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  toolIcon: {
    fontSize: 16,
  },
  colorPalette: {
    flexDirection: 'row',
    marginRight: 16,
    gap: 6,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#0a7ea4',
    borderWidth: 3,
  },
  sizeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSize: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  sizeDot: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  drawingArea: {
    flex: 1,
    overflow: 'hidden',
  },
  pdfContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#181818', // Même couleur que le fond pour éviter les contours
    overflow: 'hidden', // Cacher tout débordement
    width: '100%',
    height: '100%',
  },
  pdfImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#181818', // Pas de fond blanc
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 12,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  // Nouvelle barre de sauvegarde élégante
  saveToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(35, 35, 35, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backdropFilter: 'blur(10px)',
  },
  saveToolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  publishButtonNew: {
    backgroundColor: '#34C759',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonIcon: {
    fontSize: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButtonTextNew: {
    color: '#fff',
  },
});
