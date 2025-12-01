import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Image, useWindowDimensions, Platform, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import app, { db } from '../../constants/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Home: React.FC = () => {
	const router = useRouter();
	const [books, setBooks] = useState<any[]>([]);
	const [loadingBooks, setLoadingBooks] = useState(true);
	const [email, setEmail] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [photoURL, setPhotoURL] = useState<string | null>(null);
	const [walletBalance, setWalletBalance] = useState<number>(0);
	const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
	const heroScrollRef = useRef<ScrollView>(null);
	const nameForAvatar = (displayName || email || 'User') as string;
	const avatarLen = nameForAvatar.trim().includes(' ') ? 2 : 1;
	const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&length=${avatarLen}&background=FFA94D&color=181818&size=128`;
	const { width, height } = useWindowDimensions();
	const isTablet = Math.max(width, height) >= 768;

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
			try {
				const q = query(collection(db, 'users'), where('uid', '==', user.uid));
				const snap = await getDocs(q);
				if (!snap.empty) {
					const data = snap.docs[0].data();
					if (data && data.photoURL) setPhotoURL(data.photoURL);
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
				const filteredBooks = booksList.filter((book: any) => book.status !== 'imported');
				setBooks(filteredBooks);
			} catch (err) {
				console.warn('Erreur lors du chargement des livres', err);
			} finally {
				setLoadingBooks(false);
			}
		};

		loadProfile();
		loadBooks();
	}, []);

	// Auto-scroll pour le carrousel hero
	useEffect(() => {
		if (books.length <= 1) return;

		const interval = setInterval(() => {
			setCurrentHeroIndex((prevIndex) => {
				const nextIndex = (prevIndex + 1) % Math.min(books.length, 5);
				heroScrollRef.current?.scrollTo({
					x: nextIndex * (SCREEN_WIDTH - 40),
					animated: true,
				});
				return nextIndex;
			});
		}, 4000); // Change toutes les 4 secondes

		return () => clearInterval(interval);
	}, [books.length]);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" />
			
			{/* Header */}
			<View style={styles.header}>
				<View>
					<Text style={styles.greeting}>Bonjour,</Text>
					<Text style={styles.username}>{displayName || email?.split('@')[0] || 'Lecteur'}</Text>
				</View>
				<View style={styles.headerRight}>
					<TouchableOpacity onPress={() => router.push('/wallet')} style={styles.walletButton}>
						<Ionicons name="wallet" size={20} color="#FFA94D" />
						<Text style={styles.walletText}>{walletBalance.toFixed(0)}€</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => router.push('/profile')}>
						<Image source={{ uri: photoURL || avatarUrl }} style={styles.avatar} />
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Carrousel en vedette */}
				{books.length > 0 && (
					<View style={styles.heroSection}>
						<ScrollView 
							ref={heroScrollRef}
							horizontal 
							pagingEnabled
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.heroCarousel}
							onMomentumScrollEnd={(event) => {
								const index = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
								setCurrentHeroIndex(index);
							}}
						>
							{books.slice(0, 5).map((livre) => (
								<TouchableOpacity 
									key={livre.id}
									style={styles.heroCard}
									onPress={() => router.push(`/book/${livre.id}`)}
									activeOpacity={0.95}
								>
									<Image
										source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=512' }}
										style={styles.heroImage}
										blurRadius={20}
									/>
									<View style={styles.heroOverlay}>
										<View style={styles.heroContent}>
											<Image
												source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=512' }}
												style={styles.heroCover}
											/>
											<View style={styles.heroInfo}>
												<View style={styles.heroBadge}>
													<Ionicons name="flame" size={10} color="#FF6B35" />
													<Text style={styles.heroBadgeText}>EN VEDETTE</Text>
												</View>
												<Text style={styles.heroTitle} numberOfLines={2}>{livre.title}</Text>
												<Text style={styles.heroAuthor}>{livre.author || livre.auteur || 'Auteur inconnu'}</Text>
												<View style={styles.heroMeta}>
													<View style={styles.heroMetaItem}>
														<Ionicons name="eye" size={12} color="#aaa" />
														<Text style={styles.heroMetaText}>{livre.reads || 0}</Text>
													</View>
													{livre.tags && livre.tags[0] && (
														<Text style={styles.heroGenre}>• {livre.tags[0]}</Text>
													)}
												</View>
												<TouchableOpacity style={styles.heroButton}>
													<Text style={styles.heroButtonText}>
														{livre.price && livre.price > 0 ? `${livre.price.toFixed(2)}€` : 'Gratuit'}
													</Text>
													<Ionicons name="arrow-forward-circle" size={18} color="#FFA94D" />
												</TouchableOpacity>
											</View>
										</View>
									</View>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				)}

				{/* Section Continuer la lecture */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Populaires</Text>
						<TouchableOpacity onPress={() => router.push('/explore')}>
							<Text style={styles.seeAll}>Voir tout</Text>
						</TouchableOpacity>
					</View>
					<ScrollView 
						horizontal 
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.horizontalScroll}
					>
						{books.slice(5, 12).map((livre) => (
							<TouchableOpacity
								key={livre.id}
								style={styles.bookCard}
								onPress={() => router.push(`/book/${livre.id}`)}
								activeOpacity={0.9}
							>
								<Image
									source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=256' }}
									style={styles.bookCover}
								/>
								<View style={styles.bookInfo}>
									<Text style={styles.bookTitle} numberOfLines={2}>{livre.title}</Text>
									<Text style={styles.bookAuthor} numberOfLines={1}>{livre.author || livre.auteur || 'Auteur'}</Text>
									<View style={styles.bookFooter}>
										<Text style={styles.bookPrice}>
											{livre.price && livre.price > 0 ? `${livre.price.toFixed(2)}€` : 'Gratuit'}
										</Text>
										{livre.reads > 0 && (
											<View style={styles.bookReads}>
												<Ionicons name="eye-outline" size={12} color="#666" />
												<Text style={styles.bookReadsText}>{livre.reads}</Text>
											</View>
										)}
									</View>
								</View>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* Section Nouveautés */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Nouveautés</Text>
						<TouchableOpacity onPress={() => router.push('/explore')}>
							<Text style={styles.seeAll}>Voir tout</Text>
						</TouchableOpacity>
					</View>
					<ScrollView 
						horizontal 
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.horizontalScroll}
					>
						{books.slice(12, 19).map((livre) => (
							<TouchableOpacity
								key={livre.id}
								style={styles.bookCard}
								onPress={() => router.push(`/book/${livre.id}`)}
								activeOpacity={0.9}
							>
								<Image
									source={{ uri: livre.coverImage || 'https://ui-avatars.com/api/?name=Livre&background=FFA94D&color=181818&size=256' }}
									style={styles.bookCover}
								/>
								<View style={styles.bookInfo}>
									<Text style={styles.bookTitle} numberOfLines={2}>{livre.title}</Text>
									<Text style={styles.bookAuthor} numberOfLines={1}>{livre.author || livre.auteur || 'Auteur'}</Text>
									<View style={styles.bookFooter}>
										<Text style={styles.bookPrice}>
											{livre.price && livre.price > 0 ? `${livre.price.toFixed(2)}€` : 'Gratuit'}
										</Text>
										{livre.reads > 0 && (
											<View style={styles.bookReads}>
												<Ionicons name="eye-outline" size={12} color="#666" />
												<Text style={styles.bookReadsText}>{livre.reads}</Text>
											</View>
										)}
									</View>
								</View>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* Genres */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Explorer par genre</Text>
					<View style={styles.genresGrid}>
						{[
							{ name: 'Romance', icon: 'heart', color: '#FF6B9D' },
							{ name: 'Fantaisie', icon: 'sparkles', color: '#9B59B6' },
							{ name: 'Thriller', icon: 'flash', color: '#E74C3C' },
							{ name: 'Science-Fiction', icon: 'rocket', color: '#3498DB' },
						].map((genre) => (
							<TouchableOpacity
								key={genre.name}
								style={styles.genreCard}
								onPress={() => router.push('/explore')}
								activeOpacity={0.8}
							>
								<Ionicons name={genre.icon as any} size={24} color={genre.color} />
								<Text style={styles.genreName}>{genre.name}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				<View style={{ height: 120 }} />
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: Platform.OS === 'ios' ? 60 : 20,
		paddingBottom: 16,
	},
	greeting: {
		fontSize: 14,
		color: '#888',
		marginBottom: 2,
	},
	username: {
		fontSize: 22,
		fontWeight: '700',
		color: '#fff',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
	},
	walletButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#111',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#222',
	},
	walletText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 2,
		borderColor: '#222',
	},
	content: {
		flex: 1,
	},
	
	// Hero carousel section
	heroSection: {
		marginTop: 12,
		marginBottom: 24,
	},
	heroCarousel: {
		paddingHorizontal: 20,
	},
	heroCard: {
		width: SCREEN_WIDTH - 40,
		height: 200,
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: '#111',
		marginRight: 16,
	},
	heroImage: {
		width: '100%',
		height: '100%',
		position: 'absolute',
	},
	heroOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		padding: 14,
		justifyContent: 'flex-end',
	},
	heroContent: {
		flexDirection: 'row',
		gap: 12,
	},
	heroCover: {
		width: 100,
		height: 150,
		borderRadius: 8,
		backgroundColor: '#222',
	},
	heroInfo: {
		flex: 1,
		justifyContent: 'center',
		gap: 5,
	},
	heroBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: 'rgba(255, 107, 53, 0.15)',
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 10,
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderColor: 'rgba(255, 107, 53, 0.3)',
	},
	heroBadgeText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#FF6B35',
		letterSpacing: 0.5,
	},
	heroTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#fff',
	},
	heroAuthor: {
		fontSize: 12,
		color: '#ccc',
	},
	heroMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
	},
	heroMetaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
	},
	heroMetaText: {
		fontSize: 11,
		color: '#aaa',
	},
	heroGenre: {
		fontSize: 11,
		color: '#aaa',
	},
	heroButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 6,
	},
	heroButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#FFA94D',
	},

	// Sections
	section: {
		marginTop: 28,
		paddingHorizontal: 20,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 14,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#fff',
	},
	seeAll: {
		fontSize: 13,
		color: '#FFA94D',
		fontWeight: '600',
	},

	// Horizontal scroll
	horizontalScroll: {
		gap: 14,
		paddingRight: 20,
	},
	bookCard: {
		width: 140,
	},
	bookCover: {
		width: 140,
		height: 210,
		borderRadius: 10,
		backgroundColor: '#111',
		marginBottom: 8,
	},
	bookInfo: {
		gap: 3,
	},
	bookTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#fff',
	},
	bookAuthor: {
		fontSize: 11,
		color: '#888',
		marginBottom: 4,
	},
	bookFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	bookPrice: {
		fontSize: 12,
		fontWeight: '600',
		color: '#FFA94D',
	},
	bookReads: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
	},
	bookReadsText: {
		fontSize: 10,
		color: '#666',
	},

	// Grid
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	gridItem: {
		width: (SCREEN_WIDTH - 52) / 3,
	},
	gridCover: {
		width: '100%',
		height: 120,
		borderRadius: 8,
		backgroundColor: '#111',
		marginBottom: 6,
	},
	gridTitle: {
		fontSize: 11,
		fontWeight: '600',
		color: '#fff',
		marginBottom: 2,
	},
	gridAuthor: {
		fontSize: 10,
		color: '#888',
	},

	// Genres
	genresGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	genreCard: {
		width: (SCREEN_WIDTH - 52) / 2,
		backgroundColor: '#111',
		borderRadius: 12,
		padding: 18,
		alignItems: 'center',
		gap: 10,
		borderWidth: 1,
		borderColor: '#222',
	},
	genreName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
	},
});

export default Home;
