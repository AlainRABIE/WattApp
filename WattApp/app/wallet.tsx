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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

const WalletScreen: React.FC = () => {
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [addingFunds, setAddingFunds] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  // Montants attractifs pour inciter à l'achat (pricing psychologique)
  const predefinedAmounts = [0.99, 2.99, 4.99, 9.99, 19.99];

  useEffect(() => {
    loadWalletBalance();
  }, []);

  // Rafraîchir le solde à chaque fois qu'on navigue vers cette page
  useEffect(() => {
    const interval = setInterval(() => {
      loadWalletBalance();
    }, 2000); // Vérifier toutes les 2 secondes
    
    return () => clearInterval(interval);
  }, []);

  const loadWalletBalance = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        router.back();
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setWalletBalance(data.walletBalance || 0);
      } else {
        // Créer le document utilisateur s'il n'existe pas
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          walletBalance: 0,
          createdAt: serverTimestamp(),
        });
        setWalletBalance(0);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du portefeuille:', error);
      Alert.alert('Erreur', 'Impossible de charger le portefeuille');
    } finally {
      setLoading(false);
    }
  };

  const addFunds = async (amount: number) => {
    if (amount <= 0) {
      Alert.alert('Erreur', 'Le montant doit être supérieur à 0');
      return;
    }

    // Calculer le bonus
    let bonus = 0;
    if (amount >= 9.99) {
      bonus = 1;
    } else if (amount >= 4.99) {
      bonus = 0.5;
    }

    // Rediriger vers la page de paiement
    router.push(`/payment?amount=${amount}&bonus=${bonus}`);
  };

  const handleCustomAmountSubmit = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    if (amount > 100) {
      Alert.alert('Erreur', 'Le montant maximum est de 100€');
      return;
    }
    addFunds(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFA94D" />
        <Text style={styles.loadingText}>Chargement du portefeuille...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Portefeuille</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Solde actuel */}
        <View style={styles.balanceCard}>
          <Ionicons name="wallet-outline" size={48} color="#FFA94D" />
          <Text style={styles.balanceLabel}>Solde actuel</Text>
          <Text style={styles.balanceAmount}>{walletBalance.toFixed(2)}€</Text>
        </View>

        {/* Section ajouter des fonds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ajouter des fonds</Text>
          
          {/* Message promotionnel */}
          <View style={styles.promoCard}>
            <Ionicons name="gift-outline" size={24} color="#4FC3F7" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.promoTitle}>🎉 Offre limitée !</Text>
              <Text style={styles.promoText}>
                Rechargez 4.99€ ou plus et recevez un bonus ! Plus vous rechargez, plus vous gagnez.
              </Text>
            </View>
          </View>
          
          {/* Montants prédéfinis avec bonus */}
          <View style={styles.amountGrid}>
            {predefinedAmounts.map((amount, index) => {
              // Calculer le bonus pour les gros montants
              let bonus = 0;
              let bonusText = '';
              if (amount >= 9.99) {
                bonus = 1;
                bonusText = '+1€ BONUS';
              } else if (amount >= 4.99) {
                bonus = 0.5;
                bonusText = '+0.50€ BONUS';
              }
              
              return (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.amountButton,
                    selectedAmount === amount && styles.amountButtonSelected,
                    bonus > 0 && styles.amountButtonBonus
                  ]}
                  onPress={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  disabled={addingFunds}
                >
                  <Text style={[
                    styles.amountButtonText,
                    selectedAmount === amount && styles.amountButtonTextSelected
                  ]}>
                    {amount}€
                  </Text>
                  {bonus > 0 && (
                    <Text style={styles.bonusText}>{bonusText}</Text>
                  )}
                  {amount === 0.99 && (
                    <Text style={styles.popularBadge}>POPULAIRE</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Montant personnalisé */}
          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmountLabel}>Montant personnalisé</Text>
            <View style={styles.customAmountInputContainer}>
              <TextInput
                style={styles.customAmountInput}
                placeholder="0.00"
                placeholderTextColor="#888"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedAmount(null);
                }}
                keyboardType="decimal-pad"
                maxLength={6}
                editable={!addingFunds}
              />
              <Text style={styles.euroSymbol}>€</Text>
            </View>
          </View>

          {/* Bouton d'ajout */}
          <TouchableOpacity
            style={[
              styles.addFundsButton,
              (!selectedAmount && !customAmount) && styles.addFundsButtonDisabled
            ]}
            onPress={() => {
              if (selectedAmount) {
                addFunds(selectedAmount);
              } else if (customAmount) {
                handleCustomAmountSubmit();
              }
            }}
            disabled={addingFunds || (!selectedAmount && !customAmount)}
          >
            {addingFunds ? (
              <ActivityIndicator size="small" color="#181818" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={24} color="#181818" />
                <Text style={styles.addFundsButtonText}>
                  Ajouter {selectedAmount ? `${selectedAmount}€` : customAmount ? `${customAmount}€` : 'des fonds'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Informations de sécurité */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#4FC3F7" />
          <Text style={styles.infoTitle}>Paiement sécurisé</Text>
          <Text style={styles.infoText}>
            Vos transactions sont protégées par un cryptage de niveau bancaire. 
            Les fonds sont disponibles immédiatement après confirmation.
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
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
  balanceCard: {
    backgroundColor: '#232323',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#FFA94D',
    fontSize: 36,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  amountButton: {
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 80,
    alignItems: 'center',
  },
  amountButtonSelected: {
    backgroundColor: '#FFA94D',
    borderColor: '#FFA94D',
  },
  amountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountButtonTextSelected: {
    color: '#181818',
  },
  amountButtonBonus: {
    borderColor: '#4FC3F7',
    borderWidth: 2,
  },
  bonusText: {
    color: '#4FC3F7',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  popularBadge: {
    color: '#FF6B35',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
  },
  promoCard: {
    backgroundColor: '#1a2332',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4FC3F7',
  },
  promoTitle: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  promoText: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  customAmountContainer: {
    marginBottom: 20,
  },
  customAmountLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  customAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
  },
  customAmountInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    paddingVertical: 16,
  },
  euroSymbol: {
    color: '#FFA94D',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addFundsButton: {
    backgroundColor: '#FFA94D',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addFundsButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  addFundsButtonText: {
    color: '#181818',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTitle: {
    color: '#4FC3F7',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    flex: 1,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});

export default WalletScreen;