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
  
  // Mode d'interaction simplifié (toujours en mode dessin maintenant)
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
      {/* Interface Apple Notes - Ultra Simple */}
      <View style={styles.appleInterface}>


        {/* Barre d'outils ovale moderne avec tous les outils */}
        <View style={styles.ovalToolbar}>
          {/* Outils de dessin (toujours visibles et simplifiés) */}
          <TouchableOpacity
            style={[styles.ovalButton, selectedTool === 'highlighter' && styles.ovalButtonActive]}
            onPress={() => setSelectedTool('highlighter')}
          >
            <Text style={[styles.ovalButtonText, selectedTool === 'highlighter' && styles.ovalButtonTextActive]}>🖍️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.ovalButton, selectedTool === 'eraser' && styles.ovalButtonActive]}
            onPress={() => setSelectedTool('eraser')}
          >
            <Text style={[styles.ovalButtonText, selectedTool === 'eraser' && styles.ovalButtonTextActive]}>🧹</Text>
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.ovalSeparator} />

          {/* Couleurs principales */}
          {['#000000', '#FF0000', '#0066FF', '#00AA00'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.ovalColorButton,
                { backgroundColor: color },
                penColor === color && styles.ovalColorButtonActive
              ]}
              onPress={() => setPenColor(color)}
            />
          ))}

          {/* Séparateur */}
          <View style={styles.ovalSeparator} />

          {/* Tailles */}
          {[1, 3, 6].map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.ovalButton, penSize === size && styles.ovalButtonActive]}
              onPress={() => setPenSize(size)}
            >
              <View style={[styles.ovalSizeDot, { 
                width: size * 2 + 6, 
                height: size * 2 + 6,
                backgroundColor: penSize === size ? '#fff' : '#666'
              }]} />
            </TouchableOpacity>
          ))}

          {/* Séparateur */}
          <View style={styles.ovalSeparator} />

          {/* Actions */}
          <TouchableOpacity style={styles.ovalButton} onPress={undoLastStroke}>
            <Text style={styles.ovalButtonText}>↶</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.ovalButton} onPress={clearAll}>
            <Text style={styles.ovalButtonText}>🗑️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.ovalButton} onPress={resetZoom}>
            <Text style={styles.ovalButtonText}>🔄</Text>
          </TouchableOpacity>

          {/* Contrôles de zoom (toujours disponibles) */}
          <TouchableOpacity style={styles.ovalButton} onPress={zoomIn}>
            <Text style={styles.ovalButtonText}>➕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.ovalButton} onPress={zoomOut}>
            <Text style={styles.ovalButtonText}>➖</Text>
          </TouchableOpacity>
        </View>
      </View>



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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backdropFilter: 'blur(10px)',
  },
  saveToolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
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
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  publishButtonTextNew: {
    color: '#fff',
  },

  // Nouveaux styles pour les boutons en en-tête
  topToolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerSaveButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  headerDraftButton: {
    backgroundColor: '#FF9500',
  },
  headerPublishButton: {
    backgroundColor: '#34C759',
  },
  headerGenericButton: {
    backgroundColor: '#0a7ea4',
  },
  headerSaveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Interface Apple Notes - Simplicité absolue
  appleInterface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  appleTopButtons: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  appleDraftButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  applePublishButton: {
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appleBottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    flexDirection: 'row',
    gap: 15,
  },
  appleMode: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleModeActive: {
    backgroundColor: '#007AFF',
  },
  appleModeText: {
    fontSize: 20,
    color: '#000',
  },

  // Barre d'outils ovale verticale moderne avec tous les outils
  ovalToolbar: {
    position: 'absolute',
    top: 60, // Plus haut maintenant que les boutons sont dans l'en-tête
    right: 20, // Côté droit au lieu de gauche
    width: 60, // Largeur fixe pour une barre verticale
    backgroundColor: 'rgba(255,255,255,0.95)', // Fond blanc avec transparence
    borderRadius: 30,
    flexDirection: 'column', // Direction verticale
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8, // Espacement réduit entre les éléments
    maxHeight: '80%', // Hauteur augmentée pour contenir plus d'éléments
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden', // Pour s'assurer que rien ne dépasse
  },
  ovalButton: {
    width: 36, // Réduit la taille
    height: 36, // Réduit la taille
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)', // Léger fond gris
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  ovalButtonActive: {
    backgroundColor: '#FF6B35', // Orange vif pour l'état actif
    borderColor: '#FF6B35',
    transform: [{ scale: 1.1 }],
  },
  ovalButtonText: {
    fontSize: 16,
    color: '#333333', // Texte sombre sur fond clair
  },
  ovalButtonTextActive: {
    color: '#FFFFFF', // Blanc sur fond orange
  },
  ovalSeparator: {
    width: 24, // Largeur réduite
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // Séparateur sombre sur fond clair
    marginVertical: 2, // Marge réduite
  },
  ovalColorButton: {
    width: 28, // Réduit la taille
    height: 28, // Réduit la taille
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)', // Bordure légère par défaut
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ovalColorButtonActive: {
    borderColor: '#FF6B35', // Bordure orange pour l'actif
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.3,
  },
  ovalSizeDot: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Boutons de sauvegarde dans la barre d'outils
  ovalSaveButton: {
    width: 48,
    height: 60,
    borderRadius: 24,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginVertical: 2,
  },
  ovalPublishButton: {
    width: 48,
    height: 60,
    borderRadius: 24,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginVertical: 2,
  },
  ovalSaveText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  ovalSaveLabel: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
