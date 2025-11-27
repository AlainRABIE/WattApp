// Type for a drawn path
interface PathType {
  path: string;
  color: string;
  strokeWidth: number;
  pressure?: number;
  touchType?: string; // 'touch' | 'pen' | 'mouse'
  userId?: string; // Ajout pour collaboration
}

interface TouchData {
  locationX: number;
  locationY: number;
  pressure?: number;
  force?: number;
  touchType?: string;
  timestamp: number;
}

import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
// Firebase imports
import { getFirestore, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { View, StyleSheet, PanResponder } from 'react-native';
import { Canvas, Path, Skia, Group, Text as SkiaText } from '@shopify/react-native-skia';


// Props: roomId (string, obligatoire pour la collab)
const DrawingCanvas = forwardRef(function DrawingCanvas(props: any, ref) {
  const {
    initialPaths = [],
    penColor = '#222',
    penSize = 3,
    onChange,
    roomId, // identifiant de la room collaborative
    collaborative = false, // activer/désactiver la collab
  } = props;

  const [paths, setPaths] = useState(initialPaths);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState(penColor);
  const [currentSize, setCurrentSize] = useState(penSize);
  const [currentTouchData, setCurrentTouchData] = useState<TouchData | null>(null);

  // Firestore setup
    // Pour afficher le pseudo de chaque utilisateur (cache local)
    const [userMap, setUserMap] = useState<{ [uid: string]: string }>({});
    // Récupère le pseudo d'un utilisateur depuis Firestore
    const fetchUserDisplayName = async (uid: string) => {
      if (!uid || userMap[uid]) return;
      try {
        const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');
        const db = getFirestore(getApp());
        const q = query(collection(db, 'users'), where('uid', '==', uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setUserMap(prev => ({ ...prev, [uid]: data.displayName || data.pseudo || data.email || uid }));
        }
      } catch {}
    };
  const db = collaborative ? getFirestore(getApp()) : null;
  const roomDocRef = collaborative && roomId ? doc(db, 'drawingRooms', roomId) : null;
  // Auth pour récupérer l'utilisateur courant
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!collaborative) return;
    import('firebase/auth').then(({ getAuth }) => {
      try {
        const auth = getAuth();
        setCurrentUserId(auth.currentUser?.uid || null);
      } catch {}
    });
  }, [collaborative]);
  // Ecoute Firestore pour la collaboration
  useEffect(() => {
    if (!collaborative || !roomDocRef) return;
    // Ecoute les changements sur le document de la room
    const unsub = onSnapshot(roomDocRef, (docSnap) => {
      const data = docSnap.data();
      if (data && Array.isArray(data.paths)) {
        setPaths(data.paths);
      }
    });
    return () => unsub();
  }, [collaborative, roomId]);

  // Push les paths sur Firestore à chaque changement
  const syncPathsToFirestore = async (updatedPaths: PathType[]) => {
    if (!collaborative || !roomDocRef) return;
    try {
      await setDoc(roomDocRef, { paths: updatedPaths }, { merge: true });
    } catch (e) {
      console.warn('Erreur sync Firestore:', e);
    }
  };

  // Fonction pour détecter le type de toucher et extraire les données
  const extractTouchData = (evt: any): TouchData => {
    const nativeEvent = evt.nativeEvent;
    const touch = nativeEvent.touches && nativeEvent.touches[0] ? nativeEvent.touches[0] : nativeEvent;
    
    return {
      locationX: touch.locationX || nativeEvent.locationX,
      locationY: touch.locationY || nativeEvent.locationY,
      pressure: touch.force || nativeEvent.force || 0.5, // Force/pression du stylet
      force: touch.force || nativeEvent.force || 0.5,
      touchType: touch.touchType || nativeEvent.touchType || 'touch', // 'pen', 'touch', etc.
      timestamp: nativeEvent.timestamp || Date.now(),
    };
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onShouldBlockNativeResponder: () => true,
      
      onPanResponderGrant: (evt) => {
        const touchData = extractTouchData(evt);
        console.log('[DrawingCanvas] Grant - Touch type:', touchData.touchType, 'Pressure:', touchData.pressure);
        
        // Ignorer les gestes multi-touch
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) return;
        
        setCurrentTouchData(touchData);
        const p = Skia.Path.Make();
        p.moveTo(touchData.locationX, touchData.locationY);
        setCurrentPath(p.toSVGString());
      },
      
      onPanResponderMove: (evt) => {
        const touchData = extractTouchData(evt);
        
        // Ignorer les gestes multi-touch
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) return;
        
        if (currentPath && currentTouchData) {
          const p = Skia.Path.MakeFromSVGString(currentPath);
          if (p) {
            p.lineTo(touchData.locationX, touchData.locationY);
            setCurrentPath(p.toSVGString());
            setCurrentTouchData(touchData);
          }
        }
      },
      
      onPanResponderRelease: (evt) => {
        const touchData = extractTouchData(evt);
        console.log('[DrawingCanvas] Release - Touch type:', touchData.touchType);
        
        // Ignorer les gestes multi-touch
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) return;
        
        if (currentPath && currentTouchData) {
          // Calculer la largeur du trait basée sur la pression
          const pressureMultiplier = currentTouchData.pressure || 0.5;
          const dynamicStrokeWidth = Math.max(1, currentSize * pressureMultiplier * 2);
          
          setPaths((prev: PathType[]) => {
            const updated = [
              ...prev,
              {
                path: currentPath,
                color: currentColor,
                strokeWidth: dynamicStrokeWidth,
                pressure: currentTouchData.pressure,
                touchType: currentTouchData.touchType,
                userId: collaborative ? currentUserId : undefined,
              },
            ];
            onChange && onChange(updated);
            if (collaborative) syncPathsToFirestore(updated);
            return updated;
          });
          setCurrentPath(null);
          setCurrentTouchData(null);
        }
      },
      
      onPanResponderTerminate: (evt) => {
        console.log('[DrawingCanvas] Terminate');
        setCurrentPath(null);
        setCurrentTouchData(null);
      },
      
      // Gérer les taps simples (clics sans mouvement)
      onPanResponderEnd: (evt) => {
        const touchData = extractTouchData(evt);
        
        // Si c'est un tap simple (pas de mouvement significatif)
        if (!currentPath || currentPath.length < 10) {
          console.log('[DrawingCanvas] Single tap detected');
          
          // Créer un petit point pour le tap
          const p = Skia.Path.Make();
          p.addCircle(touchData.locationX, touchData.locationY, Math.max(1, currentSize / 2));
          
          const pressureMultiplier = touchData.pressure || 0.5;
          const dynamicStrokeWidth = Math.max(1, currentSize * pressureMultiplier * 2);
          
          setPaths((prev: PathType[]) => {
            const updated = [
              ...prev,
              {
                path: p.toSVGString(),
                color: currentColor,
                strokeWidth: dynamicStrokeWidth,
                pressure: touchData.pressure,
                touchType: touchData.touchType,
                userId: collaborative ? currentUserId : undefined,
              },
            ];
            onChange && onChange(updated);
            if (collaborative) syncPathsToFirestore(updated);
            return updated;
          });
        }
        
        setCurrentPath(null);
        setCurrentTouchData(null);
      },
    })
  ).current;

  // Méthodes exposées via la ref
  useImperativeHandle(ref, () => ({
    undo: () => {
  setPaths((prev: PathType[]) => {
        const updated = prev.slice(0, -1);
        onChange && onChange(updated);
        if (collaborative) syncPathsToFirestore(updated);
        return updated;
      });
    },
    clear: () => {
      setPaths([]);
      onChange && onChange([]);
      if (collaborative) syncPathsToFirestore([]);
    },
    setPenColor: setCurrentColor,
    setPenSize: setCurrentSize,
  }));

  return (
    <View 
      style={styles.container} 
      pointerEvents="box-only"
      {...panResponder.panHandlers}
    >
      <Canvas style={styles.canvas}>
        <Group>
          {paths.map((p: PathType, i: number) => {
            // Si collaboration, on affiche le pseudo de l'auteur
            if (collaborative && p.userId) fetchUserDisplayName(p.userId);
            return (
              <>
                <Path
                  key={i}
                  path={p.path}
                  color={p.color}
                  style="stroke"
                  strokeWidth={p.strokeWidth}
                  strokeJoin="round"
                  strokeCap="round"
                  opacity={p.touchType === 'pen' ? 0.8 : 1.0}
                />
                {/* Affiche le pseudo à côté du début du trait */}
                {collaborative && p.userId && userMap[p.userId] && (() => {
                  // On essaye d'extraire le premier point du path SVG
                  const match = p.path.match(/M\s*([\d.]+)[, ]([\d.]+)/i);
                  if (match) {
                    const x = parseFloat(match[1]);
                    const y = parseFloat(match[2]);
                    return (
                      <SkiaText
                        key={i + '-label'}
                        x={x + 8}
                        y={y - 8}
                        text={userMap[p.userId]}
                        color="#FFA94D"
                        fontSize={12}
                        opacity={0.85}
                      />
                    );
                  }
                  return null;
                })()}
              </>
            );
          })}
          {currentPath && currentTouchData && (
            <Path
              path={currentPath}
              color={currentColor}
              style="stroke"
              strokeWidth={Math.max(1, currentSize * (currentTouchData.pressure || 0.5) * 2)}
              strokeJoin="round"
              strokeCap="round"
              opacity={currentTouchData.touchType === 'pen' ? 0.8 : 1.0}
            />
          )}
        </Group>
      </Canvas>
    </View>
  );
});

export { DrawingCanvas };
export default DrawingCanvas;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});