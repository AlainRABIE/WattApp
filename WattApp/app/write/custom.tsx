import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PDFAnnotator } from '../components/PDFAnnotatorClean';
import { DrawingCanvas } from '../components/DrawingCanvas';

const DISPLAY_MODES = [
  { key: 'light', label: 'Clair', icon: 'sunny-outline', bg: '#FFF8E1', toolbar: 'rgba(255,255,255,0.7)', btn: '#23272F' },
  { key: 'dark', label: 'Sombre', icon: 'moon-outline', bg: '#181C22', toolbar: 'rgba(30,34,40,0.92)', btn: '#fff' },
  { key: 'calm', label: 'Calme', icon: 'leaf-outline', bg: '#E3F2FD', toolbar: 'rgba(200,230,201,0.7)', btn: '#388E3C' },
];

export default function CustomWriteScreen() {
  const router = useRouter();
  const { templateData } = useLocalSearchParams();
  let template: any = {};
  if (templateData) {
    const dataStr = Array.isArray(templateData) ? templateData[0] : templateData;
    try {
      template = JSON.parse(dataStr);
    } catch (e) {
      console.warn('Erreur de parsing templateData:', e);
    }
  }

  const [saving, setSaving] = useState(false);
  const [displayModeIdx, setDisplayModeIdx] = useState(0);
  const displayMode = DISPLAY_MODES[displayModeIdx];

  const pdfUri = template.pdfUri || template.backgroundImage || '';

  // Barre d'outils dessin
  const canvasRef = useRef<any>(null);
  const COLORS = ['#222', '#e53935', '#43a047', '#1e88e5', '#fbc02d'];
  const SIZES = [2, 4, 8, 12];
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);

  const saveDraft = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Brouillon sauvegardé !');
    }, 1000);
  };

  const publishBook = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Livre publié !');
    }, 1000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: displayMode.bg }]}>
      <StatusBar barStyle={displayMode.key === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Bouton retour minimal */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtnMinimalist}>
        <Ionicons name="chevron-back" size={22} color={displayMode.key === 'dark' ? '#fff' : '#23272F'} style={{ opacity: 0.7 }} />
      </TouchableOpacity>

      {/* Boutons d'action et mode en haut à gauche */}
      <View style={styles.actionBarTopLeft}>
        <TouchableOpacity
          style={[styles.actionBtnTop, { backgroundColor: displayMode.btn }]}
          onPress={() => setDisplayModeIdx((displayModeIdx + 1) % DISPLAY_MODES.length)}
        >
          <Ionicons name={displayMode.icon as any} size={20} color={displayMode.key === 'dark' ? '#23272F' : '#fff'} />        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnTop, styles.draftBtnTop, { backgroundColor: displayMode.key === 'dark' ? '#388E3C' : '#43a047' }]}
          onPress={saveDraft}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnTop, styles.publishBtnTop, { backgroundColor: displayMode.key === 'dark' ? '#1976D2' : '#1e88e5' }]}
          onPress={publishBook}
          disabled={saving}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {/* PDF et dessin */}
        <PDFAnnotator
          pdfUri={pdfUri}
          penColor={color}
          penSize={size}
          currentTool={'pen'}
          onSaveAnnotations={() => { }}
        />
        <DrawingCanvas
          ref={canvasRef}
          penColor={color}
          penSize={size}
        />
        {/* Barre d'outils verticale à droite, centrée verticalement */}
        <View style={[
          styles.toolbarModernVertical,
          { backgroundColor: displayMode.toolbar, borderColor: displayMode.key === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)' }
        ]}>
          {/* Outils principaux */}
          <TouchableOpacity style={styles.modernBtn} onPress={() => setColor(COLORS[0])}>
            <Ionicons name="pencil" size={20} color={color === COLORS[0] ? '#43a047' : (displayMode.key === 'dark' ? '#fff' : '#23272F')} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernBtn} onPress={() => setColor(COLORS[3])}>
            <Ionicons name="brush" size={20} color={color === COLORS[3] ? '#43a047' : (displayMode.key === 'dark' ? '#fff' : '#23272F')} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernBtn} onPress={() => setColor(COLORS[2])}>
            <Ionicons name="color-fill" size={20} color={color === COLORS[2] ? '#43a047' : (displayMode.key === 'dark' ? '#fff' : '#23272F')} />
          </TouchableOpacity>
          <View style={styles.modernSeparatorVertical} />
          {/* Couleurs */}
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.modernColorBtn,
                {
                  backgroundColor: c,
                  borderWidth: color === c ? 2 : 0,
                  borderColor: color === c ? '#43a047' : (displayMode.key === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(35,39,47,0.12)')
                }
              ]}
              onPress={() => setColor(c)}
            />
          ))}
          <View style={styles.modernSeparatorVertical} />
          {/* Tailles */}
          {SIZES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.modernSizeBtn,
                {
                  borderWidth: size === s ? 2 : 0,
                  borderColor: size === s ? '#43a047' : (displayMode.key === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(35,39,47,0.12)')
                }
              ]}
              onPress={() => setSize(s)}
            >
              <View style={{
                backgroundColor: displayMode.key === 'dark' ? '#fff' : '#23272F',
                width: s * 2,
                height: s * 2,
                borderRadius: s,
                opacity: 0.7
              }} />
            </TouchableOpacity>
          ))}
          <View style={styles.modernSeparatorVertical} />
          {/* Actions */}
          <TouchableOpacity style={styles.modernBtn} onPress={() => canvasRef.current?.undo?.()}>
            <Ionicons name="arrow-undo" size={20} color={displayMode.key === 'dark' ? '#fff' : '#23272F'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernBtn} onPress={() => canvasRef.current?.clear?.()}>
            <Ionicons name="trash" size={20} color="#e53935" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtnMinimalist: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 8 : 4,
    left: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(35,39,47,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  actionBarTopLeft: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 32,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 60,
  },
  actionBtnTop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 6,
  },
  draftBtnTop: {
    backgroundColor: '#43a047',
  },
  publishBtnTop: {
    backgroundColor: '#1e88e5',
  },
  toolbarModernVertical: {
    position: 'absolute',
    top: '20%',
    right: 18,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 45,
  },
  modernSeparatorVertical: {
    width: 28,
    height: 1,
    backgroundColor: 'rgba(35,39,47,0.10)',
    marginVertical: 8,
  },
  modernBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  modernColorBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginVertical: 2,
    borderWidth: 1,
  },
  modernSizeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});