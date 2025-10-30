// Type for a drawn path
interface PathType {
  path: string;
  color: string;
  strokeWidth: number;
}
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { Canvas, Path, Skia, Group } from '@shopify/react-native-skia';

const DrawingCanvas = forwardRef(function DrawingCanvas(props: any, ref) {
  const {
    initialPaths = [],
    penColor = '#222',
    penSize = 3,
    onChange,
  } = props;

  const [paths, setPaths] = useState(initialPaths);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState(penColor);
  const [currentSize, setCurrentSize] = useState(penSize);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const p = Skia.Path.Make();
        p.moveTo(locationX, locationY);
        setCurrentPath(p.toSVGString());
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (currentPath) {
          const p = Skia.Path.MakeFromSVGString(currentPath);
          if (p) {
            p.lineTo(locationX, locationY);
            setCurrentPath(p.toSVGString());
          }
        }
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths((prev: PathType[]) => {
            const updated = [
              ...prev,
              { path: currentPath, color: currentColor, strokeWidth: currentSize },
            ];
            onChange && onChange(updated);
            return updated;
          });
          setCurrentPath(null);
        }
      },
      onPanResponderTerminate: () => {
        setCurrentPath(null);
      },
    })
  ).current;

  // Méthodes exposées via la ref
  useImperativeHandle(ref, () => ({
    undo: () => {
  setPaths((prev: PathType[]) => {
        const updated = prev.slice(0, -1);
        onChange && onChange(updated);
        return updated;
      });
    },
    clear: () => {
      setPaths([]);
      onChange && onChange([]);
    },
    setPenColor: setCurrentColor,
    setPenSize: setCurrentSize,
  }));

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={styles.canvas}>
        <Group>
          {paths.map((p: PathType, i: number) => (
            <Path
              key={i}
              path={p.path}
              color={p.color}
              style="stroke"
              strokeWidth={p.strokeWidth}
              strokeJoin="round"
              strokeCap="round"
            />
          ))}
          {currentPath && (
            <Path
              path={currentPath}
              color={currentColor}
              style="stroke"
              strokeWidth={currentSize}
              strokeJoin="round"
              strokeCap="round"
            />
          )}
        </Group>
      </Canvas>
    </View>
  );
});

export { DrawingCanvas };

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
});