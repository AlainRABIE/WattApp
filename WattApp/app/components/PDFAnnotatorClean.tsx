import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
  export default PDFAnnotator;

const { width, height } = Dimensions.get('window');

interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

interface PDFAnnotatorProps {
  pdfUri: string;
  penColor: string;
  penSize: number;
  currentTool: 'pen' | 'highlighter' | 'eraser' | 'text';
  onSaveAnnotations: (annotations: any) => void;
  showLines?: boolean;
}
export function PDFAnnotator(props: PDFAnnotatorProps) {
  const {
    pdfUri,
    penColor,
    penSize,
    currentTool,
    onSaveAnnotations,
    showLines = false,
  } = props;
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [showAddText, setShowAddText] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState({ x: 0, y: 0 });
  const [newTextContent, setNewTextContent] = useState('');
  
  // Valeurs animées pour le zoom et pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const LINE_SPACING = 22;
  const NUM_LINES = 22;
  const [lines, setLines] = useState<string[]>(Array(NUM_LINES).fill(''));
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Snap automatique sur la ligne la plus proche lors de l'ajout de texte
  // (supprimé doublon LINE_SPACING)
  const handleTextAdd = (x: number, y: number) => {
    if (currentTool === 'text') {
      // Ajuster les coordonnées en fonction du zoom et du pan
      const adjustedX = (x - translateX.value) / scale.value;
      const adjustedY = (y - translateY.value) / scale.value;
      // Snap Y sur la ligne la plus proche
      const snappedY = Math.round(adjustedY / LINE_SPACING) * LINE_SPACING;
      setNewTextPosition({ x: adjustedX - 100, y: snappedY - 12 }); // -12 pour centrer sur la ligne
      setShowAddText(true);
    }
  };

  // Gestionnaire de pincement pour le zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Gestionnaire de pan
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Gestionnaire de tap
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      runOnJS(handleTextAdd)(event.x, event.y);
    });

  // Combiner les gestes
  const combinedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    tapGesture
  );

  // Style animé pour le container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Fonction pour réinitialiser le zoom
  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const addTextAnnotation = () => {
    if (newTextContent.trim()) {
      const newAnnotation: TextAnnotation = {
        id: Date.now().toString(),
        x: newTextPosition.x,
        y: newTextPosition.y,
        text: newTextContent.trim(),
        color: penColor,
        size: penSize,
      };
      
      setTextAnnotations(prev => [...prev, newAnnotation]);
      setNewTextContent('');
      setShowAddText(false);
    }
  };

  const removeAnnotation = (id: string) => {
    setTextAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const clearAllAnnotations = () => {
    Alert.alert(
      'Effacer toutes les annotations',
      'Êtes-vous sûr de vouloir effacer toutes les annotations ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: () => setTextAnnotations([])
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.pdfContainer, animatedStyle]}>
          <Image 
            source={{ uri: pdfUri }} 
            style={styles.pdfBackground}
            contentFit="contain"
          />
          {/* Lignes jaunes adaptatives (mode Cahier intelligent) */}
          {showLines && Array.from({ length: 22 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 24,
                right: 24,
                height: 4,
                backgroundColor: 'rgba(255, 221, 51, 0.7)',
                top: i * 22 + 34,
                borderRadius: 2,
              }}
            />
          ))}
          {/* Annotations textuelles */}
          {textAnnotations.map((annotation) => (
            <TouchableOpacity
              key={annotation.id}
              style={[
                styles.textAnnotation,
                { 
                  left: annotation.x, 
                  top: annotation.y,
                  borderColor: annotation.color 
                }
              ]}
              onLongPress={() => removeAnnotation(annotation.id)}
            >
              <Text style={[
                styles.annotationText, 
                { 
                  color: annotation.color,
                  fontSize: 12 + annotation.size * 2
                }
              ]}>
                {annotation.text}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Modal d'ajout de texte */}
      {showAddText && (
        <View style={[
          styles.textInputModal,
          { left: newTextPosition.x, top: newTextPosition.y }
        ]}>
          <TextInput
            style={styles.textInput}
            placeholder="Tapez votre annotation..."
            value={newTextContent}
            onChangeText={setNewTextContent}
            autoFocus
            multiline
          />
          <View style={styles.textInputButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowAddText(false);
                setNewTextContent('');
              }}
            >
              <Text style={styles.buttonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={addTextAnnotation}
            >
              <Text style={styles.buttonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Boutons d'action flottants */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={resetZoom}
        >
          <Text style={styles.actionButtonText}>🔍</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={clearAllAnnotations}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onSaveAnnotations({ textAnnotations })}
        >
          <Text style={styles.actionButtonText}>💾</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  pdfContainer: {
    flex: 1,
  },
  pdfBackground: {
    width: '100%',
    height: '100%',
  },
  textAnnotation: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 2,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  annotationText: {
    fontWeight: '500',
  },
  textInputModal: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    minHeight: 60,
    maxHeight: 120,
    marginBottom: 10,
  },
  textInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 10,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
