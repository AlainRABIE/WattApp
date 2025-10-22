import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { TEMPLATES } from '../write';
import NoteLayout from '../components/NoteLayout';

const TemplateEditor: React.FC = () => {
  const { templateId } = useLocalSearchParams();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    const t = TEMPLATES.find(x => x.id === templateId);
    if (t) {
      setTemplate(t);
      setBody(t.starter || '');
    } else {
      // if not found, go back
      router.back();
    }
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
      Alert.alert('Brouillon créé', 'Votre brouillon a été enregistré.');
  (router as any).push(`/book/${docRef.id}`);
    } catch (e: any) {
      console.warn('createDraft error', e);
      Alert.alert('Erreur', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!template) return null;

  return (
    <NoteLayout title={`Créer — ${template.title}`}>
      <View style={styles.container}>
        <TextInput value={title} onChangeText={setTitle} placeholder="Titre" placeholderTextColor="#888" style={styles.input} />
        <TextInput value={body} onChangeText={setBody} placeholder="Commencez à écrire..." placeholderTextColor="#888" style={[styles.input, { height: 300 }]} multiline />
        <TouchableOpacity style={styles.saveButton} onPress={createDraft} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Créer le brouillon'}</Text>
        </TouchableOpacity>
      </View>
    </NoteLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#181818' },
  title: { color: '#FFA94D', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveButton: { backgroundColor: '#FFA94D', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#181818', fontWeight: '700' },
});

export default TemplateEditor;
