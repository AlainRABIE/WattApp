import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, increment, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { TEMPLATES } from '../write';
import NoteLayout from '../components/NoteLayout';

import StarRating from '../components/StarRating';
import * as ImagePicker from 'expo-image-picker';

const BookEditor: React.FC = () => {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  
  const [book, setBook] = useState<any>(null);
  const [isAuthor, setIsAuthor] = useState<boolean>(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>('');
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [comments, setComments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Increment view count on mount
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string') return;
    const bookRef = doc(db, 'books', bookId);
    updateDoc(bookRef, { reads: increment(1) }).catch(() => {});
  }, [bookId]);

  // Firestore ratings and comments logic
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string') return;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (user) {
      // Listen to user's rating and comment
      const ratingRef = doc(db, 'books', bookId, 'ratings', user.uid);
      getDoc(ratingRef).then(snap => {
        if (snap.exists()) {
          setUserRating(snap.data().rating || 0);
          setUserComment(snap.data().comment || '');
        }
      });
    }
    // Listen to all ratings for average and count
    const ratingsCol = collection(db, 'books', bookId, 'ratings');
    const unsub = onSnapshot(ratingsCol, snap => {
      let sum = 0, count = 0;
      const allComments: any[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        const r = d.rating;
        if (typeof r === 'number') { sum += r; count++; }
        if (d.comment && d.comment.length > 0) {
          allComments.push({ comment: d.comment, rating: d.rating, user: d.user || 'Utilisateur', createdAt: d.createdAt });
        }
      });
      setAvgRating(count ? sum / count : 0);
      setRatingCount(count);
      // Sort comments by createdAt desc
      setComments(allComments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });
    return () => unsub();
  }, [bookId]);

  // Handle user rating and comment
  const handleSubmitRating = async () => {
    if (!userRating || userRating < 1) {
      Alert.alert('Note requise', 'Veuillez donner une note avant de commenter.');
      return;
    }
    setSubmitting(true);
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user || !bookId || typeof bookId !== 'string') return;
    const ratingRef = doc(db, 'books', bookId, 'ratings', user.uid);
    await setDoc(ratingRef, {
      rating: userRating,
      comment: userComment,
      user: user.displayName || user.email || 'Utilisateur',
      createdAt: Date.now(),
    }, { merge: true });
    setSubmitting(false);
    Alert.alert('Merci !', 'Votre avis a été enregistré.');
  };
  const [template, setTemplate] = useState<any>(null);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const loadBook = async () => {
    if (!bookId || typeof bookId !== 'string') {
      Alert.alert('Erreur', 'ID du livre invalide');
      router.back();
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        router.back();
        return;
      }

      const docRef = doc(db, 'books', bookId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Alert.alert('Erreur', 'Livre introuvable');
        router.back();
        return;
      }

      const bookData = { id: docSnap.id, ...docSnap.data() } as any;
      


      setBook(bookData);
      setTitle(bookData.title || '');
      setBody(bookData.body || '');
      setCoverImage(bookData.coverImage || null);

      // Charger le template si disponible
      if (bookData.templateId) {
        const foundTemplate = TEMPLATES.find(t => t.id === bookData.templateId);
        if (foundTemplate) {
          setTemplate(foundTemplate);
        }
      }
    } catch (error: any) {
      console.warn('Erreur lors du chargement du livre:', error);
      Alert.alert('Erreur', 'Impossible de charger le livre');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const saveBook = async () => {
    if (!book) return;

    try {
      setSaving(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      const docRef = doc(db, 'books', book.id);
      await updateDoc(docRef, {
        title: title.trim() || '(Sans titre)',
        body: body.trim(),
        coverImage: coverImage,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Sauvegardé', 
        'Vos modifications ont été sauvegardées !',
        [
          {
            text: 'OK',
            onPress: () => (router as any).push('/library/Library')
          }
        ]
      );
    } catch (error: any) {
      console.warn('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setSaving(false);
    }
  };

  const publishBook = async () => {
    if (!book) return;

    Alert.alert(
      'Publier le livre',
      'Êtes-vous sûr de vouloir publier ce livre ? Il ne sera plus modifiable.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Publier',
          style: 'default',
          onPress: async () => {
            try {
              setSaving(true);
              const docRef = doc(db, 'books', book.id);
              await updateDoc(docRef, {
                title: title.trim() || '(Sans titre)',
                body: body.trim(),
                coverImage: coverImage,
                status: 'published',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              Alert.alert(
                'Publié !',
                'Votre livre a été publié avec succès !',
                [
                  {
                    text: 'Voir dans la bibliothèque',
                    onPress: () => (router as any).push('/library/Library')
                  }
                ]
              );
            } catch (error: any) {
              console.warn('Erreur lors de la publication:', error);
              Alert.alert('Erreur', 'Impossible de publier le livre');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const pickCoverImage = async () => {
    try {
      // Demander la permission d'accès à la galerie
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour choisir une couverture.');
        return;
      }

      // Lancer le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Format portrait pour couverture de livre
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.warn('Erreur lors de la sélection d\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeCoverImage = () => {
    Alert.alert(
      'Supprimer la couverture',
      'Êtes-vous sûr de vouloir supprimer l\'image de couverture ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => setCoverImage(null) }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFA94D" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#18191c' }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#23272f", "#18191c"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 }}
      />
      <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 0, paddingBottom: 48, minHeight: 800 }}>
        {/* Couverture avec gradient */}
        {coverImage && (
          <View style={{ alignItems: 'center', width: '100%', marginTop: 36, marginBottom: 18, borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 6, backgroundColor: 'rgba(35,39,47,0.7)' }}>
            <LinearGradient
              colors={["#FFA94D55", "#23272f00"]}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 120, zIndex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
            />
            <Image source={{ uri: coverImage }} style={{ width: 180, height: 260, borderRadius: 22, zIndex: 2 }} />
          </View>
        )}
        {/* Titre modernisé */}
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, letterSpacing: 0.5, textShadowColor: '#0008', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 6, lineHeight: 38, maxWidth: 340 }} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
        {/* Auteur */}
        {book?.author && (
          <Text style={{ color: '#FFA94D', fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center', letterSpacing: 0.1, textShadowColor: '#0006', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>par {book.author}</Text>
        )}
        {/* Stats glassmorphism */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 30, gap: 18 }}>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(35,39,47,0.65)', borderRadius: 18, padding: 18, minWidth: 90, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2, backdropFilter: 'blur(8px)' }}>
            <Ionicons name="eye-outline" size={24} color="#FFA94D" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, marginTop: 2 }}>{book?.reads ?? '—'}</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>Lectures</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(35,39,47,0.65)', borderRadius: 18, padding: 18, minWidth: 90, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2, backdropFilter: 'blur(8px)' }}>
            <Ionicons name="star-outline" size={24} color="#FFA94D" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, marginTop: 2 }}>{ratingCount}</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>Votes</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(35,39,47,0.65)', borderRadius: 18, padding: 18, minWidth: 90, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2, backdropFilter: 'blur(8px)' }}>
            <Ionicons name="list-outline" size={24} color="#FFA94D" />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, marginTop: 2 }}>{book?.chapters ?? '—'}</Text>
            <Text style={{ color: '#888', fontSize: 13 }}>Chapitres</Text>
          </View>
        </View>
        {/* Note moyenne modernisée */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22, backgroundColor: 'rgba(35,39,47,0.65)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 1, backdropFilter: 'blur(8px)' }}>
          <StarRating rating={avgRating} maxStars={5} size={30} disabled />
          <Text style={{ color: '#FFA94D', marginLeft: 12, fontSize: 18, fontWeight: 'bold' }}>{avgRating.toFixed(1)} / 5</Text>
          <Text style={{ color: '#888', marginLeft: 12, fontSize: 16 }}>({ratingCount} votes)</Text>
        </View>
        {/* Notation utilisateur modernisée */}
        {!isAuthor && (
          <View style={{ marginBottom: 32, width: '90%', alignItems: 'center', backgroundColor: '#20232a', borderRadius: 18, padding: 22, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
            <Text style={{ color: '#FFA94D', marginBottom: 8, fontSize: 17, fontWeight: 'bold', alignSelf: 'flex-start' }}>Votre avis</Text>
            <StarRating
              rating={userRating}
              maxStars={5}
              size={34}
              onRate={setUserRating}
              disabled={false}
            />
            <TextInput
              style={{
                backgroundColor: '#23272f', color: '#fff', borderRadius: 12, padding: 14, fontSize: 16, marginTop: 14, width: '100%', minHeight: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
              }}
              placeholder="Écrivez un commentaire..."
              placeholderTextColor="#888"
              value={userComment}
              onChangeText={setUserComment}
              multiline
              maxLength={400}
              editable={!submitting}
            />
            <TouchableOpacity
              style={{ backgroundColor: '#FFA94D', borderRadius: 22, paddingVertical: 13, paddingHorizontal: 38, marginTop: 18, opacity: submitting ? 0.7 : 1, shadowColor: '#FFA94D', shadowOpacity: 0.18, shadowRadius: 6, elevation: 2 }}
              onPress={handleSubmitRating}
              disabled={submitting}
            >
              <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 }}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Bouton principal modernisé */}
        <TouchableOpacity
          style={{ backgroundColor: '#FFA94D', borderRadius: 32, paddingVertical: 20, paddingHorizontal: 54, marginBottom: 40, marginTop: 12, shadowColor: '#FFA94D', shadowOpacity: 0.22, shadowRadius: 12, elevation: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          onPress={() => router.push(`/book/${bookId}/read`)}
          activeOpacity={0.85}
        >
          <Ionicons name="book-outline" size={26} color="#181818" style={{ marginRight: 8 }} />
          <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 21, letterSpacing: 0.3 }}>Commencer la lecture</Text>
        </TouchableOpacity>
        {/* Section Avis/Commentaires modernisée */}
        <View style={{ width: '92%', marginTop: 8, marginBottom: 32 }}>
          <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 19, marginBottom: 14, letterSpacing: 0.2 }}>Avis & Commentaires</Text>
          {comments.length === 0 ? (
            <View style={{ backgroundColor: '#232323', borderRadius: 12, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 }}>
              <Text style={{ color: '#fff', fontStyle: 'italic', fontSize: 15 }}>
                Aucun avis pour l'instant. Soyez le premier à commenter !
              </Text>
            </View>
          ) : (
            comments.map((c, idx) => (
              <View key={idx} style={{
                backgroundColor: '#23272f', borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 3,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <StarRating rating={c.rating} maxStars={5} size={20} disabled />
                  <Text style={{ color: '#FFA94D', marginLeft: 10, fontSize: 14, fontWeight: 'bold' }}>{c.user}</Text>
                  {c.createdAt && (
                    <Text style={{ color: '#888', marginLeft: 10, fontSize: 12 }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <Text style={{ color: '#fff', fontSize: 16, lineHeight: 22 }}>{c.comment}</Text>
                {idx < comments.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#222', marginTop: 16, borderRadius: 1 }} />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
  },
  loadingText: {
    color: '#FFA94D',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 16,
    backgroundColor: '#181818',
  },
  cancelButton: {
    color: '#4FC3F7',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  publishButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#181818',
    fontWeight: '600',
    fontSize: 14,
  },
  publishButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  templateInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#232323',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA94D',
    position: 'relative',
  },
  templateLabel: {
    color: '#FFA94D',
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDescription: {
    color: '#ccc',
    fontSize: 12,
  },
  templateColorIndicator: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#181818',
  },
  statusInfo: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#FFA94D',
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFA94D',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 16,
  },
  titleInput: {
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#333',
  },
  bodyInput: {
    backgroundColor: '#232323',
    color: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  bodyInputWithTemplate: {
    backgroundColor: 'rgba(35, 35, 35, 0.8)', // Semi-transparent pour voir le template
  },
  textInputContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  templateBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3, // Transparence pour la lisibilité
    zIndex: 1,
  },
  
  // Cover styles
  coverSection: {
    alignItems: 'center',
  },
  coverContainer: {
    alignItems: 'center',
  },
  coverImage: {
    width: 150,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#333',
    marginBottom: 12,
  },
  coverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  coverButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  coverButtonText: {
    color: '#181818',
    fontWeight: '600',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#FF5722',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addCoverButton: {
    backgroundColor: '#232323',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 200,
  },
  addCoverIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  addCoverText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BookEditor;