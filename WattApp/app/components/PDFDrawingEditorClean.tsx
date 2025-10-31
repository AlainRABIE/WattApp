import React, { useState, useRef, useCallback } from 'react';
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
  const updateZoom = useCallback((z: number) => setCurrentZoom(z), []);
  const [currentMode, setCurrentMode] = useState<'draw' | 'pan' | 'zoom'>('draw');
  const [isActionLocked, setIsActionLocked] = useState(false);
  const actionLockTimeout = useRef<number | null>(null);
  // Optimisation: useMemo pour les couleurs et tailles
  const colors = React.useMemo(() => [
    '#000000', '#FF0000', '#0066FF', '#00AA00', 
    '#FF9900', '#9900FF', '#FF1493', '#00FFFF',
    '#FFFF00', '#808080', '#FFFFFF'
  ], []);
  const penSizes = React.useMemo(() => [1, 2, 3, 5, 8, 12], []);
  // Optimisation: useCallback pour setters
  const handleSetTool = useCallback((tool: 'pen' | 'highlighter' | 'eraser') => setSelectedTool(tool), []);
  const handleSetColor = useCallback((color: string) => setPenColor(color), []);
  const handleSetSize = useCallback((size: number) => setPenSize(size), []);
  // Fonction utilitaire pour (re)débloquer le verrou après 300ms du dernier clic
  const lockActions = useCallback(() => {
    setIsActionLocked(true);
    if (actionLockTimeout.current) clearTimeout(actionLockTimeout.current);
    actionLockTimeout.current = setTimeout(() => {
      setIsActionLocked(false);
    }, 300);
  }, []);
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

  // (déplacé plus haut, optimisé avec useMemo)

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
    // Pour les zooms > 1, calculer les limites avec marge de sécurité
    const margin = 24; // px, pour éviter d'aller trop loin
    const scaledWidth = screenWidth * currentScale;
    const scaledHeight = screenHeight * currentScale;
    const maxTranslateX = Math.max(0, (scaledWidth - screenWidth) / 2 - margin);
    const maxTranslateY = Math.max(0, (scaledHeight - screenHeight) / 2 - margin);
    // Contraindre les valeurs
    const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, x));
    const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, y));
    return { x: constrainedX, y: constrainedY };
  };

  // Gestes pour zoom et pan optimisés avec useMemo
  const panGesture = React.useMemo(() =>
    Gesture.Pan()
      .enabled(currentMode === 'pan')
      .onStart(() => {
        if (isDrawing.value) return;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event) => {
        if (isDrawing.value) return;
        const newX = savedTranslateX.value + event.translationX;
        const newY = savedTranslateY.value + event.translationY;
        const constrained = constrainPosition(newX, newY, scale.value);
        translateX.value = constrained.x;
        translateY.value = constrained.y;
      })
      .onEnd(() => {
        if (isDrawing.value) return;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
  , [currentMode]);

  const pinchGesture = React.useMemo(() =>
    Gesture.Pinch()
      .enabled(true)
      .onStart(() => {
        if (isDrawing.value) return;
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event: any) => {
        if (isDrawing.value) return;
        const newScale = Math.max(0.8, Math.min(2.2, savedScale.value * event.scale));
        scale.value = newScale;
        runOnJS(updateZoom)(Math.round(newScale * 100));
        const constrained = constrainPosition(savedTranslateX.value, savedTranslateY.value, newScale);
        translateX.value = constrained.x;
        translateY.value = constrained.y;
      })
      .onEnd(() => {
        if (isDrawing.value) return;
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
  , []);

  const doubleTapGesture = React.useMemo(() =>
    Gesture.Tap()
      .numberOfTaps(2)
      .enabled(true)
      .onEnd(() => {
        runOnJS(resetZoom)();
      })
  , []);

  const twFingerPanGesture = React.useMemo(() =>
    Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .enabled(true)
      .onStart(() => {
        if (isDrawing.value) return;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((event: any) => {
        if (isDrawing.value) return;
        const newX = savedTranslateX.value + event.translationX;
        const newY = savedTranslateY.value + event.translationY;
        const constrained = constrainPosition(newX, newY, scale.value);
        translateX.value = constrained.x;
        translateY.value = constrained.y;
      })
      .onEnd(() => {
        if (isDrawing.value) return;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
  , []);

  const activeGestures = React.useMemo(() =>
    Gesture.Race(doubleTapGesture, pinchGesture, twFingerPanGesture, panGesture)
  , [doubleTapGesture, pinchGesture, twFingerPanGesture, panGesture]);

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
  if (isActionLocked) return;
  setStrokes(prev => prev.slice(0, -1));
  lockActions();
  };

  // Fonction pour effacer tout
  const clearAll = () => {
    if (isActionLocked) return;
    Alert.alert(
      'Effacer tout',
      'Êtes-vous sûr de vouloir effacer tous les dessins ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: () => {
            setStrokes([]);
            lockActions();
          }
        }
      ]
    );
  };

  // Fonction pour réinitialiser le zoom
  const resetZoom = () => {
  if (isActionLocked) return;
  scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
  translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
  savedScale.value = 1;
  savedTranslateX.value = 0;
  savedTranslateY.value = 0;
  setCurrentZoom(100);
  lockActions();
  };

  // Fonction pour zoomer
  const zoomIn = () => {
  if (isActionLocked) return;
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
  lockActions();
  };

  // Fonction pour dézoomer
  const zoomOut = () => {
  if (isActionLocked) return;
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
  lockActions();
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
                onPress={useCallback(() => setCurrentMode('draw'), [])}
              >
                <Text style={styles.toolIcon}>✏️</Text>
              </TouchableOpacity>
              {/* Mode Déplacement */}
              <TouchableOpacity
                style={[styles.toolButton, currentMode === 'pan' && styles.selectedTool]}
                onPress={useCallback(() => setCurrentMode('pan'), [])}
              >
                <Text style={styles.toolIcon}>🤚</Text>
              </TouchableOpacity>
              {/* Mode Zoom */}
              <TouchableOpacity
                style={[styles.toolButton, currentMode === 'zoom' && styles.selectedTool]}
                onPress={useCallback(() => setCurrentMode('zoom'), [])}
              >
                <Text style={styles.toolIcon}>🔍</Text>
              </TouchableOpacity>
          </View>

          {/* Outils de dessin (uniquement en mode dessin) */}
          {currentMode === 'draw' && (
            <View style={styles.toolSection}>
              <TouchableOpacity
                style={[styles.toolButton, selectedTool === 'pen' && styles.selectedTool]}
                onPress={() => handleSetTool('pen')}
              >
                <Text style={styles.toolIcon}>🖊️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolButton, selectedTool === 'highlighter' && styles.selectedTool]}
                onPress={() => handleSetTool('highlighter')}
              >
                <Text style={styles.toolIcon}>🖍️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolButton, selectedTool === 'eraser' && styles.selectedTool]}
                onPress={() => handleSetTool('eraser')}
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
                  onPress={() => handleSetColor(color)}
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
                  onPress={() => handleSetSize(size)}
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

      {/* Boutons ronds flottants pour Enregistrer, Publier, Exporter placés en colonne à droite, juste au-dessus des boutons d'action */}
      <View style={styles.fabColumn} pointerEvents="box-none">
        {onSaveDraft && (
          <TouchableOpacity style={styles.fabAction} onPress={() => onSaveDraft(strokes)}>
            <Text style={styles.fabActionText}>📝</Text>
          </TouchableOpacity>
        )}
        {onPublish && (
          <TouchableOpacity style={[styles.fabAction, {backgroundColor: '#34C759'}]} onPress={() => onPublish(strokes)}>
            <Text style={styles.fabActionText}>🚀</Text>
          </TouchableOpacity>
        )}
        {(!onSaveDraft && !onPublish) && (
          <TouchableOpacity style={styles.fabAction} onPress={() => onSave(strokes)}>
            <Text style={styles.fabActionText}>💾</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Boutons d'action flottants */}
      <View style={styles.actionButtons}>
        {/* Boutons de zoom (affichés en mode pan ou zoom) */}
        {(currentMode === 'pan' || currentMode === 'zoom') && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, isActionLocked && { opacity: 0.5 }]}
              onPress={isActionLocked ? undefined : zoomIn}
              disabled={isActionLocked}
            >
              <Text style={styles.actionButtonText}>🔍+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isActionLocked && { opacity: 0.5 }]}
              onPress={isActionLocked ? undefined : zoomOut}
              disabled={isActionLocked}
            >
              <Text style={styles.actionButtonText}>�-</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.actionButton, isActionLocked && { opacity: 0.5 }]}
          onPress={isActionLocked ? undefined : resetZoom}
          disabled={isActionLocked}
        >
          <Text style={styles.actionButtonText}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, isActionLocked && { opacity: 0.5 }]}
          onPress={isActionLocked ? undefined : undoLastStroke}
          disabled={isActionLocked}
        >
          <Text style={styles.actionButtonText}>↶</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, isActionLocked && { opacity: 0.5 }]}
          onPress={isActionLocked ? undefined : clearAll}
          disabled={isActionLocked}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#232323',
    marginHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  actionButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  // Nouvelle barre de sauvegarde élégante
  fabColumn: {
    position: 'absolute',
    right: 20,
    bottom: 220, // juste au-dessus de la colonne actionButtons
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 16,
    zIndex: 2000,
    pointerEvents: 'box-none',
  },
  fabAction: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#232323',
    marginHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  fabActionText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
