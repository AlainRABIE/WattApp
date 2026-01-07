import React, { useEffect, useState } from 'react';
import { 
  View, Text, Switch, StyleSheet, Alert, ScrollView, TouchableOpacity, 
  TextInput, Modal, Pressable, StatusBar, Linking 
} from 'react-native';
import { getAuth, signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ThemeSelector } from './components/ThemeSelector';
import { useTheme } from '../contexts/ThemeContext';

const SettingsScreen: React.FC = () => {
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<boolean>(true);
  const [emailNotif, setEmailNotif] = useState<boolean>(false);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const { theme, currentThemeKey, allThemes } = useTheme();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setIsPrivate(!!data.isPrivate);
          setNotifications(data.notifications !== false);
          setEmailNotif(!!data.emailNotif);
          setAutoSave(data.autoSave !== false);
        }
      } catch (e) {
        console.error('Erreur chargement paramètres:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const updateSetting = async (field: string, value: boolean) => {
    try {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { [field]: value });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le paramètre.');
    }
  };

  const handlePrivacyToggle = async (value: boolean) => {
    setIsPrivate(value);
    await updateSetting('isPrivate', value);
    Alert.alert('Succès', value ? 'Votre compte est maintenant privé.' : 'Votre compte est maintenant public.');
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    await updateSetting('notifications', value);
  };

  const handleEmailNotifToggle = async (value: boolean) => {
    setEmailNotif(value);
    await updateSetting('emailNotif', value);
  };

  const handleAutoSaveToggle = async (value: boolean) => {
    setAutoSave(value);
    await updateSetting('autoSave', value);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    try {
      if (!user || !user.email) return;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert('Succès', 'Votre mot de passe a été modifié.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de changer le mot de passe.');
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;
              await deleteDoc(doc(db, 'users', user.uid));
              await deleteUser(user);
              router.replace('/');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer le compte. Reconnectez-vous et réessayez.');
            }
          },
        },
      ]
    );
  };

  const SettingSection = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{title}</Text>
    </View>
  );

  const SettingRow = ({ 
    icon, 
    title, 
    description, 
    value, 
    onValueChange, 
    type = 'switch',
    onPress,
    dangerous = false 
  }: any) => (
    <TouchableOpacity 
      style={[styles.settingRow, dangerous && { backgroundColor: `${theme.colors.error}0D` }]} 
      activeOpacity={type === 'switch' ? 1 : 0.7}
      onPress={onPress}
      disabled={type === 'switch'}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: dangerous ? `${theme.colors.error}1A` : `${theme.colors.primary}1A` }]}>
          <Ionicons name={icon} size={20} color={dangerous ? theme.colors.error : theme.colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: dangerous ? theme.colors.error : theme.colors.text }]}>{title}</Text>
          {description && <Text style={[styles.settingDesc, { color: theme.colors.textSecondary }]}>{description}</Text>}
        </View>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={loading}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surface, theme.colors.surface]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: `${theme.colors.primary}1A` }]}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Compte */}
        <SettingSection title="Compte" />
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            icon="person-outline"
            title="Modifier le profil"
            description="Photo, nom, bio, etc."
            type="button"
            onPress={() => router.push('/EditProfile')}
          />
          <SettingRow
            icon="lock-closed-outline"
            title="Compte privé"
            description={isPrivate ? 'Seuls vos abonnés vous voient' : 'Tout le monde peut voir votre profil'}
            value={isPrivate}
            onValueChange={handlePrivacyToggle}
          />
          <SettingRow
            icon="key-outline"
            title="Changer le mot de passe"
            type="button"
            onPress={() => setShowPasswordModal(true)}
          />
        </View>

        {/* Notifications */}
        <SettingSection title="Notifications" />
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            icon="notifications-outline"
            title="Notifications push"
            description="Recevoir des notifications sur l'appareil"
            value={notifications}
            onValueChange={handleNotificationsToggle}
          />
          <SettingRow
            icon="mail-outline"
            title="Notifications par email"
            description="Recevoir des emails de notifications"
            value={emailNotif}
            onValueChange={handleEmailNotifToggle}
          />
        </View>

        {/* Écriture */}
        <SettingSection title="Écriture" />
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            icon="save-outline"
            title="Sauvegarde automatique"
            description="Enregistrer automatiquement votre travail"
            value={autoSave}
            onValueChange={handleAutoSaveToggle}
          />
        </View>

        {/* Apparence */}
        <SettingSection title="Apparence" />
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            icon="color-palette-outline"
            title="Thème de l'application"
            description={`Thème actuel: ${allThemes[currentThemeKey]?.name || 'Orange'}`}
            type="button"
            onPress={() => setShowThemeModal(true)}
          />
        </View>

        {/* Support */}
        <SettingSection title="Support & À propos" />
        <View style={styles.section}>
          <SettingRow
            icon="help-circle-outline"
            title="Centre d'aide"
            type="button"
            onPress={() => Linking.openURL('https://wattapp.help')}
          />
          <SettingRow
            icon="document-text-outline"
            title="Conditions d'utilisation"
            type="button"
            onPress={() => Linking.openURL('https://wattapp.terms')}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            title="Politique de confidentialité"
            type="button"
            onPress={() => Linking.openURL('https://wattapp.privacy')}
          />
          <SettingRow
            icon="information-circle-outline"
            title="À propos"
            description="Version 1.0.0"
            type="button"
            onPress={() => Alert.alert('WattApp', 'Version 1.0.0\n© 2026 WattApp')}
          />
        </View>

        {/* Actions dangereuses */}
        <SettingSection title="Zone dangereuse" />
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <SettingRow
            icon="log-out-outline"
            title="Déconnexion"
            type="button"
            onPress={handleLogout}
            dangerous
          />
          <SettingRow
            icon="trash-outline"
            title="Supprimer le compte"
            description="Action irréversible"
            type="button"
            onPress={() => setShowDeleteModal(true)}
            dangerous
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sélecteur de thèmes */}
      <ThemeSelector 
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />

      {/* Modal de changement de mot de passe */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPasswordModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={80} tint="dark" style={[styles.modalBlur, { backgroundColor: `${theme.colors.surface}CC` }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Changer le mot de passe</Text>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>Mot de passe actuel</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  placeholder="Entrez votre mot de passe actuel"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>Nouveau mot de passe</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Au moins 6 caractères"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.primary }]}>Confirmer le mot de passe</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Re-tapez le nouveau mot de passe"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <TouchableOpacity style={styles.modalButton} onPress={handleChangePassword}>
                <LinearGradient colors={[theme.colors.primary, theme.colors.secondary]} style={styles.buttonGradient}>
                  <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>Modifier</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={80} tint="dark" style={[styles.modalBlur, { backgroundColor: `${theme.colors.surface}CC` }]}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="alert-circle" size={32} color={theme.colors.error} />
              </View>
              
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Supprimer le compte ?</Text>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                Cette action est irréversible. Toutes vos données, publications et informations seront définitivement supprimées.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalCancelButton, { backgroundColor: theme.colors.background }]} 
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.modalDeleteButton, { backgroundColor: theme.colors.error }]} onPress={handleDeleteAccount}>
                  <Text style={styles.modalDeleteText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFA94D',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  dangerRow: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  settingText: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  dangerText: {
    color: '#ff4444',
  },
  settingDesc: {
    fontSize: 13,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalBlur: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA94D',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#181818',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SettingsScreen;