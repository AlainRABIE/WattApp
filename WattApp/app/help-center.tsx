import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useRouter } from 'expo-router';

interface FAQItem {
	id: string;
	question: string;
	answer: string;
	category: string;
}

interface GuideItem {
	id: string;
	title: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	color: string;
}

const HelpCenterScreen: React.FC = () => {
	const { theme } = useTheme();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string>('all');
	const [contactSubject, setContactSubject] = useState('');
	const [contactMessage, setContactMessage] = useState('');

	// FAQ Data
	const faqData: FAQItem[] = [
		{
			id: '1',
			category: 'account',
			question: 'Comment créer un compte ?',
			answer: 'Pour créer un compte, appuyez sur "S\'inscrire" depuis l\'écran d\'accueil. Entrez votre email, choisissez un nom d\'utilisateur et créez un mot de passe sécurisé. Validez votre email pour activer votre compte.'
		},
		{
			id: '2',
			category: 'account',
			question: 'Comment réinitialiser mon mot de passe ?',
			answer: 'Sur l\'écran de connexion, cliquez sur "Mot de passe oublié". Entrez votre adresse email et suivez les instructions reçues par email pour réinitialiser votre mot de passe.'
		},
		{
			id: '3',
			category: 'premium',
			question: 'Quels sont les avantages Premium ?',
			answer: 'Le compte Premium vous offre : téléchargement illimité de livres, accès anticipé aux nouveautés, badge Premium sur votre profil, support prioritaire, et téléchargement automatique des mises à jour.'
		},
		{
			id: '4',
			category: 'premium',
			question: 'Comment passer à Premium ?',
			answer: 'Accédez à votre Portefeuille depuis le menu principal, puis sélectionnez "Devenir Premium". Choisissez votre formule (mensuelle ou annuelle) et suivez les étapes de paiement sécurisé.'
		},
		{
			id: '5',
			category: 'books',
			question: 'Comment télécharger un livre ?',
			answer: 'Ouvrez la page du livre souhaité et appuyez sur le bouton "Télécharger". Les utilisateurs gratuits peuvent télécharger jusqu\'à 2 livres. Les membres Premium ont un accès illimité.'
		},
		{
			id: '6',
			category: 'books',
			question: 'Où trouver mes livres téléchargés ?',
			answer: 'Tous vos livres téléchargés sont disponibles dans votre Bibliothèque. Accédez-y depuis le menu principal, puis sélectionnez l\'onglet "Téléchargés".'
		},
		{
			id: '7',
			category: 'writing',
			question: 'Comment publier mon histoire ?',
			answer: 'Allez dans "Écrire" depuis le menu principal. Créez une nouvelle histoire, rédigez votre texte avec notre éditeur avancé, ajoutez une couverture et des tags, puis publiez. Votre histoire sera visible par la communauté.'
		},
		{
			id: '8',
			category: 'writing',
			question: 'Puis-je monétiser mes histoires ?',
			answer: 'Oui ! Connectez votre compte Stripe ou PayPal dans les Paramètres > Paiements. Vous pourrez ensuite définir un prix pour vos histoires et recevoir des paiements directement.'
		},
		{
			id: '9',
			category: 'community',
			question: 'Comment rejoindre une communauté ?',
			answer: 'Explorez les communautés disponibles dans l\'onglet "Communauté". Choisissez une catégorie qui vous intéresse et appuyez sur "Rejoindre" pour participer aux discussions.'
		},
		{
			id: '10',
			category: 'privacy',
			question: 'Comment rendre mon compte privé ?',
			answer: 'Allez dans Paramètres > Compte et activez l\'option "Compte privé". Seuls vos abonnés approuvés pourront voir votre profil et vos publications.'
		}
	];

	// Guides rapides
	const guides: GuideItem[] = [
		{
			id: '1',
			title: 'Guide de démarrage',
			description: 'Découvrez les bases de WattApp',
			icon: 'rocket-outline',
			color: '#FF6B35'
		},
		{
			id: '2',
			title: 'Écrire une histoire',
			description: 'Apprenez à publier votre premier livre',
			icon: 'create-outline',
			color: '#4ECDC4'
		},
		{
			id: '3',
			title: 'Gagner de l\'argent',
			description: 'Monétisez vos créations',
			icon: 'cash-outline',
			color: '#FFD93D'
		},
		{
			id: '4',
			title: 'Sécurité du compte',
			description: 'Protégez votre compte',
			icon: 'shield-checkmark-outline',
			color: '#6BCF7F'
		}
	];

	const categories = [
		{ id: 'all', label: 'Tout', icon: 'apps-outline' },
		{ id: 'account', label: 'Compte', icon: 'person-outline' },
		{ id: 'premium', label: 'Premium', icon: 'star-outline' },
		{ id: 'books', label: 'Livres', icon: 'book-outline' },
		{ id: 'writing', label: 'Écriture', icon: 'create-outline' },
		{ id: 'community', label: 'Communauté', icon: 'people-outline' },
		{ id: 'privacy', label: 'Confidentialité', icon: 'lock-closed-outline' }
	];

	const filteredFAQ = faqData.filter(item => {
		const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
		const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
							  item.answer.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	const handleSendMessage = () => {
		if (!contactSubject.trim() || !contactMessage.trim()) {
			Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
			return;
		}

		// Simuler l'envoi
		Alert.alert(
			'Message envoyé',
			'Nous avons bien reçu votre message. Notre équipe vous répondra dans les 24-48 heures.',
			[{ text: 'OK', onPress: () => {
				setContactSubject('');
				setContactMessage('');
			}}]
		);
	};

	const styles = getStyles(theme);

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" />
			
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color={theme.colors.text} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Centre d'aide</Text>
			</View>

			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				{/* Search Bar */}
				<View style={styles.searchSection}>
					<View style={styles.searchBar}>
						<Ionicons name="search" size={20} color={theme.colors.textSecondary} />
						<TextInput
							style={styles.searchInput}
							placeholder="Rechercher une question..."
							placeholderTextColor={theme.colors.textSecondary}
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Guides rapides */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Guides rapides</Text>
					<View style={styles.guidesGrid}>
						{guides.map(guide => (
							<TouchableOpacity 
								key={guide.id} 
								style={styles.guideCard}
								activeOpacity={0.7}
							>
								<View style={[styles.guideIcon, { backgroundColor: guide.color + '20' }]}>
									<Ionicons name={guide.icon} size={24} color={guide.color} />
								</View>
								<Text style={styles.guideTitle}>{guide.title}</Text>
								<Text style={styles.guideDescription}>{guide.description}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Catégories FAQ */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Questions fréquentes</Text>
					<ScrollView 
						horizontal 
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.categoriesContainer}
					>
						{categories.map(cat => (
							<TouchableOpacity
								key={cat.id}
								style={[
									styles.categoryChip,
									selectedCategory === cat.id && styles.categoryChipActive
								]}
								onPress={() => setSelectedCategory(cat.id)}
							>
								<Ionicons 
									name={cat.icon as any} 
									size={16} 
									color={selectedCategory === cat.id ? theme.colors.primary : theme.colors.textSecondary} 
								/>
								<Text style={[
									styles.categoryChipText,
									selectedCategory === cat.id && styles.categoryChipTextActive
								]}>
									{cat.label}
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>

				{/* FAQ List */}
				<View style={styles.faqSection}>
					{filteredFAQ.length > 0 ? (
						filteredFAQ.map((item, index) => (
							<View key={item.id}>
								<TouchableOpacity
									style={styles.faqItem}
									onPress={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
									activeOpacity={0.7}
								>
									<View style={styles.faqQuestion}>
										<Text style={styles.faqQuestionText}>{item.question}</Text>
										<Ionicons 
											name={expandedFAQ === item.id ? "chevron-up" : "chevron-down"} 
											size={20} 
											color={theme.colors.textSecondary} 
										/>
									</View>
									{expandedFAQ === item.id && (
										<Text style={styles.faqAnswer}>{item.answer}</Text>
									)}
								</TouchableOpacity>
								{index < filteredFAQ.length - 1 && <View style={styles.faqSeparator} />}
							</View>
						))
					) : (
						<View style={styles.emptyState}>
							<Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
							<Text style={styles.emptyStateText}>Aucune question trouvée</Text>
							<Text style={styles.emptyStateSubtext}>
								Essayez avec d'autres mots-clés
							</Text>
						</View>
					)}
				</View>

				{/* Contact Support */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Nous contacter</Text>
					<View style={styles.contactCard}>
						<Text style={styles.contactDescription}>
							Vous n'avez pas trouvé de réponse ? Envoyez-nous un message.
						</Text>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Sujet</Text>
							<TextInput
								style={styles.input}
								placeholder="Ex: Problème de paiement"
								placeholderTextColor={theme.colors.textSecondary}
								value={contactSubject}
								onChangeText={setContactSubject}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>Message</Text>
							<TextInput
								style={[styles.input, styles.textArea]}
								placeholder="Décrivez votre problème en détail..."
								placeholderTextColor={theme.colors.textSecondary}
								value={contactMessage}
								onChangeText={setContactMessage}
								multiline
								numberOfLines={5}
								textAlignVertical="top"
							/>
						</View>

						<TouchableOpacity 
							style={styles.sendButton}
							onPress={handleSendMessage}
						>
							<Ionicons name="send" size={18} color="#fff" />
							<Text style={styles.sendButtonText}>Envoyer le message</Text>
						</TouchableOpacity>

						{/* Contact alternatif */}
						<View style={styles.alternativeContact}>
							<Text style={styles.alternativeContactTitle}>Autres moyens de contact</Text>
							
							<TouchableOpacity 
								style={styles.contactMethod}
								onPress={() => Linking.openURL('mailto:support@wattapp.com')}
							>
								<View style={styles.contactMethodLeft}>
									<View style={[styles.contactMethodIcon, { backgroundColor: '#EA4335' + '20' }]}>
										<Ionicons name="mail-outline" size={20} color="#EA4335" />
									</View>
									<Text style={styles.contactMethodText}>support@wattapp.com</Text>
								</View>
								<Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
							</TouchableOpacity>

							<TouchableOpacity 
								style={styles.contactMethod}
								onPress={() => Linking.openURL('https://twitter.com/wattapp')}
							>
								<View style={styles.contactMethodLeft}>
									<View style={[styles.contactMethodIcon, { backgroundColor: '#1DA1F2' + '20' }]}>
										<Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
									</View>
									<Text style={styles.contactMethodText}>@wattapp</Text>
								</View>
								<Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
							</TouchableOpacity>
						</View>
					</View>
				</View>

				<View style={{ height: 60 }} />
			</ScrollView>
		</View>
	);
};

const getStyles = (theme: any) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},

	// Header
	header: {
		paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
		paddingBottom: 20,
		paddingHorizontal: 24,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
		borderBottomWidth: 0.5,
		borderBottomColor: theme.colors.border,
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

	scrollView: {
		flex: 1,
	},

	// Search
	searchSection: {
		paddingHorizontal: 24,
		paddingVertical: 20,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		paddingHorizontal: 16,
		height: 48,
		gap: 12,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: theme.colors.text,
	},

	// Section
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: theme.colors.text,
		paddingHorizontal: 24,
		marginBottom: 16,
	},

	// Guides
	guidesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 18,
		gap: 12,
	},
	guideCard: {
		width: '47%',
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		padding: 16,
		alignItems: 'center',
	},
	guideIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	guideTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: theme.colors.text,
		textAlign: 'center',
		marginBottom: 4,
	},
	guideDescription: {
		fontSize: 12,
		color: theme.colors.textSecondary,
		textAlign: 'center',
		lineHeight: 16,
	},

	// Categories
	categoriesContainer: {
		paddingHorizontal: 24,
		gap: 8,
	},
	categoryChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 20,
		gap: 6,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	categoryChipActive: {
		backgroundColor: theme.colors.primary + '15',
		borderColor: theme.colors.primary,
	},
	categoryChipText: {
		fontSize: 14,
		fontWeight: '500',
		color: theme.colors.textSecondary,
	},
	categoryChipTextActive: {
		color: theme.colors.primary,
		fontWeight: '600',
	},

	// FAQ
	faqSection: {
		paddingHorizontal: 24,
		marginBottom: 16,
	},
	faqItem: {
		paddingVertical: 16,
	},
	faqQuestion: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	faqQuestionText: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.text,
		marginRight: 12,
		lineHeight: 22,
	},
	faqAnswer: {
		fontSize: 15,
		color: theme.colors.textSecondary,
		lineHeight: 22,
		marginTop: 12,
	},
	faqSeparator: {
		height: 0.5,
		backgroundColor: theme.colors.border,
	},

	// Empty state
	emptyState: {
		alignItems: 'center',
		paddingVertical: 48,
	},
	emptyStateText: {
		fontSize: 18,
		fontWeight: '600',
		color: theme.colors.text,
		marginTop: 16,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: theme.colors.textSecondary,
		marginTop: 4,
	},

	// Contact
	contactCard: {
		backgroundColor: theme.colors.surface,
		marginHorizontal: 24,
		borderRadius: 16,
		padding: 20,
	},
	contactDescription: {
		fontSize: 15,
		color: theme.colors.textSecondary,
		lineHeight: 22,
		marginBottom: 20,
	},
	inputGroup: {
		marginBottom: 16,
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.text,
		marginBottom: 8,
	},
	input: {
		backgroundColor: theme.colors.background,
		borderRadius: 12,
		padding: 14,
		fontSize: 15,
		color: theme.colors.text,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	textArea: {
		minHeight: 120,
		paddingTop: 14,
	},
	sendButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: theme.colors.primary,
		borderRadius: 12,
		paddingVertical: 14,
		gap: 8,
		marginTop: 8,
	},
	sendButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#fff',
	},

	// Alternative contact
	alternativeContact: {
		marginTop: 24,
		paddingTop: 24,
		borderTopWidth: 0.5,
		borderTopColor: theme.colors.border,
	},
	alternativeContactTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.text,
		marginBottom: 12,
	},
	contactMethod: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
	},
	contactMethodLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	contactMethodIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	contactMethodText: {
		fontSize: 15,
		color: theme.colors.text,
		fontWeight: '500',
	},
});

export default HelpCenterScreen;
