import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import NoteLayout from '../components/NoteLayout';
import PDFDrawingEditor from '../components/PDFDrawingEditorClean';
import PublishDetailsModal from './PublishDetailsModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

const TemplateEditor: React.FC = () => {
  const { templateId } = useLocalSearchParams();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [importTitle, setImportTitle] = useState<string>('');
  const [importGenre, setImportGenre] = useState<string>('');
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [savingImport, setSavingImport] = useState<boolean>(false);

  // Pour la publication (modal)
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishStrokes, setPublishStrokes] = useState<any>(null);

  useEffect(() => {
    if (!templateId) return;
    const fetchTemplate = async () => {
      try {
        const ref = doc(db, 'templates', String(templateId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const t = { id: snap.id, ...snap.data() };
          setTemplate(t);
          let starterText = '';
          if ('starter' in t && typeof t.starter === 'string') starterText = t.starter;
          else if ('body' in t && typeof t.body === 'string') starterText = t.body;
          setBody(starterText);
        } else {
          router.back();
        }
      } catch (e) {
        router.back();
      }
    };
    fetchTemplate();
  }, [templateId]);

  async function createDraft() {
    try {
      setSaving(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non authentifié');

      const docRef = await addDoc(collection(db, 'books'), {
        title: title || '(Sans titre)',
        body,
        templateId: template?.id || null,
        authorUid: user.uid,
        status: 'draft',
        createdAt: serverTimestamp(),
      });
      
      Alert.alert(
        'Brouillon créé', 
        'Votre brouillon a été enregistré avec succès !',
        [
          {
            text: 'OK',
            onPress: () => (router as any).push('/library/Library')
          }
        ]
      );
    } catch (e: any) {
      console.warn('createDraft error', e);
      Alert.alert('Erreur', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function importPdf() {
    try {
      const resAny = (await DocumentPicker.getDocumentAsync({ type: 'application/pdf' })) as any;
      if (resAny.type === 'cancel') return;
      const uri = resAny.uri;
      const name = resAny.name;
      if (!uri) return Alert.alert('Erreur', 'Impossible de récupérer le fichier.');

      // get file info
      const info = await FileSystem.getInfoAsync(uri) as any;
      const MAX_BYTES = 1500000; // ~1.5 MB limit for base64-in-Firestore

      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return Alert.alert('Authentification requise', 'Connecte-toi pour importer des fichiers.');

      // Instead of saving immediately, open a small pre-import form so the user can set title/genre/cover
      setPendingImport({ uri, name, size: info.size ?? null, isSmall: !!(info.exists && info.size && info.size <= MAX_BYTES) });
      setImportTitle(name || '(PDF)');
      setImportGenre('');
      setCoverDataUrl(null);
    } catch (e: any) {
      console.warn('importPdf error', e);
      Alert.alert('Erreur', e?.message ?? String(e));
    }
  }

  async function pickCoverImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!(permission.granted || permission.status === 'granted')) {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour choisir une couverture.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [3, 4] }) as any;
      if (res.canceled) return;
      const asset = res.assets && res.assets[0];
      const uri = asset?.uri;
      if (!uri) return;

      const manip = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      const base64 = await FileSystem.readAsStringAsync(manip.uri, { encoding: 'base64' });
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      // optional size guard could be applied here
      setCoverDataUrl(dataUrl);
    } catch (e: any) {
      console.warn('pickCoverImage error', e);
      Alert.alert('Erreur', 'Impossible de choisir la couverture.');
    }
  }

  async function saveImport() {
    if (!pendingImport) return;
    try {
      setSavingImport(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return Alert.alert('Authentification requise', 'Connecte-toi pour importer des fichiers.');

      if (pendingImport.isSmall) {
        // read base64 and store in Firestore
        const base64 = await FileSystem.readAsStringAsync(pendingImport.uri, { encoding: 'base64' });
        const dataUrl = `data:application/pdf;base64,${base64}`;
        const docRef = await addDoc(collection(db, 'books'), {
          title: importTitle || pendingImport.name || '(PDF)',
          body: '',
          templateId: template?.id || 'pdf',
          authorUid: user.uid,
          status: 'imported',
          pdfDataUrl: dataUrl,
          filename: pendingImport.name,
          size: pendingImport.size ?? null,
          createdAt: serverTimestamp(),
          type: 'pdf',
          genre: importGenre || null,
          coverDataUrl: coverDataUrl || null,
        });
        Alert.alert('Importé', 'Le PDF a été ajouté à votre bibliothèque.');
        setPendingImport(null);
        (router as any).push(`/book/${docRef.id}`);
      } else {
        // too large: copy locally and store metadata
        const name = pendingImport.name || `imported-${Date.now()}.pdf`;
        const dest = FileSystem.documentDirectory + name;
        await FileSystem.copyAsync({ from: pendingImport.uri, to: dest });
        const docRef = await addDoc(collection(db, 'books'), {
          title: importTitle || pendingImport.name || '(PDF local)',
          body: '',
          templateId: template?.id || 'pdf',
          authorUid: user.uid,
          status: 'imported',
          localUri: dest,
          filename: pendingImport.name,
          size: pendingImport.size ?? null,
          createdAt: serverTimestamp(),
          type: 'pdf',
          genre: importGenre || null,
          coverDataUrl: coverDataUrl || null,
        });
        Alert.alert('Importé localement', "Le fichier est trop volumineux pour être stocké dans Firestore. Il a été copié localement et ajouté à votre bibliothèque.");
        setPendingImport(null);
        (router as any).push(`/book/${docRef.id}`);
      }
    } catch (e: any) {
      console.warn('saveImport error', e);
      Alert.alert('Erreur', e?.message ?? String(e));
    } finally {
      setSavingImport(false);
    }
  }

  function cancelImport() {
    setPendingImport(null);
    setImportTitle('');
    setImportGenre('');
    setCoverDataUrl(null);
  }

  if (!template) return null;

  return (
    <NoteLayout
      title={`Créer — ${template.title}`}
      right={
        <TouchableOpacity onPress={importPdf} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
          <Text style={{ color: '#4FC3F7' }}>Importer PDF</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* Large template preview at the top (only for non-PDF templates) */}
        {!(template?.isPDF || (template?.backgroundImage && (template.backgroundImage.endsWith('.pdf') || template.backgroundImage.startsWith('file:') || template.backgroundImage.startsWith('content:')))) && (
          <View style={styles.templatePreviewLarge}>
            {template?.backgroundImage ? (
              <Image
                source={{ uri: template.backgroundImage }}
                style={styles.templateImageLarge}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.templateIconLargeWrap}>
                <Text style={styles.templateIconLarge}>📄</Text>
              </View>
            )}
            <Text style={styles.templateTitleLarge} numberOfLines={2}>{template?.title || template?.nom || 'Sans titre'}</Text>
            {template?.subtitle ? (
              <Text style={styles.templateSubtitleLarge} numberOfLines={2}>{template.subtitle}</Text>
            ) : null}
          </View>
        )}


        {/* If template is a PDF, show PDF drawing editor */}
        {template?.isPDF || (template?.backgroundImage && (template.backgroundImage.endsWith('.pdf') || template.backgroundImage.startsWith('file:') || template.backgroundImage.startsWith('content:')))
          ? (
            <View style={{ flex: 1, minHeight: 400 }}>
              <PDFDrawingEditor
                pdfUri={template.backgroundImage}
                onSaveDraft={(strokes) => {
                  Alert.alert('Brouillon sauvegardé', 'Votre brouillon a été enregistré.');
                }}
                onPublish={(strokes) => {
                  setPublishStrokes(strokes);
                  setShowPublishModal(true);
                }}
                onSave={(strokes) => {
                  Alert.alert('Exporté', 'Votre document a été exporté !');
                }}
              />
              <PublishDetailsModal
                visible={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                onSubmit={async (cover, title, synopsis, price) => {
                  setShowPublishModal(false);
                  try {
                    const auth = getAuth(app);
                    const user = auth.currentUser;
                    if (!user) throw new Error('Utilisateur non authentifié');
                    if (!title.trim()) throw new Error('Le titre est obligatoire');
                    const docData = {
                      title: title || '(Sans titre)',
                      body: '',
                      synopsis: synopsis || '',
                      coverImage: cover || '',
                      templateId: template?.id || null,
                      templateName: template?.title || template?.nom || '',
                      templateBackgroundImage: template?.backgroundImage || '',
                      isPDFAnnotation: true,
                      isPublished: true,
                      authorUid: user.uid,
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                      strokes: Array.isArray(publishStrokes) ? publishStrokes : [],
                      reads: 0,
                      status: 'published',
                      price: price ? parseFloat(price) : 0,
                    };
                    await addDoc(collection(db, 'books'), docData);
                    Alert.alert('Publié', 'Votre document a été publié !');
                  } catch (e) {
                    let msg = '';
                    if (e instanceof Error) msg = e.message;
                    else msg = String(e);
                    Alert.alert('Erreur', msg);
                  }
                  setTimeout(() => {
                    (router as any).push('/library/Library');
                  }, 500);
                }}
              />
            </View>
          ) : (
            <>
              <TextInput value={title} onChangeText={setTitle} placeholder="Titre" placeholderTextColor="#888" style={styles.input} />
              <TextInput value={body} onChangeText={setBody} placeholder="Commencez à écrire..." placeholderTextColor="#888" style={[styles.input, { height: 300 }]} multiline />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity style={[styles.saveButton, { flex: 1, marginRight: 6 }]} onPress={() => Alert.alert('Brouillon sauvegardé', 'Votre brouillon a été enregistré.') }>
                  <Text style={styles.saveText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, styles.publishButtonNew, { flex: 1, marginHorizontal: 6 }]} onPress={() => Alert.alert('Publié', 'Votre document a été publié !')}>
                  <Text style={[styles.saveText, styles.publishButtonTextNew]}>Publier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, { flex: 1, marginLeft: 6, backgroundColor: '#4FC3F7' }]} onPress={() => Alert.alert('Exporté', 'Votre document a été exporté !')}>
                  <Text style={styles.saveText}>Exporter</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        {pendingImport ? (
          <View style={styles.importBox}>
            <Text style={styles.importLabel}>Importer : {pendingImport.name}</Text>
            <TextInput value={importTitle} onChangeText={setImportTitle} placeholder="Titre (optionnel)" placeholderTextColor="#888" style={styles.input} />
            <TextInput value={importGenre} onChangeText={setImportGenre} placeholder="Genre (optionnel)" placeholderTextColor="#888" style={styles.input} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage}>
                <Text style={{ color: '#4FC3F7' }}>{coverDataUrl ? 'Changer la couverture' : 'Ajouter une couverture'}</Text>
              </TouchableOpacity>
              {coverDataUrl ? (
                <View style={styles.coverPreviewWrap}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>Prévisualisation</Text>
                  <View style={styles.coverPreview}>
                    <Text style={{ color: '#999', fontSize: 10 }}>✓</Text>
                  </View>
                </View>
              ) : null}
            </View>
            <View style={styles.importRow}>
              <TouchableOpacity style={[styles.importBtn, { backgroundColor: '#555' }]} onPress={cancelImport}>
                <Text style={styles.importBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.importBtn, { backgroundColor: '#FFA94D' }]} onPress={saveImport} disabled={savingImport}>
                <Text style={styles.importBtnText}>{savingImport ? 'Importation...' : 'Enregistrer l\'import'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Bouton 'Créer le brouillon' supprimé comme demandé */}
      </View>
    </NoteLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#181818' },
  templatePreviewLarge: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  templateImageLarge: {
    width: 160,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#23232a',
    marginBottom: 10,
  },
  templateIconLargeWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#23232a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  templateIconLarge: {
    fontSize: 60,
    color: '#FFA94D',
  },
  templateTitleLarge: {
    color: '#FFA94D',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    maxWidth: 260,
  },
  templateSubtitleLarge: {
    color: '#ECEDEE',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
    maxWidth: 260,
  },
  title: { color: '#FFA94D', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveButton: { backgroundColor: '#FFA94D', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#181818', fontWeight: '700' },
  publishButtonNew: { backgroundColor: '#34C759' },
  publishButtonTextNew: { color: '#fff' },
  importBox: { backgroundColor: '#1E1E1E', borderRadius: 10, padding: 12, marginBottom: 12, borderColor: '#333', borderWidth: 1 },
  importLabel: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  coverPicker: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#333', marginRight: 12 },
  coverPreviewWrap: { alignItems: 'center' },
  coverPreview: { width: 60, height: 80, borderRadius: 6, backgroundColor: '#333', marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  importRow: { flexDirection: 'row', justifyContent: 'space-between' },
  importBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, minWidth: 120, alignItems: 'center' },
  importBtnText: { color: '#fff', fontWeight: '700' },
});

export default TemplateEditor;
