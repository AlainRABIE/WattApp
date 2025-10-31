
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions, Modal, Pressable, ActivityIndicator, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import app, { db } from '../constants/firebaseConfig';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  'Roman', 'Manga', 'Poésie', 'Nouvelle', 'Fiche lecture', 'Bullet Journal', 'Note', 'Autre', 'imported'
];
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  tabsRow: {
    backgroundColor: '#181818',
    paddingVertical: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#23232a',
    marginTop: 0,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#23232a',
  },
  tabBtnText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#FFA94D',
    fontWeight: 'bold',
  },
  bookCard: {
    backgroundColor: '#181818',
    borderRadius: 16,
    marginBottom: 18,
    flex: 1,
    marginHorizontal: 6,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 120,
    maxHeight: 120,
    maxWidth: (width / 2) - 18,
    overflow: 'hidden',
  },
  bookRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#23232a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 2,
  },
  bookRankText: {
    color: '#FFA94D',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bookCoverPlaceholder: {
    width: 54,
    height: 74,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCoverEmoji: {
    fontSize: 28,
    color: '#FFA94D',
  },
  bookInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    maxWidth: 110,
    overflow: 'hidden',
  },
  bookAuthor: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 2,
    maxWidth: 110,
    overflow: 'hidden',
  },
  bookPreview: {
    color: '#ECEDEE',
    fontSize: 13,
    marginTop: 2,
    opacity: 0.85,
    maxWidth: 110,
    overflow: 'hidden',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#FFA94D',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA94D',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  fabIcon: {
    color: '#23232a',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: -2,
  },
  // Styles pour le modal et le picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#23232a',
    borderRadius: 18,
    padding: 24,
    minWidth: 260,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    width: 180,
  },
  modalOptionActive: {
    backgroundColor: '#FFA94D',
  },
  modalOptionText: {
    color: '#ECEDEE',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: '#23232a',
    fontWeight: 'bold',
  },
  pickFileBtn: {
    marginTop: 18,
    backgroundColor: '#FFA94D',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  pickFileBtnText: {
    color: '#23232a',
    fontWeight: 'bold',
    fontSize: 15,
  },
  pickedFileName: {
    color: '#FFA94D',
    fontSize: 13,
    marginTop: 8,
    maxWidth: 180,
    textAlign: 'center',
  },
  // Styles pour la prévisualisation grand format
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    backgroundColor: '#23232a',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    maxWidth: '90%',
    maxHeight: '80%',
  },
  previewImage: {
    width: 240,
    height: 320,
    borderRadius: 12,
    marginBottom: 18,
    backgroundColor: '#333',
  },
  previewIcon: {
    fontSize: 90,
    color: '#FFA94D',
    marginBottom: 18,
  },
  previewTitle: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  previewSubtitle: {
    color: '#ECEDEE',
    fontSize: 15,
    marginBottom: 2,
    textAlign: 'center',
  },
});

export default function WriteScreen() {
  const router = useRouter();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewModal, setPreviewModal] = useState<{visible: boolean, item?: any}>({visible: false});

  // Charger les templates Firestore filtrés par catégorie
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'templates'),
          where('type', '==', category)
        );
        const snap = await getDocs(q);
        setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setTemplates([]);
      }
      setLoading(false);
    };
    fetchTemplates();
  }, [category]);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setPickedFile(file);
        // Ajout Firestore avec la catégorie sélectionnée
        await addDoc(collection(db, 'templates'), {
          title: file.name,
          subtitle: 'Importé depuis un fichier',
          backgroundImage: file.uri,
          type: category,
          isCustom: true,
          isPDF: file.name?.toLowerCase().endsWith('.pdf') || false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      // Gestion d'erreur
    }
  };

  const renderCard = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.bookCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/write/${item.id}`)}
      onLongPress={() => setPreviewModal({ visible: true, item })}
      delayLongPress={250}
    >
      <View style={styles.bookRank}><Text style={styles.bookRankText}>{index + 1}</Text></View>
      <View style={styles.bookCoverPlaceholder}>
        {item.backgroundImage ? (
          <Image
            source={{ uri: item.backgroundImage }}
            style={{ width: 54, height: 74, borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.bookCoverEmoji}>📄</Text>
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={1}>{item.title || item.nom || 'Sans titre'}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.subtitle || ''}</Text>
        <Text style={styles.bookPreview} numberOfLines={2}>{item.starter || item.preview || ''}</Text>
      </View>
    </TouchableOpacity>
  );

  // Modal de prévisualisation grand format
  const renderPreviewModal = () => (
    <Modal
      visible={previewModal.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setPreviewModal({ visible: false })}
    >
      <Pressable style={styles.previewOverlay} onPress={() => setPreviewModal({ visible: false })}>
        <View style={styles.previewContent}>
          {previewModal.item?.backgroundImage ? (
            <Image
              source={{ uri: previewModal.item.backgroundImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.previewIcon}>📄</Text>
          )}
          <Text style={styles.previewTitle}>{previewModal.item?.title || previewModal.item?.nom || 'Sans titre'}</Text>
          <Text style={styles.previewSubtitle}>{previewModal.item?.subtitle || ''}</Text>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Onglets catégories tout en haut */}
      <View style={{backgroundColor: '#181818'}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.tabBtn, category === cat && styles.tabBtnActive]}
              onPress={() => setCategory(cat)}>
              <Text style={[styles.tabBtnText, category === cat && styles.tabBtnTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {/* Grille de templates Firestore */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <ActivityIndicator color="#FFA94D" style={{ marginTop: 32 }} size="large" />
        ) : templates.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: '#aaa', fontSize: 16 }}>Aucun template trouvé.</Text>
          </View>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 8 }}
            contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
          />
        )}
        {renderPreviewModal()}
      </View>
      {/* Bouton flottant pour ajouter un template */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
      {/* Modal de sélection de domaine et fichier */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un domaine</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalOption, category === cat && styles.modalOptionActive]}
                onPress={() => {
                  setCategory(cat);
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, category === cat && styles.modalOptionTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickFileBtn} onPress={handlePickFile}>
              <Text style={styles.pickFileBtnText}>Sélectionner un fichier</Text>
            </TouchableOpacity>
            {pickedFile && (
              <Text style={styles.pickedFileName} numberOfLines={1}>{pickedFile.name}</Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}