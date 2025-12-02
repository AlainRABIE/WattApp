import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Image,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, where } from 'firebase/firestore';
import { mangaProjectService } from '../services/MangaProjectService';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';

interface MangaPublication {
  id: string;
  title: string;
  synopsis: string;
  description: string;
  author: string;
  price: number;
  currency: 'EUR' | 'USD';
  isFree: boolean;
  tags: string[];
  category: string;
  genre: string[];
  targetAudience: 'children' | 'teen' | 'adult' | 'all';
  language: string;
  coverImage?: string;
  previewPages: number;
  totalPages: number;
  publishDate: Date;
  isPublished: boolean;
  isDraft: boolean;
  rating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
  copyrightInfo: string;
  collaborators: string[];
  socialLinks: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

const MangaPublisher: React.FC = () => {
  const router = useRouter();
  const { projectId } = useLocalSearchParams();
  
  // Sidebar (menu latéral) pour le suivi
  const [showSidebar, setShowSidebar] = useState(false);
  const [todos, setTodos] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [activity, setActivity] = useState<any[]>([]);
  
  // Paiement vendeur (Stripe/PayPal)
  const [stripeStatus, setStripeStatus] = useState<'not-connected' | 'connected' | 'loading'>('loading');
  const [paypalStatus, setPaypalStatus] = useState<'not-connected' | 'connected' | 'loading'>('loading');
  const [paypalEmail, setPaypalEmail] = useState<string | null>(null);
  const [stripeId, setStripeId] = useState<string | null>(null);
  
  const [publication, setPublication] = useState<MangaPublication>({
    id: '',
    title: '',
    synopsis: '',
    description: '',
    author: '',
    price: 0,
    currency: 'EUR',
    isFree: true,
    tags: [],
    category: '',
    genre: [],
    targetAudience: 'all',
    language: 'fr',
    previewPages: 3,
    totalPages: 0,
    publishDate: new Date(),
    isPublished: false,
    isDraft: true,
    rating: 'G',
    copyrightInfo: '',
    collaborators: [],
    socialLinks: {},
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loading, setLoading] = useState(true);

  // Marquer une tâche comme terminée
  const toggleTodoDone = async (todo: any) => {
    if (!projectId) return;
    const todoRef = doc(db, 'projects', projectId as string, 'todos', todo.id);
    await updateDoc(todoRef, {
      status: todo.status === 'terminé' ? 'à faire' : 'terminé'
    });
  };

  // Ajouter une tâche à la to-do list
  const addTodo = async () => {
    if (!newTask.trim() || !projectId) return;
    await addDoc(collection(db, 'projects', projectId as string, 'todos'), {
      title: newTask,
      status: 'à faire',
      createdBy: getAuth(app).currentUser?.uid,
      createdAt: new Date()
    });
    setNewTask('');
  };

  // Ouvre les réglages sur la section paiement
  const goToSettings = () => router.push('/settings');

  // Lancer onboarding Stripe depuis la page de publication
  const handleStripeConnect = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Non connecté');
      const res = await fetch('/api/stripe/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        Linking.openURL(data.url);
      } else {
        Alert.alert('Erreur', 'Impossible de générer le lien Stripe.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de se connecter à Stripe.');
    }
  };

  // Connexion PayPal (simple: demande l'email)
  const handlePaypalConnect = async () => {
    Alert.prompt(
      'Connecter PayPal',
      'Entrez votre adresse email PayPal pour recevoir vos paiements.',
      async (email) => {
        if (!email) return;
        try {
          const auth = getAuth(app);
          const user = auth.currentUser;
          if (!user) throw new Error('Non connecté');
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { paypalEmail: email });
          setPaypalStatus('connected');
          setPaypalEmail(email);
          Alert.alert('Succès', 'Votre compte PayPal est connecté.');
        } catch (e) {
          Alert.alert('Erreur', 'Impossible de connecter PayPal.');
          setPaypalStatus('not-connected');
        }
      },
      'plain-text',
      paypalEmail || ''
    );
  };

