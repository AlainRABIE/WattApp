import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { StripeProvider, usePaymentSheet } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from '../../constants/stripeConfig';
import StripeServiceDemo from '../../services/StripeServiceDemo';

const PaymentScreen: React.FC = () => {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

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
      const docRef = doc(db, 'books', bookId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        Alert.alert('Erreur', 'Livre introuvable');
        router.back();
        return;
      }

      const bookData = { id: docSnap.id, ...docSnap.data() };
      setBook(bookData);
    } catch (error) {
      console.error('Erreur lors du chargement du livre:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du livre');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const initializePaymentSheet = async () => {
    if (!book) return;

    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour effectuer un achat');
      return;
    }

    try {
      // Version de production avec Firebase Functions
      // const { clientSecret } = await StripeService.createPaymentIntent(book.id, book.price);
      
      // Version de démonstration (à remplacer)
      const demoClientSecret = `pi_demo_${book.id}_${Date.now()}_secret_demo`;

      const { error } = await initPaymentSheet({
        merchantDisplayName: STRIPE_CONFIG.MERCHANT_DISPLAY_NAME,
        paymentIntentClientSecret: demoClientSecret,
        defaultBillingDetails: {
          name: user.displayName || user.email || 'Utilisateur',
          email: user.email || undefined,
        },
        appearance: STRIPE_CONFIG.APPEARANCE,
        allowsDelayedPaymentMethods: false,
        returnURL: 'wattapp://payment-return',
      });

      if (error) {
        console.error('Erreur d\'initialisation Stripe:', error);
        Alert.alert('Erreur', 'Impossible d\'initialiser le système de paiement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser le système de paiement');
    }
  };

  const handlePayment = async () => {
    if (!book) {
      Alert.alert('Erreur', 'Informations du livre non disponibles');
      return;
    }

    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour effectuer un achat');
      return;
    }

    setProcessing(true);

    try {
      // Version simplifiée pour la démo (sans Payment Sheet)
      const result = await StripeServiceDemo.processPayment(book.id, book.price);

      if (result.success) {
        Alert.alert(
          'Achat réussi ! 🎉',
          `Vous avez acheté "${book.title}" avec succès. Le livre est maintenant disponible dans votre bibliothèque.`,
          [
            {
              text: 'Voir le livre',
              onPress: () => router.push(`/book/${bookId}`)
            }
          ]
        );
      } else {
        throw new Error(result.message);
      }

    } catch (error: any) {
      console.error('Erreur lors du paiement:', error);
      Alert.alert('Erreur de paiement', error.message || 'Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
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

  if (!book) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>Livre non trouvé</Text>
      </View>
    );
  }

  const commissionAmount = book.price * 0.1;
  const authorAmount = book.price - commissionAmount;

  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Informations du livre */}
          <View style={styles.bookSection}>
            <Text style={styles.sectionTitle}>Récapitulatif de commande</Text>
            <View style={styles.bookCard}>
              <Image 
                source={{ uri: book.coverImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&background=23232a&color=FFA94D&size=128` }} 
                style={styles.bookCover} 
              />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>par {book.author}</Text>
                <Text style={styles.bookPrice}>{book.price.toFixed(2)}€</Text>
              </View>
            </View>
          </View>

          {/* Détails de facturation */}
          <View style={styles.billingSection}>
            <Text style={styles.sectionTitle}>Détails de facturation</Text>
            <View style={styles.billingCard}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Prix du livre</Text>
                <Text style={styles.billingValue}>{book.price.toFixed(2)}€</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Commission plateforme (10%)</Text>
                <Text style={styles.billingValue}>{commissionAmount.toFixed(2)}€</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Versement à l'auteur</Text>
                <Text style={styles.billingValue}>{authorAmount.toFixed(2)}€</Text>
              </View>
              <View style={[styles.billingRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalValue}>{book.price.toFixed(2)}€</Text>
              </View>
            </View>
          </View>

          {/* Information sur Stripe */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Paiement sécurisé</Text>
            <View style={styles.stripeInfo}>
              <View style={styles.stripeRow}>
                <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                <View style={styles.stripeTextContainer}>
                  <Text style={styles.stripeTitle}>Paiement sécurisé par Stripe</Text>
                  <Text style={styles.stripeDesc}>
                    Vos informations de paiement sont protégées et cryptées. 
                    Nous n'avons pas accès à vos données bancaires.
                  </Text>
                </View>
              </View>
              <View style={styles.paymentMethods}>
                <Text style={styles.acceptedTitle}>Méthodes acceptées :</Text>
                <View style={styles.methodsRow}>
                  <View style={styles.methodIcon}>
                    <Ionicons name="card" size={20} color="#FFA94D" />
                    <Text style={styles.methodText}>Visa</Text>
                  </View>
                  <View style={styles.methodIcon}>
                    <Ionicons name="card" size={20} color="#FFA94D" />
                    <Text style={styles.methodText}>Mastercard</Text>
                  </View>
                  <View style={styles.methodIcon}>
                    <Ionicons name="logo-paypal" size={20} color="#FFA94D" />
                    <Text style={styles.methodText}>PayPal</Text>
                  </View>
                  <View style={styles.methodIcon}>
                    <Ionicons name="logo-apple" size={20} color="#FFA94D" />
                    <Text style={styles.methodText}>Apple Pay</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Conditions */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              En procédant au paiement, vous acceptez nos{' '}
              <Text style={styles.termsLink}>conditions générales de vente</Text>
              {' '}et notre{' '}
              <Text style={styles.termsLink}>politique de confidentialité</Text>.
            </Text>
          </View>
        </ScrollView>

        {/* Bouton de paiement fixe */}
        <View style={styles.paymentButtonContainer}>
          <TouchableOpacity 
            style={[styles.paymentButton, processing && styles.paymentButtonDisabled]}
            onPress={handlePayment}
            disabled={processing}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#181818" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#181818" style={{ marginRight: 8 }} />
                <Text style={styles.paymentButtonText}>
                  Finaliser l'achat - {book.price.toFixed(2)}€
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </StripeProvider>
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
  },
  loadingText: {
    color: '#FFA94D',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#FF5722',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 24,
  },
  bookSection: {
    marginTop: 0,
  },
  bookCard: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookAuthor: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  bookPrice: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
  },
  billingSection: {},
  billingCard: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 16,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billingLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  billingValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentSection: {},
  stripeInfo: {
    backgroundColor: '#23232a',
    borderRadius: 16,
    padding: 16,
  },
  stripeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stripeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  stripeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stripeDesc: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
  },
  paymentMethods: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  acceptedTitle: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  methodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodIcon: {
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  termsSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  termsText: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  termsLink: {
    color: '#FFA94D',
    textDecorationLine: 'underline',
  },
  paymentButtonContainer: {
    padding: 20,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  paymentButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  paymentButtonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
  },
  paymentButtonText: {
    color: '#181818',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;