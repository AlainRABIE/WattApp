

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Home: React.FC = () => {
	const router = useRouter();
	// helper to open explore
	const openExplore = () => (router as any).push('/explore');

	// State pour les livres dynamiques
	const [books, setBooks] = useState<any[]>([]);
	const [loadingBooks, setLoadingBooks] = useState(true);
	const [email, setEmail] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [photoURL, setPhotoURL] = useState<string | null>(null);

	// compute a fallback avatar URL based on the loaded user name so Home matches Profile
	const nameForAvatar = (displayName || email || 'User') as string;
	const avatarLen = nameForAvatar.trim().includes(' ') ? 2 : 1;
	const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&length=${avatarLen}&background=FFA94D&color=181818&size=128`;

	const { width, height } = useWindowDimensions();
	// treat as tablet when the longest side is >= 768
	const isTablet = Math.max(width, height) >= 768;

	// Avatar placement: compute top offset so the avatar stays fixed below the status bar
	const avatarSize = 48; // size of the fixed profile circle
	const topOffset = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 0) + 8;
	const contentPaddingTop = topOffset + avatarSize + 12; // keep content from being hidden under avatar

	const renderBookItem = (item: any) => {
		// Champs Firestore adaptés : title, coverImage
		let couverture = item.coverImage;
		if (couverture && typeof couverture === 'object' && couverture.uri) {
			couverture = couverture.uri;
		}
		if (!couverture || typeof couverture !== 'string' || couverture.trim() === '') {
			couverture = 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=128';
		}
		const titre = item.title || 'Titre inconnu';
		// Pas de champ auteur dans Firestore, on affiche "Auteur inconnu"
		const auteur = item.auteur || 'Auteur inconnu';
		const tags = Array.isArray(item.tags) ? item.tags : [];
		return (
			<View key={item.id} style={isTablet ? styles.livreCardTablet : styles.livreCardHorizontal}>
				<View style={isTablet ? styles.livreImageBoxTablet : styles.livreImageBoxHorizontal}>
					<Image source={{ uri: couverture }} style={isTablet ? styles.livreImageTablet : styles.livreImageHorizontal} />
				</View>
				<Text style={styles.livreTitre}>{titre}</Text>
				<Text style={styles.livreAuteur}>par {auteur}</Text>
				<View style={styles.tagsRow}>
					{tags.map((tag: string) => (
						<View key={tag} style={styles.tagBox}>
							<Text style={styles.tagText}>{tag}</Text>
						</View>
					))}
				</View>
			</View>
		);
	};

	useEffect(() => {
		const loadProfile = async () => {
			const auth = getAuth(app);
			const user = auth.currentUser;
			if (!user) return;
			setEmail(user.email || '');
			setDisplayName(user.displayName || '');
			if (user.photoURL) {
				setPhotoURL(user.photoURL);
				return;
			}
			// fallback: look up in Firestore users collection where uid == user.uid
			try {
				const q = query(collection(db, 'users'), where('uid', '==', user.uid));
				const snap = await getDocs(q);
				if (!snap.empty) {
					const data = snap.docs[0].data();
					if (data && data.photoURL) setPhotoURL(data.photoURL);
				}
			} catch (err) {
				console.warn('Failed to fetch user photo from Firestore', err);
			}
		};

		const loadBooks = async () => {
			try {
				const booksSnap = await getDocs(collection(db, 'books'));
				const booksList = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				setBooks(booksList);
			} catch (err) {
				console.warn('Erreur lors du chargement des livres', err);
			} finally {
				setLoadingBooks(false);
			}
		};

		loadProfile();
		loadBooks();
	}, []);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" />
			{/* Section Livres dynamiques */}
			<Text style={styles.sectionTitle}>Livres disponibles</Text>
			<View style={[styles.sectionBox, isTablet && styles.sectionBoxTablet]}>
				{loadingBooks ? (
					<Text>Chargement...</Text>
				) : books.length === 0 ? (
					<Text>Aucun livre trouvé.</Text>
				) : (
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{books.map(livre => renderBookItem(livre))}
					</ScrollView>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
				avatar: {
					width: 50,
					height: 50,
					borderRadius: 25,
					borderWidth: 2,
					borderColor: '#FFA94D',
					backgroundColor: '#181818',
				},
	tagsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		marginTop: 4,
	},
	tagBox: {
		backgroundColor: '#181818',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 2,
		marginHorizontal: 2,
		marginVertical: 2,
		borderWidth: 1,
		borderColor: '#FFA94D',
	},
	tagText: {
		color: '#FFA94D',
		fontSize: 12,
		fontWeight: 'bold',
	},
		livreCardHorizontal: {
			marginRight: 18,
			width: 120,
			alignItems: 'center',
		},
	livreImageBoxHorizontal: {
		width: 80,
		height: 120,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#181818',
		marginBottom: 8,
	},
	livreImageHorizontal: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	livreCard: {
		backgroundColor: '#232323',
		borderRadius: 10,
		padding: 10,
		marginBottom: 12,
		width: '100%',
		elevation: 2,
	},
	livreRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	livreImageBox: {
		width: 60,
		height: 90,
		borderRadius: 8,
		overflow: 'hidden',
		marginRight: 16,
		backgroundColor: '#181818',
	},
	livreImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	livreInfo: {
		flex: 1,
		justifyContent: 'center',
	},
	livreTitre: {
		color: '#FFA94D',
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 4,
	},
	livreAuteur: {
		color: '#fff',
		fontSize: 15,
	},
	container: {
		flex: 1,
		backgroundColor: '#181818',
	},
	header: {
		paddingTop: 50,
		paddingBottom: 30,
		backgroundColor: '#181818',
		alignItems: 'center',
	},
	headerText: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#fff',
	},
	content: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		paddingTop: 120, // leave more space for fixed avatar/header overlay
	},
	button: {
		backgroundColor: '#FFA94D',
		paddingVertical: 18,
		borderRadius: 10,
		width: '90%',
		alignItems: 'center',
		marginBottom: 18,
		elevation: 2,
	},
	buttonText: {
		color: '#181818',
		fontSize: 20,
		fontWeight: 'bold',
	},
	buttonSecondary: {
		backgroundColor: '#232323',
		paddingVertical: 18,
		borderRadius: 10,
		width: '90%',
		alignItems: 'center',
		marginBottom: 18,
		borderWidth: 2,
		borderColor: '#FFA94D',
	},
	buttonTextSecondary: {
		color: '#FFA94D',
		fontSize: 20,
		fontWeight: 'bold',
	},
	infoBox: {
		backgroundColor: '#232323',
		borderRadius: 10,
		padding: 18,
		width: '90%',
		marginTop: 30,
		alignItems: 'center',
	},
			infoText: {
				color: '#FFA94D',
				fontSize: 16,
				marginBottom: 8,
			},
			sectionTitle: {
				fontSize: 22,
				fontWeight: 'bold',
				color: '#FFA94D',
				marginTop: 18,
				marginBottom: 8,
				alignSelf: 'flex-start',
			},
			sectionBox: {
				backgroundColor: '#232323',
				borderRadius: 10,
				padding: 16,
				width: '100%',
				marginBottom: 10,
				minHeight: 60,
			},
			placeholder: {
				color: '#888',
				fontSize: 16,
				fontStyle: 'italic',
			},
			livreCardTablet: {
				marginRight: 24,
				width: 180,
				alignItems: 'flex-start',
			},
			livreImageBoxTablet: {
				width: 140,
				height: 200,
				borderRadius: 10,
				overflow: 'hidden',
				backgroundColor: '#181818',
				marginBottom: 12,
			},
			livreImageTablet: {
				width: '100%',
				height: '100%',
				resizeMode: 'cover',
			},
			sectionBoxTablet: {
				padding: 24,
				borderRadius: 14,
			},
			userButtonContainer: {
				position: 'absolute',
				top: 80,
				right: 12,
				zIndex: 120,
			},
			userButtonImage: {
				width: 44,
				height: 44,
				borderRadius: 22,
				borderWidth: 2,
				borderColor: '#FFA94D',
				backgroundColor: '#181818',
			},
});

export default Home;
