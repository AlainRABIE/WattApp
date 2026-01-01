import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';

const BookSetup: React.FC = () => {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  const { theme } = useTheme();

  const [step, setStep] = useState(1);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCoverImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
      setHashtags([...hashtags, hashtagInput.trim()]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!coverImage) {
        Alert.alert('Image requise', 'Veuillez ajouter une image de couverture');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!bookTitle.trim()) {
        Alert.alert('Titre requis', 'Veuillez ajouter un titre à votre livre');
        return;
      }
      handleSaveAndContinue();
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      setIsSaving(true);
      const auth = getAuth();
      if (!auth.currentUser) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const bookData = {
        bookTitle,
        bookDescription,
        coverImage,
        hashtags,
        chapters: [{
          number: 1,
          title: '',
          content: '',
          wordCount: 0
        }],
        totalChapters: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        status: 'draft',
      };

      let finalProjectId = projectId;

      if (projectId && projectId !== 'new') {
        const projectRef = doc(db, 'users', auth.currentUser.uid, 'books', projectId as string);
        await setDoc(projectRef, bookData, { merge: true });
      } else {
        const newBookRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'books'), bookData);
        finalProjectId = newBookRef.id;
      }

      // Rediriger vers l'éditeur avec l'ID du projet
      router.replace(`/write/wattpad-editor?projectId=${finalProjectId}`);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le livre');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 1 ? '📚 Couverture du Livre' : '✏️ Informations du Livre'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Indicateur de progression */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            // ÉTAPE 1: Couverture
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Ajoutez une couverture</Text>
              <Text style={styles.stepSubtitle}>
                Une belle couverture attire plus de lecteurs
              </Text>

              <TouchableOpacity 
                style={styles.coverImageButton}
                onPress={handleCoverImagePicker}
              >
                {coverImage ? (
                  <Image source={{ uri: coverImage }} style={styles.coverImage} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="image" size={64} color={theme.colors.primary} />
                    <Text style={styles.coverPlaceholderText}>Toucher pour ajouter</Text>
                    <Text style={styles.coverPlaceholderSubtext}>Ratio 2:3 recommandé</Text>
                  </View>
                )}
              </TouchableOpacity>

              {coverImage && (
                <TouchableOpacity 
                  style={styles.changeCoverButton}
                  onPress={handleCoverImagePicker}
                >
                  <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                  <Text style={styles.changeCoverText}>Changer la couverture</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // ÉTAPE 2: Titre, Description, Hashtags
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>À propos de votre livre</Text>
              <Text style={styles.stepSubtitle}>
                Donnez-lui un titre accrocheur et une belle description
              </Text>

              {/* Aperçu de la couverture */}
              <View style={styles.coverPreview}>
                <Image source={{ uri: coverImage || '' }} style={styles.coverPreviewImage} />
              </View>

              {/* Titre */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Titre *</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Le titre de votre livre"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={bookTitle}
                  onChangeText={setBookTitle}
                  maxLength={100}
                />
                <Text style={styles.charCount}>{bookTitle.length}/100</Text>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Synopsis / Description</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Décrivez votre histoire, attirez vos lecteurs..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={bookDescription}
                  onChangeText={setBookDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{bookDescription.length}/500</Text>
              </View>

              {/* Hashtags */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}># Hashtags</Text>
                <View style={styles.hashtagInputContainer}>
                  <TextInput
                    style={styles.hashtagInput}
                    placeholder="Ajouter un hashtag (ex: fantasy, romance...)"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={hashtagInput}
                    onChangeText={setHashtagInput}
                    onSubmitEditing={addHashtag}
                  />
                  <TouchableOpacity
                    style={styles.hashtagAddButton}
                    onPress={addHashtag}
                  >
                    <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                {hashtags.length > 0 && (
                  <View style={styles.hashtagList}>
                    {hashtags.map((tag, index) => (
                      <View key={index} style={styles.hashtagChip}>
                        <Text style={styles.hashtagChipText}>#{tag}</Text>
                        <TouchableOpacity
                          onPress={() => removeHashtag(index)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close-circle" size={18} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Boutons de navigation */}
        <View style={styles.footer}>
          {step === 2 && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setStep(1)}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.nextButton, isSaving && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={isSaving}
          >
            <Text style={styles.nextButtonText}>
              {isSaving ? 'Sauvegarde...' : step === 1 ? 'Suivant' : 'Commencer à écrire'}
            </Text>
            <Ionicons 
              name={step === 1 ? "chevron-forward" : "create"} 
              size={24} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
    marginBottom: 30,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.border,
    marginHorizontal: 10,
  },
  progressLineActive: {
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverImageButton: {
    marginBottom: 20,
  },
  coverImage: {
    width: 200,
    height: 300,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: theme.colors.primary,
  },
  coverPlaceholder: {
    width: 200,
    height: 300,
    borderRadius: 16,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  coverPlaceholderText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  coverPlaceholderSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  changeCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: `${theme.colors.primary}20`,
    borderRadius: 12,
  },
  changeCoverText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  coverPreview: {
    alignItems: 'center',
    marginBottom: 30,
  },
  coverPreviewImage: {
    width: 100,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 10,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: `${theme.colors.surface}80`,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  descriptionInput: {
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: `${theme.colors.surface}80`,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },
  hashtagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hashtagInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: `${theme.colors.surface}80`,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  hashtagAddButton: {
    padding: 4,
  },
  hashtagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  hashtagChipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: `${theme.colors.border}40`,
    borderRadius: 12,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default BookSetup;
