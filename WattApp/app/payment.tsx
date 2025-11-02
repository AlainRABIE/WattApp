import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment, addDoc, collection } from 'firebase/firestore';

type PaymentMethod = 'card' | 'paypal' | 'mobile';

const PaymentScreen: React.FC = () => {
  const router = useRouter();
  const { amount, bonus } = useLocalSearchParams();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  
  // États pour le formulaire de carte
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // États pour facturation mobile
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operator, setOperator] = useState('');

  const paymentAmount = parseFloat(Array.isArray(amount) ? amount[0] : amount || '0');
  const bonusAmount = parseFloat(Array.isArray(bonus) ? bonus[0] : bonus || '0');
  const totalAmount = paymentAmount + bonusAmount;

  const operators = [
    { id: 'orange', name: 'Orange', color: '#FF6600' },
    { id: 'sfr', name: 'SFR', color: '#E60012' },
    { id: 'bouygues', name: 'Bouygues Telecom', color: '#009639' },
    { id: 'free', name: 'Free', color: '#000000' },
  ];

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    if (formatted.length <= 19) {
      setCardNumber(formatted);
    }
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      const formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
      setExpiryDate(formatted);
    } else {
      setExpiryDate(cleaned);
    }
  };

  const validateCardForm = () => {
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Erreur', 'Numéro de carte invalide');
      return false;
    }
    if (!cardHolder.trim()) {
      Alert.alert('Erreur', 'Nom du titulaire requis');
      return false;
    }
    if (expiryDate.length !== 5) {
      Alert.alert('Erreur', 'Date d\'expiration invalide');
      return false;
    }
    if (cvv.length !== 3) {
      Alert.alert('Erreur', 'Code CVV invalide');
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    if (selectedMethod === 'card' && !validateCardForm()) {
      return;
    }
    
    if (selectedMethod === 'mobile' && (!phoneNumber || !operator)) {
      Alert.alert('Erreur', 'Veuillez saisir votre numéro et choisir votre opérateur');
      return;
    }

    try {
      setProcessing(true);
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;

      // Simulation du processus de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Sauvegarder la transaction
      const transactionData = {
        userId: user.uid,
        amount: paymentAmount,
        bonus: bonusAmount,
        totalAmount: totalAmount,
        paymentMethod: selectedMethod,
        status: 'completed',
        createdAt: serverTimestamp(),
        // Informations de paiement (masquées pour la sécurité)
        paymentInfo: selectedMethod === 'card' 
          ? { lastFourDigits: cardNumber.slice(-4) }
          : selectedMethod === 'mobile'
          ? { operator: operator, phoneLastDigits: phoneNumber.slice(-4) }
          : { method: 'paypal' }
      };

      // Enregistrer la transaction
      await addDoc(collection(db, 'transactions'), transactionData);

      // Mettre à jour le solde de l'utilisateur
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        walletBalance: increment(totalAmount),
        lastTopUp: serverTimestamp(),
        lastPaymentMethod: selectedMethod,
      });

      Alert.alert(
        '🎉 Paiement réussi !',
        `${totalAmount.toFixed(2)}€ ont été ajoutés à votre portefeuille.`,
        [
          {
            text: 'Retour au portefeuille',
            onPress: () => router.push('/wallet')
          }
        ]
      );

    } catch (error) {
      console.error('Erreur de paiement:', error);
      Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
  };

  const initiatePayPalPayment = () => {
    // URL PayPal avec vos paramètres (à remplacer par vos vraies credentials)
    const paypalConfig = {
      business: "votre-email@paypal.com", // Remplacez par votre email PayPal
      amount: paymentAmount.toFixed(2),
      currency_code: "EUR",
      item_name: `Recharge WattApp ${paymentAmount}€`,
      return_url: "wattapp://payment-success",
      cancel_url: "wattapp://payment-cancel",
    };

    Alert.alert(
      'Paiement PayPal',
      'Vous allez être redirigé vers PayPal pour finaliser votre paiement.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Continuer', 
          onPress: () => {
            // Ici vous intégreriez la vraie API PayPal
            // Pour l'instant, on simule le processus
            processPayment();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Résumé de la commande */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé de votre commande</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant :</Text>
            <Text style={styles.summaryAmount}>{paymentAmount.toFixed(2)}€</Text>
          </View>
          {bonusAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bonus offert :</Text>
              <Text style={styles.summaryBonus}>+{bonusAmount.toFixed(2)}€</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total crédité :</Text>
            <Text style={styles.summaryTotalAmount}>{totalAmount.toFixed(2)}€</Text>
          </View>
        </View>

        {/* Méthodes de paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisissez votre méthode de paiement</Text>
          
          {/* Carte bancaire */}
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedMethod === 'card' && styles.paymentMethodSelected
            ]}
            onPress={() => setSelectedMethod('card')}
          >
            <Ionicons name="card-outline" size={28} color="#4FC3F7" />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>Carte bancaire</Text>
              <Text style={styles.paymentMethodSubtitle}>Visa, Mastercard, CB</Text>
            </View>
            <View style={styles.radioButton}>
              {selectedMethod === 'card' && <View style={styles.radioButtonSelected} />}
            </View>
          </TouchableOpacity>

          {/* PayPal */}
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedMethod === 'paypal' && styles.paymentMethodSelected
            ]}
            onPress={() => setSelectedMethod('paypal')}
          >
            <Ionicons name="logo-paypal" size={28} color="#0070BA" />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>PayPal</Text>
              <Text style={styles.paymentMethodSubtitle}>Paiement sécurisé</Text>
            </View>
            <View style={styles.radioButton}>
              {selectedMethod === 'paypal' && <View style={styles.radioButtonSelected} />}
            </View>
          </TouchableOpacity>

          {/* Facturation mobile */}
          <TouchableOpacity
            style={[
              styles.paymentMethod,
              selectedMethod === 'mobile' && styles.paymentMethodSelected
            ]}
            onPress={() => setSelectedMethod('mobile')}
          >
            <Ionicons name="phone-portrait-outline" size={28} color="#FF6B35" />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>Facturation mobile</Text>
              <Text style={styles.paymentMethodSubtitle}>Orange, SFR, Bouygues, Free</Text>
            </View>
            <View style={styles.radioButton}>
              {selectedMethod === 'mobile' && <View style={styles.radioButtonSelected} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Formulaire de carte bancaire */}
        {selectedMethod === 'card' && (
          <View style={styles.cardForm}>
            <Text style={styles.formTitle}>Informations de la carte</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro de carte</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#888"
                value={cardNumber}
                onChangeText={formatCardNumber}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du titulaire</Text>
              <TextInput
                style={styles.input}
                placeholder="JEAN DUPONT"
                placeholderTextColor="#888"
                value={cardHolder}
                onChangeText={setCardHolder}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>Date d'expiration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/AA"
                  placeholderTextColor="#888"
                  value={expiryDate}
                  onChangeText={formatExpiryDate}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.inputLabel}>Code CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="#888"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        )}

        {/* Formulaire de facturation mobile */}
        {selectedMethod === 'mobile' && (
          <View style={styles.mobileForm}>
            <Text style={styles.formTitle}>Facturation mobile</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro de téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="06 12 34 56 78"
                placeholderTextColor="#888"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Votre opérateur</Text>
              <View style={styles.operatorGrid}>
                {operators.map((op) => (
                  <TouchableOpacity
                    key={op.id}
                    style={[
                      styles.operatorButton,
                      operator === op.id && styles.operatorButtonSelected
                    ]}
                    onPress={() => setOperator(op.id)}
                  >
                    <Text style={[
                      styles.operatorText,
                      operator === op.id && styles.operatorTextSelected
                    ]}>
                      {op.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Bouton de paiement */}
        <TouchableOpacity
          style={[
            styles.payButton,
            processing && styles.payButtonDisabled
          ]}
          onPress={() => {
            if (selectedMethod === 'paypal') {
              initiatePayPalPayment();
            } else {
              processPayment();
            }
          }}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#181818" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={20} color="#181818" />
              <Text style={styles.payButtonText}>
                Payer {paymentAmount.toFixed(2)}€
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Informations de sécurité */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4FC3F7" />
          <Text style={styles.securityText}>
            Paiement 100% sécurisé • SSL 256 bits • Données chiffrées
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#181818',
  },
  backButton: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  headerTitle: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  summaryTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 16,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryBonus: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  summaryTotalLabel: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryTotalAmount: {
    color: '#FFA94D',
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentMethod: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodSelected: {
    borderColor: '#4FC3F7',
    backgroundColor: '#1a2332',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 16,
  },
  paymentMethodTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4FC3F7',
  },
  cardForm: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  mobileForm: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    color: '#FFA94D',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#181818',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  operatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  operatorButton: {
    backgroundColor: '#181818',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 120,
    alignItems: 'center',
  },
  operatorButtonSelected: {
    borderColor: '#4FC3F7',
    backgroundColor: '#1a2332',
  },
  operatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  operatorTextSelected: {
    color: '#4FC3F7',
  },
  payButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  payButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  payButtonText: {
    color: '#181818',
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  securityText: {
    color: '#4FC3F7',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PaymentScreen;