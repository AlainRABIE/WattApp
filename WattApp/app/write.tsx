import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import NoteLayout from './components/NoteLayout';
import TemplateManager from './components/TemplateManager';

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
  
  // Nouveaux templates inspirés de TheGoodocs
  { id: 'cornell', title: 'Cornell Notes', subtitle: 'Méthode Cornell pour prise de notes', starter: "📝 Sujet: \n\n📋 Notes principales:\n\n\n🔍 Résumé:\n", color: '#F0F8FF' },
  { id: 'bullet-journal', title: 'Bullet Journal', subtitle: 'Organisation quotidienne', starter: "📅 Date: \n\n• Tâches importantes\n○ Événements\n- Notes\n! Priorité\n", color: '#FFF5EE' },
  { id: 'pointille', title: 'Pointillé', subtitle: 'Grille de points discrets', starter: '', color: '#FAFAFA' },
  { id: 'seyes', title: 'Seyès', subtitle: 'Réglure française traditionnelle', starter: '', color: '#FFFFFF' },
  { id: 'meeting', title: 'Réunion', subtitle: 'Prise de notes de réunion', starter: "📅 Date: \n👥 Participants: \n🎯 Objectifs:\n\n📝 Points abordés:\n\n✅ Actions à retenir:\n", color: '#F0FFF0' },
  { id: 'daily-planner', title: 'Planning Jour', subtitle: 'Organisation quotidienne', starter: "📅 Date: \n\n🌅 Matin:\n\n☀️ Après-midi:\n\n🌙 Soir:\n\n📌 Priorités:\n", color: '#FFF8DC' },
  { id: 'creative', title: 'Créatif', subtitle: 'Espace libre pour créativité', starter: "💡 Idée:\n\n🎨 Inspiration:\n\n✨ Développement:\n", color: '#FFFACD' },
  { id: 'lecture', title: 'Fiche Lecture', subtitle: 'Notes de lecture structurées', starter: "📚 Titre: \n✍️ Auteur: \n📖 Genre: \n\n💭 Résumé:\n\n⭐ Avis personnel:\n", color: '#F5F5DC' },
];

const WriteScreen: React.FC = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<Template | null>(null);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isPortrait, setIsPortrait] = useState<boolean>(true);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [showTemplateManager, setShowTemplateManager] = useState<boolean>(false);
  const [recentTemplates, setRecentTemplates] = useState<any[]>([]);

  useEffect(() => {
    let unsub: any;
    const load = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      
      // Requête simplifiée pour éviter l'index composite
      const q = query(
        collection(db, 'books'), 
        where('authorUid', '==', user.uid)
      );
      
      unsub = onSnapshot(q, snap => {
        // Filtrer et trier côté client pour éviter l'index Firebase
        const allBooks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const draftBooks = allBooks
          .filter((book: any) => book.status === 'draft')
          .sort((a: any, b: any) => {
            // Tri par date de création décroissante
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
        setDrafts(draftBooks);
      });
    };
    load();
    return () => { if (unsub) unsub(); };
  }, []);

  function chooseTemplate(t: Template) {
    // open dedicated editor for this template
    (router as any).push(`/write/${t.id}`);
  }

  async function createDraft() {
    if (!title.trim() && !body.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir au moins un titre ou du contenu');
      return;
    }

    try {
      setSaving(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      const docRef = await addDoc(collection(db, 'books'), {
        title: title.trim() || '(Sans titre)',
        body: body.trim(),
        templateId: selected?.id || null,
        authorUid: user.uid,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Réinitialiser les champs
      setTitle('');
      setBody('');
      setSelected(null);
      
      // Rediriger vers la bibliothèque
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
      Alert.alert('Erreur', `Impossible de sauvegarder: ${e?.message ?? String(e)}`);
    } finally {
      setSaving(false);
    }
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
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowTemplateManager(true)}>
            <Text style={styles.iconText}>📋 Templates</Text>
          </TouchableOpacity>
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
          {(recentTemplates.length > 0 ? recentTemplates : TEMPLATES.slice(0, 6)).map(t => (
            <TouchableOpacity key={`recent-${t.id}`} onPress={() => chooseTemplate(t)} style={styles.recentThumbWrap}>
              <View style={[styles.recentThumb, { backgroundColor: t.color || '#eee' }]}> 
                {t.backgroundImage ? (
                  <Image 
                    source={{ uri: t.backgroundImage }} 
                    style={styles.recentBackgroundImage}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Text style={[styles.previewTitle, (t.color && t.color.toUpperCase().includes('FFF')) ? { color: '#222' } : { color: '#222' }]} numberOfLines={1}>{t.title}</Text>
                    {t.starter ? t.starter.split('\n').slice(0,2).map((ln: string, i: number) => (
                      <Text key={i} style={[styles.previewLine, (t.color && t.color.toUpperCase().includes('FFF')) ? { color: '#333' } : { color: '#333' }]} numberOfLines={1}>{ln}</Text>
                    )) : null}
                  </>
                )}
              </View>
              <Text style={styles.recentLabel}>{t.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
          onPress={createDraft}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? 'Sauvegarde...' : (selected ? `Créer (${selected.title})` : 'Créer (sans template)')}
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      
      <TemplateManager
        visible={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onSelectTemplate={(template) => {
          setSelected(template);
          setBody(template.starter || '');
          setShowTemplateManager(false);
          
          // Si c'est un template personnalisé, utiliser un éditeur générique
          if (template.isCustom) {
            (router as any).push({
              pathname: '/write/custom',
              params: { 
                templateData: JSON.stringify(template)
              }
            });
          } else {
            // Template prédéfini, utiliser l'éditeur existant
            (router as any).push(`/write/${template.id}`);
          }
        }}
        recentTemplates={recentTemplates}
        onUpdateRecentTemplates={setRecentTemplates}
      />
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
  recentBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  recentInner: { flex: 1, backgroundColor: '#eee' },
  recentLabel: { color: '#ccc', fontSize: 12, marginTop: 6, textAlign: 'center' },
  previewTitle: { fontWeight: '700', fontSize: 12, marginTop: 8, paddingHorizontal: 6 },
  previewLine: { fontSize: 11, paddingHorizontal: 6, color: '#444' },
  placeholder: { color: '#888', fontStyle: 'italic' },
  draftCard: { width: 160, height: 84, backgroundColor: '#222', borderRadius: 8, padding: 10, marginRight: 12, justifyContent: 'center' },
  draftTitle: { color: '#fff', fontWeight: '700' },
  draftMeta: { color: '#aaa', fontSize: 12, marginTop: 6 },
  input: { backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  saveButton: { backgroundColor: '#FFA94D', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#666', opacity: 0.7 },
  saveText: { color: '#181818', fontWeight: '700' },
});

export default WriteScreen;
