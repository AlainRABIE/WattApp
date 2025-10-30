import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PDFAnnotator } from '../components/PDFAnnotatorClean';
import { DrawingCanvas } from '../components/DrawingCanvas';

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />


      {/* Bouton retour minimal, fin, collé au coin */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtnMinimalist}>
        <Ionicons name="chevron-back" size={22} color="#23272F" style={{ opacity: 0.7 }} />
      </TouchableOpacity>


      <View style={{ flex: 1 }}>
        {/* PDF et dessin */}
        <PDFAnnotator
          pdfUri={pdfUri}
          penColor={color}
          penSize={size}
          currentTool={'pen'}
          onSaveAnnotations={() => {}}
        />
        <DrawingCanvas
          ref={canvasRef}
          penColor={color}
          penSize={size}
        />
        {/* Barre d'outils verticale à droite, centrée verticalement */}
        <View style={styles.toolbarModernVertical}>
          {/* Outils principaux (stylo, surligneur, gomme) */}
          <TouchableOpacity style={styles.modernBtn} onPress={() => setColor(COLORS[0])}>
            <Ionicons name="pencil" size={20} color={color === COLORS[0] ? '#43a047' : '#23272F'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernBtn} onPress={() => setColor(COLORS[3])}>
            <Ionicons name="brush" size={20} color={color === COLORS[3] ? '#43a047' : '#23272F'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernBtn} onPress={() => setColor(COLORS[2])}>
            <Ionicons name="color-fill" size={20} color={color === COLORS[2] ? '#43a047' : '#23272F'} />
          </TouchableOpacity>
          <View style={styles.modernSeparatorVertical} />
          {/* Couleurs */}
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.modernColorBtn, { backgroundColor: c, borderWidth: color === c ? 2 : 0, borderColor: color === c ? '#43a047' : 'rgba(35,39,47,0.12)' }]}
              onPress={() => setColor(c)}
            />
          ))}
          <View style={styles.modernSeparatorVertical} />
          {/* Tailles */}
          {SIZES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.modernSizeBtn, { borderWidth: size === s ? 2 : 0, borderColor: size === s ? '#43a047' : 'rgba(35,39,47,0.12)' }]}
              onPress={() => setSize(s)}
            >
              <View style={{ backgroundColor: '#23272F', width: s * 2, height: s * 2, borderRadius: s, opacity: 0.7 }} />
            </TouchableOpacity>
          ))}
          <View style={styles.modernSeparatorVertical} />
          {/* Actions */}
          <TouchableOpacity style={styles.modernBtn} onPress={() => canvasRef.current?.undo?.()}>
            <Ionicons name="arrow-undo" size={20} color="#23272F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernBtn} onPress={() => canvasRef.current?.clear?.()}>
            <Ionicons name="trash" size={20} color="#e53935" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions flottantes en bas */}
      {/* Boutons d'action en haut à gauche */}
      <View style={styles.actionBarTopLeft}>
        <TouchableOpacity style={[styles.actionBtnTop, styles.draftBtnTop]} onPress={saveDraft} disabled={saving}>
          <Ionicons name="save-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtnTop, styles.publishBtnTop]} onPress={publishBook} disabled={saving}>
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
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
  backIconMinimalist: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '300',
    opacity: 0.7,
    marginLeft: 1,
    marginTop: -1,
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
    marginHorizontal: 4,
  },
  modernSeparator: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(35,39,47,0.10)',
    marginHorizontal: 8,
  },
  modernColorBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginHorizontal: 2,
    borderWidth: 1,
  },
  modernSizeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
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
  actionBarGlass: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 18,
    marginHorizontal: 24,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 18,
  },
  actionGlassBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 22,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#fff',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  draftGlassButton: {
    backgroundColor: 'rgba(251,192,45,0.85)',
  },
  publishGlassButton: {
    backgroundColor: 'rgba(67,160,71,0.85)',
  },
  actionGlassBtnText: {
    color: '#23272F',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});