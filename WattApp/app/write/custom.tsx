
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PDFAnnotator } from '../components/PDFAnnotatorClean';

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
  console.log('template:', template);

  const [saving, setSaving] = useState(false);
  const [showLines, setShowLines] = useState(false);

  // PDF interactif : on utilise PDFAnnotatorClean
  const pdfUri = template.pdfUri || template.backgroundImage || '';
  console.log('pdfUri:', pdfUri);

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
      {/* Header du template */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.templateInfo}>
          <Text style={styles.templateTitle}>{template.title || 'Template personnalisé'}</Text>
          {template.subtitle ? <Text style={styles.templateSubtitle}>{template.subtitle}</Text> : null}
        </View>
        <TouchableOpacity
          style={styles.smartNotebookBtn}
          onPress={() => setShowLines((prev) => !prev)}
        >
          <Text style={styles.smartNotebookBtnText}>
            {showLines ? 'Masquer les lignes' : 'Cahier intelligent'}
          </Text>
        </TouchableOpacity>
      </View>
  


      {/* PDF interactif : écriture directe sur le PDF */}
      <View style={{ flex: 1 }}>
        <PDFAnnotator
          pdfUri={pdfUri}
          penColor={'#222'}
          penSize={2}
          currentTool={'text'}
          onSaveAnnotations={(annotations: any) => {
            // Tu peux gérer la sauvegarde ici
            Alert.alert('Annotations sauvegardées');
          }}
          showLines={showLines}
        />
      </View>

      {/* Actions flottantes en bas */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={[styles.actionBtn, styles.draftButton]} onPress={saveDraft} disabled={saving}>
          <Text style={styles.actionBtnText}>{saving ? 'Sauvegarde...' : 'Brouillon'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.publishButton]} onPress={publishBook} disabled={saving}>
          <Text style={styles.actionBtnText}>Publier</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#222',
    fontSize: 18,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    opacity: 0.18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backText: {
    fontSize: 22,
    color: '#222',
    fontWeight: '700',
  },
  templateInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  templateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  templateSubtitle: {
    fontSize: 14,
    color: '#555',
    opacity: 0.8,
  },
  lineInput: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 16,
    minHeight: 28,
    maxHeight: 32,
    color: '#222',
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.13)',
    position: 'absolute',
    left: 24,
    right: 24,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  draftButton: {
    backgroundColor: 'rgba(255, 149, 0, 0.95)',
  },
  publishButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  smartNotebookBtn: {
    marginLeft: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'center',
  },
  smartNotebookBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  
});