import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { PayoutService, AuthorPayoutAccount } from '../services/PayoutService';

export default function EarningsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AuthorPayoutAccount | null>(null);
  const [earnings, setEarnings] = useState({ total: 0, available: 0, pending: 0, withdrawn: 0 });
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountData, earningsData, historyData] = await Promise.all([
        PayoutService.getAuthorPayoutAccount(),
        PayoutService.calculateAuthorEarnings('current'),
        PayoutService.getPayoutHistory(),
      ]);
      
      setAccount(accountData);
      setEarnings(earningsData);
      setPayoutHistory(historyData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    Alert.alert(
      'Connecter Stripe',
      'Vous allez être redirigé vers Stripe pour connecter votre compte et recevoir vos paiements.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: async () => {
            try {
              const result = await PayoutService.connectStripeAccount();
              if (result.success) {
                if (result.accountLink) {
                  // Ouvrir le lien Stripe dans le navigateur
                  const canOpen = await Linking.canOpenURL(result.accountLink);
                  if (canOpen) {
                    await Linking.openURL(result.accountLink);
                    Alert.alert(
                      'Finalisation en cours',
                      'Complétez le processus sur Stripe, puis revenez à l\'app. Votre compte sera automatiquement connecté.',
                      [{ text: 'OK', onPress: () => loadData() }]
                    );
                  } else {
                    Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
                  }
                } else {
                  Alert.alert('Succès', 'Compte Stripe connecté !');
                  loadData();
                }
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de connecter Stripe');
              }
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de connecter Stripe');
            }
          },
        },
      ]
    );
  };

  const handleDisconnectStripe = async () => {
    Alert.alert(
      'Déconnecter Stripe',
      'Êtes-vous sûr de vouloir déconnecter votre compte Stripe ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            const success = await PayoutService.disconnectStripeAccount();
            if (success) {
              Alert.alert('Succès', 'Compte Stripe déconnecté');
              loadData();
            } else {
              Alert.alert('Erreur', 'Impossible de déconnecter');
            }
          },
        },
      ]
    );
  };

  const handleConnectPayPal = () => {
    setShowPayPalModal(true);
  };

  const handleSubmitPayPal = async () => {
    if (!paypalEmail || !paypalEmail.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer un email PayPal valide');
      return;
    }

    const result = await PayoutService.connectPayPalAccount(paypalEmail);
    setShowPayPalModal(false);
    
    if (result.success) {
      Alert.alert('Succès', 'Compte PayPal connecté !');
      setPaypalEmail('');
      loadData();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de connecter PayPal');
    }
  };

  const handleDisconnectPayPal = async () => {
    Alert.alert(
      'Déconnecter PayPal',
      'Êtes-vous sûr de vouloir déconnecter votre compte PayPal ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            const success = await PayoutService.disconnectPayPalAccount();
            if (success) {
              Alert.alert('Succès', 'Compte PayPal déconnecté');
              loadData();
            } else {
              Alert.alert('Erreur', 'Impossible de déconnecter');
            }
          },
        },
      ]
    );
  };

  const handleSetDefaultMethod = async (method: 'stripe' | 'paypal' | 'bank') => {
    const success = await PayoutService.setDefaultPaymentMethod(method);
    if (success) {
      Alert.alert('Succès', 'Méthode de paiement par défaut mise à jour');
      loadData();
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }

    if (amount < 10) {
      Alert.alert('Erreur', 'Le montant minimum de retrait est de 10€');
      return;
    }

    if (amount > earnings.available) {
      Alert.alert('Erreur', `Solde disponible insuffisant: ${earnings.available.toFixed(2)}€`);
      return;
    }

    const result = await PayoutService.requestPayout(amount);
    setShowPayoutModal(false);
    setPayoutAmount('');
    
    if (result.success) {
      Alert.alert(
        'Demande envoyée',
        `Votre demande de retrait de ${amount.toFixed(2)}€ a été envoyée. Les fonds seront transférés sous 3-5 jours ouvrés.`
      );
      loadData();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de demander le retrait');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Mes Revenus
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Carte de revenus */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          style={styles.earningsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet-outline" size={32} color="#fff" />
            <Text style={styles.earningsLabel}>Revenus Disponibles</Text>
          </View>
          <Text style={styles.earningsAmount}>{earnings.available.toFixed(2)} €</Text>
          
          <View style={styles.earningsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Gagné</Text>
              <Text style={styles.statValue}>{earnings.total.toFixed(2)} €</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>En Attente</Text>
              <Text style={styles.statValue}>{earnings.pending.toFixed(2)} €</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Retiré</Text>
              <Text style={styles.statValue}>{earnings.withdrawn.toFixed(2)} €</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.withdrawButton}
            onPress={() => setShowPayoutModal(true)}
            disabled={earnings.available < 10}
          >
            <Text style={styles.withdrawButtonText}>
              {earnings.available < 10 ? 'Minimum 10€' : 'Demander un Retrait'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Méthodes de paiement */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Méthodes de Paiement
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Connectez vos comptes pour recevoir vos revenus
          </Text>

          {/* Stripe */}
          <View style={[styles.paymentMethod, { backgroundColor: theme.colors.background }]}>
            <View style={styles.paymentMethodHeader}>
              <View style={styles.paymentMethodIcon}>
                <FontAwesome5 name="stripe" size={24} color="#635BFF" />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[styles.paymentMethodName, { color: theme.colors.text }]}>
                  Stripe
                </Text>
                <Text style={[styles.paymentMethodDesc, { color: theme.colors.textSecondary }]}>
                  {account?.stripe?.connected
                    ? `Connecté • ${account.stripe.accountId.substring(0, 12)}...`
                    : 'Recommandé - Transfert instantané'}
                </Text>
              </View>
              {account?.defaultMethod === 'stripe' && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Par défaut</Text>
                </View>
              )}
            </View>

            {account?.stripe?.connected ? (
              <View style={styles.paymentMethodActions}>
                <TouchableOpacity
                  style={[styles.methodButton, styles.setDefaultButton]}
                  onPress={() => handleSetDefaultMethod('stripe')}
                >
                  <Text style={styles.setDefaultButtonText}>Définir par défaut</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, styles.disconnectButton]}
                  onPress={handleDisconnectStripe}
                >
                  <Text style={styles.disconnectButtonText}>Déconnecter</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnectStripe}
              >
                <Text style={styles.connectButtonText}>Connecter Stripe</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* PayPal */}
          <View style={[styles.paymentMethod, { backgroundColor: theme.colors.background }]}>
            <View style={styles.paymentMethodHeader}>
              <View style={[styles.paymentMethodIcon, { backgroundColor: '#00457C' }]}>
                <FontAwesome5 name="paypal" size={24} color="#fff" />
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={[styles.paymentMethodName, { color: theme.colors.text }]}>
                  PayPal
                </Text>
                <Text style={[styles.paymentMethodDesc, { color: theme.colors.textSecondary }]}>
                  {account?.paypal?.connected
                    ? `Connecté • ${account.paypal.email}`
                    : 'Transfert sous 1-2 jours'}
                </Text>
              </View>
              {account?.defaultMethod === 'paypal' && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Par défaut</Text>
                </View>
              )}
            </View>

            {account?.paypal?.connected ? (
              <View style={styles.paymentMethodActions}>
                <TouchableOpacity
                  style={[styles.methodButton, styles.setDefaultButton]}
                  onPress={() => handleSetDefaultMethod('paypal')}
                >
                  <Text style={styles.setDefaultButtonText}>Définir par défaut</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, styles.disconnectButton]}
                  onPress={handleDisconnectPayPal}
                >
                  <Text style={styles.disconnectButtonText}>Déconnecter</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: '#00457C' }]}
                onPress={handleConnectPayPal}
              >
                <Text style={styles.connectButtonText}>Connecter PayPal</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Historique des retraits */}
        {payoutHistory.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Historique des Retraits
            </Text>
            {payoutHistory.map((payout) => (
              <View
                key={payout.id}
                style={[styles.historyItem, { backgroundColor: theme.colors.background }]}
              >
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyAmount, { color: theme.colors.text }]}>
                    {payout.amount.toFixed(2)} €
                  </Text>
                  <Text style={[styles.historyMethod, { color: theme.colors.textSecondary }]}>
                    via {payout.method === 'stripe' ? 'Stripe' : 'PayPal'}
                  </Text>
                </View>
                <View style={[
                  styles.historyStatus,
                  { backgroundColor: payout.status === 'completed' ? '#4CAF50' : '#FFA94D' }
                ]}>
                  <Text style={styles.historyStatusText}>
                    {payout.status === 'completed' ? 'Payé' : 'En cours'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Les revenus sont disponibles 15 jours après l'achat pour la protection contre les fraudes.
            Commission plateforme: 10%
          </Text>
        </View>
      </ScrollView>

      {/* Modal PayPal */}
      <Modal
        visible={showPayPalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayPalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Connecter PayPal
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Entrez l'email associé à votre compte PayPal
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              placeholder="email@paypal.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={paypalEmail}
              onChangeText={setPaypalEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPayPalModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSubmitPayPal}
              >
                <Text style={styles.confirmButtonText}>Connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Retrait */}
      <Modal
        visible={showPayoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Demander un Retrait
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Disponible: {earnings.available.toFixed(2)} € • Minimum: 10€
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              placeholder="Montant en €"
              placeholderTextColor={theme.colors.textSecondary}
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPayoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleRequestPayout}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  earningsCard: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsLabel: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    opacity: 0.9,
  },
  earningsAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  withdrawButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  paymentMethod: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 12,
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  setDefaultButton: {
    backgroundColor: '#4CAF50',
  },
  setDefaultButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#FF5722',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#635BFF',
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyMethod: {
    fontSize: 12,
  },
  historyStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#FFA94D',
  },
  confirmButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
