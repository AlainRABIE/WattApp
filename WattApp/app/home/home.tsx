

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Image, useWindowDimensions, Platform, TouchableOpacity } from 'react-native';
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
	const [walletBalance, setWalletBalance] = useState<number>(0);

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

		return (
			<View key={item.id} style={isTablet ? styles.livreCardTablet : styles.livreCardHorizontal}>
				<View style={isTablet ? styles.livreImageBoxTablet : styles.livreImageBoxHorizontal}>
					<Image source={{ uri: couverture }} style={isTablet ? styles.livreImageTablet : styles.livreImageHorizontal} />
				</View>
				<Text style={styles.livreTitre}>{titre}</Text>
				<Text style={styles.livreAuteur}>par {auteur}</Text>
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
			}
			// fallback: look up in Firestore users collection where uid == user.uid
			try {
				const q = query(collection(db, 'users'), where('uid', '==', user.uid));
				const snap = await getDocs(q);
				if (!snap.empty) {
					const data = snap.docs[0].data();
					if (data && data.photoURL) setPhotoURL(data.photoURL);
					// Charger le solde du portefeuille
					if (data && typeof data.walletBalance === 'number') {
						setWalletBalance(data.walletBalance);
					} else {
						setWalletBalance(0);
					}
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
		<View style={{ flex: 1, backgroundColor: '#181818' }}>
			<StatusBar barStyle="light-content" />
			
			{/* Barre de navigation fixe en haut - RESTE TOUJOURS VISIBLE */}
			<View style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				height: Platform.OS === 'ios' ? 100 : 80,
				backgroundColor: '#181818',
				zIndex: 999,
				borderBottomWidth: 1,
				borderBottomColor: '#2a2a2a',
				paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight ?? 0) + 8,
				paddingHorizontal: 18,
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				shadowColor: '#000',
				shadowOpacity: 0.2,
				shadowOffset: { width: 0, height: 2 },
				shadowRadius: 8,
				elevation: 10
			}}>
				{/* Logo amis à gauche */}
				<TouchableOpacity 
					onPress={() => router.push('/friends')} 
					activeOpacity={0.8} 
					style={{ 
						backgroundColor: '#232323', 
						borderRadius: 22, 
						padding: 8,
						shadowColor: '#000',
						shadowOpacity: 0.3,
						shadowRadius: 4,
						elevation: 5
					}}
				>
					<Ionicons name="people" size={28} color="#FFA94D" />
				</TouchableOpacity>

				{/* Logo central WattApp */}
				<View style={{ alignItems: 'center' }}>
					<Text style={{
						color: '#FFA94D',
						fontSize: 24,
						fontWeight: 'bold',
						letterSpacing: 1,
						textShadowColor: '#000',
						textShadowOffset: { width: 0, height: 1 },
						textShadowRadius: 3
					}}>
						WattApp
					</Text>
				</View>

				{/* Section droite : Portefeuille + Avatar */}
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
					{/* Portefeuille */}
					<TouchableOpacity
						onPress={() => router.push('/wallet')}
						activeOpacity={0.8}
						style={{
							backgroundColor: '#232323',
							borderRadius: 20,
							paddingHorizontal: 12,
							paddingVertical: 6,
							flexDirection: 'row',
							alignItems: 'center',
							borderWidth: 1,
							borderColor: '#FFA94D',
							shadowColor: '#000',
							shadowOpacity: 0.3,
							shadowRadius: 4,
							elevation: 5
						}}
					>
						<Ionicons name="wallet-outline" size={18} color="#FFA94D" />
						<Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }}>
							{String(walletBalance.toFixed(2))}€
						</Text>
					</TouchableOpacity>

					{/* Avatar profil */}
					<TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8}>
						<Image
							source={{ uri: photoURL || avatarUrl }}
							style={{ 
								width: 40, 
								height: 40, 
								borderRadius: 20, 
								borderWidth: 2, 
								borderColor: '#FFA94D', 
								backgroundColor: '#232323'
							}}
							resizeMode="cover"
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Contenu scrollable avec marge pour éviter la barre fixe */}
			<ScrollView 
				style={{ flex: 1 }} 
				contentContainerStyle={{ 
					paddingTop: Platform.OS === 'ios' ? 120 : 100, 
					paddingBottom: 120 
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Carrousel principal */}
				<Text style={{ color: '#FFA94D', fontWeight: 'bold', fontSize: 20, marginTop: 28, marginLeft: 18, marginBottom: 8 }}>À la une</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 18, paddingRight: 18 }}>
					{(() => {
						if (loadingBooks) return <Text style={styles.placeholder}>Chargement...</Text>;
						if (books.length === 0) return <Text style={styles.placeholder}>Aucun livre trouvé.</Text>;
						// Utilisé pour éviter les doublons
						const usedIds = new Set();
						return books.map(livre => {
							if (usedIds.has(livre.id)) return null;
							usedIds.add(livre.id);
							return (
								<TouchableOpacity
									key={livre.id}
									style={{ width: 100, marginRight: 14 }}
									activeOpacity={0.8}
									onPress={() => router.push(`/book/${livre.id}`)}
								>
									<Image
										source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=128' }}
										style={{ width: 100, height: 150, borderRadius: 8, backgroundColor: '#232323' }}
										resizeMode="cover"
									/>
									{/* Badge de genre */}
									
									{/* Titre */}
									<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginTop: 8 }} numberOfLines={1}>{livre.title || 'Titre inconnu'}</Text>
									{/* Auteur et Prix */}
									<Text style={{ color: '#888', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
										par {livre.author || livre.auteur || 'Auteur inconnu'}
									</Text>
									{/* Tags */}
									{livre.tags && Array.isArray(livre.tags) && livre.tags.length > 0 && (
										<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
											{livre.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
												<View
													key={tagIndex}
													style={{
														backgroundColor: '#FFA94D',
														borderRadius: 8,
														paddingHorizontal: 6,
														paddingVertical: 2,
														marginRight: 4,
														marginBottom: 2,
													}}
												>
													<Text style={{ color: '#181818', fontSize: 10, fontWeight: 'bold' }}>
														{tag}
													</Text>
												</View>
											))}
											{livre.tags.length > 2 && (
												<Text style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
													+{livre.tags.length - 2}
												</Text>
											)}
										</View>
									)}
									{/* Prix */}
									<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
										<Text style={{ color: '#FFA94D', fontSize: 14, fontWeight: 'bold' }}>
											{livre.price && livre.price > 0 ? `${String(livre.price.toFixed(2))}€` : 'Gratuit'}
										</Text>
										<Text style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>👁️ {String(livre.reads || 0)}</Text>
									</View>
								</TouchableOpacity>
							);
						});
					})()}
				</ScrollView>

				{/* Section Explorer */}
				<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginTop: 28, marginLeft: 18, marginBottom: 8 }}>Explorer</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 18, paddingRight: 18 }}>
					{(() => {
						if (loadingBooks) return <Text style={styles.placeholder}>Chargement...</Text>;
						if (books.length === 0) return <Text style={styles.placeholder}>Aucun livre trouvé.</Text>;
						// Utilisé pour éviter les doublons
						const usedIds = new Set();
						return books.slice(0, 6).map(livre => {
							if (usedIds.has(livre.id)) return null;
							usedIds.add(livre.id);
							return (
								<TouchableOpacity
									key={livre.id + '-explore'}
									style={{ width: 80, marginRight: 10 }}
									activeOpacity={0.8}
									onPress={() => router.push(`/book/${livre.id}`)}
								>
									<Image
										source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=128' }}
										style={{ width: 80, height: 120, borderRadius: 8, backgroundColor: '#232323' }}
										resizeMode="cover"
									/>
									<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginTop: 6 }} numberOfLines={2}>{livre.title || 'Titre inconnu'}</Text>
									{/* Auteur et Prix */}
									<Text style={{ color: '#888', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
										par {livre.author || livre.auteur || 'Auteur inconnu'}
									</Text>
									{/* Tags */}
									{livre.tags && Array.isArray(livre.tags) && livre.tags.length > 0 && (
										<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
											<View
												style={{
													backgroundColor: '#FFA94D',
													borderRadius: 6,
													paddingHorizontal: 4,
													paddingVertical: 1,
													marginRight: 3,
												}}
											>
												<Text style={{ color: '#181818', fontSize: 9, fontWeight: 'bold' }}>
													{livre.tags[0]}
												</Text>
											</View>
											{livre.tags.length > 1 && (
												<Text style={{ color: '#888', fontSize: 9, marginTop: 1 }}>
													+{livre.tags.length - 1}
												</Text>
											)}
										</View>
									)}
									<Text style={{ color: '#FFA94D', fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>
										{livre.price && livre.price > 0 ? `${String(livre.price.toFixed(2))}€` : 'Gratuit'}
									</Text>
								</TouchableOpacity>
							);
						});
					})()}
				</ScrollView>

				{/* Section Vos auteurs suivis */}
				<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginTop: 28, marginLeft: 18, marginBottom: 8 }}>Vos auteurs suivis</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 18, paddingRight: 18 }}>
					{(() => {
						if (loadingBooks) return <Text style={styles.placeholder}>Chargement...</Text>;
						if (books.length === 0) return <Text style={styles.placeholder}>Aucun livre trouvé.</Text>;
						// Utilisé pour éviter les doublons
						const usedIds = new Set();
						return books.slice(3, 9).map(livre => {
							if (usedIds.has(livre.id)) return null;
							usedIds.add(livre.id);
							return (
								<TouchableOpacity
									key={livre.id + '-auteur'}
									style={{ width: 80, marginRight: 10 }}
									activeOpacity={0.8}
									onPress={() => router.push(`/book/${livre.id}`)}
								>
									<Image
										source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=128' }}
										style={{ width: 80, height: 120, borderRadius: 8, backgroundColor: '#232323' }}
										resizeMode="cover"
									/>
									<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginTop: 6 }} numberOfLines={2}>{livre.title || 'Titre inconnu'}</Text>
									{/* Auteur et Prix */}
									<Text style={{ color: '#888', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
										par {livre.author || livre.auteur || 'Auteur inconnu'}
									</Text>
									{/* Tags */}
									{livre.tags && Array.isArray(livre.tags) && livre.tags.length > 0 && (
										<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 }}>
											<View
												style={{
													backgroundColor: '#FFA94D',
													borderRadius: 6,
													paddingHorizontal: 4,
													paddingVertical: 1,
													marginRight: 3,
												}}
											>
												<Text style={{ color: '#181818', fontSize: 9, fontWeight: 'bold' }}>
													{livre.tags[0]}
												</Text>
											</View>
											{livre.tags.length > 1 && (
												<Text style={{ color: '#888', fontSize: 9, marginTop: 1 }}>
													+{livre.tags.length - 1}
												</Text>
											)}
										</View>
									)}
									<Text style={{ color: '#FFA94D', fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>
										{livre.price && livre.price > 0 ? `${String(livre.price.toFixed(2))}€` : 'Gratuit'}
									</Text>
								</TouchableOpacity>
							);
						});
					})()}
				</ScrollView>
			</ScrollView>
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
