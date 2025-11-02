import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, updateDoc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';
import StripePaymentComponent from './StripePaymentComponent';

interface Props {
  book: {
    id: string;
    title: string;
    price: number;
    authorUid: string;
    author?: string;
  };
  userOwnsBook?: boolean;
  onPurchaseSuccess?: () => void;
  style?: any;
}

export default function QuickPurchaseButton({ book, userOwnsBook = false, onPurchaseSuccess, style }: Props) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchaseSuccess = async (paymentIntentId: string) => {
    try {
      setPurchasing(true);
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) throw new Error('Utilisateur non connecté');

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
        authorName: book.author || 'Auteur inconnu',
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
      
      Alert.alert(
        '🎉 Achat réussi !', 
        'Le livre a été ajouté à votre bibliothèque.',
        [{ text: 'Super !', onPress: () => onPurchaseSuccess?.() }]
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

  if (userOwnsBook) {
    return (
      <TouchableOpacity style={[styles.ownedButton, style]} disabled>
        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
        <Text style={styles.ownedButtonText}>Possédé</Text>
      </TouchableOpacity>
    );
  }

  if (book.price === 0) {
    return (
      <TouchableOpacity style={[styles.freeButton, style]}>
        <MaterialCommunityIcons name="download" size={16} color="#FFA94D" />
        <Text style={styles.freeButtonText}>Gratuit</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={[styles.buyButton, style]} 
        onPress={() => setShowPaymentModal(true)}
        disabled={purchasing}
      >
        <MaterialCommunityIcons name="cart" size={16} color="#181818" />
        <Text style={styles.buyButtonText}>
          {purchasing ? 'Achat...' : `${book.price.toFixed(2)}€`}
        </Text>
      </TouchableOpacity>

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
              style={styles.closeButton}
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
    </>
  );
}

const styles = StyleSheet.create({
  buyButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
  },
  buyButtonText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
  },
  freeButton: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  freeButtonText: {
    color: '#FFA94D',
    fontSize: 14,
    fontWeight: '600',
  },
  ownedButton: {
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  ownedButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
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
  closeButton: {
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