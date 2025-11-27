
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';


const SettingsScreen: React.FC = () => {
	const [isPrivate, setIsPrivate] = useState<boolean>(false);
	const [loading, setLoading] = useState(true);
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
		<View style={styles.container}>
			<Text style={styles.title}>Confidentialité du compte</Text>
			<View style={styles.row}>
				<Text style={styles.label}>Compte privé (comme Instagram)</Text>
				<Switch
					value={isPrivate}
					onValueChange={handleToggle}
					disabled={loading}
				/>
			</View>
			<Text style={styles.desc}>
				{isPrivate
					? 'Seuls vos abonnés peuvent voir votre profil et vos œuvres.'
					: 'Tout le monde peut voir votre profil et vos œuvres.'}
			</Text>

			{/* Stripe Connect */}
			<View style={{ marginTop: 40 }}>
				<Text style={styles.title}>Ventes & Paiements</Text>
				{/* Stripe */}
				<View style={styles.row}>
					<Text style={styles.label}>Compte Stripe vendeur</Text>
					{stripeStatus === 'connected' ? (
						<Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Connecté</Text>
					) : stripeStatus === 'loading' ? (
						<ActivityIndicator color="#FFA94D" />
					) : (
						<TouchableOpacity style={{ backgroundColor: '#FFA94D', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 18 }} onPress={handleStripeConnect}>
							<Text style={{ color: '#181818', fontWeight: 'bold' }}>Connecter Stripe</Text>
						</TouchableOpacity>
					)}
				</View>
				<Text style={styles.desc}>
					Connectez votre compte Stripe pour recevoir vos paiements de ventes de livres.
				</Text>
				{/* PayPal */}
				<View style={styles.row}>
					<Text style={styles.label}>Compte PayPal vendeur</Text>
					{paypalStatus === 'connected' ? (
						<Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>{paypalEmail}</Text>
					) : paypalStatus === 'loading' ? (
						<ActivityIndicator color="#FFA94D" />
					) : (
						<TouchableOpacity style={{ backgroundColor: '#0070BA', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 18 }} onPress={handlePaypalConnect}>
							<Text style={{ color: '#fff', fontWeight: 'bold' }}>Connecter PayPal</Text>
						</TouchableOpacity>
					)}
				</View>
				<Text style={styles.desc}>
					Connectez votre compte PayPal pour recevoir vos paiements de ventes de livres.
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#181818', padding: 24 },
	title: { color: '#FFA94D', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
	row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
	label: { color: '#fff', fontSize: 16 },
	desc: { color: '#aaa', fontSize: 14, marginTop: 12 },
});

export default SettingsScreen;
