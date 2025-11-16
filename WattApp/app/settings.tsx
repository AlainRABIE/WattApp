
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SettingsScreen: React.FC = () => {
	const [isPrivate, setIsPrivate] = useState<boolean>(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchPrivacy = async () => {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) return;
				const userRef = doc(db, 'users', user.uid);
				const userSnap = await getDoc(userRef);
				if (userSnap.exists()) {
					setIsPrivate(!!userSnap.data().isPrivate);
				}
			} catch (e) {
				// ignore
			} finally {
				setLoading(false);
			}
		};
		fetchPrivacy();
	}, []);

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
