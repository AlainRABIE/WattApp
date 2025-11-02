import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { StripePaymentService, PaymentIntentData } from '../../services/stripePaymentService';

interface Props {
  bookData: {
    id: string;
    title: string;
    price: number;
    authorId: string;
  };
  buyerId: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
}

export default function StripePaymentComponent({ bookData, buyerId, onPaymentSuccess, onPaymentError }: Props) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // 1. Créer PaymentIntent via backend (sécurisé)
      const paymentIntentData: PaymentIntentData = {
        bookId: bookData.id,
        bookTitle: bookData.title,
        amount: Math.round(bookData.price * 100), // Convertir en centimes
        authorId: bookData.authorId,
        buyerId: buyerId,
      };

      const paymentIntent = await StripePaymentService.createPaymentIntent(paymentIntentData);
      
      if (!paymentIntent?.client_secret) {
        throw new Error('Impossible de créer l\'intention de paiement');
      }

      // 2. Initialiser Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'WattApp',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: 'Utilisateur WattApp',
        },
        style: 'automatic', // Adapté au thème système
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Présenter Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
        return; // Utilisateur a annulé
      }

      // 4. Paiement réussi
      const paymentIntentId = paymentIntent.client_secret.split('_secret_')[0];
      onPaymentSuccess(paymentIntentId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de paiement';
      onPaymentError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{bookData.title}</Text>
        <Text style={styles.price}>{bookData.price.toFixed(2)}€</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading}
      >
        <Text style={styles.payButtonText}>
          {loading ? 'Traitement...' : `Acheter pour ${bookData.price.toFixed(2)}€`}
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.secureText}>🔒 Paiement sécurisé par Stripe</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    borderWidth: 1,
    borderColor: '#23232a',
  },
  bookInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
  },
  price: {
    color: '#FFA94D',
    fontSize: 28,
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FFA94D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payButtonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secureText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});