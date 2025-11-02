
import { Modal, FlatList, Pressable, Animated, Easing, Dimensions } from 'react-native';
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
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, increment, collection, onSnapshot, getDocs, addDoc, query, orderBy, setDoc as setDocFirestore, deleteDoc } from 'firebase/firestore';
import NoteLayout from '../components/NoteLayout';

import StarRating from '../components/StarRating';
import * as ImagePicker from 'expo-image-picker';

const BookEditor: React.FC = () => {
  const [showChapters, setShowChapters] = useState(false);
  const [sidebarAnim] = useState(new Animated.Value(Dimensions.get('window').width));
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ [key: string]: any[] }>({});
  const [likes, setLikes] = useState<{ [key: string]: { count: number, liked: boolean } }>({});
  // Listen for likes for each comment
  useEffect(() => {
    const safeBookId = Array.isArray(bookId) ? bookId[0] : String(bookId);
    if (!safeBookId || !comments.length) return;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) return;
    const unsubscribes: any[] = [];
    const fetchLikes = async () => {
      for (const c of comments) {
        let ratingDocId = c.userId || c.user;
        if (Array.isArray(ratingDocId)) ratingDocId = ratingDocId[0];
        ratingDocId = String(ratingDocId);
        if (!ratingDocId) continue;
        const likesCol = collection(doc(db, 'books', safeBookId, 'ratings', ratingDocId), 'likes');
        const unsub = onSnapshot(likesCol, snap => {
          let count = snap.size;
          let liked = false;
          snap.forEach(docSnap => {
            if (docSnap.id === user.uid) liked = true;
          });
          setLikes(l => ({ ...l, [ratingDocId]: { count, liked } }));
        });
        unsubscribes.push(unsub);
      }
    };
    fetchLikes();
    return () => { unsubscribes.forEach(u => u && u()); };
  }, [bookId, comments]);
  // Listen for replies for each comment
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string' || !comments.length) return;
    const unsubscribes: any[] = [];
    const fetchReplies = async () => {
      const newReplies: { [key: string]: any[] } = {};
      for (const c of comments) {
        const ratingDocId = c.userId || c.user; // fallback if userId not present
        if (!ratingDocId) continue;
        const repliesCol = collection(db, 'books', bookId, 'ratings', ratingDocId, 'replies');
        const q = query(repliesCol, orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, snap => {
          newReplies[ratingDocId] = snap.docs.map(d => d.data());
          setReplies(r => ({ ...r, [ratingDocId]: newReplies[ratingDocId] }));
        });
        unsubscribes.push(unsub);
      }
    };
    fetchReplies();
    return () => { unsubscribes.forEach(u => u && u()); };
  }, [bookId, comments]);
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
  const [synopsis, setSynopsis] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
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
  setSynopsis(bookData.synopsis || '');
  setTags(Array.isArray(bookData.tags) ? bookData.tags : []);

      // Charger le template si disponible
      if (bookData.templateId) {
        try {
          const templateRef = doc(db, 'templates', bookData.templateId);
          const templateSnap = await getDoc(templateRef);
          if (templateSnap.exists()) {
            setTemplate({ id: templateSnap.id, ...templateSnap.data() });
          }
        } catch (error) {
          console.warn('Erreur lors du chargement du template:', error);
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
        synopsis: synopsis.trim(),
        tags: tags,
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

    if (!synopsis.trim()) {
      Alert.alert('Synopsis requis', 'Veuillez saisir un synopsis avant de publier.');
      return;
    }
    if (!tags.length) {
      Alert.alert('Tags requis', 'Veuillez ajouter au moins un tag avant de publier.');
      return;
    }

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
              const auth = getAuth(app);
              const user = auth.currentUser;
              const docRef = doc(db, 'books', book.id);
              await updateDoc(docRef, {
                title: title.trim() || '(Sans titre)',
                body: body.trim(),
                coverImage: coverImage,
                synopsis: synopsis.trim(),
                tags: tags,
                status: 'published',
                publishedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                author: user?.displayName || user?.email || 'Auteur inconnu',
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


  // Liste des chapitres (mock si pas de vraie data)
  const chapters = book?.chaptersList || [
    { id: 1, title: 'Chapitre 1', cover: book?.coverImage },
    { id: 2, title: 'Chapitre 2', cover: book?.coverImage },
    { id: 3, title: 'Chapitre 3', cover: book?.coverImage },
  ];

  // Animation sidebar chapitres : slide in/out depuis la droite
  useEffect(() => {
    if (showChapters) {
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: Dimensions.get('window').width,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showChapters]);

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
      
      {/* Bouton retour vers home en haut à gauche */}
      <View style={{ position: 'absolute', top: 38, left: 18, zIndex: 15 }}>
        <TouchableOpacity
          onPress={() => router.push('/home/home')}
          activeOpacity={0.8}
          style={{ 
            backgroundColor: 'rgba(35,39,47,0.65)', 
            borderRadius: 20, 
            padding: 12, 
            borderWidth: 1, 
            borderColor: '#FFA94D',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5
          }}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
      </View>

      {/* Chip Chapitres en haut à droite, ouvre la sidebar chapitres + badge status */}
      <View style={{ width: '100%', alignItems: 'flex-end', marginTop: 38, marginBottom: -18, paddingRight: 18, zIndex: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
        {book?.status && (
          <View style={{
            backgroundColor: book.status === 'published' ? '#FFA94D' : (book.status === 'finished' ? '#4CAF50' : '#888'),
            borderRadius: 14,
            paddingVertical: 5,
            paddingHorizontal: 16,
            marginRight: 10,
            alignSelf: 'flex-start',
            minWidth: 60,
          }}>
            <Text style={{ color: book.status === 'published' ? '#18191c' : '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center', textTransform: 'capitalize' }}>
              {book.status === 'published' ? 'Publié' : (book.status === 'finished' ? 'Fini' : book.status)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setShowChapters(true)}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(35,39,47,0.65)', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: '#FFA94D', marginBottom: 0 }}
        >
          <Ionicons name="list-outline" size={20} color="#FFA94D" />
          <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16, marginLeft: 7 }}>
            {book?.status === 'finished'
              ? 'Fini'
              : (book?.chapters && book.chapters > 0)
                ? book.chapters
                : 'En cours'}
          </Text>
          {book?.status === 'finished' || !(book?.chapters && book.chapters > 0) ? null : (
            <Text style={{ color: '#FFA94D', fontSize: 13, marginLeft: 4 }}>
              {book.chapters === 1 ? 'chapitre' : 'chapitres'}
            </Text>
          )}
        </TouchableOpacity>
      </View>


  {/* Modal/Sidebar chapitres */}
      <Modal
        visible={showChapters}
        transparent
        animationType="none"
        onRequestClose={() => setShowChapters(false)}
      >
        <Pressable
          style={{ flex: 1, flexDirection: 'row', backgroundColor: '#000A' }}
          onPress={() => setShowChapters(false)}
        >
          <View style={{ flex: 1 }} />
          <Animated.View style={{
            width: 320,
            height: '100%',
            backgroundColor: '#23272f',
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 24,
            padding: 18,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
            transform: [{ translateX: sidebarAnim }],
          }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#FFA94D55', marginBottom: 8 }} />
              <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 18 }}>Chapitres</Text>
            </View>
            <FlatList
              data={chapters}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderRadius: 12, backgroundColor: '#18191c', padding: 10 }}>
                  <Image source={{ uri: item.cover }} style={{ width: 48, height: 64, borderRadius: 8, marginRight: 14, backgroundColor: '#333' }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{item.title}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 340 }}
            />
            <TouchableOpacity onPress={() => setShowChapters(false)} style={{ alignSelf: 'center', marginTop: 10, padding: 10 }}>
              <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16 }}>Fermer</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

  <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 60 }}>
        {/* ...existing code... */}
        {coverImage && (
          <View style={{ alignItems: 'center', width: '100%', marginTop: 28, marginBottom: 38, borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 16, elevation: 8 }}>
            <Image source={{ uri: coverImage }} style={{ width: 240, height: 340, borderRadius: 28 }} />
          </View>
        )}

        {/* Section Synopsis modernisée */}
        {book?.synopsis && (
          <View style={{ width: '92%', flexDirection: 'row', backgroundColor: '#23232a', borderRadius: 16, padding: 18, marginBottom: 18, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 1, alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Synopsis</Text>
              <Text style={{ color: '#ccc', fontSize: 15, fontStyle: 'italic', lineHeight: 22 }}>{book.synopsis}</Text>
            </View>
            {book?.tags && Array.isArray(book.tags) && book.tags.length > 0 && (
              <View style={{ flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, maxWidth: 120 }}>
                <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 14, marginBottom: 6, alignSelf: 'flex-end' }}>Tags</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {book.tags.map((tag: string, idx: number) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: '#18191c',
                        borderRadius: 8,
                        paddingVertical: 3,
                        paddingHorizontal: 10,
                        marginLeft: 4,
                        marginBottom: 6,
                        minHeight: 22,
                        alignSelf: 'flex-end',
                      }}
                    >
                      <Text style={{ color: '#FFA94D', fontSize: 12, fontWeight: '500', letterSpacing: 0.1 }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
        {/* Titre modernisé */}
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, letterSpacing: 0.5, textShadowColor: '#0008', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 6, lineHeight: 38, maxWidth: 340 }} numberOfLines={2} ellipsizeMode="tail">{title}</Text>
        {/* Auteur affiché systématiquement */}
        <Text style={{ color: '#FFA94D', fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center', letterSpacing: 0.1, textShadowColor: '#0006', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 3 }}>
          par {book?.author ? book.author : 'Auteur inconnu'}
        </Text>

        {/* Synopsis */}
        {book?.synopsis && (
          <Text style={{ color: '#ccc', fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginBottom: 10, marginHorizontal: 10 }}>
            {book.synopsis}
          </Text>
        )}

        {/* Tags sous les stats */}
        {/* Stats modernisées */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 18 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', backgroundColor: '#23232a', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 4 }}>
            <Ionicons name="eye-outline" size={20} color="#FFA94D" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{book?.reads ?? '—'}</Text>
            <Text style={{ color: '#888', fontSize: 13, marginLeft: 4 }}>vues</Text>
          </View>
          <View style={{ alignItems: 'center', flexDirection: 'row', backgroundColor: '#23232a', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 4 }}>
            <Ionicons name="star-outline" size={20} color="#FFA94D" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{ratingCount}</Text>
            <Text style={{ color: '#888', fontSize: 13, marginLeft: 4 }}>votes</Text>
          </View>
          <View style={{ alignItems: 'center', flexDirection: 'row', backgroundColor: '#23232a', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 4 }}>
            <Ionicons name="star" size={20} color="#FFA94D" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{avgRating.toFixed(1)}</Text>
            <Text style={{ color: '#888', fontSize: 13, marginLeft: 4 }}>/ 5</Text>
          </View>
        </View>
        {book?.tags && Array.isArray(book.tags) && book.tags.length > 0 && (
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap',
            alignSelf: 'flex-start',
            marginLeft: 10,
            marginBottom: 20,
            maxWidth: '98%',
          }}>
            {book.tags.map((tag: string, idx: number) => (
              <View
                key={idx}
                style={{
                  backgroundColor: '#23232a',
                  borderRadius: 8,
                  paddingVertical: 3,
                  paddingHorizontal: 10,
                  marginRight: 6,
                  marginBottom: 6,
                  minHeight: 24,
                }}
              >
                <Text style={{ color: '#FFA94D', fontSize: 12, fontWeight: '500', letterSpacing: 0.1 }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Note moyenne modernisée supprimée, déplacée dans la ligne des stats */}

        {/* Champs synopsis et tags pour l'auteur (édition/publication) */}
        {isAuthor && (
          <View style={{ width: '92%', backgroundColor: '#23232a', borderRadius: 16, padding: 18, marginBottom: 18, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 }}>
            <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Synopsis</Text>
            <TextInput
              value={synopsis}
              onChangeText={setSynopsis}
              placeholder="Écrivez le synopsis de votre livre..."
              placeholderTextColor="#888"
              style={{ color: '#fff', fontSize: 15, fontStyle: 'italic', lineHeight: 22, backgroundColor: '#18191c', borderRadius: 8, padding: 10, marginBottom: 12 }}
              multiline
              numberOfLines={3}
              maxLength={800}
            />
            <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16, marginBottom: 6 }}>Tags</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Ajouter un tag..."
                placeholderTextColor="#888"
                style={{ color: '#fff', fontSize: 14, backgroundColor: '#18191c', borderRadius: 8, padding: 8, minWidth: 100, flex: 1, marginRight: 8 }}
                onSubmitEditing={() => {
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()]);
                    setTagInput('');
                  }
                }}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => {
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()]);
                    setTagInput('');
                  }
                }}
                style={{ backgroundColor: '#FFA94D', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 }}
              >
                <Text style={{ color: '#18191c', fontWeight: 'bold', fontSize: 15 }}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
              {tags.map((tag, idx) => (
                <View key={idx} style={{ backgroundColor: '#18191c', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10, marginRight: 6, marginBottom: 6, minHeight: 22, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#FFA94D', fontSize: 12, fontWeight: '500', letterSpacing: 0.1 }}>{tag}</Text>
                  <TouchableOpacity onPress={() => setTags(tags.filter((t, i) => i !== idx))} style={{ marginLeft: 6 }}>
                    <Ionicons name="close-circle" size={16} color="#FFA94D" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bouton principal modernisé + bouton ajout bibliothèque */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 40, marginTop: 12 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#FFA94D', borderRadius: 32, paddingVertical: 20, paddingHorizontal: 54, shadowColor: '#FFA94D', shadowOpacity: 0.22, shadowRadius: 12, elevation: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => router.push(`/book/${bookId}/read`)}
            activeOpacity={0.85}
          >
            <Ionicons name="book-outline" size={26} color="#181818" style={{ marginRight: 8 }} />
            <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 21, letterSpacing: 0.3 }}>Commencer la lecture</Text>
          </TouchableOpacity>
          {/* Bouton + ou check pour ajouter à la bibliothèque */}
          {(() => {
            const auth = getAuth(app);
            const user = auth.currentUser;
            const isInLibrary = book && user && book.ownerUid === user.uid;
            if (isInLibrary) {
              return (
                <TouchableOpacity
                  style={{ backgroundColor: '#23232a', borderRadius: 32, padding: 18, marginLeft: 8, borderWidth: 2, borderColor: '#FFA94D', alignItems: 'center', justifyContent: 'center' }}
                  onPress={async () => {
                    Alert.alert(
                      'Supprimer ce livre',
                      `Voulez-vous vraiment supprimer "${book.title || book.titre}" de votre bibliothèque ?`,
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Supprimer', style: 'destructive',
                          onPress: async () => {
                            try {
                              const { doc, deleteDoc } = await import('firebase/firestore');
                              const bookRef = doc(db, 'books', book.id);
                              await deleteDoc(bookRef);
                              setBook((prev: any) => prev ? { ...prev, ownerUid: undefined } : prev);
                              Alert.alert('Supprimé', 'Le livre a été retiré de votre bibliothèque.');
                            } catch (e) {
                              Alert.alert('Erreur', 'Impossible de supprimer le livre.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={28} color="#FFA94D" />
                </TouchableOpacity>
              );
            } else {
              return (
                <TouchableOpacity
                  style={{ backgroundColor: '#23232a', borderRadius: 32, padding: 18, marginLeft: 8, borderWidth: 2, borderColor: '#FFA94D', alignItems: 'center', justifyContent: 'center' }}
                  onPress={async () => {
                    try {
                      const auth = getAuth(app);
                      const user = auth.currentUser;
                      if (!user || !book) {
                        Alert.alert('Erreur', 'Vous devez être connecté pour ajouter ce livre.');
                        return;
                      }
                      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                      const bookRef = doc(db, 'books', book.id);
                      await setDoc(bookRef, {
                        ...book,
                        ownerUid: user.uid,
                        status: 'published',
                        addedAt: serverTimestamp(),
                      }, { merge: true });
                      setBook((prev: any) => prev ? { ...prev, ownerUid: user.uid } : prev);
                      Alert.alert('Ajouté', `Le livre "${book.title || book.titre}" a été ajouté à votre bibliothèque !`);
                    } catch (e) {
                      Alert.alert('Erreur', 'Impossible d\'ajouter le livre.');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={28} color="#FFA94D" />
                </TouchableOpacity>
              );
            }
          })()}
        </View>
        {/* Section Avis/Commentaires modernisée */}
        <View style={{ width: '92%', marginTop: 8, marginBottom: 32 }}>
          <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 19, marginBottom: 14, letterSpacing: 0.2 }}>Avis & Commentaires</Text>
          {comments.length === 0 ? (
            <View style={{ backgroundColor: '#232323', borderRadius: 10, padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontStyle: 'italic', fontSize: 15 }}>
                Aucun avis pour l'instant. Soyez le premier à commenter !
              </Text>
            </View>
          ) : (
            comments.map((c, idx) => {
              let ratingDocId = c.userId || c.user;
              if (Array.isArray(ratingDocId)) ratingDocId = ratingDocId.join('-');
              ratingDocId = String(ratingDocId);
              return (
                <View key={idx} style={{
                  backgroundColor: '#20222a', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#23272f',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    {/* Avatar/Initiale */}
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFA94D33', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 14 }}>{(c.user || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 14 }}>{c.user}</Text>
                      <Text style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>{c.createdAt ? `${new Date(c.createdAt).toLocaleDateString()} à ${new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 15, lineHeight: 21, marginBottom: 8, marginLeft: 2 }}>{c.comment}</Text>
                  {/* Barre d’actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}
                      onPress={async () => {
                        const auth = getAuth(app);
                        const user = auth.currentUser;
                        if (!user || !bookId || !ratingDocId) return;
                        let safeBookId = Array.isArray(bookId) ? bookId[0] : String(bookId);
                        let safeRatingDocId = Array.isArray(ratingDocId) ? ratingDocId[0] : String(ratingDocId);
                        const likeDocRef = doc(db, 'books', safeBookId, 'ratings', safeRatingDocId, 'likes', user.uid);
                        if (likes[safeRatingDocId]?.liked) {
                          await deleteDoc(likeDocRef);
                        } else {
                          await setDocFirestore(likeDocRef, { liked: true, createdAt: Date.now() });
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={likes[String(ratingDocId)]?.liked ? 'heart' : 'heart-outline'} size={18} color={likes[String(ratingDocId)]?.liked ? '#FF4D6D' : '#888'} style={{ marginRight: 5 }} />
                      <Text style={{ color: '#888', fontSize: 13 }}>
                        {likes[String(ratingDocId)]?.count > 0 ? `${likes[String(ratingDocId)]?.count}` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setReplyingTo(ratingDocId)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={17} color="#4FC3F7" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#4FC3F7', fontWeight: 'bold', fontSize: 13 }}>Commenter</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Zone de réponse */}
                  {replyingTo === ratingDocId && (
                    <View style={{ marginBottom: 6, marginLeft: 28 }}>
                      <TextInput
                        style={{ backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 8, fontSize: 13, borderWidth: 1, borderColor: '#333', marginBottom: 4 }}
                        placeholder="Votre réponse..."
                        placeholderTextColor="#888"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                        maxLength={300}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ backgroundColor: '#FFA94D', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14, marginRight: 6 }}
                          onPress={async () => {
                            if (!replyText.trim()) return;
                            const auth = getAuth(app);
                            const user = auth.currentUser;
                            if (!user || !bookId || !ratingDocId) return;
                            let safeBookId = Array.isArray(bookId) ? bookId[0] : String(bookId);
                            let safeRatingDocId = Array.isArray(ratingDocId) ? ratingDocId[0] : String(ratingDocId);
                            const ratingDocRef = doc(db, 'books', safeBookId, 'ratings', safeRatingDocId);
                            const repliesCol = collection(ratingDocRef, 'replies');
                            await addDoc(repliesCol, {
                              text: replyText,
                              user: user.displayName || user.email || 'Utilisateur',
                              createdAt: Date.now(),
                            });
                            setReplyText('');
                            setReplyingTo(null);
                          }}
                        >
                          <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 12 }}>Envoyer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ backgroundColor: '#232323', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#444' }}
                          onPress={() => { setReplyingTo(null); setReplyText(''); }}
                        >
                          <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 12 }}>Annuler</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {/* Affichage des réponses */}
                  {replies[ratingDocId] && replies[ratingDocId].length > 0 && (
                    <View style={{ marginTop: 4, marginLeft: 36 }}>
                      {replies[ratingDocId].map((r, ridx) => (
                        <View key={ridx} style={{ backgroundColor: '#23272f', borderRadius: 8, padding: 8, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: '#4FC3F7' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
                            <Text style={{ color: '#4FC3F7', fontWeight: 'bold', fontSize: 12 }}>{r.user}</Text>
                            {r.createdAt && (
                              <Text style={{ color: '#888', marginLeft: 6, fontSize: 10 }}>
                                {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            )}
                          </View>
                          <Text style={{ color: '#fff', fontSize: 13 }}>{r.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {idx < comments.length - 1 && (
                    <View style={{ height: 1, backgroundColor: '#222', marginTop: 12, borderRadius: 1 }} />
                  )}
                </View>
              );
            })
          )}
  </View>
        {/* Section Votre avis modernisée (en bas) */}
        {!isAuthor && (
          <View style={{ marginBottom: 32, width: '92%', alignItems: 'center', backgroundColor: '#20222a', borderRadius: 10, padding: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 }}>
            <Text style={{ color: '#FFA94D', marginBottom: 6, fontSize: 15, fontWeight: 'bold', alignSelf: 'flex-start' }}>Votre avis</Text>
            <StarRating
              rating={userRating}
              maxStars={5}
              size={22}
              onRate={setUserRating}
              disabled={false}
            />
            <TextInput
              style={{
                backgroundColor: '#23232a', color: '#fff', borderRadius: 8, padding: 8, fontSize: 13, marginTop: 8, width: '100%', minHeight: 36, textAlignVertical: 'top', borderWidth: 1, borderColor: '#333',
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
              style={{ backgroundColor: '#FFA94D', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 22, marginTop: 10, opacity: submitting ? 0.7 : 1, alignSelf: 'flex-end' }}
              onPress={handleSubmitRating}
              disabled={submitting}
            >
              <Text style={{ color: '#181818', fontWeight: 'bold', fontSize: 14 }}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
  }

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