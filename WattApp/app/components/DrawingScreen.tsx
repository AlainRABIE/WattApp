import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { DrawingCanvas } from './DrawingCanvas';

const COLORS = ['#222', '#e53935', '#43a047', '#1e88e5', '#fbc02d'];
const SIZES = [2, 4, 8, 12];

export default function DrawingScreen() {
  const canvasRef = useRef<any>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);

  // Pour undo/clear, on passe des refs ou callbacks au composant DrawingCanvas
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <DrawingCanvas
        ref={canvasRef}
        penColor={color}
        penSize={size}
      />
      <View style={styles.toolbar}>
        <View style={styles.colors}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorBtn, { backgroundColor: c, borderWidth: color === c ? 2 : 0 }]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>
        <View style={styles.sizes}>
          {SIZES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sizeBtn, { borderWidth: size === s ? 2 : 0 }]}
              onPress={() => setSize(s)}
            >
              <View style={{ backgroundColor: '#222', width: s * 2, height: s * 2, borderRadius: s }} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={() => canvasRef.current?.undo?.()}>
          <Text style={styles.actionText}>↩️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => canvasRef.current?.clear?.()}>
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 10,
    borderRadius: 16,
    marginHorizontal: 20,
    gap: 12,
  },
  colors: {
    flexDirection: 'row',
    gap: 8,
  },
  colorBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 2,
    borderColor: '#222',
  },
  sizes: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  sizeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#222',
    marginHorizontal: 2,
  },
  actionBtn: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  actionText: {
    fontSize: 20,
  },
});
