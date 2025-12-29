import { getAuth } from 'firebase/auth';
import BookService from './BookService';
import StorageService from './StorageService';

/**
 * Service pour importer des livres open source depuis diverses sources
 */

interface OpenSourceBook {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  coverUrl?: string;
  downloadUrl?: string;
  category: string;
  genres: string[];
  tags: string[];
}

class OpenSourceBooksService {
  
  /**
   * Liste de livres open source populaires (Project Gutenberg, etc.)
   */
  private openSourceBooks: OpenSourceBook[] = [
    {
      id: 'alice-wonderland',
      title: 'Alice au pays des merveilles',
      author: 'Lewis Carroll',
      description: 'L\'histoire fantastique d\'une jeune fille nommée Alice qui tombe dans un terrier de lapin et découvre un monde extraordinaire peuplé de créatures étranges.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/55/pg55.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/55/55-0.txt',
      category: 'Fiction',
      genres: ['Fantasy', 'Aventure', 'Enfants'],
      tags: ['classique', 'fantasy', 'jeunesse', 'aventure'],
    },
    {
      id: 'sherlock-holmes',
      title: 'Les Aventures de Sherlock Holmes',
      author: 'Arthur Conan Doyle',
      description: 'Recueil de nouvelles mettant en scène le célèbre détective Sherlock Holmes et son fidèle compagnon le Dr Watson dans leurs enquêtes les plus passionnantes.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1661/1661-0.txt',
      category: 'Mystère',
      genres: ['Mystère', 'Policier', 'Classique'],
      tags: ['sherlock', 'mystère', 'détective', 'enquête'],
    },
    {
      id: 'pride-prejudice',
      title: 'Orgueil et Préjugés',
      author: 'Jane Austen',
      description: 'Roman classique racontant l\'histoire d\'Elizabeth Bennet et ses relations avec le fier M. Darcy dans l\'Angleterre du XIXe siècle.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1342/1342-0.txt',
      category: 'Romance',
      genres: ['Romance', 'Classique', 'Drame'],
      tags: ['romance', 'classique', 'historique', 'angleterre'],
    },
    {
      id: 'twenty-thousand-leagues',
      title: 'Vingt mille lieues sous les mers',
      author: 'Jules Verne',
      description: 'Les aventures du professeur Aronnax, de son domestique Conseil et du harponneur Ned Land à bord du Nautilus, le sous-marin du mystérieux Capitaine Nemo.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/164/pg164.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/164/164-0.txt',
      category: 'Science-Fiction',
      genres: ['Science-Fiction', 'Aventure', 'Classique'],
      tags: ['jules-verne', 'aventure', 'sous-marin', 'océan'],
    },
    {
      id: 'three-musketeers',
      title: 'Les Trois Mousquetaires',
      author: 'Alexandre Dumas',
      description: 'Les aventures de d\'Artagnan et ses trois compagnons mousquetaires dans la France du XVIIe siècle sous le règne de Louis XIII.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1257/pg1257.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1257/1257-0.txt',
      category: 'Aventure',
      genres: ['Aventure', 'Historique', 'Action'],
      tags: ['mousquetaires', 'aventure', 'historique', 'action'],
    },
    {
      id: 'dracula',
      title: 'Dracula',
      author: 'Bram Stoker',
      description: 'L\'histoire terrifiante du comte Dracula et de sa confrontation avec un groupe de chasseurs de vampires déterminés à l\'arrêter.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/345/345-0.txt',
      category: 'Horreur',
      genres: ['Horreur', 'Gothic', 'Classique'],
      tags: ['vampire', 'horreur', 'gothic', 'dracula'],
    },
    {
      id: 'count-monte-cristo',
      title: 'Le Comte de Monte-Cristo',
      author: 'Alexandre Dumas',
      description: 'L\'histoire épique d\'Edmond Dantès, injustement emprisonné, qui s\'évade et revient se venger de ceux qui l\'ont trahi.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/1184/pg1184.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/1184/1184-0.txt',
      category: 'Aventure',
      genres: ['Aventure', 'Drame', 'Historique'],
      tags: ['vengeance', 'aventure', 'historique', 'trésor'],
    },
    {
      id: 'frankenstein',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      description: 'L\'histoire du scientifique Victor Frankenstein et de la créature qu\'il crée, explorant les thèmes de l\'ambition et de la responsabilité.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/84/84-0.txt',
      category: 'Science-Fiction',
      genres: ['Science-Fiction', 'Horreur', 'Gothic'],
      tags: ['frankenstein', 'monstre', 'science', 'créature'],
    },
    {
      id: 'moby-dick',
      title: 'Moby Dick',
      author: 'Herman Melville',
      description: 'Le récit épique de la quête obsessionnelle du capitaine Ahab pour capturer la baleine blanche qui lui a arraché une jambe.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2701/2701-0.txt',
      category: 'Aventure',
      genres: ['Aventure', 'Classique', 'Maritime'],
      tags: ['baleine', 'océan', 'aventure', 'obsession'],
    },
    {
      id: 'war-peace',
      title: 'Guerre et Paix',
      author: 'Léon Tolstoï',
      description: 'Épopée monumentale suivant plusieurs familles aristocratiques russes pendant les guerres napoléoniennes.',
      language: 'fr',
      coverUrl: 'https://www.gutenberg.org/cache/epub/2600/pg2600.cover.medium.jpg',
      downloadUrl: 'https://www.gutenberg.org/files/2600/2600-0.txt',
      category: 'Historique',
      genres: ['Historique', 'Drame', 'Classique'],
      tags: ['russie', 'guerre', 'historique', 'épique'],
    },
  ];

