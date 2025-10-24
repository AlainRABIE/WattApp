import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import NoteLayout from './components/NoteLayout';

type Template = { id: string; title: string; subtitle: string; starter: string; color: string };

export const TEMPLATES: Template[] = [
  { id: 'vierge', title: 'Vierge', subtitle: 'Page blanche', starter: '', color: '#FFFFFF' },
  { id: 'quadrillage', title: 'Quadrillage', subtitle: 'Papier quadrillé', starter: '', color: '#FFF8E1' },
  { id: 'reglure', title: 'À régule', subtitle: 'Lignes régulières', starter: '', color: '#FFFFFF' },
  { id: 'note', title: 'Note', subtitle: "Note courte, listes à puces", starter: "- Point 1\n- Point 2\n- Point 3\n", color: '#FFF59D' },
  { id: 'roman', title: 'Roman', subtitle: 'Narration longue, description', starter: "Chapitre 1\n\nIl était une fois...", color: '#BBDEFB' },
  { id: 'manga', title: 'Manga', subtitle: 'Scènes et dialogues, format visuel', starter: "Page 1\n\n[Planche 1]\nPersonnage: \n- \n", color: '#F8BBD0' },
  { id: 'nouvelle', title: 'Nouvelle', subtitle: "Courte, percutante", starter: "Le matin où tout a changé...", color: '#C8E6C9' },
  { id: 'poesie', title: 'Poésie', subtitle: 'Vers et rimes', starter: "Sur le pavé, la lune danse...", color: '#E1BEE7' },
];

