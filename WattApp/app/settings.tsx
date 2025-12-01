
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';


const SettingsScreen: React.FC = () => {
	const [isPrivate, setIsPrivate] = useState<boolean>(false);
	const [loading, setLoading] = useState(true);
	const { theme, changeTheme, currentThemeKey, allThemes } = useTheme();
	
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

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
			{/* Section Thème */}
			<View style={styles.section}>
				<Text style={[styles.title, { color: theme.colors.primary }]}>Thème de l'application</Text>
				<Text style={[styles.desc, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
					Personnalisez les couleurs de votre application
				</Text>
				<View style={styles.themesGrid}>
					{Object.entries(allThemes).map(([key, themeData]) => (
						<TouchableOpacity
							key={key}
							style={[
								styles.themeCard,
								{ 
									backgroundColor: theme.colors.surface,
									borderColor: currentThemeKey === key ? theme.colors.primary : theme.colors.border,
									borderWidth: currentThemeKey === key ? 2 : 1,
								}
							]}
							onPress={() => changeTheme(key)}
						>
							<View style={[styles.themeColorCircle, { backgroundColor: themeData.colors.primary }]}>
								<Text style={styles.themeIcon}>{themeData.icon}</Text>
							</View>
							<Text style={[styles.themeName, { color: theme.colors.text }]}>{themeData.name}</Text>
							{currentThemeKey === key && (
								<Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} style={styles.themeCheck} />
							)}
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Section Confidentialité */}
			<View style={styles.section}>
				<Text style={[styles.title, { color: theme.colors.primary }]}>Confidentialité du compte</Text>
				<View style={[styles.row, { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12 }]}>
					<Text style={[styles.label, { color: theme.colors.text }]}>Compte privé</Text>
					<Switch
						value={isPrivate}
						onValueChange={handleToggle}
						disabled={loading}
						trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
						thumbColor={isPrivate ? '#fff' : '#f4f3f4'}
					/>
				</View>
				<Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
					{isPrivate
						? 'Seuls vos abonnés peuvent voir votre profil et vos œuvres.'
						: 'Tout le monde peut voir votre profil et vos œuvres.'}
				</Text>
			</View>

			{/* Ventes & Paiements */}
			<View style={styles.section}>
				<Text style={[styles.title, { color: theme.colors.primary }]}>Ventes & Paiements</Text>
				
				{/* Stripe */}
				<View style={[styles.paymentCard, { backgroundColor: theme.colors.surface }]}>
					<View style={styles.row}>
						<Text style={[styles.label, { color: theme.colors.text }]}>Compte Stripe vendeur</Text>
						{stripeStatus === 'connected' ? (
							<Text style={{ color: theme.colors.success, fontWeight: 'bold' }}>✓ Connecté</Text>
						) : stripeStatus === 'loading' ? (
							<ActivityIndicator color={theme.colors.primary} />
						) : (
							<TouchableOpacity 
								style={[styles.connectButton, { backgroundColor: theme.colors.primary }]} 
								onPress={handleStripeConnect}
							>
								<Text style={styles.connectButtonText}>Connecter</Text>
							</TouchableOpacity>
						)}
					</View>
					<Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
						Connectez votre compte Stripe pour recevoir vos paiements de ventes de livres.
					</Text>
				</View>
				
				{/* PayPal */}
				<View style={[styles.paymentCard, { backgroundColor: theme.colors.surface, marginTop: 12 }]}>
					<View style={styles.row}>
						<Text style={[styles.label, { color: theme.colors.text }]}>Compte PayPal vendeur</Text>
						{paypalStatus === 'connected' ? (
							<Text style={{ color: theme.colors.success, fontWeight: 'bold' }}>✓ {paypalEmail}</Text>
						) : paypalStatus === 'loading' ? (
							<ActivityIndicator color={theme.colors.primary} />
						) : (
							<TouchableOpacity 
								style={[styles.connectButton, { backgroundColor: '#0070BA' }]} 
								onPress={handlePaypalConnect}
							>
								<Text style={styles.connectButtonText}>Connecter</Text>
							</TouchableOpacity>
						)}
					</View>
					<Text style={[styles.desc, { color: theme.colors.textSecondary }]}>
						Connectez votre compte PayPal pour recevoir vos paiements de ventes de livres.
					</Text>
				</View>
			</View>
			
			<View style={{ height: 60 }} />
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		padding: 20,
	},
	section: {
		marginBottom: 32,
	},
	title: { 
		fontSize: 22, 
		fontWeight: 'bold', 
		marginBottom: 8,
	},
	row: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		justifyContent: 'space-between',
	},
	label: { 
		fontSize: 16,
		fontWeight: '600',
	},
	desc: { 
		fontSize: 14, 
		marginTop: 8,
		lineHeight: 20,
	},
	
	// Thèmes
	themesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	themeCard: {
		width: '48%',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		gap: 8,
	},
	themeColorCircle: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	themeIcon: {
		fontSize: 28,
	},
	themeName: {
		fontSize: 14,
		fontWeight: '600',
		textAlign: 'center',
	},
	themeCheck: {
		position: 'absolute',
		top: 8,
		right: 8,
	},
	
	// Paiements
	paymentCard: {
		padding: 16,
		borderRadius: 12,
		gap: 8,
	},
	connectButton: {
		borderRadius: 16,
		paddingVertical: 8,
		paddingHorizontal: 18,
	},
	connectButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 14,
	},
});

export default SettingsScreen;
