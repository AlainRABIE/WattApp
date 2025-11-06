import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar, Image, Platform, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { StripeProvider, usePaymentSheet } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from '../../constants/stripeConfig';
import PaymentService from '../../services/PaymentService';
// Fonction utilitaire pour appeler l'API backend Stripe PaymentIntent
async function createStripePaymentIntent(bookId, amount) {
  const response = await fetch('https://watt-app.vercel.app/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, amount })
  });
  if (!response.ok) throw new Error('Erreur lors de la création du paiement Stripe');
  return await response.json(); // { clientSecret, paymentIntentId }
}

// Fonction utilitaire pour créer une session Stripe Checkout (PayPal)
async function createStripeCheckoutSession(bookId, amount, bookTitle) {
  const response = await fetch('https://watt-app.vercel.app/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookId,
      amount,
      bookTitle,
      currency: 'eur',
      successUrl: 'https://watt-app.vercel.app/payment-success',
      cancelUrl: 'https://watt-app.vercel.app/payment-cancel',
    })
  });
  if (!response.ok) throw new Error('Erreur lors de la création de la session PayPal');
  return await response.json(); // { url }
}

const PaymentScreen: React.FC = () => {
  const { bookId } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletToUse, setWalletToUse] = useState<string>('');
  // Calcule le montant à utiliser depuis le portefeuille (max: solde ou prix du livre)
  const walletAmount = Math.max(0, Math.min(parseFloat(walletToUse) || 0, walletBalance, book ? book.price : 0));
  const resteAPayer = book ? Math.max(0, book.price - walletAmount) : 0;
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'paypal' | 'apple' | null>(null);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();


  useEffect(() => {
    loadBook();
    loadWallet();
  }, [bookId]);

  const loadWallet = async () => {
    try {
      setWalletLoading(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setWalletBalance(data.walletBalance || 0);
      } else {
        setWalletBalance(0);
      }
    } catch (e) {
      setWalletBalance(0);
    } finally {
      setWalletLoading(false);
    }
  };
  const handleWalletPayment = async () => {
    if (!book) return;
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour effectuer un achat');
      return;
    }
    if (walletBalance < book.price) {
      Alert.alert('Solde insuffisant', 'Votre solde de portefeuille est insuffisant pour cet achat.');
      return;
    }
    setProcessing(true);
    try {
      // Débiter le portefeuille utilisateur
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        walletBalance: walletBalance - book.price,
        updatedAt: serverTimestamp(),
      });
      // Marquer le livre comme acheté (simulate PaymentService)
      await PaymentService.handlePaymentSuccess(book.id, `wallet_${Date.now()}`, book.price);
      Alert.alert(
        'Achat réussi avec portefeuille ! 🎉',
        `Vous avez acheté "${book.title}" avec succès. Le livre est maintenant disponible dans votre bibliothèque.`,
        [
          {
            text: 'Voir le livre',
            onPress: () => router.push(`/book/${bookId}`)
          }
        ]
      );
      // Rafraîchir le solde
      loadWallet();
    } catch (e) {
      Alert.alert('Erreur', 'Une erreur est survenue lors du paiement avec le portefeuille.');
    } finally {
      setProcessing(false);
    }
  };

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
      // Appel réel à l'API backend pour créer un PaymentIntent Stripe
      const { clientSecret } = await createStripePaymentIntent(book.id, book.price);
      const { error } = await initPaymentSheet({
        merchantDisplayName: STRIPE_CONFIG.MERCHANT_DISPLAY_NAME,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: user.displayName || user.email || 'Utilisateur',
          email: user.email || undefined,
        },
        appearance: STRIPE_CONFIG.APPEARANCE,
        allowsDelayedPaymentMethods: true, // Active Apple Pay et autres wallets
        returnURL: 'wattapp://payment-return',
      });
      if (error) {
        console.error('Erreur d\'initialisation Stripe:', error);
        console.log('Stripe initPaymentSheet error details:', JSON.stringify(error, null, 2));
        Alert.alert('Erreur', 'Impossible d\'initialiser le système de paiement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser le système de paiement');
    }
  };

  // Handler pour le paiement PayPal (Stripe Checkout)
  const handlePayPal = async () => {
    if (!book) return;
    setProcessing(true);
    try {
      const { url } = await createStripeCheckoutSession(book.id, book.price, book.title);
      if (url) {
        Linking.openURL(url);
      } else {
        Alert.alert('Erreur', 'Impossible de démarrer le paiement PayPal.');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de démarrer le paiement PayPal.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Méthode de paiement', 'Veuillez sélectionner une méthode de paiement');
      return;
    }
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
      // Initialiser la PaymentSheet Stripe réelle
      await initializePaymentSheet();
      const { error } = await presentPaymentSheet();
      if (error) {
        Alert.alert('Erreur de paiement', error.message || 'Le paiement a échoué.');
        setProcessing(false);
        return;
      }
      // Succès Stripe : marquer le livre comme acheté
      await PaymentService.handlePaymentSuccess(book.id, 'stripe', book.price);
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
    } catch (error) {
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
          {/* Paiement partiel avec portefeuille */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Utiliser le portefeuille</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="wallet-outline" size={28} color="#FFA94D" style={{ marginRight: 10 }} />
              {walletLoading ? (
                <ActivityIndicator size="small" color="#FFA94D" />
              ) : (
                <Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16 }}>
                  Solde: {walletBalance.toFixed(2)}€
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', marginRight: 8 }}>Montant à utiliser :</Text>
              <View style={{ backgroundColor: '#232323', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 60 }}>
                <TextInput
                  style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 16, textAlign: 'right' }}
                  placeholder="0.00"
                  placeholderTextColor="#888"
                  value={walletToUse}
                  onChangeText={setWalletToUse}
                  keyboardType="decimal-pad"
                  editable={!processing && !walletLoading}
                  maxLength={6}
                />
              </View>
              <Text style={{ color: '#FFA94D', marginLeft: 4 }}>€</Text>
            </View>
            <Text style={{ color: '#aaa', marginBottom: 8 }}>
              Reste à payer par carte/PayPal : <Text style={{ color: '#FFA94D', fontWeight: 'bold' }}>{resteAPayer.toFixed(2)}€</Text>
            </Text>
          </View>
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

          {/* Méthodes de paiement */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Méthode de paiement</Text>
            

            {/* Carte bancaire (Stripe PaymentSheet) */}
            <TouchableOpacity 
              style={[styles.paymentMethod, selectedPaymentMethod === 'card' && styles.selectedPaymentMethod]}
              onPress={() => setSelectedPaymentMethod('card')}
              activeOpacity={0.8}
            >
              <View style={styles.paymentMethodLeft}>
                <Ionicons name="card" size={24} color="#FFA94D" />
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodTitle}>Carte bancaire / Apple Pay</Text>
                  <Text style={styles.paymentMethodDesc}>Visa, Mastercard, American Express, Apple Pay</Text>
                </View>
              </View>
              <View style={[styles.radio, selectedPaymentMethod === 'card' && styles.radioSelected]} />
            </TouchableOpacity>

            {/* PayPal (Stripe Checkout) */}
            <TouchableOpacity 
              style={[styles.paymentMethod, styles.selectedPaymentMethod]}
              onPress={handlePayPal}
              activeOpacity={0.8}
            >
              <View style={styles.paymentMethodLeft}>
                <Ionicons name="logo-paypal" size={24} color="#FFA94D" />
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodTitle}>PayPal</Text>
                  <Text style={styles.paymentMethodDesc}>Paiement sécurisé via Stripe Checkout</Text>
                </View>
              </View>
              {/* Pas de radio pour PayPal, c'est un bouton direct */}
            </TouchableOpacity>

            {/* Apple Pay (si iOS) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={[styles.paymentMethod, selectedPaymentMethod === 'apple' && styles.selectedPaymentMethod]}
                onPress={() => setSelectedPaymentMethod('apple')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentMethodLeft}>
                  <Ionicons name="logo-apple" size={24} color="#FFA94D" />
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodTitle}>Apple Pay</Text>
                    <Text style={styles.paymentMethodDesc}>Paiement rapide avec Touch/Face ID</Text>
                  </View>
                </View>
                <View style={[styles.radio, selectedPaymentMethod === 'apple' && styles.radioSelected]} />
              </TouchableOpacity>
            )}

            {/* Informations de sécurité */}
            <View style={styles.securityInfo}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
              <Text style={styles.securityText}>
                Paiement sécurisé et crypté par Stripe
              </Text>
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
            style={[styles.paymentButton, (!selectedPaymentMethod || processing) && styles.paymentButtonDisabled]}
            onPress={handlePayment}
            disabled={!selectedPaymentMethod || processing}
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
  paymentMethod: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    borderColor: '#FFA94D',
    backgroundColor: '#FFA94D15',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  paymentMethodDesc: {
    color: '#aaa',
    fontSize: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: 'transparent',
  },
  radioSelected: {
    borderColor: '#FFA94D',
    backgroundColor: '#FFA94D',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  securityText: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 8,
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