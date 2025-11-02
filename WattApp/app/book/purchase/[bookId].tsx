import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, updateDoc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../../constants/firebaseConfig';
import StripePaymentComponent from '../../components/StripePaymentComponent';

const { width } = Dimensions.get('window');

interface BookData {
  id: string;
  title: string;
  author: string;
  authorUid: string;
  price: number;
  coverImage?: string;
  synopsis?: string;
  tags?: string[];
  reads?: number;
  chapters?: number;
  createdAt?: any;
  authorName?: string;
}

export default function BookPurchaseScreen() {
  const router = useRouter();
  const { bookId } = useLocalSearchParams();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [userOwnsBook, setUserOwnsBook] = useState(false);

  useEffect(() => {
    loadBookData();
    checkOwnership();
  }, [bookId]);

  const loadBookData = async () => {
    try {
      if (!bookId || typeof bookId !== 'string') return;
      
      const bookRef = doc(db, 'books', bookId);
      const bookSnap = await getDoc(bookRef);
      
      if (bookSnap.exists()) {
        const bookData = { id: bookSnap.id, ...bookSnap.data() } as BookData;
        setBook(bookData);
      } else {
        Alert.alert('Erreur', 'Livre non trouvé');
        router.back();
      }
    } catch (error) {
      console.error('Erreur chargement livre:', error);
      Alert.alert('Erreur', 'Impossible de charger le livre');
    } finally {
      setLoading(false);
    }
  };

  const checkOwnership = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !bookId) return;

      // Vérifier si l'utilisateur possède déjà ce livre
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const purchasedBooks = userData.purchasedBooks || [];
        setUserOwnsBook(purchasedBooks.includes(bookId));
      }
    } catch (error) {
      console.error('Erreur vérification propriété:', error);
    }
  };

  const handlePurchaseSuccess = async (paymentIntentId: string) => {
    try {
      setPurchasing(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !book) throw new Error('Données manquantes');

      // 1. Enregistrer l'achat
      const purchaseData = {
        bookId: book.id,
        buyerId: user.uid,
        authorId: book.authorUid,
        amount: book.price,
        platformCommission: book.price * 0.1,
        authorEarnings: book.price * 0.9,
        paymentIntentId,
        purchasedAt: serverTimestamp(),
        status: 'completed',
        bookTitle: book.title,
        authorName: book.author,
      };

      await addDoc(collection(db, 'purchases'), purchaseData);

      // 2. Ajouter à la bibliothèque utilisateur
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        purchasedBooks: arrayUnion(book.id),
        totalSpent: increment(book.price),
        updatedAt: serverTimestamp(),
      });

      // 3. Mettre à jour les stats du livre
      const bookRef = doc(db, 'books', book.id);
      await updateDoc(bookRef, {
        totalSales: increment(1),
        totalRevenue: increment(book.price),
        updatedAt: serverTimestamp(),
      });

      // 4. Mettre à jour les gains de l'auteur
      const authorRef = doc(db, 'users', book.authorUid);
      await updateDoc(authorRef, {
        totalEarnings: increment(book.price * 0.9),
        updatedAt: serverTimestamp(),
      });

      setShowPaymentModal(false);
      setUserOwnsBook(true);
      
      Alert.alert(
        '🎉 Achat réussi !', 
        'Le livre a été ajouté à votre bibliothèque.',
        [
          { text: 'Voir ma bibliothèque', onPress: () => router.push('/library/Library') },
          { text: 'Lire maintenant', onPress: () => router.push(`/book/${book.id}/read`) }
        ]
      );
      
    } catch (error) {
      console.error('Erreur post-achat:', error);
      Alert.alert('Erreur', 'Achat effectué mais erreur de synchronisation. Contactez le support.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseError = (error: string) => {
    Alert.alert('Erreur de paiement', error);
    setShowPaymentModal(false);
  };

  const handleReadBook = () => {
    if (userOwnsBook) {
      router.push(`/book/${book?.id}/read`);
    } else {
      setShowPaymentModal(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFA94D" size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="book-outline" size={64} color="#666" />
          <Text style={styles.errorText}>Livre non trouvé</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚀 PAGE MODIFIÉE - ACHAT LIVRE</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Feather name="more-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Couverture et infos principales */}
        <View style={styles.bookMainInfo}>
          <View style={styles.coverContainer}>
            <Image 
              source={{ 
                uri: book.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&background=23232a&color=FFA94D&size=256` 
              }} 
              style={styles.coverImage} 
            />
            {/* TEST - Œil d'aperçu en haut à droite de la couverture */}
            {!userOwnsBook && (
              <TouchableOpacity 
                style={styles.previewEye} 
                onPress={() => Alert.alert('TEST ŒEIL', 'Ça marche ! L\'œil est cliquable')}
              >
                <Feather name="eye" size={18} color="#4FC3F7" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.bookDetails}>
            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>par {book.author}</Text>
            
            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Feather name="eye" size={16} color="#aaa" />
                <Text style={styles.statText}>{book.reads || 0}</Text>
              </View>
              <View style={styles.stat}>
                <Feather name="list" size={16} color="#aaa" />
                <Text style={styles.statText}>{book.chapters || 0} ch.</Text>
              </View>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="star-outline" size={16} color="#aaa" />
                <Text style={styles.statText}>4.8</Text>
              </View>
            </View>

            {/* Prix */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Prix :</Text>
              <Text style={styles.price}>{book.price.toFixed(2)}€</Text>
              {book.price > 0 && (
                <Text style={styles.priceNote}>Commission 10% incluse</Text>
              )}
            </View>
          </View>
        </View>

        {/* Tags */}
        {book.tags && book.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <Text style={styles.sectionTitle}>Genres</Text>
            <View style={styles.tagsRow}>
              {book.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Synopsis */}
        {book.synopsis && (
          <View style={styles.synopsisContainer}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.synopsis}>{book.synopsis}</Text>
          </View>
        )}

        {/* Espace pour les boutons */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Boutons d'action fixes en bas */}
      <View style={styles.actionButtons}>
        {userOwnsBook ? (
          <TouchableOpacity style={styles.readButton} onPress={handleReadBook}>
            <Ionicons name="book" size={20} color="#181818" />
            <Text style={styles.readButtonText}>Lire maintenant</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buyButtonFull} onPress={() => setShowPaymentModal(true)}>
            <MaterialCommunityIcons name="cart" size={20} color="#181818" />
            <Text style={styles.buyButtonText}>Acheter {book.price.toFixed(2)}€</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de paiement */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Ionicons name="close" size={24} color="#FFA94D" />
            </TouchableOpacity>
            
            <StripePaymentComponent
              bookData={{
                id: book.id,
                title: book.title,
                price: book.price,
                authorId: book.authorUid,
              }}
              buyerId={getAuth().currentUser?.uid || ''}
              onPaymentSuccess={handlePurchaseSuccess}
              onPaymentError={handlePurchaseError}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#23232a',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  moreBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#aaa',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '600',
  },
  bookMainInfo: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'flex-start',
  },
  coverContainer: {
    position: 'relative',
    marginRight: 16,
  },
  coverImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#23232a',
  },
  previewEye: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bookDetails: {
    flex: 1,
    paddingTop: 8,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 28,
  },
  bookAuthor: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 4,
  },
  priceContainer: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 12,
  },
  priceLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    color: '#FFA94D',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceNote: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  tagsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '500',
  },
  synopsisContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  synopsis: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#23232a',
    gap: 12,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  previewButtonText: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: '600',
  },
  buyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  buyButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  buyButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  readButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  readButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '95%',
    backgroundColor: '#181818',
    borderRadius: 16,
    position: 'relative',
    maxHeight: '80%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#23232a',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});