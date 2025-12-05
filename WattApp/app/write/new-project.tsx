import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Genre {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const genres: Genre[] = [
  { id: 'romance', name: 'Romance', icon: 'heart', color: '#FF6B6B' },
  { id: 'fantasy', name: 'Fantasy', icon: 'planet', color: '#9C27B0' },
  { id: 'scifi', name: 'Science-fiction', icon: 'rocket', color: '#2196F3' },
  { id: 'thriller', name: 'Thriller', icon: 'flash', color: '#FF9800' },
  { id: 'mystery', name: 'Mystère', icon: 'eye', color: '#673AB7' },
  { id: 'adventure', name: 'Aventure', icon: 'map', color: '#4CAF50' },
  { id: 'horror', name: 'Horreur', icon: 'skull', color: '#B71C1C' },
  { id: 'drama', name: 'Drame', icon: 'sad', color: '#795548' },
  { id: 'comedy', name: 'Comédie', icon: 'happy', color: '#FFC107' },
  { id: 'poetry', name: 'Poésie', icon: 'flower', color: '#E91E63' },
  { id: 'biography', name: 'Biographie', icon: 'person', color: '#607D8B' },
  { id: 'other', name: 'Autre', icon: 'ellipsis-horizontal', color: '#9E9E9E' },
];

const NewProject: React.FC = () => {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [targetWords, setTargetWords] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreateProject = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un titre pour votre projet');
      return;
    }

    if (!selectedGenre) {
      Alert.alert('Erreur', 'Veuillez sélectionner un genre');
      return;
    }

    setLoading(true);

    try {
      // TODO: Créer le projet dans Firebase
      // const newProject = await createProject({
      //   title: title.trim(),
      //   description: description.trim(),
      //   genre: selectedGenre,
      //   targetWords: parseInt(targetWords) || 0,
      //   isPublic,
      //   createdAt: new Date(),
      //   lastEdited: new Date(),
      //   wordCount: 0,
      //   chaptersCount: 0,
      //   status: 'draft',
      //   progress: 0,
      // });

      // Pour l'instant, on simule avec un ID temporaire
      const tempProjectId = `project_${Date.now()}`;
      
      // Stocker les données du projet temporairement
      const projectData = {
        id: tempProjectId,
        title: title.trim(),
        description: description.trim(),
        genre: selectedGenre,
        targetWords: parseInt(targetWords) || 0,
        isPublic,
      };
      
      Alert.alert(
        'Projet créé !',
        'Votre nouveau projet a été créé avec succès.',
        [
          {
            text: 'Commencer à écrire',
            onPress: () => {
              // Passer le titre et les infos du projet à l'éditeur
              router.push(
                `/write/editor/${tempProjectId}?projectTitle=${encodeURIComponent(title.trim())}&projectGenre=${selectedGenre}&isNewProject=true`
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création du projet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Nouveau Projet</Text>
          <Text style={styles.headerSubtitle}>Donnez vie à votre histoire</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Titre du projet */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Titre du projet <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Les Chroniques d'Aetheria"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez votre histoire en quelques mots..."
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Genre */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Genre <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.genresContainer}>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre.id}
                  style={[
                    styles.genreChip,
                    selectedGenre === genre.id && styles.genreChipSelected,
                  ]}
                  onPress={() => setSelectedGenre(genre.id)}
                >
                  <View
                    style={[
                      styles.genreIcon,
                      { backgroundColor: selectedGenre === genre.id ? genre.color : '#333' },
                    ]}
                  >
                    <Ionicons
                      name={genre.icon as any}
                      size={16}
                      color={selectedGenre === genre.id ? '#fff' : '#888'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.genreText,
                      selectedGenre === genre.id && { color: genre.color },
                    ]}
                  >
                    {genre.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Objectif de mots */}
          <View style={styles.section}>
            <Text style={styles.label}>Objectif de mots (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 50000"
              placeholderTextColor="#666"
              value={targetWords}
              onChangeText={(text) => setTargetWords(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>
              💡 Un roman standard contient entre 50 000 et 100 000 mots
            </Text>
          </View>

          {/* Visibilité */}
          <View style={styles.section}>
            <Text style={styles.label}>Visibilité</Text>
            <View style={styles.visibilityContainer}>
              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  isPublic && styles.visibilityOptionSelected,
                ]}
                onPress={() => setIsPublic(true)}
              >
                <Ionicons
                  name="globe-outline"
                  size={24}
                  color={isPublic ? '#4CAF50' : '#666'}
                />
                <Text
                  style={[
                    styles.visibilityText,
                    isPublic && styles.visibilityTextSelected,
                  ]}
                >
                  Public
                </Text>
                <Text style={styles.visibilityDescription}>
                  Visible par tous les lecteurs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.visibilityOption,
                  !isPublic && styles.visibilityOptionSelected,
                ]}
                onPress={() => setIsPublic(false)}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color={!isPublic ? '#FF9800' : '#666'}
                />
                <Text
                  style={[
                    styles.visibilityText,
                    !isPublic && styles.visibilityTextSelected,
                  ]}
                >
                  Privé
                </Text>
                <Text style={styles.visibilityDescription}>
                  Visible uniquement par vous
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Informations */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#FFA94D" />
            <Text style={styles.infoText}>
              Vous pourrez modifier ces informations à tout moment et ajouter des tags,
              une couverture et d'autres détails plus tard.
            </Text>
          </View>
        </ScrollView>

        {/* Bouton de création */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, (!title.trim() || !selectedGenre) && styles.createButtonDisabled]}
            onPress={handleCreateProject}
            disabled={!title.trim() || !selectedGenre || loading}
          >
            <LinearGradient
              colors={
                !title.trim() || !selectedGenre
                  ? ['#333', '#333']
                  : ['#FFA94D', '#FF8A65']
              }
              style={styles.createButtonGradient}
            >
              {loading ? (
                <Text style={styles.createButtonText}>Création...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.createButtonText}>Créer le projet</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  genreChipSelected: {
    borderColor: '#FFA94D',
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
  },
  genreIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  visibilityOptionSelected: {
    borderColor: '#FFA94D',
    backgroundColor: 'rgba(255, 169, 77, 0.05)',
  },
  visibilityText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  visibilityTextSelected: {
    color: '#fff',
  },
  visibilityDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    color: '#FFA94D',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  createButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NewProject;