const WriteScreen: React.FC = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<Template | null>(null);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isPortrait, setIsPortrait] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    let unsub: any;
    const load = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'books'), where('authorUid', '==', user.uid), where('status', '==', 'draft'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, snap => {
        setDrafts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    };
    load();
    return () => { if (unsub) unsub(); };
  }, []);

  function chooseTemplate(t: Template) {
    // open dedicated editor for this template
    (router as any).push(`/write/${t.id}`);
  }

  function createDraft() {
    // Placeholder: in the future save to Firestore 'books' collection as draft
    console.log('Creating draft', { template: selected?.id, title, body });
    router.back();
  }

  return (
    <NoteLayout title="Sélectionner un modèle">
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélectionner un modèle</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>Fichiers</Text></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconText}>Photos</Text></TouchableOpacity>
        </View>
      </View>

      {/* Portrait / Paysage toggles */}
      <View style={styles.controlsRow}>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, isPortrait ? styles.toggleActive : null]} onPress={() => setIsPortrait(true)}>
            <Text style={isPortrait ? styles.toggleTextActive : styles.toggleText}>Portrait</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, !isPortrait ? styles.toggleActive : null]} onPress={() => setIsPortrait(false)}>
            <Text style={!isPortrait ? styles.toggleTextActive : styles.toggleText}>Paysage</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Récents */}
      <View style={styles.sectionLarge}>
        <Text style={styles.sectionTitleLarge}>Récents</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
          {TEMPLATES.map(t => (
            <TouchableOpacity key={`recent-${t.id}`} onPress={() => chooseTemplate(t)} style={styles.recentThumbWrap}>
              <View style={[styles.recentThumb, { backgroundColor: t.color || '#eee' }]}> 
                {/* Mini preview: title + up to 2 starter lines */}
                <Text style={[styles.previewTitle, (t.color && t.color.toUpperCase().includes('FFF')) ? { color: '#222' } : { color: '#222' }]} numberOfLines={1}>{t.title}</Text>
                {t.starter ? t.starter.split('\n').slice(0,2).map((ln, i) => (
                  <Text key={i} style={[styles.previewLine, (t.color && t.color.toUpperCase().includes('FFF')) ? { color: '#333' } : { color: '#333' }]} numberOfLines={1}>{ln}</Text>
                )) : null}
              </View>
              <Text style={styles.recentLabel}>{t.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notes surdimensionnées */}
      <View style={styles.sectionLarge}>
        <Text style={styles.sectionTitleLarge}>Notes surdimensionnées</Text>
        <View style={styles.oversizedRow}>
          <TouchableOpacity style={styles.oversizedCard} onPress={() => chooseTemplate({ id: 'vierge', title: 'Vierge', subtitle: 'Vierge', starter: '', color: '#FFF' })}>
            <View style={styles.oversizedPreview} />
            <Text style={styles.oversizedLabel}>Vierge</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.oversizedCard} onPress={() => chooseTemplate({ id: 'quadrillage', title: 'Quadrillage', subtitle: 'Quadrillage', starter: '', color: '#FFF' })}>
            <View style={[styles.oversizedPreview, styles.gridPreview]} />
            <Text style={styles.oversizedLabel}>Quadrillage</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.oversizedCard} onPress={() => chooseTemplate({ id: 'reglure', title: 'À régule', subtitle: 'À régule', starter: '', color: '#FFF' })}>
            <View style={[styles.oversizedPreview, styles.linedPreview]} />
            <Text style={styles.oversizedLabel}>À régule</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Editor inputs below selection */}
      <View style={styles.sectionLarge}>
        <Text style={styles.sectionTitleLarge}>Mes brouillons</Text>
        {drafts.length === 0 ? (
          <Text style={styles.placeholder}>Tu n'as pas encore de brouillons.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 8 }}>
            {drafts.map(d => (
              <TouchableOpacity key={d.id} style={styles.draftCard} onPress={() => (router as any).push(`/book/${d.id}`)}>
                <Text style={styles.draftTitle} numberOfLines={1}>{d.title || '(Sans titre)'}</Text>
                <Text style={styles.draftMeta}>{d.templateId || d.type || '—'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
        <TextInput value={title} onChangeText={setTitle} placeholder="Titre de l'œuvre" placeholderTextColor="#888" style={styles.input} />
        <TextInput value={body} onChangeText={setBody} placeholder={selected ? undefined : "Début de votre histoire..."} placeholderTextColor="#888" style={[styles.input, { height: 220 }]} multiline />

        <TouchableOpacity style={styles.saveButton} onPress={createDraft}>
          <Text style={styles.saveText}>{selected ? `Créer (${selected.title})` : 'Créer (sans template)'}</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </NoteLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#181818' },
  title: { color: '#FFA94D', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  sectionLabel: { color: '#fff', marginBottom: 8 },
  templateCard: { backgroundColor: '#232323', padding: 12, borderRadius: 10, marginRight: 10, minWidth: 140, minHeight: 110, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  templateCardActive: { borderColor: '#FFA94D', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pin: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF176', marginRight: 8, transform: [{ rotate: '20deg' }] },
  templateTitle: { color: '#3E2723', fontWeight: '700', marginBottom: 2 },
  templateSubtitle: { color: '#3E2723', fontSize: 12 },
  previewLines: { marginTop: 8 },
  line: { height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, marginTop: 6 },
  header: { width: '100%', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { color: '#4FC3F7' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  iconText: { color: '#ddd', fontSize: 12 },
  controlsRow: { width: '100%', paddingHorizontal: 12, marginTop: 6 },
  toggleRow: { flexDirection: 'row' },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#1F1F1F', marginRight: 8 },
  toggleActive: { backgroundColor: '#333' },
  toggleText: { color: '#aaa' },
  toggleTextActive: { color: '#fff', fontWeight: '700' },
  sectionLarge: { width: '100%', paddingHorizontal: 12, marginTop: 12 },
  sectionTitleLarge: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  recentThumbWrap: { alignItems: 'center', marginRight: 12 },
  recentThumb: { width: 96, height: 120, borderRadius: 6, backgroundColor: '#222', overflow: 'hidden' },
  recentInner: { flex: 1, backgroundColor: '#eee' },
  recentLabel: { color: '#ccc', fontSize: 12, marginTop: 6, textAlign: 'center' },
  previewTitle: { fontWeight: '700', fontSize: 12, marginTop: 8, paddingHorizontal: 6 },
  previewLine: { fontSize: 11, paddingHorizontal: 6, color: '#444' },
  placeholder: { color: '#888', fontStyle: 'italic' },
  draftCard: { width: 160, height: 84, backgroundColor: '#222', borderRadius: 8, padding: 10, marginRight: 12, justifyContent: 'center' },
  draftTitle: { color: '#fff', fontWeight: '700' },
  draftMeta: { color: '#aaa', fontSize: 12, marginTop: 6 },
  oversizedRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  oversizedCard: { flex: 1, marginRight: 10, alignItems: 'center' },
  oversizedPreview: { width: '100%', height: 140, borderRadius: 8, backgroundColor: '#fff' },
  gridPreview: { backgroundColor: '#f7f7e6' },
  linedPreview: { backgroundColor: '#f3f3f3' },
  oversizedLabel: { color: '#ccc', marginTop: 8 },
  input: { backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveButton: { backgroundColor: '#FFA94D', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#181818', fontWeight: '700' },
});

export default WriteScreen;