  /**
   * Récupère la liste des livres disponibles
   */
  getAvailableBooks(): OpenSourceBook[] {
    return this.openSourceBooks;
  }

  /**
   * Importe un livre open source dans Firebase
   */
  async importBook(book: OpenSourceBook, onProgress?: (message: string, progress: number) => void): Promise<string> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error('User not authenticated');
      }

      onProgress?.('Création du livre...', 10);

      // 1. Créer le livre dans Firestore
      const bookId = await BookService.createBook({
        title: book.title,
        description: book.description,
        synopsis: book.description.substring(0, 200) + '...',
        userId: user.uid,
        authorId: user.uid,
        authorName: book.author,
        category: book.category,
        genre: book.genres,
        tags: book.tags,
        language: book.language,
        isPublished: true,
        isDraft: false,
        isFree: true,
        price: 0,
        currency: 'EUR',
        rating: 'G',
        status: 'completed',
        isAdult: false,
        copyrightInfo: 'Domaine public - Source: Project Gutenberg',
        body: '',
        publishDate: new Date(),
        lastModified: new Date(),
        views: 0,
        downloads: 0,
        likes: 0,
        rating_average: 0,
        rating_count: 0,
        totalChapters: 0,
      } as any);

      onProgress?.('Livre créé. Téléchargement de la couverture...', 30);

      // 2. Télécharger et uploader la vraie couverture depuis Project Gutenberg
      if (book.coverUrl) {
        try {
          onProgress?.('Téléchargement de la couverture...', 40);
          
          // Télécharger l'image depuis Project Gutenberg
          const coverUrl = await StorageService.uploadBookCover(
            book.coverUrl,
            bookId,
            user.uid
          );

          onProgress?.('Upload de la couverture...', 60);

          // Mettre à jour le livre avec l'URL de la couverture
          await BookService.updateBook(bookId, {
            coverImageUrl: coverUrl,
          });

          onProgress?.('✅ Couverture uploadée !', 70);
        } catch (error) {
          console.warn('Impossible d\'uploader la couverture:', error);
          
          // Fallback: générer une couverture colorée avec le titre
          const colors = [
            { bg: '6366F1', color: 'FFFFFF' }, // Indigo
            { bg: 'EC4899', color: 'FFFFFF' }, // Pink
            { bg: '14B8A6', color: 'FFFFFF' }, // Teal
            { bg: 'F59E0B', color: '000000' }, // Amber
            { bg: '8B5CF6', color: 'FFFFFF' }, // Purple
            { bg: 'EF4444', color: 'FFFFFF' }, // Red
            { bg: '10B981', color: 'FFFFFF' }, // Emerald
            { bg: '3B82F6', color: 'FFFFFF' }, // Blue
            { bg: 'F97316', color: 'FFFFFF' }, // Orange
            { bg: '06B6D4', color: 'FFFFFF' }, // Cyan
          ];
          
          const colorIndex = book.id.length % colors.length;
          const color = colors[colorIndex];
          const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&background=${color.bg}&color=${color.color}&size=400&bold=true&font-size=0.4`;
          
          await BookService.updateBook(bookId, {
            coverImageUrl: fallbackUrl,
          });
          
          onProgress?.('Couverture générée (fallback)', 70);
        }
      } else {
        // Pas de couverture disponible, générer un placeholder
        const colors = [
          { bg: '6366F1', color: 'FFFFFF' },
          { bg: 'EC4899', color: 'FFFFFF' },
          { bg: '14B8A6', color: 'FFFFFF' },
          { bg: 'F59E0B', color: '000000' },
          { bg: '8B5CF6', color: 'FFFFFF' },
          { bg: 'EF4444', color: 'FFFFFF' },
          { bg: '10B981', color: 'FFFFFF' },
          { bg: '3B82F6', color: 'FFFFFF' },
          { bg: 'F97316', color: 'FFFFFF' },
          { bg: '06B6D4', color: 'FFFFFF' },
        ];
        
        const colorIndex = book.id.length % colors.length;
        const color = colors[colorIndex];
        const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(book.title)}&background=${color.bg}&color=${color.color}&size=400&bold=true&font-size=0.4`;
        
        await BookService.updateBook(bookId, {
          coverImageUrl: placeholderUrl,
        });
        
        onProgress?.('Couverture générée', 50);
      }

      onProgress?.('Téléchargement du contenu du livre...', 75);

      // 3. Télécharger le contenu du livre si disponible
      if (book.downloadUrl) {
        try {
          const response = await fetch(book.downloadUrl);
          const text = await response.text();

          // Extraire les premiers chapitres (limiter la taille)
          const maxLength = 50000; // Environ 50KB
          const truncatedText = text.length > maxLength 
            ? text.substring(0, maxLength) + '\n\n[...suite disponible au téléchargement...]'
            : text;

          // Mettre à jour le livre avec le contenu
          await BookService.updateBook(bookId, {
            body: truncatedText,
          });

          onProgress?.('Contenu téléchargé !', 90);
        } catch (error) {
          console.warn('Impossible de télécharger le contenu:', error);
          onProgress?.('Contenu non disponible', 90);
        }
      }

      onProgress?.('✅ Import terminé !', 100);

      return bookId;
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      throw error;
    }
  }

  /**
   * Importe plusieurs livres en batch
   */
  async importMultipleBooks(
    bookIds: string[],
    onBookProgress?: (bookTitle: string, progress: number) => void,
    onOverallProgress?: (completed: number, total: number) => void
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < bookIds.length; i++) {
      const bookId = bookIds[i];
      const book = this.openSourceBooks.find(b => b.id === bookId);

      if (!book) {
        failed.push(bookId);
        continue;
      }

      try {
        onBookProgress?.(book.title, 0);
        
        const importedId = await this.importBook(
          book,
          (message, progress) => {
            onBookProgress?.(book.title, progress);
          }
        );
        
        success.push(importedId);
        onOverallProgress?.(i + 1, bookIds.length);
      } catch (error) {
        console.error(`Erreur import ${book.title}:`, error);
        failed.push(bookId);
      }

      // Pause entre chaque livre pour ne pas surcharger
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success, failed };
  }

  /**
   * Importe tous les livres disponibles
   */
  async importAllBooks(
    onBookProgress?: (bookTitle: string, progress: number) => void,
    onOverallProgress?: (completed: number, total: number) => void
  ): Promise<{ success: string[]; failed: string[] }> {
    const allBookIds = this.openSourceBooks.map(b => b.id);
    return this.importMultipleBooks(allBookIds, onBookProgress, onOverallProgress);
  }
}

export default new OpenSourceBooksService();
