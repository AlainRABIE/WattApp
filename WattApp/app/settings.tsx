
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Linking, ScrollView, Platform, StatusBar } from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRouter } from 'expo-router';


const SettingsScreen: React.FC = () => {
	const [isPrivate, setIsPrivate] = useState<boolean>(false);
	const [loading, setLoading] = useState(true);
	const { theme, changeTheme, currentThemeKey, allThemes } = useTheme();
	const router = useRouter();
	const [notifications, setNotifications] = useState(true);
	const [autoDownload, setAutoDownload] = useState(false);
	const [darkMode, setDarkMode] = useState(false);
	const [isPremium, setIsPremium] = useState(false);
	
	// Stripe
	const [stripeStatus, setStripeStatus] = useState<'not-connected' | 'connected' | 'loading'>('loading');
	const [stripeUrl, setStripeUrl] = useState<string | null>(null);
	// PayPal
	const [paypalStatus, setPaypalStatus] = useState<'not-connected' | 'connected' | 'loading'>('not-connected');
	const [paypalEmail, setPaypalEmail] = useState<string | null>(null);

	useEffect(() => {
		const fetchPrivacyAndPayments = async () => {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) return;
				const userRef = doc(db, 'users', user.uid);
				const userSnap = await getDoc(userRef);
				if (userSnap.exists()) {
					setIsPrivate(!!userSnap.data().isPrivate);
					setIsPremium(!!userSnap.data().isPremium);
					// Stripe status
					if (userSnap.data().stripeAccountId) {
						setStripeStatus('connected');
					} else {
						setStripeStatus('not-connected');
					}
					// PayPal status
					if (userSnap.data().paypalEmail) {
						setPaypalStatus('connected');
						setPaypalEmail(userSnap.data().paypalEmail);
					} else {
						setPaypalStatus('not-connected');
						setPaypalEmail(null);
					}
				} else {
					setStripeStatus('not-connected');
					setPaypalStatus('not-connected');
				}
			} catch (e) {
				setStripeStatus('not-connected');
				setPaypalStatus('not-connected');
			} finally {
				setLoading(false);
			}
		};
		fetchPrivacyAndPayments();
	}, []);
		// Connexion PayPal (simple: demande l'email)
		const handlePaypalConnect = async () => {
			Alert.prompt(
				'Connecter PayPal',
				'Entrez votre adresse email PayPal pour recevoir vos paiements.',
				async (email) => {
					if (!email) return;
					setPaypalStatus('loading');
					try {
						const auth = getAuth();
						const user = auth.currentUser;
						if (!user) throw new Error('Non connecté');
						const userRef = doc(db, 'users', user.uid);
						await updateDoc(userRef, { paypalEmail: email });
						setPaypalStatus('connected');
						setPaypalEmail(email);
						Alert.alert('Succès', 'Votre compte PayPal est connecté.');
					} catch (e) {
						Alert.alert('Erreur', 'Impossible de connecter PayPal.');
						setPaypalStatus('not-connected');
					}
				},
				'plain-text',
				paypalEmail || ''
			);
		};
	// Lancer l'onboarding Stripe
	const handleStripeConnect = async () => {
		setStripeStatus('loading');
		try {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) throw new Error('Non connecté');
			// Appelle l'API backend pour obtenir le lien d'onboarding
			const res = await fetch('/api/stripe/onboard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid: user.uid, email: user.email }),
			});
			const data = await res.json();
			if (data.url) {
				setStripeUrl(data.url);
				Linking.openURL(data.url);
			} else {
				Alert.alert('Erreur', 'Impossible de générer le lien Stripe.');
			}
		} catch (e) {
			Alert.alert('Erreur', 'Impossible de se connecter à Stripe.');
		} finally {
			setStripeStatus('not-connected');
		}
	};

	const handleToggle = async (value: boolean) => {
		setIsPrivate(value);
		try {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) return;
			const userRef = doc(db, 'users', user.uid);
			await updateDoc(userRef, { isPrivate: value });
			Alert.alert('Succès', value ? 'Votre compte est maintenant privé.' : 'Votre compte est maintenant public.');
		} catch (e) {
			Alert.alert('Erreur', 'Impossible de mettre à jour la confidentialité.');
		}
	};

	const styles = getStyles(theme);

	return (
		<ScrollView style={styles.container}>
			<StatusBar barStyle="light-content" />
			
			{/* Header épuré */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color={theme.colors.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Paramètres</Text>
			</View>

			{/* Section Apparence */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Apparence</Text>
				
				{/* Thème */}
				<View style={styles.settingGroup}>
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
								<Ionicons name="color-palette" size={20} color={theme.colors.primary} />
							</View>
							<Text style={styles.settingLabel}>Thème de couleur</Text>
						</View>
						<View style={styles.settingRight}>
							<Text style={styles.settingValue}>{allThemes[currentThemeKey]?.name}</Text>
							<Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
						</View>
					</View>
				</View>

				{/* Grille de thèmes */}
				<View style={styles.themesGrid}>
					{Object.entries(allThemes).map(([key, themeData]) => (
						<TouchableOpacity
							key={key}
							style={[
								styles.themeChip,
								{ 
									backgroundColor: currentThemeKey === key ? theme.colors.primary + '20' : theme.colors.surface,
									borderColor: currentThemeKey === key ? theme.colors.primary : 'transparent',
								}
							]}
							onPress={() => changeTheme(key)}
						>
							<Text style={styles.themeEmoji}>{themeData.icon}</Text>
							<Text style={[
								styles.themeChipName, 
								{ color: currentThemeKey === key ? theme.colors.primary : theme.colors.text }
							]}>
								{themeData.name}
							</Text>
							{currentThemeKey === key && (
								<Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
							)}
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Section Compte */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Compte</Text>
				
				<View style={styles.settingGroup}>
					{/* Compte privé */}
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#9C27B0' + '20' }]}>
								<Ionicons name="lock-closed" size={20} color="#9C27B0" />
							</View>
							<View style={styles.settingTextContainer}>
								<Text style={styles.settingLabel}>Compte privé</Text>
								<Text style={styles.settingDescription}>
									{isPrivate ? 'Seuls vos abonnés peuvent voir votre profil' : 'Votre profil est public'}
								</Text>
							</View>
						</View>
						<Switch
							value={isPrivate}
							onValueChange={handleToggle}
							disabled={loading}
							trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
							thumbColor={isPrivate ? '#fff' : '#f4f3f4'}
						/>
					</View>

					<View style={styles.separator} />

					{/* Notifications */}
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#FF9800' + '20' }]}>
								<Ionicons name="notifications" size={20} color="#FF9800" />
							</View>
							<View style={styles.settingTextContainer}>
								<Text style={styles.settingLabel}>Notifications</Text>
								<Text style={styles.settingDescription}>Recevoir les notifications push</Text>
							</View>
						</View>
						<Switch
							value={notifications}
							onValueChange={setNotifications}
							trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
							thumbColor={notifications ? '#fff' : '#f4f3f4'}
						/>
					</View>
				</View>
			</View>

			{/* Section Paiements */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Paiements</Text>
				
				<View style={styles.settingGroup}>
					{/* Stripe */}
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#635BFF' + '20' }]}>
								<Ionicons name="card" size={20} color="#635BFF" />
							</View>
							<View style={styles.settingTextContainer}>
								<Text style={styles.settingLabel}>Stripe</Text>
								<Text style={styles.settingDescription}>
									{stripeStatus === 'connected' ? 'Compte connecté' : 'Recevoir vos paiements'}
								</Text>
							</View>
						</View>
						{stripeStatus === 'connected' ? (
							<View style={styles.statusBadge}>
								<Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
								<Text style={[styles.statusText, { color: theme.colors.success }]}>Connecté</Text>
							</View>
						) : stripeStatus === 'loading' ? (
							<ActivityIndicator color={theme.colors.primary} />
						) : (
							<TouchableOpacity style={styles.connectButton} onPress={handleStripeConnect}>
								<Text style={styles.connectButtonText}>Connecter</Text>
							</TouchableOpacity>
						)}
					</View>

					<View style={styles.separator} />

					{/* PayPal */}
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#0070BA' + '20' }]}>
								<Ionicons name="logo-paypal" size={20} color="#0070BA" />
							</View>
							<View style={styles.settingTextContainer}>
								<Text style={styles.settingLabel}>PayPal</Text>
								<Text style={styles.settingDescription}>
									{paypalStatus === 'connected' ? paypalEmail : 'Recevoir vos paiements'}
								</Text>
							</View>
						</View>
						{paypalStatus === 'connected' ? (
							<View style={styles.statusBadge}>
								<Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
								<Text style={[styles.statusText, { color: theme.colors.success }]}>Connecté</Text>
							</View>
						) : paypalStatus === 'loading' ? (
							<ActivityIndicator color={theme.colors.primary} />
						) : (
							<TouchableOpacity style={styles.connectButton} onPress={handlePaypalConnect}>
								<Text style={styles.connectButtonText}>Connecter</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>

			{/* Section Stockage */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Stockage & Données</Text>
				
				<View style={styles.settingGroup}>
					{/* Téléchargement auto */}
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#4CAF50' + '20' }]}>
								<Ionicons name="download" size={20} color="#4CAF50" />
							</View>
							<View style={styles.settingTextContainer}>
								<View style={styles.labelWithBadge}>
									<Text style={styles.settingLabel}>Téléchargement automatique</Text>
									{!isPremium && (
										<View style={styles.premiumBadge}>
											<Ionicons name="star" size={10} color="#FFD700" />
											<Text style={styles.premiumBadgeText}>Premium</Text>
										</View>
									)}
								</View>
								<Text style={styles.settingDescription}>
									{isPremium 
										? 'Télécharger les livres en Wi-Fi' 
										: 'Fonctionnalité Premium uniquement'
									}
								</Text>
							</View>
						</View>
						<Switch
							value={autoDownload && isPremium}
							onValueChange={(value) => {
								if (!isPremium) {
									Alert.alert(
										'Fonctionnalité Premium',
										'Le téléchargement automatique est réservé aux membres Premium. Passez à Premium pour télécharger un nombre illimité de livres sans contrainte.',
										[
											{ text: 'Annuler', style: 'cancel' },
											{ text: 'Devenir Premium', onPress: () => router.push('/wallet') }
										]
									);
								} else {
									setAutoDownload(value);
								}
							}}
							disabled={!isPremium}
							trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
							thumbColor={(autoDownload && isPremium) ? '#fff' : '#f4f3f4'}
						/>
					</View>

					<View style={styles.separator} />

					{/* Cache */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#F44336' + '20' }]}>
								<Ionicons name="trash" size={20} color="#F44336" />
							</View>
							<View style={styles.settingTextContainer}>
								<Text style={styles.settingLabel}>Vider le cache</Text>
								<Text style={styles.settingDescription}>Libérer de l'espace de stockage</Text>
							</View>
						</View>
						<Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Section Aide & Support */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Aide & Support</Text>
				
				<View style={styles.settingGroup}>
					{/* Centre d'aide */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#2196F3' + '20' }]}>
								<Ionicons name="help-circle" size={20} color="#2196F3" />
							</View>
							<Text style={styles.settingLabel}>Centre d'aide</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
					</TouchableOpacity>

					<View style={styles.separator} />

					{/* Signaler un problème */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#FF5722' + '20' }]}>
								<Ionicons name="flag" size={20} color="#FF5722" />
							</View>
							<Text style={styles.settingLabel}>Signaler un problème</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
					</TouchableOpacity>

					<View style={styles.separator} />

					{/* Politique de confidentialité */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#607D8B' + '20' }]}>
								<Ionicons name="shield-checkmark" size={20} color="#607D8B" />
							</View>
							<Text style={styles.settingLabel}>Politique de confidentialité</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
					</TouchableOpacity>

					<View style={styles.separator} />

					{/* Conditions d'utilisation */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: '#795548' + '20' }]}>
								<Ionicons name="document-text" size={20} color="#795548" />
							</View>
							<Text style={styles.settingLabel}>Conditions d'utilisation</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Section À propos */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>À propos</Text>
				
				<View style={styles.settingGroup}>
					{/* Version */}
					<View style={styles.settingItem}>
						<View style={styles.settingLeft}>
							<View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
								<Ionicons name="information-circle" size={20} color={theme.colors.primary} />
							</View>
							<Text style={styles.settingLabel}>Version</Text>
						</View>
						<Text style={styles.settingValue}>1.0.0</Text>
					</View>
				</View>
			</View>

			{/* Déconnexion */}
			<View style={styles.section}>
				<TouchableOpacity 
					style={styles.logoutButton}
					onPress={() => {
						Alert.alert(
							'Déconnexion',
							'Êtes-vous sûr de vouloir vous déconnecter ?',
							[
								{ text: 'Annuler', style: 'cancel' },
								{ 
									text: 'Déconnexion', 
									style: 'destructive',
									onPress: () => {
										getAuth().signOut();
										router.replace('/');
									}
								}
							]
						);
					}}
				>
					<Ionicons name="log-out-outline" size={20} color="#FF3B30" />
					<Text style={styles.logoutText}>Déconnexion</Text>
				</TouchableOpacity>
			</View>
			
			<View style={{ height: 100 }} />
		</ScrollView>
	);
};

const getStyles = (theme: any) => StyleSheet.create({
	container: { 
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	
	// Header épuré
	header: {
		paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
		paddingBottom: 20,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	headerTitle: {
		color: theme.colors.text,
		fontSize: 34,
		fontWeight: '700',
		letterSpacing: -0.5,
	},

	// Sections
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.textSecondary,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		paddingHorizontal: 24,
		marginBottom: 12,
	},

	// Groupe de paramètres
	settingGroup: {
		backgroundColor: theme.colors.background,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		paddingHorizontal: 24,
		backgroundColor: theme.colors.background,
		borderBottomWidth: 0.5,
		borderBottomColor: theme.colors.border,
	},
	settingLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	settingRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 14,
	},
	settingTextContainer: {
		flex: 1,
	},
	labelWithBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 2,
	},
	settingLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: theme.colors.text,
	},
	settingDescription: {
		fontSize: 13,
		color: theme.colors.textSecondary,
		lineHeight: 18,
	},
	settingValue: {
		fontSize: 15,
		color: theme.colors.textSecondary,
	},
	separator: {
		height: 0.5,
		backgroundColor: theme.colors.border,
		marginLeft: 74,
	},

	// Badge Premium
	premiumBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFD700' + '20',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
		gap: 3,
	},
	premiumBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#FFD700',
		textTransform: 'uppercase',
	},

	// Thèmes
	themesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 18,
		gap: 8,
		marginTop: 8,
	},
	themeChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
		borderWidth: 1,
		gap: 6,
	},
	themeEmoji: {
		fontSize: 16,
	},
	themeChipName: {
		fontSize: 14,
		fontWeight: '500',
	},

	// Statut
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	statusText: {
		fontSize: 14,
		fontWeight: '600',
	},

	// Boutons
	connectButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: 16,
		paddingVertical: 6,
		paddingHorizontal: 14,
	},
	connectButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 13,
	},

	// Déconnexion
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		paddingHorizontal: 24,
		backgroundColor: theme.colors.background,
		borderBottomWidth: 0.5,
		borderBottomColor: theme.colors.border,
		gap: 8,
	},
	logoutText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#FF3B30',
	},
});

export default SettingsScreen;
