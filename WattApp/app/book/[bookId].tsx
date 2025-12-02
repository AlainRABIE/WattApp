import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, increment, collection, onSnapshot, getDocs, addDoc, query, orderBy, setDoc as setDocFirestore, deleteDoc } from 'firebase/firestore';
import PaymentService from '../../services/PaymentService';
import StarRating from '../components/StarRating';
import * as ImagePicker from 'expo-image-picker';
import { ShareModal } from '../components/ShareModal';
import { useTheme } from '../../hooks/useTheme';

const BookDetail: React.FC = () => {
  const { theme } = useTheme();
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
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  
  const [chapters, setChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);
  
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Charger le livre - OPTIMISÉ
  useEffect(() => {
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

        // Chargement parallèle optimisé
        const [bookSnap, userRatingSnap, purchaseCheck] = await Promise.all([
          getDoc(doc(db, 'books', bookId)),
          getDoc(doc(db, 'books', bookId, 'ratings', user.uid)),
          PaymentService.checkPurchase(bookId).catch(() => false)
        ]);

        if (!bookSnap.exists()) {
          Alert.alert('Erreur', 'Livre introuvable');
          router.back();
          return;
        }

        const bookData = { id: bookSnap.id, ...bookSnap.data() } as any;
        
        setBook(bookData);
        setIsAuthor(bookData.authorUid === user.uid);
        setTags(Array.isArray(bookData.tags) ? bookData.tags : []);
        setHasPurchased(purchaseCheck);
        
        // User rating
        if (userRatingSnap.exists()) {
          setUserRating(userRatingSnap.data().rating || 0);
          setUserComment(userRatingSnap.data().comment || '');
        }

        // Incrémenter les vues (fire and forget)
        updateDoc(doc(db, 'books', bookId), { reads: increment(1) }).catch(() => {});
        
      } catch (error) {
        console.error('Erreur chargement:', error);
        Alert.alert('Erreur', 'Impossible de charger le livre');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [bookId]);

  // Écouter les ratings en temps réel - OPTIMISÉ
  useEffect(() => {
    if (!bookId || typeof bookId !== 'string') return;

    const ratingsCol = collection(db, 'books', bookId, 'ratings');
    const unsubscribe = onSnapshot(ratingsCol, (snap) => {
      let sum = 0, count = 0;
      const allComments: any[] = [];
      
      snap.forEach(doc => {
        const d = doc.data();
        const r = d.rating;
        if (typeof r === 'number') { 
          sum += r; 
          count++; 
        }
        if (d.comment && d.comment.length > 0) {
          allComments.push({ 
            userId: doc.id,
            comment: d.comment, 
            rating: d.rating, 
            user: d.user || 'Utilisateur', 
            createdAt: d.createdAt 
          });
        }
      });
      
      setAvgRating(count ? sum / count : 0);
      setRatingCount(count);
      setComments(allComments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    });

    return () => unsubscribe();
  }, [bookId]);

  // Charger les chapitres uniquement quand nécessaire
  const loadChapters = async () => {
    if (!bookId || typeof bookId !== 'string' || loadingChapters) return;
    
    setLoadingChapters(true);
    try {
      const chaptersRef = collection(db, 'books', bookId, 'chapters');
      const chaptersQuery = query(chaptersRef, orderBy('chapterNumber', 'asc'));
      const chaptersSnapshot = await getDocs(chaptersQuery);
      
      const chaptersData = chaptersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setChapters(chaptersData);
    } catch (error) {
      console.error('Erreur chargement chapitres:', error);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Charger les chapitres quand le modal s'ouvre
  useEffect(() => {
    if (showChapters && chapters.length === 0) {
      loadChapters();
    }
  }, [showChapters]);

  // Soumettre un avis
  const handleSubmitRating = async () => {
    if (!userRating || userRating < 1) {
      Alert.alert('Note requise', 'Veuillez donner une note avant de commenter.');
      return;
    }
    
    setSubmitting(true);
    try {
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
      
      Alert.alert('Merci !', 'Votre avis a été enregistré.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer votre avis.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const dynamicStyles = getStyles(theme);
  
  if (loading) {
    return (
      <View style={[dynamicStyles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[dynamicStyles.loadingText, { color: theme.colors.primary }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={dynamicStyles.headerRight}>
          {isAuthor && (
            <View style={[dynamicStyles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[dynamicStyles.badgeText, { color: theme.colors.primary }]}>Mon livre</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setShareModalVisible(true)}
            style={dynamicStyles.iconButton}
          >
            <Ionicons name="share-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={dynamicStyles.scrollView}>
        {/* Hero Section */}
        <View style={dynamicStyles.heroSection}>
          {(book?.cover || book?.coverImage) && (
            <Image 
              source={{ uri: book?.cover || book?.coverImage }} 
              style={dynamicStyles.coverImage}
              resizeMode="cover"
            />
          )}
          
          <Text style={[dynamicStyles.bookTitle, { color: theme.colors.text }]} numberOfLines={3}>
            {book?.title || 'Titre non disponible'}
          </Text>
          
          <TouchableOpacity 
            onPress={() => book?.authorUid && router.push(`/author/${book.authorUid}`)}
            style={dynamicStyles.authorContainer}
          >
            <Text style={[dynamicStyles.authorText, { color: theme.colors.textSecondary }]}>
              par {book?.author || 'Auteur inconnu'}
            </Text>
          </TouchableOpacity>

          {/* Stats inline */}
          <View style={dynamicStyles.statsContainer}>
            <View style={dynamicStyles.statItem}>
              <Ionicons name="eye-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={[dynamicStyles.statValue, { color: theme.colors.textSecondary }]}>
                {book?.reads ?? 0}
              </Text>
            </View>
            
            <View style={dynamicStyles.statItem}>
              <Ionicons name="star" size={16} color={theme.colors.primary} />
              <Text style={[dynamicStyles.statValue, { color: theme.colors.textSecondary }]}>
                {Number(avgRating || 0).toFixed(1)} ({ratingCount})
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={dynamicStyles.actionsContainer}>
          {isAuthor ? (
            <>
              <TouchableOpacity
                style={[dynamicStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push(`/book/${bookId}/read`)}
              >
                <Ionicons name="book-outline" size={20} color="#fff" />
                <Text style={dynamicStyles.primaryButtonText}>Lire</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[dynamicStyles.secondaryButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowChapters(true)}
              >
                <Ionicons name="list-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          ) : (book?.price && book.price > 0) ? (
            hasPurchased ? (
              <TouchableOpacity
                style={[dynamicStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push(`/book/${bookId}/read`)}
              >
                <Ionicons name="book-outline" size={20} color="#fff" />
                <Text style={dynamicStyles.primaryButtonText}>Lire maintenant</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[dynamicStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => router.navigate(`/payment/${bookId}`)}
                >
                  <Ionicons name="card-outline" size={20} color="#fff" />
                  <Text style={dynamicStyles.primaryButtonText}>
                    Acheter · {Number(book.price).toFixed(2)} €
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[dynamicStyles.secondaryButton, { borderColor: theme.colors.border }]}
                  onPress={() => setShowChapters(true)}
                >
                  <Ionicons name="list-outline" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </>
            )
          ) : (
            <TouchableOpacity
              style={[dynamicStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push(`/book/${bookId}/read`)}
            >
              <Ionicons name="book-outline" size={20} color="#fff" />
              <Text style={dynamicStyles.primaryButtonText}>Lire gratuitement</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Synopsis */}
        {book?.synopsis && (
          <View style={dynamicStyles.section}>
            <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Synopsis</Text>
            <Text style={[dynamicStyles.synopsisText, { color: theme.colors.textSecondary }]}>
              {book.synopsis}
            </Text>
          </View>
        )}

        {/* Tags */}
        {book?.tags && Array.isArray(book.tags) && book.tags.length > 0 && (
          <View style={dynamicStyles.section}>
            <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Genres</Text>
            <View style={dynamicStyles.tagsContainer}>
              {book.tags.map((tag: string, idx: number) => (
                <View
                  key={idx}
                  style={[dynamicStyles.tag, { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.border 
                  }]}
                >
                  <Text style={[dynamicStyles.tagText, { color: theme.colors.text }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Avis utilisateur (si pas auteur) */}
        {!isAuthor && (
          <View style={dynamicStyles.section}>
            <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Votre avis</Text>
            <View style={[dynamicStyles.ratingCard, { backgroundColor: theme.colors.surface }]}>
              <StarRating
                rating={userRating}
                maxStars={5}
                size={28}
                onRate={setUserRating}
                disabled={false}
              />
              <TextInput
                style={[dynamicStyles.commentInput, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Partagez votre avis..."
                placeholderTextColor={theme.colors.textSecondary}
                value={userComment}
                onChangeText={setUserComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[dynamicStyles.submitButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmitRating}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={dynamicStyles.submitButtonText}>Publier</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Commentaires */}
        <View style={dynamicStyles.section}>
          <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>
            Avis ({comments.length})
          </Text>
          
          {comments.length === 0 ? (
            <View style={dynamicStyles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={[dynamicStyles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Aucun avis
              </Text>
            </View>
          ) : (
            comments.map((comment, idx) => (
              <View 
                key={idx} 
                style={[dynamicStyles.commentCard, { 
                  backgroundColor: theme.colors.surface,
                  borderBottomWidth: idx < comments.length - 1 ? 0.5 : 0,
                  borderBottomColor: theme.colors.border
                }]}
              >
                <View style={dynamicStyles.commentHeader}>
                  <View style={dynamicStyles.commentUser}>
                    <View style={[dynamicStyles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
                      <Text style={[dynamicStyles.avatarText, { color: theme.colors.primary }]}>
                        {String(comment.user || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[dynamicStyles.commentUsername, { color: theme.colors.text }]}>
                        {comment.user}
                      </Text>
                      <StarRating rating={comment.rating || 0} maxStars={5} size={12} disabled />
                    </View>
                  </View>
                </View>
                
                <Text style={[dynamicStyles.commentText, { color: theme.colors.textSecondary }]}>
                  {comment.comment}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal chapitres */}
      <Modal
        visible={showChapters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChapters(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={[dynamicStyles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={[dynamicStyles.modalTitle, { color: theme.colors.text }]}>Chapitres</Text>
              <TouchableOpacity onPress={() => setShowChapters(false)}>
                <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {loadingChapters ? (
              <View style={dynamicStyles.emptyChapters}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : chapters.length === 0 ? (
              <View style={dynamicStyles.emptyChapters}>
                <Ionicons name="book-outline" size={40} color={theme.colors.textSecondary} />
                <Text style={[dynamicStyles.emptyChaptersText, { color: theme.colors.textSecondary }]}>
                  Aucun chapitre
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {chapters.map((chapter, index) => (
                  <TouchableOpacity
                    key={chapter.id}
                    style={[dynamicStyles.chapterItem, { 
                      borderBottomWidth: index < chapters.length - 1 ? 0.5 : 0,
                      borderBottomColor: theme.colors.border 
                    }]}
                    onPress={() => {
                      router.push(`/book/${bookId}/chapter/${chapter.id}`);
                      setShowChapters(false);
                    }}
                  >
                    <View style={[dynamicStyles.chapterNumber, { 
                      backgroundColor: theme.colors.primary + '15',
                      borderColor: theme.colors.primary 
                    }]}>
                      <Text style={[dynamicStyles.chapterNumberText, { color: theme.colors.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={dynamicStyles.chapterInfo}>
                      <Text style={[dynamicStyles.chapterTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {chapter.title || `Chapitre ${index + 1}`}
                      </Text>
                      {chapter.content && (
                        <Text style={[dynamicStyles.chapterPreview, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {chapter.content.substring(0, 60)}...
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de partage */}
      {shareModalVisible && (
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          bookId={bookId as string}
          bookTitle={book?.title || ''}
          bookCover={book?.cover || book?.coverImage || ''}
          bookAuthor={book?.author || ''}
        />
      )}
    </View>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  coverImage: {
    width: 140,
    height: 210,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
  },
  bookTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  authorContainer: {
    marginBottom: 16,
  },
  authorText: {
    fontSize: 15,
  },

  // Stats inline
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  synopsisText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Avis utilisateur
  ratingCard: {
    padding: 16,
    borderRadius: 12,
  },
  commentInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Commentaires
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 15,
    marginTop: 8,
  },
  commentCard: {
    padding: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  commentUsername: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 46,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyChapters: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChaptersText: {
    fontSize: 15,
    marginTop: 8,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  chapterNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  chapterPreview: {
    fontSize: 13,
    lineHeight: 16,
  },
});

export default BookDetail;