  // Récupère le compte de paiement de l'utilisateur
  useEffect(() => {
    const fetchPaymentAccounts = async () => {
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.stripeAccountId) {
            setStripeStatus('connected');
            setStripeId(data.stripeAccountId);
          } else {
            setStripeStatus('not-connected');
            setStripeId(null);
          }
          if (data.paypalEmail) {
            setPaypalStatus('connected');
            setPaypalEmail(data.paypalEmail);
          } else {
            setPaypalStatus('not-connected');
            setPaypalEmail(null);
          }
        } else {
          setStripeStatus('not-connected');
          setPaypalStatus('not-connected');
        }
      } catch {
        setStripeStatus('not-connected');
        setPaypalStatus('not-connected');
      }
    };
    fetchPaymentAccounts();
  }, []);

  // Charger la to-do list collaborative
  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, 'projects', projectId as string, 'todos'),
      where('deleted', '!=', true),
      orderBy('deleted'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [projectId]);

  // Charger l'historique des modifications
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, 'projects', projectId as string, 'activity'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [projectId]);

  // Charger les données du projet de manga si projectId est fourni
  useEffect(() => {
    const loadProjectData = async () => {
      if (projectId) {
        try {
          const project = await mangaProjectService.getProject(projectId as string);
          if (project) {
            const auth = getAuth(app);
            const user = auth.currentUser;
            
            setPublication(prev => ({
              ...prev,
              id: project.id,
              title: project.title || '',
              description: project.description || '',
              author: project.author || user?.displayName || user?.email || '',
              coverImage: project.coverImage || '',
              totalPages: project.totalPages || project.pages?.length || 0,
              tags: project.tags || [],
              genre: project.genre ? [project.genre] : [],
            }));
          }
        } catch (error) {
          console.error('Erreur chargement projet:', error);
          Alert.alert('Erreur', 'Impossible de charger les données du projet');
        }
      }
      setLoading(false);
    };

    loadProjectData();
  }, [projectId]);

  const categories = [
    'Shonen', 'Shojo', 'Seinen', 'Josei', 'Kodomomuke',
    'Action', 'Aventure', 'Comédie', 'Drame', 'Fantasy',
    'Horreur', 'Romance', 'Science-Fiction', 'Slice of Life',
    'Sports', 'Thriller', 'Historique', 'Surnaturel'
  ];

  const genres = [
    'Action', 'Aventure', 'Comédie', 'Drame', 'Ecchi',
    'Fantasy', 'Horreur', 'Josei', 'Mecha', 'Musique',
    'Mystère', 'Psychologique', 'Romance', 'École',
    'Science-Fiction', 'Seinen', 'Shojo', 'Shonen',
    'Slice of Life', 'Sports', 'Surnaturel', 'Thriller'
  ];

  const handleInputChange = (field: keyof MangaPublication, value: any) => {
    setPublication(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !publication.tags.includes(newTag.trim())) {
      setPublication(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setPublication(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleGenre = (genre: string) => {
    setPublication(prev => ({
      ...prev,
      genre: prev.genre.includes(genre)
        ? prev.genre.filter(g => g !== genre)
        : [...prev.genre, genre]
    }));
  };

  const uploadCoverImage = async () => {
    try {
      setUploadingCover(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPublication(prev => ({
          ...prev,
          coverImage: result.assets[0].uri
        }));
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'uploader l\'image de couverture');
    } finally {
      setUploadingCover(false);
    }
  };

  const saveDraft = async () => {
    try {
      setLoading(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour sauvegarder');
        return;
      }

      if (projectId) {
        const docRef = doc(db, 'books', projectId as string);
        await updateDoc(docRef, {
          title: publication.title.trim() || 'Manga sans titre',
          synopsis: publication.synopsis.trim(),
          description: publication.description.trim(),
          tags: publication.tags,
          status: 'draft',
          isPublished: false,
          updatedAt: serverTimestamp(),
          category: publication.category,
          genre: publication.genre,
          isFree: publication.isFree,
          price: publication.isFree ? 0 : publication.price,
          rating: publication.rating,
          targetAudience: publication.targetAudience,
          language: publication.language,
          copyrightInfo: publication.copyrightInfo,
          author: publication.author || user.displayName || user.email || 'Auteur',
          authorUid: user.uid,
        });

        Alert.alert('Brouillon sauvegardé', 'Votre manga a été sauvegardé en tant que brouillon');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le brouillon');
    } finally {
      setLoading(false);
    }
  };

  const validatePublication = (): string[] => {
    const errors: string[] = [];
    
    if (!publication.title.trim()) errors.push('Le titre est requis');
    if (!publication.synopsis.trim()) errors.push('Le synopsis est requis');
    if (!publication.author.trim()) errors.push('L\'auteur est requis');
    if (!publication.category) errors.push('La catégorie est requise');
    if (publication.genre.length === 0) errors.push('Au moins un genre est requis');
    if (!publication.isFree && publication.price <= 0) errors.push('Le prix doit être supérieur à 0');
    if (publication.tags.length < 3) errors.push('Au moins 3 tags sont requis');
    if (!publication.coverImage) errors.push('Une image de couverture est requise');
    
    return errors;
  };

  const publishManga = async () => {
    const errors = validatePublication();
    
    if (errors.length > 0) {
      Alert.alert(
        'Erreurs de validation',
        errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Publier le manga',
      'Êtes-vous sûr de vouloir publier ce manga ? Il sera visible par tous les utilisateurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          onPress: async () => {
            try {
              setLoading(true);
              const auth = getAuth(app);
              const user = auth.currentUser;
              
              if (!user) {
                Alert.alert('Erreur', 'Vous devez être connecté pour publier');
                return;
              }

              if (projectId) {
                // Mettre à jour le projet de manga existant
                const docRef = doc(db, 'books', projectId as string);
                await updateDoc(docRef, {
                  title: publication.title.trim(),
                  synopsis: publication.synopsis.trim(),
                  description: publication.description.trim(),
                  tags: publication.tags,
                  status: 'published',
                  isPublished: true,
                  publishedAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  category: publication.category,
                  genre: publication.genre,
                  isFree: publication.isFree,
                  price: publication.isFree ? 0 : publication.price,
                  rating: publication.rating,
                  targetAudience: publication.targetAudience,
                  language: publication.language,
                  copyrightInfo: publication.copyrightInfo,
                  author: publication.author || user.displayName || user.email || 'Auteur',
                  authorUid: user.uid,
                });

                // Notifier les followers de la publication du manga
                const { FollowService } = await import('../../services/FollowService');
                await FollowService.notifyFollowersBookPublished(
                  user.uid,
                  publication.author || user.displayName || user.email || 'Auteur',
                  projectId as string,
                  publication.title,
                  publication.coverImage || undefined
                );

                Alert.alert(
                  'Manga publié !', 
                  'Votre manga est maintenant disponible dans la marketplace',
                  [
                    {
                      text: 'Voir dans marketplace',
                      onPress: () => router.push('/(tabs)/marketplace' as any)
                    },
                    {
                      text: 'Retourner aux projets',
                      onPress: () => router.push('/write/index' as any)
                    }
                  ]
                );
              } else {
                Alert.alert('Erreur', 'Aucun projet sélectionné');
              }
            } catch (error) {
              console.error('Erreur publication:', error);
              Alert.alert('Erreur', 'Impossible de publier le manga');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informations de base</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Titre *</Text>
        <TextInput
          style={styles.input}
          value={publication.title}
          onChangeText={(text) => handleInputChange('title', text)}
          placeholder="Titre de votre manga"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Auteur *</Text>
        <TextInput
          style={styles.input}
          value={publication.author}
          onChangeText={(text) => handleInputChange('author', text)}
          placeholder="Nom de l'auteur"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Synopsis * (résumé court)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={publication.synopsis}
          onChangeText={(text) => handleInputChange('synopsis', text)}
          placeholder="Un résumé accrocheur de votre manga en quelques lignes..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description détaillée</Text>
        <TextInput
          style={[styles.input, styles.textAreaLarge]}
          value={publication.description}
          onChangeText={(text) => handleInputChange('description', text)}
          placeholder="Description complète de l'histoire, des personnages, de l'univers..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={6}
        />
      </View>
    </View>
  );

  const renderCoverUpload = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Image de couverture *</Text>
      
      <TouchableOpacity
        style={styles.coverUploadArea}
        onPress={uploadCoverImage}
        disabled={uploadingCover}
      >
        {publication.coverImage ? (
          <Image source={{ uri: publication.coverImage }} style={styles.coverPreview} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="image-outline" size={48} color="#666" />
            <Text style={styles.coverPlaceholderText}>
              {uploadingCover ? 'Upload en cours...' : 'Toucher pour ajouter une couverture'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      
      {publication.coverImage && (
        <TouchableOpacity
          style={styles.changeCoverButton}
          onPress={uploadCoverImage}
        >
          <Ionicons name="refresh-outline" size={16} color="#FFA94D" />
          <Text style={styles.changeCoverText}>Changer la couverture</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCategoriesAndGenres = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Catégorie et Genres</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Catégorie principale *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.optionsContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.optionChip,
                  publication.category === cat && styles.optionChipSelected
                ]}
                onPress={() => handleInputChange('category', cat)}
              >
                <Text style={[
                  styles.optionChipText,
                  publication.category === cat && styles.optionChipTextSelected
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Genres * (sélection multiple)</Text>
        <View style={styles.genresGrid}>
          {genres.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreChip,
                publication.genre.includes(genre) && styles.genreChipSelected
              ]}
              onPress={() => toggleGenre(genre)}
            >
              <Text style={[
                styles.genreChipText,
                publication.genre.includes(genre) && styles.genreChipTextSelected
              ]}>
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTags = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tags * (minimum 3)</Text>
      
      <View style={styles.tagInputContainer}>
        <TextInput
          style={styles.tagInput}
          value={newTag}
          onChangeText={setNewTag}
          placeholder="Ajouter un tag..."
          placeholderTextColor="#666"
          onSubmitEditing={addTag}
        />
        <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
          <Ionicons name="add" size={20} color="#FFA94D" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tagsContainer}>
        {publication.tags.map((tag, index) => (
          <View key={index} style={styles.tagChip}>
            <Text style={styles.tagChipText}>{tag}</Text>
            <TouchableOpacity onPress={() => removeTag(tag)}>
              <Ionicons name="close" size={16} color="#FFA94D" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPricingSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Prix et distribution</Text>
      
      <View style={styles.pricingToggle}>
        <Text style={styles.label}>Manga gratuit</Text>
        <Switch
          value={publication.isFree}
          onValueChange={(value) => handleInputChange('isFree', value)}
          trackColor={{ false: '#333', true: '#FFA94D' }}
          thumbColor={publication.isFree ? '#fff' : '#666'}
        />
      </View>
      
      {!publication.isFree && (
        <View style={styles.priceInputContainer}>
          <View style={styles.priceInput}>
            <TextInput
              style={styles.priceValue}
              value={publication.price.toString()}
              onChangeText={(text) => handleInputChange('price', parseFloat(text) || 0)}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />
            <Text style={styles.currency}>{publication.currency}</Text>
          </View>
          
          <View style={styles.currencySelector}>
            {['EUR', 'USD'].map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyOption,
                  publication.currency === curr && styles.currencyOptionSelected
                ]}
                onPress={() => handleInputChange('currency', curr)}
              >
                <Text style={[
                  styles.currencyOptionText,
                  publication.currency === curr && styles.currencyOptionTextSelected
                ]}>
                  {curr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pages de prévisualisation gratuites</Text>
        <View style={styles.previewPagesSelector}>
          {[1, 3, 5, 10].map((pages) => (
            <TouchableOpacity
              key={pages}
              style={[
                styles.previewOption,
                publication.previewPages === pages && styles.previewOptionSelected
              ]}
              onPress={() => handleInputChange('previewPages', pages)}
            >
              <Text style={[
                styles.previewOptionText,
                publication.previewPages === pages && styles.previewOptionTextSelected
              ]}>
                {pages}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderAdditionalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informations supplémentaires</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Public cible</Text>
        <View style={styles.audienceSelector}>
          {[
            { key: 'children', label: 'Enfants' },
            { key: 'teen', label: 'Adolescents' },
            { key: 'adult', label: 'Adultes' },
            { key: 'all', label: 'Tout public' }
          ].map((audience) => (
            <TouchableOpacity
              key={audience.key}
              style={[
                styles.audienceOption,
                publication.targetAudience === audience.key && styles.audienceOptionSelected
              ]}
              onPress={() => handleInputChange('targetAudience', audience.key)}
            >
              <Text style={[
                styles.audienceOptionText,
                publication.targetAudience === audience.key && styles.audienceOptionTextSelected
              ]}>
                {audience.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Classification</Text>
        <View style={styles.ratingSelector}>
          {['G', 'PG', 'PG-13', 'R', 'NC-17'].map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.ratingOption,
                publication.rating === rating && styles.ratingOptionSelected
              ]}
              onPress={() => handleInputChange('rating', rating)}
            >
              <Text style={[
                styles.ratingOptionText,
                publication.rating === rating && styles.ratingOptionTextSelected
              ]}>
                {rating}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Informations de copyright</Text>
        <TextInput
          style={styles.input}
          value={publication.copyrightInfo}
          onChangeText={(text) => handleInputChange('copyrightInfo', text)}
          placeholder="© 2024 Votre nom. Tous droits réservés."
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsSection}>
      <TouchableOpacity style={styles.draftButton} onPress={saveDraft}>
        <Ionicons name="save-outline" size={20} color="#888" />
        <Text style={styles.draftButtonText}>Sauvegarder brouillon</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.previewButton} onPress={() => setShowPreview(true)}>
        <Ionicons name="eye-outline" size={20} color="#FFA94D" />
        <Text style={styles.previewButtonText}>Aperçu</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.publishButton} onPress={publishManga}>
        <LinearGradient
          colors={['#FFA94D', '#FF8A65']}
          style={styles.publishGradient}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.publishButtonText}>Publier</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sidebar latéral pour les tâches */}
      <Modal
        visible={showSidebar}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSidebar(false)}
      >
        <TouchableOpacity 
          style={styles.sidebarOverlay} 
          activeOpacity={1} 
          onPress={() => setShowSidebar(false)}
        >
          <TouchableOpacity 
            style={styles.sidebarContainer} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header de la sidebar */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarTitleContainer}>
                <Ionicons name="checkbox-outline" size={24} color="#FFA94D" />
                <Text style={styles.sidebarTitle}>Mes Tâches</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSidebar(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFA94D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              {/* Formulaire d'ajout de tâche */}
              <View style={styles.addTaskContainer}>
                <TextInput
                  value={newTask}
                  onChangeText={setNewTask}
                  placeholder="Nouvelle tâche..."
                  placeholderTextColor="#666"
                  style={styles.taskInput}
                  onSubmitEditing={addTodo}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={addTodo} style={styles.addButton}>
                  <Ionicons name="add-circle" size={32} color="#FFA94D" />
                </TouchableOpacity>
              </View>

              {/* Liste des tâches */}
              <View style={styles.tasksListContainer}>
                {todos.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="clipboard-outline" size={48} color="#444" />
                    <Text style={styles.emptyStateText}>Aucune tâche pour le moment</Text>
                    <Text style={styles.emptyStateSubtext}>Ajoutez votre première tâche ci-dessus</Text>
                  </View>
                ) : (
                  todos.map((todo) => (
                    <View key={todo.id} style={styles.taskItem}>
                      <TouchableOpacity
                        onPress={() => toggleTodoDone(todo)}
                        style={styles.taskCheckbox}
                      >
                        <Ionicons
                          name={todo.status === 'terminé' ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={todo.status === 'terminé' ? '#4CAF50' : '#FFA94D'}
                        />
                      </TouchableOpacity>
                      <Text style={[
                        styles.taskText,
                        todo.status === 'terminé' && styles.taskTextCompleted
                      ]}>
                        {todo.title}
                      </Text>
                      <TouchableOpacity
                        onPress={async () => {
                          if (!projectId) return;
                          Alert.alert(
                            'Supprimer la tâche',
                            'Êtes-vous sûr de vouloir supprimer cette tâche ?',
                            [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: async () => {
                                  const todoRef = doc(db, 'projects', projectId as string, 'todos', todo.id);
                                  await updateDoc(todoRef, { deleted: true });
                                }
                              }
                            ]
                          );
                        }}
                        style={styles.deleteTaskButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Statistiques */}
              {todos.length > 0 && (
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{todos.filter(t => t.status === 'terminé').length}</Text>
                    <Text style={styles.statLabel}>Terminées</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{todos.filter(t => t.status !== 'terminé').length}</Text>
                    <Text style={styles.statLabel}>En cours</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{todos.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publier le Manga</Text>
        <TouchableOpacity onPress={() => setShowSidebar(true)} style={styles.tasksButton}>
          <Ionicons name="checkbox-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Bloc récapitulatif paiement */}
      <View style={{ backgroundColor: '#232323', borderRadius: 12, margin: 18, padding: 16, borderWidth: 1, borderColor: '#FFA94D' }}>
        <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Compte de paiement sélectionné</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="card-outline" size={20} color="#FFA94D" style={{ marginRight: 8 }} />
          {stripeStatus === 'connected' ? (
            <Text style={{ color: '#4CAF50' }}>Stripe connecté (ID: {stripeId})</Text>
          ) : (
            <TouchableOpacity style={{ backgroundColor: '#FFA94D', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14, marginLeft: 8 }} onPress={handleStripeConnect}>
              <Text style={{ color: '#181818', fontWeight: 'bold' }}>Connecter Stripe</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="logo-paypal" size={20} color="#0070BA" style={{ marginRight: 8 }} />
          {paypalStatus === 'connected' ? (
            <Text style={{ color: '#4CAF50' }}>PayPal connecté ({paypalEmail})</Text>
          ) : (
            <TouchableOpacity style={{ backgroundColor: '#0070BA', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14, marginLeft: 8 }} onPress={handlePaypalConnect}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Connecter PayPal</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>
          Le paiement de vos ventes sera envoyé sur le compte connecté ci-dessus. Vous pouvez modifier ce choix dans les réglages.
        </Text>
        <TouchableOpacity onPress={goToSettings} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
          <Text style={{ color: '#FFA94D', fontWeight: 'bold' }}>Modifier dans les réglages</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des données du projet...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderBasicInfo()}
          {renderCoverUpload()}
          {renderCategoriesAndGenres()}
          {renderTags()}
          {renderPricingSection()}
          {renderAdditionalInfo()}
          {renderActions()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tasksButton: {
    padding: 4,
  },
  // Sidebar styles
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  sidebarContainer: {
    width: 360,
    height: '100%',
    backgroundColor: '#232323',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
    padding: 20,
  },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  taskInput: {
    flex: 1,
    backgroundColor: '#181818',
    color: '#fff',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  addButton: {
    padding: 4,
  },
  tasksListContainer: {
    flex: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  taskCheckbox: {
    marginRight: 12,
  },
  taskText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  taskTextCompleted: {
    color: '#4CAF50',
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  deleteTaskButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#23232a',
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  
  // Cover Upload
  coverUploadArea: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  coverPlaceholderText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  changeCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  changeCoverText: {
    color: '#FFA94D',
    fontSize: 14,
  },
  
  // Options
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  optionChipSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  optionChipText: {
    color: '#888',
    fontSize: 14,
  },
  optionChipTextSelected: {
    color: '#181818',
    fontWeight: '600',
  },
  
  // Genres
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#444',
  },
  genreChipSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  genreChipText: {
    color: '#888',
    fontSize: 12,
  },
  genreChipTextSelected: {
    color: '#181818',
    fontWeight: '600',
  },
  
  // Tags
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFA94D',
    gap: 6,
  },
  tagChipText: {
    color: '#181818',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Pricing
  pricingToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceInputContainer: {
    gap: 12,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  priceValue: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 12,
  },
  currency: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '600',
    paddingRight: 12,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  currencyOptionSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  currencyOptionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  currencyOptionTextSelected: {
    color: '#181818',
  },
  
  // Preview Pages
  previewPagesSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  previewOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  previewOptionSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  previewOptionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  previewOptionTextSelected: {
    color: '#181818',
  },
  
  // Audience
  audienceSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  audienceOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  audienceOptionSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  audienceOptionText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  audienceOptionTextSelected: {
    color: '#181818',
  },
  
  // Rating
  ratingSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  ratingOptionSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  ratingOptionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingOptionTextSelected: {
    color: '#181818',
  },
  
  // Actions
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
    marginBottom: 40,
  },
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#333',
    gap: 8,
  },
  draftButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#FFA94D',
    gap: 8,
  },
  previewButtonText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
  publishButton: {
    flex: 1,
    borderRadius: 25,
    overflow: 'hidden',
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MangaPublisher;