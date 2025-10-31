import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const LINE_SPACING = 22;

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
  linePositions?: number[];
}

export function PDFAnnotator(props: PDFAnnotatorProps) {
  const { pdfUri } = props;

  // Valeurs animées pour le zoom et le déplacement
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Gestes
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      console.log('[PDFAnnotator] Pinch START');
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      console.log('[PDFAnnotator] Pinch UPDATE', event.scale);
      scale.value = Math.max(0.5, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      console.log('[PDFAnnotator] Pinch END');
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      console.log('[PDFAnnotator] Pan START');
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      console.log('[PDFAnnotator] Pan UPDATE', event.translationX, event.translationY);
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      console.log('[PDFAnnotator] Pan END');
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const combinedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.pdfContainer, animatedStyle]}>
          <Image
            source={{ uri: pdfUri }}
            style={styles.pdfBackground}
            contentFit="contain"
          />
        </Animated.View>
      </GestureDetector>
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
  tapToAnnotateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  tapToAnnotateText: {
    fontSize: 18,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
  },
});