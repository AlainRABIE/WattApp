import { db, auth } from '../constants/firebaseConfig';
import { collection, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import BookService from './BookService';
import StorageService from './StorageService';

export interface OpenSourceBook {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  coverUrl: string;
  downloadUrl: string;
  category?: string;
  genres?: string[];
}

export class OpenSourceBooksService {
  private static instance: OpenSourceBooksService;
  private bookService: typeof BookService;
  private storageService: typeof StorageService;

  private constructor() {
    this.bookService = BookService;
    this.storageService = StorageService;
  }

  public static getInstance(): OpenSourceBooksService {
    if (!OpenSourceBooksService.instance) {
      OpenSourceBooksService.instance = new OpenSourceBooksService();
    }
    return OpenSourceBooksService.instance;
  }

  // 10 livres de base
  private openSourceBooks: OpenSourceBook[] = [
    {
      id: 'pride-prejudice',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      description: 'Une comédie romantique intemporelle sur l\'amour et les malentendus.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1342/1342-0.txt',
      category: 'Romance',
      genres: ['Romance', 'Classique', 'Fiction'],
    },
    {
      id: 'moby-dick',
      title: 'Moby Dick',
      author: 'Herman Melville',
      description: 'L\'obsession du capitaine Ahab pour la baleine blanche.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2701/2701-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Classique', 'Fiction'],
    },
    {
      id: 'alice-wonderland',
      title: 'Alice\'s Adventures in Wonderland',
      author: 'Lewis Carroll',
      description: 'Alice tombe dans un terrier de lapin et découvre un monde fantastique.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/11/11-0.txt',
      category: 'Fantasy',
      genres: ['Fantaisie', 'Aventure', 'Enfants'],
    },
    {
      id: 'sherlock-holmes',
      title: 'The Adventures of Sherlock Holmes',
      author: 'Arthur Conan Doyle',
      description: 'Recueil de 12 histoires mettant en scène le célèbre détective.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1661/1661-0.txt',
      category: 'Mystery',
      genres: ['Mystère', 'Crime', 'Fiction'],
    },
    {
      id: 'great-expectations',
      title: 'Great Expectations',
      author: 'Charles Dickens',
      description: 'L\'histoire de Pip, un orphelin qui rêve de devenir gentleman.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1400/pg1400.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1400/1400-0.txt',
      category: 'Fiction',
      genres: ['Classique', 'Fiction', 'Drame'],
    },
    {
      id: 'frankenstein',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      description: 'Un scientifique crée une créature qui échappe à son contrôle.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/84/84-0.txt',
      category: 'Horror',
      genres: ['Horreur', 'Science-Fiction', 'Classique'],
    },
    {
      id: 'dracula',
      title: 'Dracula',
      author: 'Bram Stoker',
      description: 'Le comte Dracula tente d\'émigrer de Transylvanie en Angleterre.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/345/345-0.txt',
      category: 'Horror',
      genres: ['Horreur', 'Gothique', 'Classique'],
    },
    {
      id: 'jane-eyre',
      title: 'Jane Eyre',
      author: 'Charlotte Brontë',
      description: 'Une orpheline devient gouvernante et tombe amoureuse de Mr. Rochester.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1260/pg1260.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1260/1260-0.txt',
      category: 'Romance',
      genres: ['Romance', 'Classique', 'Gothique'],
    },
    {
      id: 'wuthering-heights',
      title: 'Wuthering Heights',
      author: 'Emily Brontë',
      description: 'Une histoire d\'amour passionnée et destructrice entre Heathcliff et Catherine.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/768/pg768.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/768/768-0.txt',
      category: 'Romance',
      genres: ['Romance', 'Drame', 'Classique'],
    },
    {
      id: 'picture-dorian-gray',
      title: 'The Picture of Dorian Gray',
      author: 'Oscar Wilde',
      description: 'Un jeune homme vend son âme pour rester éternellement jeune.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/174/174-0.txt',
      category: 'Fiction',
      genres: ['Philosophique', 'Gothique', 'Classique'],
    },
  ];

  // 20 livres supplémentaires
  private extendedBooks: OpenSourceBook[] = [
    {
      id: 'metamorphosis',
      title: 'Metamorphosis',
      author: 'Franz Kafka',
      description: 'Un homme se réveille transformé en insecte géant.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/5200/pg5200.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/5200/5200-0.txt',
      category: 'Fiction',
      genres: ['Absurde', 'Philosophique', 'Classique'],
    },
    {
      id: 'war-peace',
      title: 'War and Peace',
      author: 'Leo Tolstoy',
      description: 'Épopée sur l\'invasion napoléonienne de la Russie.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2600/pg2600.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2600/2600-0.txt',
      category: 'Historical Fiction',
      genres: ['Historique', 'Épopée', 'Classique'],
    },
    {
      id: 'odyssey',
      title: 'The Odyssey',
      author: 'Homer',
      description: 'Le voyage épique d\'Ulysse pour rentrer chez lui après la guerre de Troie.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1727/pg1727.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1727/1727-0.txt',
      category: 'Epic',
      genres: ['Épopée', 'Mythologie', 'Aventure'],
    },
    {
      id: 'iliad',
      title: 'The Iliad',
      author: 'Homer',
      description: 'Récit de la guerre de Troie et de la colère d\'Achille.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/6130/pg6130.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/6130/6130-0.txt',
      category: 'Epic',
      genres: ['Épopée', 'Mythologie', 'Guerre'],
    },
    {
      id: 'don-quixote',
      title: 'Don Quixote',
      author: 'Miguel de Cervantes',
      description: 'Les aventures d\'un noble qui se prend pour un chevalier errant.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/996/pg996.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/996/996-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Comédie', 'Classique'],
    },
    {
      id: 'count-monte-cristo',
      title: 'The Count of Monte Cristo',
      author: 'Alexandre Dumas',
      description: 'Un marin emprisonné à tort se venge de ses ennemis.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1184/pg1184.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1184/1184-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Revanche', 'Classique'],
    },
    {
      id: 'three-musketeers',
      title: 'The Three Musketeers',
      author: 'Alexandre Dumas',
      description: 'D\'Artagnan se joint aux trois mousquetaires pour de nombreuses aventures.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1257/pg1257.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1257/1257-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Historique', 'Action'],
    },
    {
      id: 'anna-karenina',
      title: 'Anna Karenina',
      author: 'Leo Tolstoy',
      description: 'Une femme mariée vit une liaison passionnée avec des conséquences tragiques.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1399/pg1399.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1399/1399-0.txt',
      category: 'Romance',
      genres: ['Romance', 'Drame', 'Tragédie'],
    },
    {
      id: 'brothers-karamazov',
      title: 'The Brothers Karamazov',
      author: 'Fyodor Dostoevsky',
      description: 'Trois frères et leur père sont impliqués dans un meurtre.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/28054/pg28054.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/28054/28054-0.txt',
      category: 'Fiction',
      genres: ['Philosophique', 'Drame', 'Classique'],
    },
    {
      id: 'les-miserables',
      title: 'Les Misérables',
      author: 'Victor Hugo',
      description: 'Jean Valjean tente de se racheter après avoir été emprisonné.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/17489/pg17489.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/17489/17489-0.txt',
      category: 'Historical Fiction',
      genres: ['Historique', 'Drame', 'Classique'],
    },
    {
      id: 'around-world-80-days',
      title: 'Around the World in Eighty Days',
      author: 'Jules Verne',
      description: 'Phileas Fogg parie qu\'il peut faire le tour du monde en 80 jours.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/103/pg103.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/103/103-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Science-Fiction', 'Classique'],
    },
    {
      id: '20000-leagues',
      title: 'Twenty Thousand Leagues Under the Sea',
      author: 'Jules Verne',
      description: 'Aventures sous-marines à bord du Nautilus avec le capitaine Nemo.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/164/pg164.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/164/164-0.txt',
      category: 'Science Fiction',
      genres: ['Science-Fiction', 'Aventure', 'Classique'],
    },
    {
      id: 'time-machine',
      title: 'The Time Machine',
      author: 'H. G. Wells',
      description: 'Un scientifique voyage dans le futur et découvre deux races.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/35/pg35.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/35/35-0.txt',
      category: 'Science Fiction',
      genres: ['Science-Fiction', 'Classique', 'Dystopie'],
    },
    {
      id: 'war-worlds',
      title: 'The War of the Worlds',
      author: 'H. G. Wells',
      description: 'Des Martiens envahissent la Terre avec des machines de guerre.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/36/pg36.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/36/36-0.txt',
      category: 'Science Fiction',
      genres: ['Science-Fiction', 'Invasion', 'Classique'],
    },
    {
      id: 'treasure-island',
      title: 'Treasure Island',
      author: 'Robert Louis Stevenson',
      description: 'Jim Hawkins part à la recherche d\'un trésor de pirates.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/120/120-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Pirates', 'Classique'],
    },
    {
      id: 'jekyll-hyde',
      title: 'Strange Case of Dr Jekyll and Mr Hyde',
      author: 'Robert Louis Stevenson',
      description: 'Un docteur découvre un moyen de libérer son côté sombre.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/43/pg43.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/43/43-0.txt',
      category: 'Horror',
      genres: ['Horreur', 'Gothique', 'Psychologique'],
    },
    {
      id: 'heart-darkness',
      title: 'Heart of Darkness',
      author: 'Joseph Conrad',
      description: 'Un voyage sur le fleuve Congo révèle l\'horreur du colonialisme.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/219/pg219.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/219/219-0.txt',
      category: 'Fiction',
      genres: ['Aventure', 'Psychologique', 'Classique'],
    },
    {
      id: 'the-trial',
      title: 'The Trial',
      author: 'Franz Kafka',
      description: 'Josef K. est arrêté et poursuivi par une autorité mystérieuse.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/7849/pg7849.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/7849/7849-0.txt',
      category: 'Fiction',
      genres: ['Absurde', 'Philosophique', 'Classique'],
    },
    {
      id: 'scarlet-letter',
      title: 'The Scarlet Letter',
      author: 'Nathaniel Hawthorne',
      description: 'Une femme adultère doit porter un "A" écarlate en public.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/25344/pg25344.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/25344/25344-0.txt',
      category: 'Fiction',
      genres: ['Drame', 'Historique', 'Classique'],
    },
    {
      id: 'huckleberry-finn',
      title: 'Adventures of Huckleberry Finn',
      author: 'Mark Twain',
      description: 'Huck et Jim descendent le Mississippi sur un radeau.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/76/pg76.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/76/76-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Satire', 'Classique'],
    },
  ];

  // 39 livres MEGA collection - tous validés
  private megaCollection: OpenSourceBook[] = [
    {
      id: 'little-women',
      title: 'Little Women',
      author: 'Louisa May Alcott',
      description: 'Les quatre sœurs March grandissent pendant la guerre de Sécession.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/514/pg514.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/514/514-0.txt',
      category: 'Fiction',
      genres: ['Famille', 'Classique', 'Drame'],
    },
    {
      id: 'tale-two-cities',
      title: 'A Tale of Two Cities',
      author: 'Charles Dickens',
      description: 'Romance et intrigue pendant la Révolution française.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/98/pg98.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/98/98-0.txt',
      category: 'Historical Fiction',
      genres: ['Historique', 'Drame', 'Classique'],
    },
    {
      id: 'david-copperfield',
      title: 'David Copperfield',
      author: 'Charles Dickens',
      description: 'L\'histoire semi-autobiographique de David Copperfield.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/766/pg766.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/766/766-0.txt',
      category: 'Fiction',
      genres: ['Drame', 'Classique', 'Biographie'],
    },
    {
      id: 'oliver-twist',
      title: 'Oliver Twist',
      author: 'Charles Dickens',
      description: 'Un orphelin s\'échappe d\'un orphelinat et rejoint un gang de pickpockets.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/730/pg730.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/730/730-0.txt',
      category: 'Fiction',
      genres: ['Crime', 'Drame', 'Classique'],
    },
    {
      id: 'tom-sawyer',
      title: 'The Adventures of Tom Sawyer',
      author: 'Mark Twain',
      description: 'Les aventures d\'un jeune garçon dans le Missouri.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/74/pg74.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/74/74-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Enfants', 'Classique'],
    },
    {
      id: 'call-of-the-wild',
      title: 'The Call of the Wild',
      author: 'Jack London',
      description: 'Un chien domestique découvre ses instincts sauvages dans le Yukon.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/215/pg215.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/215/215-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Nature', 'Classique'],
    },
    {
      id: 'white-fang',
      title: 'White Fang',
      author: 'Jack London',
      description: 'Un loup-chien apprend à survivre dans la nature sauvage.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/910/pg910.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/910/910-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Nature', 'Classique'],
    },
    {
      id: 'anne-green-gables',
      title: 'Anne of Green Gables',
      author: 'L. M. Montgomery',
      description: 'Une jeune orpheline trouve un foyer à Green Gables.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/45/pg45.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/45/45-0.txt',
      category: 'Fiction',
      genres: ['Famille', 'Classique', 'Enfants'],
    },
    {
      id: 'secret-garden',
      title: 'The Secret Garden',
      author: 'Frances Hodgson Burnett',
      description: 'Mary découvre un jardin caché et change la vie de tous.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/113/pg113.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/113/113-0.txt',
      category: 'Fiction',
      genres: ['Enfants', 'Nature', 'Classique'],
    },
    {
      id: 'wizard-oz',
      title: 'The Wonderful Wizard of Oz',
      author: 'L. Frank Baum',
      description: 'Dorothy voyage au pays d\'Oz pour rentrer chez elle.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/55/pg55.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/55/55-0.txt',
      category: 'Fantasy',
      genres: ['Fantaisie', 'Aventure', 'Enfants'],
    },
    {
      id: 'peter-pan',
      title: 'Peter Pan',
      author: 'J. M. Barrie',
      description: 'Le garçon qui ne grandit jamais emmène Wendy au Pays Imaginaire.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/16/pg16.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/16/16-0.txt',
      category: 'Fantasy',
      genres: ['Fantaisie', 'Aventure', 'Enfants'],
    },
    {
      id: 'jungle-book',
      title: 'The Jungle Book',
      author: 'Rudyard Kipling',
      description: 'Mowgli, un enfant élevé par des loups dans la jungle indienne.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/236/pg236.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/236/236-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Nature', 'Enfants'],
    },
    {
      id: 'invisible-man',
      title: 'The Invisible Man',
      author: 'H. G. Wells',
      description: 'Un scientifique découvre comment devenir invisible avec des conséquences tragiques.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/5230/pg5230.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/5230/5230-0.txt',
      category: 'Science Fiction',
      genres: ['Science-Fiction', 'Horreur', 'Classique'],
    },
    {
      id: 'island-dr-moreau',
      title: 'The Island of Dr. Moreau',
      author: 'H. G. Wells',
      description: 'Un naufragé découvre une île où un scientifique fou transforme des animaux.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/159/pg159.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/159/159-0.txt',
      category: 'Science Fiction',
      genres: ['Science-Fiction', 'Horreur', 'Classique'],
    },
    {
      id: 'origin-of-species',
      title: 'On the Origin of Species',
      author: 'Charles Darwin',
      description: 'L\'œuvre fondamentale sur l\'évolution par sélection naturelle.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1228/pg1228.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1228/1228-0.txt',
      category: 'Science',
      genres: ['Science', 'Non-fiction', 'Biologie'],
    },
    {
      id: 'common-sense',
      title: 'Common Sense',
      author: 'Thomas Paine',
      description: 'Pamphlet révolutionnaire en faveur de l\'indépendance américaine.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/147/pg147.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/147/147-0.txt',
      category: 'Political Philosophy',
      genres: ['Politique', 'Histoire', 'Non-fiction'],
    },
    {
      id: 'walden',
      title: 'Walden',
      author: 'Henry David Thoreau',
      description: 'Réflexions sur la vie simple dans la nature.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/205/pg205.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/205/205-0.txt',
      category: 'Philosophy',
      genres: ['Philosophie', 'Nature', 'Non-fiction'],
    },
    {
      id: 'meditations',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      description: 'Réflexions philosophiques d\'un empereur romain stoïcien.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2680/pg2680.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2680/2680-0.txt',
      category: 'Philosophy',
      genres: ['Philosophie', 'Stoïcisme', 'Non-fiction'],
    },
    {
      id: 'art-of-war',
      title: 'The Art of War',
      author: 'Sun Tzu',
      description: 'Traité militaire chinois ancien sur la stratégie.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/132/pg132.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/132/132-0.txt',
      category: 'Military Strategy',
      genres: ['Stratégie', 'Guerre', 'Non-fiction'],
    },
    {
      id: 'nicomachean-ethics',
      title: 'The Nicomachean Ethics',
      author: 'Aristotle',
      description: 'Traité fondamental d\'Aristote sur l\'éthique et la vertu.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/8438/pg8438.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/8438/8438-0.txt',
      category: 'Philosophy',
      genres: ['Philosophie', 'Éthique', 'Classique'],
    },
    {
      id: 'utopia',
      title: 'Utopia',
      author: 'Thomas More',
      description: 'Description d\'une société idéale sur une île fictive.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2130/pg2130.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2130/2130-0.txt',
      category: 'Political Philosophy',
      genres: ['Philosophie', 'Politique', 'Utopie'],
    },
    {
      id: 'candide',
      title: 'Candide',
      author: 'Voltaire',
      description: 'Satire philosophique sur l\'optimisme naïf.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/19942/pg19942.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/19942/19942-0.txt',
      category: 'Satire',
      genres: ['Satire', 'Philosophie', 'Classique'],
    },
    {
      id: 'faust',
      title: 'Faust',
      author: 'Johann Wolfgang von Goethe',
      description: 'Un érudit vend son âme au diable en échange de la connaissance.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/14591/pg14591.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/14591/14591-0.txt',
      category: 'Drama',
      genres: ['Drame', 'Philosophique', 'Classique'],
    },
    {
      id: 'divine-comedy',
      title: 'The Divine Comedy',
      author: 'Dante Alighieri',
      description: 'Voyage de Dante à travers l\'Enfer, le Purgatoire et le Paradis.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/8800/pg8800.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/8800/8800-0.txt',
      category: 'Epic Poetry',
      genres: ['Poésie', 'Épopée', 'Religion'],
    },
    {
      id: 'beowulf',
      title: 'Beowulf',
      author: 'Unknown',
      description: 'Épopée anglo-saxonne sur un héros qui combat des monstres.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/16328/pg16328.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/16328/16328-0.txt',
      category: 'Epic Poetry',
      genres: ['Épopée', 'Mythologie', 'Classique'],
    },
    {
      id: 'canterbury-tales',
      title: 'The Canterbury Tales',
      author: 'Geoffrey Chaucer',
      description: 'Collection d\'histoires racontées par des pèlerins en route vers Canterbury.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2383/pg2383.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2383/2383-0.txt',
      category: 'Poetry',
      genres: ['Poésie', 'Contes', 'Classique'],
    },
    {
      id: 'leaves-of-grass',
      title: 'Leaves of Grass',
      author: 'Walt Whitman',
      description: 'Collection de poèmes célébrant l\'individualisme et la démocratie.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1322/pg1322.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1322/1322-0.txt',
      category: 'Poetry',
      genres: ['Poésie', 'Modernisme', 'Classique'],
    },
    {
      id: 'paradise-lost',
      title: 'Paradise Lost',
      author: 'John Milton',
      description: 'Épopée sur la chute de l\'homme et la révolte de Satan.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/20/pg20.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/20/20-0.txt',
      category: 'Epic Poetry',
      genres: ['Poésie', 'Épopée', 'Religion'],
    },
    {
      id: 'sonnets-shakespeare',
      title: 'Shakespeare\'s Sonnets',
      author: 'William Shakespeare',
      description: 'Collection de 154 sonnets sur l\'amour, la beauté et le temps.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1041/pg1041.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1041/1041-0.txt',
      category: 'Poetry',
      genres: ['Poésie', 'Romance', 'Classique'],
    },
    {
      id: 'romeo-juliet',
      title: 'Romeo and Juliet',
      author: 'William Shakespeare',
      description: 'La tragique histoire d\'amour de deux jeunes amants.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1112/pg1112.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1112/1112-0.txt',
      category: 'Drama',
      genres: ['Drame', 'Tragédie', 'Romance'],
    },
    {
      id: 'hamlet',
      title: 'Hamlet',
      author: 'William Shakespeare',
      description: 'Le prince du Danemark cherche à venger le meurtre de son père.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1524/pg1524.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1524/1524-0.txt',
      category: 'Drama',
      genres: ['Drame', 'Tragédie', 'Classique'],
    },
    {
      id: 'macbeth',
      title: 'Macbeth',
      author: 'William Shakespeare',
      description: 'Un général écossais assassine le roi pour s\'emparer du trône.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1533/pg1533.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1533/1533-0.txt',
      category: 'Drama',
      genres: ['Drame', 'Tragédie', 'Classique'],
    },
    {
      id: 'othello',
      title: 'Othello',
      author: 'William Shakespeare',
      description: 'La jalousie détruit le mariage d\'un général maure.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1531/pg1531.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1531/1531-0.txt',
      category: 'Drama',
      genres: ['Drame', 'Tragédie', 'Classique'],
    },
    {
      id: 'princess-mars',
      title: 'A Princess of Mars',
      author: 'Edgar Rice Burroughs',
      description: 'John Carter est transporté sur Mars et vit des aventures épiques.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/62/pg62.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/62/62-0.txt',
      category: 'Science Fiction',
      genres: ['Science-Fiction', 'Aventure', 'Fantasy'],
    },
    {
      id: 'gullivers-travels',
      title: 'Les Voyages de Gulliver',
      author: 'Jonathan Swift',
      description: 'Voyages satiriques de Gulliver dans des terres extraordinaires.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/829/pg829.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/829/829-0.txt',
      category: 'Satire',
      genres: ['Satire', 'Aventure', 'Fantasy'],
    },
    {
      id: 'kidnapped',
      title: 'Kidnapped',
      author: 'Robert Louis Stevenson',
      description: 'David Balfour est kidnappé et vit des aventures en Écosse.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/421/pg421.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/421/421-0.txt',
      category: 'Adventure',
      genres: ['Aventure', 'Historique', 'Classique'],
    },
    {
      id: 'republic-plato',
      title: 'La République',
      author: 'Platon',
      description: 'Dialogue socratique sur la justice et l\'État idéal.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1497/pg1497.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1497/1497-0.txt',
      category: 'Philosophy',
      genres: ['Philosophie', 'Politique', 'Classique'],
    },
    {
      id: 'prince-machiavel',
      title: 'Le Prince',
      author: 'Nicolas Machiavel',
      description: 'Traité de philosophie politique sur l\'art de gouverner.',
      language: 'en',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1232/pg1232.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1232/1232-0.txt',
      category: 'Political Philosophy',
      genres: ['Politique', 'Philosophie', 'Classique'],
    },
    {
      id: 'fleurs-mal',
      title: 'Les Fleurs du mal',
      author: 'Charles Baudelaire',
      description: 'Recueil de poèmes explorant le beau et le décadent.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/6099/pg6099.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/6099/6099-0.txt',
      category: 'Poetry',
      genres: ['Poésie', 'Symbolisme', 'Classique'],
    },
  ];

  getAvailableBooks(): OpenSourceBook[] {
    return this.openSourceBooks;
  }

  getExtendedBooks(): OpenSourceBook[] {
    return this.extendedBooks;
  }

  getAllBooks(): OpenSourceBook[] {
    return [...this.openSourceBooks, ...this.extendedBooks];
  }

  getMegaCollection(): OpenSourceBook[] {
    return this.megaCollection;
  }

  getAllAvailableBooks(): OpenSourceBook[] {
    return [...this.openSourceBooks, ...this.extendedBooks, ...this.megaCollection];
  }

  async importBook(book: OpenSourceBook, onProgress?: (message: string, progress: number) => void): Promise<string> {
    console.log(`🔧 importBook() appelé pour: "${book.title}"`);
    console.log(`   - downloadUrl présent: ${!!book.downloadUrl}`);
    console.log(`   - coverUrl présent: ${!!book.coverUrl}`);
    
    try {
      const user = auth.currentUser;
      console.log(`   - User ID: ${user?.uid || 'AUCUN'}`);
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      onProgress?.('Création du livre...', 10);
      console.log(`   📊 Progress 10%: Création du livre...`);

      // 1. Créer le livre dans Firestore
      console.log(`   📝 Création du livre dans Firestore...`);
      const bookData = {
        title: book.title,
        authorName: book.author,
        description: book.description,
        language: book.language,
        category: book.category || 'Fiction',
        genres: book.genres || ['Classique'],
        authorId: user.uid,
        createdAt: new Date(),
        status: 'published',
        coverImageUrl: '',
        isPublic: true,
        isOpenSource: true,
      };

      const bookRef = await addDoc(collection(db, 'books'), bookData);
      const bookId = bookRef.id;
      console.log(`   ✅ Livre créé dans Firestore avec ID: ${bookId}`);

      onProgress?.('Livre créé. Téléchargement de la couverture...', 30);
      console.log(`   📊 Progress 30%: Livre créé. Téléchargement de la couverture...`);

      // 2. Upload de la couverture
      if (book.coverUrl) {
        try {
          console.log(`   🖼️ Tentative téléchargement couverture: ${book.coverUrl}`);
          onProgress?.('Téléchargement de la couverture...', 40);
          console.log(`   📊 Progress 40%: Téléchargement de la couverture...`);
          
          const coverImageUrl = await this.storageService.uploadImageFromUrl(
            book.coverUrl,
            `books/${user.uid}/${bookId}/cover.jpg`
          );
          
          console.log(`   ✅ Couverture uploadée: ${coverImageUrl}`);
          onProgress?.('Upload de la couverture...', 60);
          console.log(`   📊 Progress 60%: Upload de la couverture...`);

          await updateDoc(bookRef, { coverImageUrl });
          console.log(`   ✅ Livre mis à jour avec coverImageUrl`);
          onProgress?.('✅ Couverture uploadée !', 70);
          console.log(`   📊 Progress 70%: ✅ Couverture uploadée !`);
        } catch (error) {
          console.log(`   ⚠️ Erreur upload couverture (on continue):`, error);
        }
      }

      // 3. Télécharger et sauvegarder le contenu
      if (book.downloadUrl) {
        try {
          onProgress?.('Téléchargement du contenu du livre...', 75);
          console.log(`   📊 Progress 75%: Téléchargement du contenu du livre...`);
          console.log(`   📥 Téléchargement du contenu depuis: ${book.downloadUrl}`);
          
          const response = await fetch(book.downloadUrl);
          console.log(`   ✅ Réponse HTTP reçue (status: ${response.status})`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const text = await response.text();
          console.log(`   ✅ Texte téléchargé (${text.length} caractères)`);

          // Sauvegarder les premiers 50000 caractères
          const content = text.substring(0, 50000);
          console.log(`   💾 Sauvegarde du contenu (${content.length} caractères)...`);

          await updateDoc(bookRef, { content });
          console.log(`   ✅ Contenu sauvegardé avec succès!`);
          
          onProgress?.('Contenu téléchargé !', 90);
          console.log(`   📊 Progress 90%: Contenu téléchargé !`);
        } catch (error) {
          console.error(`   ❌ Impossible de télécharger le contenu:`, error);
          console.error(`   URL: ${book.downloadUrl}`);
          console.error(`   Message:`, (error as Error).message);
          onProgress?.('Contenu non disponible', 90);
          console.log(`   📊 Progress 90%: Contenu non disponible`);
        }
      }

      onProgress?.('✅ Import terminé !', 100);
      console.log(`   🎉 Import terminé avec succès!`);
      console.log(`   📊 Progress 100%: ✅ Import terminé !`);
      return bookId;

    } catch (error) {
      console.error(`❌ Erreur lors de l'import du livre:`, error);
      throw error;
    }
  }

  async importMultipleBooks(
    bookIds: string[],
    onProgress?: (current: number, total: number, bookTitle: string) => void
  ): Promise<{ success: string[], failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };
    
    console.log(`\n🚀 DÉBUT IMPORT DE ${bookIds.length} LIVRES`);
    console.log(`📋 IDs: ${bookIds.join(', ')}`);
    
    // Chercher dans TOUS les livres disponibles
    const allBooks = [...this.openSourceBooks, ...this.extendedBooks, ...this.megaCollection];
    console.log(`📚 Recherche dans ${allBooks.length} livres disponibles (base + extended + mega)`);

    for (let i = 0; i < bookIds.length; i++) {
      const bookId = bookIds[i];
      console.log(`\n📚 [${i + 1}/${bookIds.length}] Recherche du livre: ${bookId}`);
      
      const book = allBooks.find(b => b.id === bookId);
      
      if (!book) {
        console.log(`   ❌ LIVRE NON TROUVÉ dans la liste`);
        results.failed.push(bookId);
        continue;
      }

      console.log(`   ✅ Livre trouvé: "${book.title}" par ${book.author}`);
      console.log(`   - downloadUrl: ${book.downloadUrl}`);
      console.log(`   - coverUrl: ${book.coverUrl}`);

      try {
        console.log(`   ⏳ Début import de "${book.title}"...`);
        onProgress?.(i + 1, bookIds.length, book.title);

        const bookDbId = await this.importBook(book, (message, progress) => {
          console.log(`   📊 Progress ${progress}%: ${message}`);
        });

        results.success.push(bookDbId);
        console.log(`   ✅ SUCCESS: "${book.title}" importé avec ID: ${bookDbId}`);

      } catch (error) {
        console.error(`   ❌ FAILED: Erreur import "${book.title}":`, error);
        results.failed.push(bookId);
      }
    }

    console.log(`\n🏁 RÉSULTAT FINAL:`);
    console.log(`   ✅ Succès: ${results.success.length} livres`);
    console.log(`   ❌ Échecs: ${results.failed.length} livres`);

    return results;
  }
}

export const openSourceBooksService = OpenSourceBooksService.getInstance();
