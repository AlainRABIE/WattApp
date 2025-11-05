import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Dimensions,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  genre: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  wordCount: number;
  tags: string[];
  content: string;
  structure: TemplateStructure;
  preview: string;
  author: string;
  rating: number;
  downloads: number;
  lastUpdated: Date;
  isOfficial: boolean;
  isPremium: boolean;
  thumbnailUrl?: string;
  color: string;
  variables?: TemplateVariable[];
}

interface TemplateStructure {
  chapters: TemplateChapter[];
  plotPoints: string[];
  characterArcs: string[];
  themes: string[];
}

interface TemplateChapter {
  id: string;
  title: string;
  description: string;
  wordTarget: number;
  keyEvents: string[];
  notes: string;
}

interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

const TemplatesGallery: React.FC = () => {
  const router = useRouter();
  
  // États principaux
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États de l'interface
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // États de filtrage
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showOfficialOnly, setShowOfficialOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'recent' | 'alphabetical'>('rating');

  // Templates réels avec contenu complet
  const realTemplates: Template[] = [
    {
      id: '1',
      title: 'Roman Policier Classique',
      description: 'Structure complète pour un roman policier avec enquête, indices et révélation finale',
      category: 'Policier',
      genre: ['Policier', 'Mystère', 'Enquête'],
      difficulty: 'intermediate',
      estimatedTime: 150,
      wordCount: 85000,
      tags: ['enquête', 'mystère', 'détective', 'indices'],
      content: `CHAPITRE 1 - LA DÉCOUVERTE

Le brouillard matinal s'accrochait encore aux pavés humides de la rue Saint-Antoine quand l'inspecteur Martin Durand reçut l'appel qui allait bouleverser sa semaine. Il était 6h47, et le café qu'il venait de se servir fumait encore dans sa tasse lorsque son téléphone sonna.

"Durand à l'appareil."

"Inspecteur, nous avons un corps. Villa des Roses, 15 avenue Foch. La victime est un certain Henri Belmont, 52 ans, homme d'affaires. Ça ne ressemble pas à un cambriolage qui a mal tourné."

Martin soupira, reposa sa tasse et attrapa son manteau. Une nouvelle enquête commençait.

---

STRUCTURE DU ROMAN :

ACTE I - L'ENQUÊTE COMMENCE (Chapitres 1-6)
- Découverte du crime
- Première analyse de la scène
- Interrogatoires des témoins
- Établissement des premiers suspects

ACTE II - APPROFONDISSEMENT (Chapitres 7-15)
- Révélation de secrets du passé
- Fausses pistes et rebondissements
- Développement des relations entre personnages
- Découverte d'indices cruciaux

ACTE III - RÉSOLUTION (Chapitres 16-20)
- Confrontation avec le coupable
- Révélation de la méthode
- Explication des motifs
- Dénouement et justice

PERSONNAGES PRINCIPAUX :
- Inspecteur Martin Durand : 45 ans, méticuleux, divorcé
- Henri Belmont : Victime, homme d'affaires aux activités douteuses
- Sylvie Belmont : Épouse de la victime, héritière
- Jean Moreau : Associé de la victime
- Marie Dubois : Secrétaire, témoin clé

INDICES CLÉS :
- Une montre arrêtée à 23h15
- Un carnet de rendez-vous avec une page arrachée
- Des traces de poison dans le verre de cognac
- Une lettre de chantage anonyme`,
      structure: {
        chapters: [
          {
            id: '1',
            title: 'La Découverte',
            description: 'Découverte du corps et première analyse de la scène de crime',
            wordTarget: 4500,
            keyEvents: ['Appel d\'urgence', 'Arrivée sur les lieux', 'Première analyse'],
            notes: 'Établir l\'atmosphère et présenter l\'enquêteur'
          },
          {
            id: '2',
            title: 'Les Premiers Indices',
            description: 'Collecte des premiers éléments et identification des suspects potentiels',
            wordTarget: 4200,
            keyEvents: ['Examen médico-légal', 'Interrogatoire de l\'épouse', 'Découverte du carnet'],
            notes: 'Semer les premiers indices sans tout révéler'
          },
          {
            id: '3',
            title: 'Les Témoignages',
            description: 'Interrogatoires des proches et reconstitution des dernières heures',
            wordTarget: 4800,
            keyEvents: ['Témoignage de la secrétaire', 'Alibi de l\'associé', 'Secrets de famille'],
            notes: 'Créer de la confusion avec des témoignages contradictoires'
          }
        ],
        plotPoints: ['Crime découvert', 'Premiers suspects', 'Fausse piste', 'Révélation', 'Arrestation'],
        characterArcs: ['Évolution de l\'enquêteur', 'Révélation des secrets', 'Justice rendue'],
        themes: ['Justice', 'Vérité', 'Secrets', 'Vengeance']
      },
      preview: 'Le brouillard matinal s\'accrochait encore aux pavés humides de la rue Saint-Antoine quand l\'inspecteur Martin Durand reçut l\'appel qui allait bouleverser sa semaine...',
      author: 'WattApp Official',
      rating: 4.8,
      downloads: 15420,
      lastUpdated: new Date(),
      isOfficial: true,
      isPremium: false,
      color: '#4a5568',
      variables: [
        { name: 'detective_name', label: 'Nom du détective', type: 'text', required: true, placeholder: 'Martin Durand' },
        { name: 'victim_name', label: 'Nom de la victime', type: 'text', required: true, placeholder: 'Henri Belmont' },
        { name: 'crime_location', label: 'Lieu du crime', type: 'text', required: true, placeholder: 'Villa des Roses' }
      ]
    },
    {
      id: '2',
      title: 'Nouvelle Science-Fiction',
      description: 'Template complet pour une nouvelle de science-fiction avec monde futuriste',
      category: 'Science-Fiction',
      genre: ['Science-Fiction', 'Futurisme', 'Nouvelle'],
      difficulty: 'beginner',
      estimatedTime: 45,
      wordCount: 8000,
      tags: ['futur', 'technologie', 'espace', 'humanité'],
      content: `NOUVELLE SCIENCE-FICTION : "L'ÉCHO DU FUTUR"

En 2157, la Terre n'était plus qu'un lointain souvenir pour les habitants de la station orbitale Neo-Terra. Luna travaillait comme technicienne en communication quantique, un métier qui l'obligeait à passer ses journées dans les entrailles métalliques de la station, à ajuster les fréquences qui permettaient aux messages de voyager instantanément à travers la galaxie.

Ce matin-là, quelque chose d'inhabituel se produisit. Alors qu'elle calibrait le transmetteur principal, Luna capta un signal étrange – un écho venant du passé. La voix était faible, distordue par le temps et l'espace, mais les mots étaient clairs :

"Ici la Terre... l'année 2024... Si quelqu'un reçoit ce message... nous avons besoin d'aide..."

Luna sentit son cœur s'accélérer. Les communications temporelles étaient théoriquement impossibles. Pourtant, elle entendait distinctement cette voix du passé, porteuse d'un message désespéré de l'humanité d'autrefois.

Elle devait prendre une décision : signaler cette anomalie à ses supérieurs, ce qui conduirait probablement à l'effacement du signal, ou enquêter en secret et peut-être découvrir un moyen de répondre au cri d'aide de leurs ancêtres.

---

STRUCTURE DE LA NOUVELLE :

PARTIE I - LA DÉCOUVERTE (2000 mots)
- Présentation du monde futuriste
- Introduction de Luna et son travail
- Découverte du signal temporel

PARTIE II - L'ENQUÊTE (3000 mots)
- Recherches secrètes sur le signal
- Découverte de la technologie temporelle
- Dilemme moral et éthique

PARTIE III - LA RÉVÉLATION (2000 mots)
- Communication établie avec le passé
- Révélation sur l'histoire cachée
- Décision finale de Luna

PARTIE IV - LA RÉSOLUTION (1000 mots)
- Conséquences des actions
- Impact sur le futur
- Message d'espoir

ÉLÉMENTS SCIENCE-FICTION :
- Station orbitale Neo-Terra
- Communication quantique
- Paradoxes temporels
- Intelligence artificielle
- Exploration spatiale

THÈMES ABORDÉS :
- Responsabilité envers le passé
- Impact de la technologie
- Connexion humaine à travers le temps
- Espoir et survie`,
      structure: {
        chapters: [
          {
            id: '1',
            title: 'Signal du Passé',
            description: 'Découverte mystérieuse d\'un signal venant du passé',
            wordTarget: 2000,
            keyEvents: ['Travail quotidien', 'Signal anormal', 'Première écoute'],
            notes: 'Établir le monde futuriste et créer l\'intrigue'
          },
          {
            id: '2',
            title: 'Enquête Secrète',
            description: 'Investigation cachée sur l\'origine du signal',
            wordTarget: 3000,
            keyEvents: ['Recherches nocturnes', 'Découverte technologique', 'Dilemme moral'],
            notes: 'Développer le mystère et les enjeux'
          },
          {
            id: '3',
            title: 'Contact Établi',
            description: 'Première communication bidirectionnelle avec le passé',
            wordTarget: 2000,
            keyEvents: ['Réponse au signal', 'Révélations historiques', 'Décision cruciale'],
            notes: 'Révéler la vérité et préparer le climax'
          },
          {
            id: '4',
            title: 'L\'Écho du Futur',
            description: 'Résolution et impact des actions sur l\'avenir',
            wordTarget: 1000,
            keyEvents: ['Conséquences', 'Nouveau monde', 'Message d\'espoir'],
            notes: 'Conclure avec une note optimiste'
          }
        ],
        plotPoints: ['Signal mystérieux', 'Enquête secrète', 'Contact établi', 'Révélation', 'Nouveau futur'],
        characterArcs: ['Évolution de Luna', 'Connexion temporelle', 'Responsabilité assumée'],
        themes: ['Temps', 'Responsabilité', 'Espoir', 'Technologie', 'Humanité']
      },
      preview: 'En 2157, la Terre n\'était plus qu\'un lointain souvenir pour les habitants de la station orbitale Neo-Terra. Luna travaillait comme technicienne en communication quantique...',
      author: 'Alex Future',
      rating: 4.7,
      downloads: 9830,
      lastUpdated: new Date(),
      isOfficial: false,
      isPremium: false,
      color: '#4c51bf',
      variables: [
        { name: 'protagonist_name', label: 'Nom du protagoniste', type: 'text', required: true, placeholder: 'Luna' },
        { name: 'station_name', label: 'Nom de la station', type: 'text', required: true, placeholder: 'Neo-Terra' },
        { name: 'year', label: 'Année futuriste', type: 'number', required: true, placeholder: '2157' }
      ]
    },
    {
      id: '3',
      title: 'Recueil de Poésie Moderne',
      description: 'Structure et poèmes d\'exemple pour un recueil de poésie contemporaine',
      category: 'Poésie',
      genre: ['Poésie', 'Contemporain', 'Lyrique'],
      difficulty: 'intermediate',
      estimatedTime: 60,
      wordCount: 5000,
      tags: ['poésie', 'vers', 'émotion', 'moderne'],
      content: `RECUEIL DE POÉSIE : "ÉCHOS URBAINS"

SECTION I - MATIN

"Réveil"

Les rues s'éveillent doucement,
Café fumant sur le zinc,
Pas pressés sur l'asphalte humide,
La ville reprend son souffle.

Entre les immeubles de verre,
Un pigeon solitaire
Dessine des cercles parfaits
Dans le ciel couleur d'espoir.

Je marche parmi les ombres,
Portant mes rêves de la nuit
Comme un manteau trop léger
Pour ce matin de novembre.

---

"Métro"

Tunnel de lumière artificielle,
Corps serrés, regards évités,
Chacun dans sa bulle de silence,
Train qui file vers l'inconnu.

Une femme lit un livre,
Un homme fixe son téléphone,
Une enfant dessine sur la buée
De son monde imaginaire.

Nous sommes tous des voyageurs
Sur cette ligne de métro,
Partageant le même wagon
Mais si loin les uns des autres.

---

SECTION II - MIDI

"Pause Déjeuner"

Le soleil perce enfin les nuages,
Banc de parc, sandwich vite avalé,
Pigeons qui mendient des miettes,
Moment volé à la routine.

Un jogger passe en musique,
Des enfants jouent au ballon,
Le monde continue sa danse
Pendant que je reprends mon souffle.

---

SECTION III - SOIR

"Retour"

Les néons s'allument un à un,
Vitrines qui tentent les passants,
Je rentre chez moi fatigué
De cette journée trop pleine.

Dans le reflet des fenêtres,
Je vois défiler ma vie,
Fragments d'instants fugaces
Que seule la poésie retient.

---

STRUCTURE DU RECUEIL :

PREMIÈRE PARTIE : RÉVEIL DE LA VILLE (10 poèmes)
- Matins urbains
- Transports quotidiens  
- Rencontres furtives

DEUXIÈME PARTIE : MIDI SOLAIRE (8 poèmes)
- Pauses dans l'agitation
- Nature en ville
- Moments de grâce

TROISIÈME PARTIE : CRÉPUSCULE (10 poèmes)
- Retours du soir
- Mélancolie urbaine
- Réflexions nocturnes

QUATRIÈME PARTIE : NUIT PROFONDE (7 poèmes)
- Solitude
- Rêves et cauchemars
- Espoir du nouveau jour

THÈMES RÉCURRENTS :
- Solitude en ville
- Connexions humaines
- Passage du temps
- Beauté du quotidien
- Mélancolie moderne`,
      structure: {
        chapters: [
          {
            id: '1',
            title: 'Réveil de la Ville',
            description: 'Poèmes sur les matins urbains et les commencements',
            wordTarget: 1500,
            keyEvents: ['Réveil', 'Transport', 'Première rencontre'],
            notes: 'Capturer l\'énergie du matin et les nouveaux départs'
          },
          {
            id: '2',
            title: 'Midi Solaire',
            description: 'Moments de pause et de contemplation en plein jour',
            wordTarget: 1200,
            keyEvents: ['Pause déjeuner', 'Observation', 'Réflexion'],
            notes: 'Montrer la beauté dans les moments ordinaires'
          },
          {
            id: '3',
            title: 'Crépuscule',
            description: 'Retours du soir et mélancolie urbaine',
            wordTarget: 1800,
            keyEvents: ['Retour du travail', 'Solitude', 'Nostalgie'],
            notes: 'Explorer la mélancolie et la beauté de la fin de journée'
          },
          {
            id: '4',
            title: 'Nuit Profonde',
            description: 'Poèmes nocturnes sur la solitude et l\'espoir',
            wordTarget: 1000,
            keyEvents: ['Insomnie', 'Rêves', 'Espoir du matin'],
            notes: 'Conclure sur une note d\'espoir malgré la mélancolie'
          }
        ],
        plotPoints: ['Éveil matinal', 'Contemplation diurne', 'Mélancolie vespérale', 'Solitude nocturne', 'Espoir renaissant'],
        characterArcs: ['Voix poétique urbaine', 'Évolution émotionnelle', 'Acceptation de la solitude'],
        themes: ['Urbanité', 'Solitude', 'Temps', 'Beauté', 'Mélancolie', 'Espoir']
      },
      preview: 'Les rues s\'éveillent doucement, Café fumant sur le zinc, Pas pressés sur l\'asphalte humide, La ville reprend son souffle...',
      author: 'Marie Vers',
      rating: 4.5,
      downloads: 3200,
      lastUpdated: new Date(),
      isOfficial: false,
      isPremium: false,
      color: '#805ad5',
      variables: [
        { name: 'collection_name', label: 'Nom du recueil', type: 'text', required: true, placeholder: 'Échos Urbains' },
        { name: 'poetic_voice', label: 'Voix poétique (je/tu/il)', type: 'select', required: true, options: ['Première personne (je)', 'Deuxième personne (tu)', 'Troisième personne (il/elle)'] },
        { name: 'setting', label: 'Cadre géographique', type: 'text', required: false, placeholder: 'Ville, campagne, bord de mer...' }
      ]
    }
  ];

  const mockCategories: Category[] = [
    { id: 'all', name: 'Tous', icon: 'library-outline', color: '#FFA94D', count: 0 },
    { id: 'structure', name: 'Structure', icon: 'git-branch-outline', color: '#667eea', count: 0 },
    { id: 'romance', name: 'Romance', icon: 'heart-outline', color: '#f093fb', count: 0 },
    { id: 'thriller', name: 'Thriller', icon: 'flash-outline', color: '#4facfe', count: 0 },
    { id: 'fantasy', name: 'Fantasy', icon: 'sparkles-outline', color: '#fa709a', count: 0 },
    { id: 'worldbuilding', name: 'World-building', icon: 'globe-outline', color: '#95e1d3', count: 0 },
    { id: 'characters', name: 'Personnages', icon: 'people-outline', color: '#fbc7d4', count: 0 },
  ];

  // Chargement des données
  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedGenre, selectedDifficulty, showPremiumOnly, showOfficialOnly, sortBy]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Simuler le chargement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTemplates(realTemplates);
      
      // Calculer les compteurs de catégories
      const categoriesWithCount = mockCategories.map(cat => {
        const count = cat.id === 'all' 
          ? realTemplates.length 
          : realTemplates.filter(t => t.category.toLowerCase() === cat.id).length;
        return { ...cat, count };
      });
      
      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query)) ||
        template.author.toLowerCase().includes(query)
      );
    }

    // Filtrage par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => 
        template.category.toLowerCase() === selectedCategory
      );
    }

    // Filtrage par genre
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(template =>
        template.genre.some(g => g.toLowerCase() === selectedGenre.toLowerCase())
      );
    }

    // Filtrage par difficulté
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    // Filtrage premium
    if (showPremiumOnly) {
      filtered = filtered.filter(template => template.isPremium);
    }

    // Filtrage officiel
    if (showOfficialOnly) {
      filtered = filtered.filter(template => template.isOfficial);
    }

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'downloads':
          return b.downloads - a.downloads;
        case 'recent':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleUseTemplate = (template: Template) => {
    setShowPreview(false);
    router.push(`/write/editor/new?templateId=${template.id}`);
  };

  // Importation d'un template depuis un fichier
  const handleImportTemplate = async () => {
    try {
      // Dans une vraie app, on utiliserait DocumentPicker d'Expo
      Alert.prompt(
        'Importer un template',
        'Collez le contenu de votre template ici :',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Importer', 
            onPress: (content) => {
              if (content && content.trim()) {
                createCustomTemplate(content.trim());
              }
            }
          }
        ],
        'plain-text'
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'importer le template');
    }
  };

  // Création d'un template personnalisé
  const createCustomTemplate = (content: string) => {
    const newTemplate: Template = {
      id: Date.now().toString(),
      title: 'Template Importé',
      description: 'Template créé par importation',
      category: 'Personnalisé',
      genre: ['Personnalisé'],
      difficulty: 'beginner',
      estimatedTime: 60,
      wordCount: content.length,
      tags: ['import', 'personnalisé'],
      content: content,
      structure: {
        chapters: [
          {
            id: '1',
            title: 'Chapitre Unique',
            description: 'Contenu importé',
            wordTarget: content.length,
            keyEvents: ['Contenu importé'],
            notes: 'Template créé par importation'
          }
        ],
        plotPoints: ['Début', 'Développement', 'Fin'],
        characterArcs: ['Évolution personnalisée'],
        themes: ['Thème personnalisé']
      },
      preview: content.substring(0, 200) + '...',
      author: 'Utilisateur',
      rating: 5.0,
      downloads: 1,
      lastUpdated: new Date(),
      isOfficial: false,
      isPremium: false,
      color: '#38b2ac'
    };

    setTemplates(prev => [...prev, newTemplate]);
    Alert.alert('Succès', 'Template importé avec succès !');
    setShowImportModal(false);
  };

  // Création d'un nouveau template vide
  const createNewTemplate = () => {
    Alert.prompt(
      'Nouveau Template',
      'Nom du template :',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Créer', 
          onPress: (title) => {
            if (title && title.trim()) {
              const newTemplate: Template = {
                id: Date.now().toString(),
                title: title.trim(),
                description: 'Template personnalisé',
                category: 'Personnalisé',
                genre: ['Personnalisé'],
                difficulty: 'beginner',
                estimatedTime: 60,
                wordCount: 0,
                tags: ['personnalisé', 'nouveau'],
                content: `# ${title.trim()}

Commencez à écrire votre template ici...

## Structure suggérée :

### Chapitre 1
[Votre contenu ici]

### Chapitre 2
[Votre contenu ici]

### Notes
- Point important 1
- Point important 2
- Point important 3`,
                structure: {
                  chapters: [
                    {
                      id: '1',
                      title: 'Chapitre 1',
                      description: 'Premier chapitre',
                      wordTarget: 2000,
                      keyEvents: ['Événement clé'],
                      notes: 'Notes pour ce chapitre'
                    }
                  ],
                  plotPoints: ['Début', 'Milieu', 'Fin'],
                  characterArcs: ['Évolution principale'],
                  themes: ['Thème principal']
                },
                preview: `Nouveau template personnalisé : ${title.trim()}`,
                author: 'Utilisateur',
                rating: 5.0,
                downloads: 1,
                lastUpdated: new Date(),
                isOfficial: false,
                isPremium: false,
                color: '#4299e1'
              };

              setTemplates(prev => [...prev, newTemplate]);
              Alert.alert('Succès', 'Nouveau template créé !');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  // Rendu d'une carte de template (mode grille)
  const renderTemplateCard = ({ item }: { item: Template }) => (
    <TouchableOpacity
      style={[styles.templateCard, { borderLeftColor: item.color }]}
      onPress={() => handleTemplateSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.templateImageContainer}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.templateImage} />
        ) : (
          <LinearGradient
            colors={[item.color, item.color + '80']}
            style={styles.templateImagePlaceholder}
          >
            <Ionicons name="document-text-outline" size={32} color="#fff" />
          </LinearGradient>
        )}
        
        <View style={styles.templateBadges}>
          {item.isOfficial && (
            <View style={styles.officialBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
            </View>
          )}
          {item.isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#FFD700" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.templateContent}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.templateRating}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>

        <Text style={styles.templateAuthor}>par {item.author}</Text>
        <Text style={styles.templateDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.templateMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#888" />
            <Text style={styles.metaText}>{item.estimatedTime}min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="document-text-outline" size={12} color="#888" />
            <Text style={styles.metaText}>{(item.wordCount / 1000).toFixed(0)}k mots</Text>
          </View>
          <View style={[styles.difficultyBadge, { 
            backgroundColor: 
              item.difficulty === 'beginner' ? '#4CAF50' :
              item.difficulty === 'intermediate' ? '#FF9800' : '#F44336'
          }]}>
            <Text style={styles.difficultyText}>
              {item.difficulty === 'beginner' ? 'Débutant' :
               item.difficulty === 'intermediate' ? 'Inter.' : 'Avancé'}
            </Text>
          </View>
        </View>

        <View style={styles.templateTags}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: item.color + '20' }]}>
              <Text style={[styles.tagText, { color: item.color }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Rendu d'un template (mode liste)
  const renderTemplateListItem = ({ item }: { item: Template }) => (
    <TouchableOpacity
      style={styles.templateListItem}
      onPress={() => handleTemplateSelect(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.templateListImage, { backgroundColor: item.color }]}>
        <Ionicons name="document-text-outline" size={24} color="#fff" />
      </View>
      
      <View style={styles.templateListContent}>
        <View style={styles.templateListHeader}>
          <Text style={styles.templateListTitle}>{item.title}</Text>
          <View style={styles.templateListRating}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
        
        <Text style={styles.templateListAuthor}>par {item.author}</Text>
        <Text style={styles.templateListDescription} numberOfLines={1}>
          {item.description}
        </Text>
        
        <View style={styles.templateListMeta}>
          <Text style={styles.templateListCategory}>{item.category}</Text>
          <Text style={styles.templateListDot}>•</Text>
          <Text style={styles.templateListTime}>{item.estimatedTime} min</Text>
          <Text style={styles.templateListDot}>•</Text>
          <Text style={styles.templateListDownloads}>{item.downloads} téléchargements</Text>
        </View>
      </View>
      
      <View style={styles.templateListActions}>
        {item.isPremium && (
          <Ionicons name="diamond" size={16} color="#FFD700" />
        )}
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  // Rendu des filtres
  const renderFilters = () => (
    <Modal visible={showFilters} animationType="slide" transparent statusBarTranslucent>
      <BlurView intensity={50} style={styles.modalOverlay}>
        <View style={styles.filtersModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#FFA94D" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filtersContent}>
            {/* Tri */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Trier par</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'rating', label: 'Note', icon: 'star-outline' },
                  { key: 'downloads', label: 'Popularité', icon: 'trending-up-outline' },
                  { key: 'recent', label: 'Récent', icon: 'time-outline' },
                  { key: 'alphabetical', label: 'Alphabétique', icon: 'text-outline' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      sortBy === option.key && styles.filterOptionSelected
                    ]}
                    onPress={() => setSortBy(option.key as any)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={sortBy === option.key ? '#FFA94D' : '#666'} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      sortBy === option.key && styles.filterOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Difficulté */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Difficulté</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'all', label: 'Toutes' },
                  { key: 'beginner', label: 'Débutant' },
                  { key: 'intermediate', label: 'Intermédiaire' },
                  { key: 'advanced', label: 'Avancé' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      selectedDifficulty === option.key && styles.filterOptionSelected
                    ]}
                    onPress={() => setSelectedDifficulty(option.key)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedDifficulty === option.key && styles.filterOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Options spéciales */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Options</Text>
              
              <TouchableOpacity
                style={[styles.filterToggle, showOfficialOnly && styles.filterToggleSelected]}
                onPress={() => setShowOfficialOnly(!showOfficialOnly)}
              >
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={20} 
                  color={showOfficialOnly ? '#FFA94D' : '#666'} 
                />
                <Text style={[
                  styles.filterToggleText,
                  showOfficialOnly && styles.filterToggleTextSelected
                ]}>
                  Templates officiels uniquement
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.filterToggle, showPremiumOnly && styles.filterToggleSelected]}
                onPress={() => setShowPremiumOnly(!showPremiumOnly)}
              >
                <Ionicons 
                  name="diamond-outline" 
                  size={20} 
                  color={showPremiumOnly ? '#FFA94D' : '#666'} 
                />
                <Text style={[
                  styles.filterToggleText,
                  showPremiumOnly && styles.filterToggleTextSelected
                ]}>
                  Templates premium uniquement
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );

  // Rendu de la prévisualisation
  const renderPreview = () => (
    <Modal visible={showPreview} animationType="slide" statusBarTranslucent>
      <View style={styles.previewContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#181818" />
        
        {/* Header de prévisualisation */}
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={() => setShowPreview(false)}>
            <Ionicons name="close" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <Text style={styles.previewHeaderTitle}>Prévisualisation</Text>
          <TouchableOpacity 
            onPress={() => selectedTemplate && handleUseTemplate(selectedTemplate)}
            style={styles.useTemplateButton}
          >
            <Text style={styles.useTemplateButtonText}>Utiliser</Text>
          </TouchableOpacity>
        </View>
        
        {selectedTemplate && (
          <ScrollView style={styles.previewContent}>
            {/* Informations du template */}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{selectedTemplate.title}</Text>
              <Text style={styles.previewAuthor}>par {selectedTemplate.author}</Text>
              <Text style={styles.previewDescription}>{selectedTemplate.description}</Text>
              
              <View style={styles.previewMeta}>
                <View style={styles.previewMetaRow}>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.previewMetaText}>{selectedTemplate.rating}/5</Text>
                  </View>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="download-outline" size={16} color="#888" />
                    <Text style={styles.previewMetaText}>{selectedTemplate.downloads}</Text>
                  </View>
                  <View style={styles.previewMetaItem}>
                    <Ionicons name="time-outline" size={16} color="#888" />
                    <Text style={styles.previewMetaText}>{selectedTemplate.estimatedTime} min</Text>
                  </View>
                </View>
                
                <View style={styles.previewTags}>
                  {selectedTemplate.tags.map((tag, index) => (
                    <View key={index} style={[styles.previewTag, { backgroundColor: selectedTemplate.color + '20' }]}>
                      <Text style={[styles.previewTagText, { color: selectedTemplate.color }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            
            {/* Structure du template */}
            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Structure</Text>
              {selectedTemplate.structure.chapters.map((chapter, index) => (
                <View key={chapter.id} style={styles.previewChapter}>
                  <Text style={styles.previewChapterTitle}>
                    Chapitre {index + 1}: {chapter.title}
                  </Text>
                  <Text style={styles.previewChapterDescription}>{chapter.description}</Text>
                  <Text style={styles.previewChapterTarget}>
                    Objectif: {chapter.wordTarget} mots
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Aperçu du contenu */}
            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Aperçu</Text>
              <View style={styles.previewText}>
                <Text style={styles.previewTextContent}>{selectedTemplate.preview}</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  // Rendu du modal d'importation
  const renderImportModal = () => (
    <Modal visible={showImportModal} animationType="slide" transparent statusBarTranslucent>
      <BlurView intensity={50} style={styles.modalOverlay}>
        <View style={styles.importModalContainer}>
          <View style={styles.importModalHeader}>
            <Text style={styles.importModalTitle}>Importer un Template</Text>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
              <Ionicons name="close" size={24} color="#FFA94D" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.importModalContent}>
            <View style={styles.importOption}>
              <TouchableOpacity 
                style={styles.importOptionButton}
                onPress={() => {
                  setShowImportModal(false);
                  setTimeout(handleImportTemplate, 100);
                }}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.importOptionGradient}
                >
                  <Ionicons name="document-text-outline" size={32} color="#fff" />
                  <Text style={styles.importOptionTitle}>Coller du Texte</Text>
                  <Text style={styles.importOptionDescription}>
                    Collez directement le contenu de votre template
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <View style={styles.importOption}>
              <TouchableOpacity 
                style={styles.importOptionButton}
                onPress={() => {
                  setShowImportModal(false);
                  Alert.alert('Bientôt disponible', 'L\'importation de fichiers sera disponible dans une prochaine mise à jour');
                }}
              >
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  style={styles.importOptionGradient}
                >
                  <Ionicons name="cloud-upload-outline" size={32} color="#fff" />
                  <Text style={styles.importOptionTitle}>Importer un Fichier</Text>
                  <Text style={styles.importOptionDescription}>
                    Importez depuis .txt, .docx, .md
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <View style={styles.importOption}>
              <TouchableOpacity 
                style={styles.importOptionButton}
                onPress={() => {
                  setShowImportModal(false);
                  setTimeout(createNewTemplate, 100);
                }}
              >
                <LinearGradient
                  colors={['#fa709a', '#fee140']}
                  style={styles.importOptionGradient}
                >
                  <Ionicons name="add-circle-outline" size={32} color="#fff" />
                  <Text style={styles.importOptionTitle}>Créer Nouveau</Text>
                  <Text style={styles.importOptionDescription}>
                    Commencez avec un template vide
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#181818" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFA94D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Templates</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={createNewTemplate} style={styles.headerButton}>
            <Ionicons name="add-outline" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowImportModal(true)} style={styles.headerButton}>
            <Ionicons name="cloud-upload-outline" size={24} color="#FFA94D" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={styles.headerButton}
          >
            <Ionicons 
              name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} 
              size={24} 
              color="#FFA94D" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.headerButton}>
            <Ionicons name="filter-outline" size={24} color="#FFA94D" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un template..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Catégories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              { borderColor: category.color },
              selectedCategory === category.id && { backgroundColor: category.color }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === category.id ? '#fff' : category.color} 
            />
            <Text style={[
              styles.categoryButtonText,
              { color: selectedCategory === category.id ? '#fff' : category.color }
            ]}>
              {category.name} ({category.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des templates */}
      <FlatList
        data={filteredTemplates}
        renderItem={viewMode === 'grid' ? renderTemplateCard : renderTemplateListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        contentContainerStyle={styles.templatesList}
        columnWrapperStyle={viewMode === 'grid' ? styles.templatesRow : null}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>Aucun template trouvé</Text>
            <Text style={styles.emptyStateSubtext}>
              Essayez de modifier vos critères de recherche
            </Text>
          </View>
        }
      />

      {/* Modales */}
      {renderFilters()}
      {renderPreview()}
      {renderImportModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  
  // Catégories
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Templates Grid
  templatesList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  templatesRow: {
    justifyContent: 'space-between',
  },
  templateCard: {
    width: (width - 60) / 2,
    backgroundColor: '#23232a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
  templateImageContainer: {
    height: 120,
    position: 'relative',
  },
  templateImage: {
    width: '100%',
    height: '100%',
  },
  templateImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBadges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  officialBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  templateContent: {
    padding: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  templateTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  templateRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  templateAuthor: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  templateDescription: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    color: '#888',
    fontSize: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  templateTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  
  // Templates List
  templateListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateListImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  templateListContent: {
    flex: 1,
  },
  templateListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateListTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  templateListRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  templateListAuthor: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  templateListDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  templateListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateListCategory: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  templateListDot: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 6,
  },
  templateListTime: {
    color: '#666',
    fontSize: 12,
  },
  templateListDownloads: {
    color: '#666',
    fontSize: 12,
  },
  templateListActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filtersModal: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filtersContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  filterOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  filterOptionTextSelected: {
    color: '#FFA94D',
    fontWeight: '600',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23232a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  filterToggleSelected: {
    backgroundColor: 'rgba(255, 169, 77, 0.2)',
    borderWidth: 1,
    borderColor: '#FFA94D',
  },
  filterToggleText: {
    color: '#fff',
    fontSize: 14,
  },
  filterToggleTextSelected: {
    color: '#FFA94D',
    fontWeight: '600',
  },
  
  // Preview
  previewContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  previewHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  useTemplateButton: {
    backgroundColor: '#FFA94D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  useTemplateButtonText: {
    color: '#181818',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContent: {
    flex: 1,
    padding: 20,
  },
  previewInfo: {
    marginBottom: 32,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewAuthor: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  previewDescription: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  previewMeta: {
    gap: 16,
  },
  previewMetaRow: {
    flexDirection: 'row',
    gap: 24,
  },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewMetaText: {
    color: '#888',
    fontSize: 14,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 32,
  },
  previewSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  previewChapter: {
    backgroundColor: '#23232a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewChapterTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewChapterDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  previewChapterTarget: {
    color: '#FFA94D',
    fontSize: 12,
    fontWeight: '600',
  },
  previewText: {
    backgroundColor: '#23232a',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA94D',
  },
  previewTextContent: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  
  // Import Modal Styles
  importModalContainer: {
    backgroundColor: '#181818',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  importModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  importModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  importModalContent: {
    padding: 20,
    gap: 16,
  },
  importOption: {
    marginBottom: 8,
  },
  importOptionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  importOptionGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  importOptionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  importOptionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TemplatesGallery;