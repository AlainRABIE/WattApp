import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MangaCoverCreator from '../../components/MangaCoverCreator';

const MangaEditorWithCover: React.FC = () => {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  
  const [showCoverCreator, setShowCoverCreator] = useState(false);
  const [projectCover, setProjectCover] = useState<string | null>(null);

  const handleCreateCover = () => {
    setShowCoverCreator(true);
  };

  const handleSaveCover = (coverData: { type: 'drawn' | 'imported'; uri: string; title?: string }) => {
    setProjectCover(coverData.uri);
    setShowCoverCreator(false);
    Alert.alert('✅ Succès', 'Couverture ajoutée au manga !');
  };

  return (
    <View style={styles.container}>
      {/* Header avec bouton couverture */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Éditeur Manga</Text>
        
        <TouchableOpacity 
          style={styles.coverButton}
          onPress={handleCreateCover}
        >
          <Ionicons name="image-outline" size={20} color="#FFA94D" />
          <Text style={styles.coverButtonText}>Couverture</Text>
        </TouchableOpacity>
      </View>

      {/* Zone principale */}
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          Interface de l'éditeur de manga
        </Text>
        
        {projectCover && (
          <View style={styles.coverPreview}>
            <Text style={styles.coverLabel}>Couverture créée :</Text>
            <Text style={styles.coverPath}>{projectCover}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/write/manga-editor/simple?projectId=new')}
        >
          <Text style={styles.actionButtonText}>
            Ouvrir l'éditeur principal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de création de couverture */}
      <MangaCoverCreator
        visible={showCoverCreator}
        onClose={() => setShowCoverCreator(false)}
        onSaveCover={handleSaveCover}
        initialTitle="Mon Nouveau Manga"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  coverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  coverButtonText: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverPreview: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  coverLabel: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coverPath: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  actionButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MangaEditorWithCover;