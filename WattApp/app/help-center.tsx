import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, StatusBar, Linking, Modal } from 'react-native';
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
	content: {
		intro: string;
		steps: { title: string; description: string; }[];
		tips?: string[];
	};
}

const HelpCenterScreen: React.FC = () => {
	const { theme } = useTheme();
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
	const [selectedCategory, setSelectedCategory] = useState<string>('all');
	const [contactSubject, setContactSubject] = useState('');
	const [contactMessage, setContactMessage] = useState('');
	const [selectedGuide, setSelectedGuide] = useState<GuideItem | null>(null);

	// FAQ Data
	const faqData: FAQItem[] = [
		{
			id: '1',
			category: 'account',
			question: 'Comment changer mon mot de passe ?',
			answer: 'Allez dans Paramètres > Compte > Sécurité. Appuyez sur "Changer le mot de passe", entrez votre mot de passe actuel puis votre nouveau mot de passe deux fois pour confirmer.'
		},
		{
			id: '2',
			category: 'account',
			question: 'Comment modifier mon profil ?',
			answer: 'Allez dans votre profil, appuyez sur "Modifier le profil". Vous pouvez changer votre photo, votre bio, votre nom d\'utilisateur et vos informations personnelles. N\'oubliez pas de sauvegarder vos modifications.'
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
			color: '#FF6B35',
			content: {
				intro: 'Optimisez votre expérience WattApp ! Découvrez toutes les fonctionnalités pour profiter pleinement de l\'application.',
				steps: [
					{
						title: 'Personnalisez votre profil',
						description: 'Ajoutez une photo de profil et une bio accrocheuse pour vous présenter à la communauté. Rendez votre profil unique !'
					},
					{
						title: 'Explorez les livres',
						description: 'Parcourez notre bibliothèque de milliers d\'histoires. Utilisez les filtres par genre, popularité ou nouveautés pour trouver votre prochaine lecture.'
					},
					{
						title: 'Suivez vos auteurs favoris',
						description: 'Restez informé des nouvelles publications de vos auteurs préférés en les suivant. Vous recevrez des notifications à chaque nouveau chapitre.'
					},
					{
						title: 'Rejoignez des communautés',
						description: 'Participez aux discussions thématiques, partagez vos avis et connectez-vous avec d\'autres passionnés de lecture.'
					},
					{
						title: 'Téléchargez pour lire hors ligne',
						description: 'Téléchargez vos livres préférés pour les lire sans connexion Internet. Version gratuite : 2 livres, Premium : illimité.'
					}
				],
				tips: [
					'Personnalisez votre thème dans les paramètres',
					'Créez des listes de lecture pour organiser vos livres',
					'Activez les notifications pour ne rien manquer'
				]
			}
		},
		{
			id: '2',
			title: 'Écrire une histoire',
			description: 'Apprenez à publier votre premier livre',
			icon: 'create-outline',
			color: '#4ECDC4',
			content: {
				intro: 'Partagez votre créativité avec la communauté WattApp ! Suivez ces étapes pour publier votre première histoire et toucher des milliers de lecteurs.',
				steps: [
					{
						title: 'Accédez à l\'éditeur',
						description: 'Appuyez sur l\'icône "Écrire" dans le menu principal pour ouvrir l\'éditeur avancé avec tous ses outils de mise en forme.'
					},
					{
						title: 'Créez votre histoire',
						description: 'Donnez un titre accrocheur, écrivez un résumé captivant qui donne envie de lire et choisissez le genre approprié.'
					},
					{
						title: 'Rédigez votre contenu',
						description: 'Utilisez notre éditeur riche avec mise en forme avancée, insertion d\'images et gestion de chapitres multiples.'
					},
					{
						title: 'Ajoutez une couverture',
						description: 'Créez ou importez une couverture professionnelle et attrayante. La première impression est essentielle pour attirer les lecteurs !'
					},
					{
						title: 'Optimisez avec des tags',
						description: 'Utilisez des tags pertinents (genres, thèmes, ambiance) pour améliorer la découvrabilité de votre histoire dans les recherches.'
					},
					{
						title: 'Publiez et partagez',
						description: 'Relisez votre travail, prévisualisez le rendu final et cliquez sur "Publier" pour partager avec la communauté.'
					}
				],
				tips: [
					'Publiez régulièrement pour garder vos lecteurs engagés',
					'Répondez aux commentaires pour créer une communauté fidèle',
					'Utilisez les brouillons pour préparer vos chapitres à l\'avance'
				]
			}
		},
		{
			id: '3',
			title: 'Gagner de l\'argent',
			description: 'Monétisez vos créations',
			icon: 'cash-outline',
			color: '#FFD93D',
			content: {
				intro: 'Transformez votre passion en revenus ! WattApp vous permet de monétiser vos histoires et de recevoir des paiements directement de vos lecteurs.',
				steps: [
					{
						title: 'Connectez votre compte de paiement',
						description: 'Allez dans Paramètres > Paiements et connectez Stripe ou PayPal. C\'est sécurisé et indispensable pour recevoir vos gains.'
					},
					{
						title: 'Définissez vos prix',
						description: 'Lors de la publication, choisissez entre gratuit, payant ou chapitres premium. Vous pouvez aussi mixer gratuit et payant.'
					},
					{
						title: 'Activez les dons',
						description: 'Permettez à vos lecteurs de vous soutenir avec des pourboires et des dons volontaires. Beaucoup de lecteurs aiment soutenir leurs auteurs favoris !'
					},
					{
						title: 'Créez du contenu exclusif',
						description: 'Proposez des chapitres bonus, des histoires courtes ou du contenu en avant-première réservés aux lecteurs qui vous soutiennent.'
					},
					{
						title: 'Suivez vos revenus',
						description: 'Consultez votre portefeuille pour un tableau de bord détaillé : ventes, dons, revenus par livre et statistiques complètes.'
					},
					{
						title: 'Retirez vos gains',
						description: 'Demandez un retrait vers votre compte bancaire dès 10€. Les paiements sont traités de manière sécurisée sous 3-5 jours ouvrés.'
					}
				],
				tips: [
					'Commencez avec du contenu gratuit pour bâtir votre audience',
					'Proposez les premiers chapitres gratuitement pour accrocher',
					'Soyez transparent avec vos lecteurs sur votre modèle économique'
				]
			}
		},
		{
			id: '4',
			title: 'Sécurité du compte',
			description: 'Protégez votre compte',
			icon: 'shield-checkmark-outline',
			color: '#6BCF7F',
			content: {
				intro: 'Protégez votre compte, vos créations et vos revenus ! Suivez ces recommandations essentielles pour garantir la sécurité de vos données.',
				steps: [
					{
						title: 'Renforcez votre mot de passe',
						description: 'Utilisez un mot de passe unique et fort avec au moins 8 caractères : majuscules, minuscules, chiffres et symboles. Évitez les mots du dictionnaire.'
					},
					{
						title: 'Activez la vérification en deux étapes',
						description: 'Ajoutez une couche de sécurité supplémentaire en activant l\'authentification à deux facteurs dans Paramètres > Sécurité.'
					},
					{
						title: 'Vérifiez votre email',
						description: 'Assurez-vous que votre adresse email est vérifiée et à jour pour recevoir les alertes de sécurité importantes.'
					},
					{
						title: 'Gérez vos sessions actives',
						description: 'Consultez régulièrement les appareils connectés à votre compte et déconnectez les sessions que vous ne reconnaissez pas.'
					},
					{
						title: 'Méfiez-vous du phishing',
						description: 'WattApp ne vous demandera JAMAIS votre mot de passe par email ou message. Ne cliquez pas sur les liens suspects.'
					},
					{
						title: 'Signalez toute activité suspecte',
						description: 'Si vous remarquez une connexion ou activité inhabituelle, changez immédiatement votre mot de passe et contactez le support.'
					}
				],
				tips: [
					'Ne partagez jamais votre mot de passe avec personne',
					'Déconnectez-vous toujours sur les appareils publics ou partagés',
					'Changez votre mot de passe tous les 3-6 mois'
				]
			}
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
								onPress={() => setSelectedGuide(guide)}
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

			{/* Modal Guide détaillé */}
			<Modal
				visible={selectedGuide !== null}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setSelectedGuide(null)}
			>
				{selectedGuide && (
					<View style={styles.modalContainer}>
						<StatusBar barStyle="light-content" />
						
						{/* Modal Header */}
						<View style={styles.modalHeader}>
							<TouchableOpacity 
								onPress={() => setSelectedGuide(null)}
								style={styles.modalCloseButton}
							>
								<Ionicons name="close" size={28} color={theme.colors.text} />
							</TouchableOpacity>
							<View style={[styles.modalIcon, { backgroundColor: selectedGuide.color + '20' }]}>
								<Ionicons name={selectedGuide.icon} size={32} color={selectedGuide.color} />
							</View>
							<Text style={styles.modalTitle}>{selectedGuide.title}</Text>
							<Text style={styles.modalSubtitle}>{selectedGuide.description}</Text>
						</View>

						{/* Modal Content */}
						<ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
							{/* Introduction */}
							<View style={styles.modalSection}>
								<Text style={styles.modalIntro}>{selectedGuide.content.intro}</Text>
							</View>

							{/* Étapes */}
							<View style={styles.modalSection}>
								<Text style={styles.modalSectionTitle}>Étapes à suivre</Text>
								{selectedGuide.content.steps.map((step, index) => (
									<View key={index} style={styles.stepCard}>
										<View style={styles.stepNumber}>
											<Text style={styles.stepNumberText}>{index + 1}</Text>
										</View>
										<View style={styles.stepContent}>
											<Text style={styles.stepTitle}>{step.title}</Text>
											<Text style={styles.stepDescription}>{step.description}</Text>
										</View>
									</View>
								))}
							</View>

							{/* Conseils */}
							{selectedGuide.content.tips && selectedGuide.content.tips.length > 0 && (
								<View style={styles.modalSection}>
									<Text style={styles.modalSectionTitle}>💡 Conseils supplémentaires</Text>
									<View style={styles.tipsContainer}>
										{selectedGuide.content.tips.map((tip, index) => (
											<View key={index} style={styles.tipItem}>
												<Ionicons name="checkmark-circle" size={20} color={selectedGuide.color} />
												<Text style={styles.tipText}>{tip}</Text>
											</View>
										))}
									</View>
								</View>
							)}

							{/* CTA */}
							<View style={styles.modalSection}>
								<TouchableOpacity 
									style={[styles.ctaButton, { backgroundColor: selectedGuide.color }]}
									onPress={() => {
										setSelectedGuide(null);
										// Redirection selon le guide
										if (selectedGuide.id === '2') {
											// Écrire une histoire
											router.push('/write/editor');
										} else if (selectedGuide.id === '3') {
											// Gagner de l'argent
											router.push('/wallet');
										}
									}}
								>
									<Text style={styles.ctaButtonText}>
										{selectedGuide.id === '2' ? 'Commencer à écrire' : 
										 selectedGuide.id === '3' ? 'Voir mon portefeuille' :
										 'Compris !'}
									</Text>
								</TouchableOpacity>
							</View>

							<View style={{ height: 40 }} />
						</ScrollView>
					</View>
				)}
			</Modal>
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

	// Modal styles
	modalContainer: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	modalHeader: {
		paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
		paddingBottom: 24,
		paddingHorizontal: 24,
		alignItems: 'center',
		borderBottomWidth: 0.5,
		borderBottomColor: theme.colors.border,
	},
	modalCloseButton: {
		position: 'absolute',
		top: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
		right: 24,
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 10,
	},
	modalIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 28,
		fontWeight: '700',
		color: theme.colors.text,
		textAlign: 'center',
		marginBottom: 8,
	},
	modalSubtitle: {
		fontSize: 16,
		color: theme.colors.textSecondary,
		textAlign: 'center',
	},
	modalContent: {
		flex: 1,
	},
	modalSection: {
		paddingHorizontal: 24,
		marginTop: 24,
	},
	modalIntro: {
		fontSize: 16,
		color: theme.colors.textSecondary,
		lineHeight: 24,
		textAlign: 'center',
	},
	modalSectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: 16,
	},
	stepCard: {
		flexDirection: 'row',
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		gap: 14,
	},
	stepNumber: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: theme.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumberText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#fff',
	},
	stepContent: {
		flex: 1,
	},
	stepTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.text,
		marginBottom: 4,
	},
	stepDescription: {
		fontSize: 14,
		color: theme.colors.textSecondary,
		lineHeight: 20,
	},
	tipsContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		padding: 16,
	},
	tipItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		marginBottom: 12,
	},
	tipText: {
		flex: 1,
		fontSize: 15,
		color: theme.colors.text,
		lineHeight: 22,
	},
	ctaButton: {
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaButtonText: {
		fontSize: 17,
		fontWeight: '600',
		color: '#fff',
	},
});

export default HelpCenterScreen;
