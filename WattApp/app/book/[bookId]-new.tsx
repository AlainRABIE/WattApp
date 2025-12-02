// Ce fichier contient le nouveau design épuré pour book detail
// À copier dans [bookId].tsx après validation

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
import PaymentService from '../../services/PaymentService';
import StarRating from '../components/StarRating';
import * as ImagePicker from 'expo-image-picker';
import { ShareModal } from '../components/ShareModal';
import { useTheme } from '../../hooks/useTheme';

const BookDetail: React.FC = () => {
  const { theme } = useTheme();
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
  const [hasPurchased, setHasPurchased] = useState<boolean>(false);
  
  // États pour les chapitres
  const [chapters, setChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState<boolean>(false);
  const [readingProgress, setReadingProgress] = useState<any>(null);
  
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // TODO: Copier tous les useEffect et fonctions du fichier original ici
  
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
        {/* Hero Section avec couverture */}
        <View style={dynamicStyles.heroSection}>
          {(book?.cover || book?.coverImage) && (
            <View style={dynamicStyles.coverContainer}>
              <Image 
                source={{ uri: book?.cover || book?.coverImage }} 
                style={dynamicStyles.coverImage}
                resizeMode="cover"
              />
              
              {/* Badge de prix sur la couverture */}
              {!isAuthor && (book?.price && book.price > 0) && !hasPurchased && (
                <View style={[dynamicStyles.priceBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={dynamicStyles.priceBadgeText}>{Number(book.price).toFixed(2)} €</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Titre et auteur */}
          <Text style={[dynamicStyles.bookTitle, { color: theme.colors.text }]} numberOfLines={3}>
            {book?.title || 'Titre non disponible'}
          </Text>
          
          <TouchableOpacity 
            onPress={() => book?.authorUid && router.push(`/author/${book.authorUid}`)}
            style={dynamicStyles.authorContainer}
          >
            <Text style={[dynamicStyles.authorText, { color: theme.colors.primary }]}>
              par {book?.author || 'Auteur inconnu'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>

          {/* Stats bar */}
          <View style={[dynamicStyles.statsBar, { backgroundColor: theme.colors.surface }]}>
            <View style={dynamicStyles.statItem}>
              <Ionicons name="eye-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[dynamicStyles.statText, { color: theme.colors.text }]}>
                {book?.reads ?? 0}
              </Text>
            </View>
            <View style={[dynamicStyles.statDivider, { backgroundColor: theme.colors.border }]} />
            
            <View style={dynamicStyles.statItem}>
              <Ionicons name="star" size={18} color={theme.colors.primary} />
              <Text style={[dynamicStyles.statText, { color: theme.colors.text }]}>
                {Number(avgRating || 0).toFixed(1)}
              </Text>
            </View>
            <View style={[dynamicStyles.statDivider, { backgroundColor: theme.colors.border }]} />
            
            <View style={dynamicStyles.statItem}>
              <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[dynamicStyles.statText, { color: theme.colors.text }]}>
                {ratingCount}
              </Text>
            </View>
            <View style={[dynamicStyles.statDivider, { backgroundColor: theme.colors.border }]} />
            
            <TouchableOpacity 
              style={dynamicStyles.statItem}
              onPress={() => setShowChapters(true)}
            >
              <Ionicons name="list-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[dynamicStyles.statText, { color: theme.colors.text }]}>
                {book?.chapters || 0}
              </Text>
            </TouchableOpacity>
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
                style={[dynamicStyles.secondaryButton, { borderColor: theme.colors.primary }]}
                onPress={() => router.push(`/dashboard?bookId=${bookId}`)}
              >
                <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} />
                <Text style={[dynamicStyles.secondaryButtonText, { color: theme.colors.primary }]}>
                  Stats
                </Text>
              </TouchableOpacity>
            </>
          ) : (book?.price && book.price > 0) ? (
            hasPurchased ? (
              <TouchableOpacity
                style={[dynamicStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push(`/book/${bookId}/read`)}
              >
                <Ionicons name="book-outline" size={20} color="#fff" />
                <Text style={dynamicStyles.primaryButtonText}>Lire</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[dynamicStyles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.navigate(`/payment/${bookId}`)}
              >
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={dynamicStyles.primaryButtonText}>
                  Acheter {Number(book.price).toFixed(2)}€
                </Text>
              </TouchableOpacity>
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
            <View style={[dynamicStyles.card, { backgroundColor: theme.colors.surface }]}>
              <Text style={[dynamicStyles.synopsisText, { color: theme.colors.textSecondary }]}>
                {book.synopsis}
              </Text>
            </View>
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
                  style={[dynamicStyles.tag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '30' }]}
                >
                  <Text style={[dynamicStyles.tagText, { color: theme.colors.primary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Avis utilisateur (si pas auteur) */}
        {!isAuthor && (
          <View style={dynamicStyles.section}>
            <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Votre avis</Text>
            <View style={[dynamicStyles.card, { backgroundColor: theme.colors.surface }]}>
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
                placeholder="Partagez votre avis sur ce livre..."
                placeholderTextColor={theme.colors.textSecondary}
                value={userComment}
                onChangeText={setUserComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[dynamicStyles.submitButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {/* TODO: handleSubmitRating */}}
                disabled={submitting}
              >
                <Text style={dynamicStyles.submitButtonText}>Publier</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Commentaires */}
        <View style={dynamicStyles.section}>
          <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>
            Avis de lecteurs ({comments.length})
          </Text>
          
          {comments.length === 0 ? (
            <View style={[dynamicStyles.emptyState, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[dynamicStyles.emptyStateText, { color: theme.colors.textSecondary }]}>
                Aucun avis pour l'instant
              </Text>
            </View>
          ) : (
            comments.map((comment, idx) => (
              <View 
                key={idx} 
                style={[dynamicStyles.commentCard, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border 
                }]}
              >
                <View style={dynamicStyles.commentHeader}>
                  <View style={dynamicStyles.commentUser}>
                    <View style={[dynamicStyles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[dynamicStyles.avatarText, { color: theme.colors.primary }]}>
                        {String(comment.user || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[dynamicStyles.commentUsername, { color: theme.colors.text }]}>
                      {comment.user}
                    </Text>
                  </View>
                  <StarRating rating={comment.rating || 0} maxStars={5} size={14} disabled />
                </View>
                
                <Text style={[dynamicStyles.commentText, { color: theme.colors.textSecondary }]}>
                  {comment.comment}
                </Text>
                
                <View style={dynamicStyles.commentActions}>
                  <TouchableOpacity style={dynamicStyles.commentAction}>
                    <Ionicons name="heart-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={[dynamicStyles.commentActionText, { color: theme.colors.textSecondary }]}>
                      0
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={dynamicStyles.commentAction}>
                    <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={[dynamicStyles.commentActionText, { color: theme.colors.textSecondary }]}>
                      Répondre
                    </Text>
                  </TouchableOpacity>
                </View>
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
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {chapters.length === 0 ? (
                <View style={dynamicStyles.emptyChapters}>
                  <Ionicons name="book-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[dynamicStyles.emptyChaptersText, { color: theme.colors.textSecondary }]}>
                    Aucun chapitre disponible
                  </Text>
                </View>
              ) : (
                chapters.map((chapter, index) => (
                  <TouchableOpacity
                    key={chapter.id}
                    style={[dynamicStyles.chapterItem, { borderColor: theme.colors.border }]}
                    onPress={() => {
                      router.push(`/book/${bookId}/chapter/${chapter.id}`);
                      setShowChapters(false);
                    }}
                  >
                    <View style={dynamicStyles.chapterNumber}>
                      <Text style={[dynamicStyles.chapterNumberText, { color: theme.colors.primary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={dynamicStyles.chapterInfo}>
                      <Text style={[dynamicStyles.chapterTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {chapter.title || `Chapitre ${index + 1}`}
                      </Text>
                      {chapter.content && (
                        <Text style={[dynamicStyles.chapterPreview, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                          {chapter.content.substring(0, 100)}...
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
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
    fontSize: 16,
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
    borderRadius: 20,
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
    borderRadius: 20,
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
  coverContainer: {
    position: 'relative',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  coverImage: {
    width: 200,
    height: 300,
    borderRadius: 16,
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  bookTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  authorText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 20,
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
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Avis utilisateur
  commentInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
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
    paddingVertical: 48,
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  commentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 16,
    fontWeight: '700',
  },
  commentUsername: {
    fontSize: 15,
    fontWeight: '600',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 20,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentActionText: {
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptyChapters: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChaptersText: {
    fontSize: 16,
    marginTop: 12,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  chapterNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'currentColor',
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  chapterPreview: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default BookDetail;
