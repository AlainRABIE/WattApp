import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../constants/firebaseConfig';

export interface DrawingPath {
  id: string;
  d: string;
  stroke: string;
  strokeWidth: number;
  tool: 'pen' | 'brush' | 'eraser';
  timestamp: number;
}

export interface TextBubble {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  borderRadius: number;
  rotation: number;
  style: 'speech' | 'thought' | 'shout' | 'whisper';
}

export interface MangaPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  paths: DrawingPath[];
  textBubbles: TextBubble[];
  backgroundImage?: string;
  order: number;
}

export interface MangaPage {
  id: string;
  pageNumber: number;
  panels: MangaPanel[];
  title?: string;
  backgroundColor?: string;
  order: number;
}

export interface MangaProject {
  id: string;
  title: string;
  authorId: string;
  authorUid: string; // Pour compatibilité avec 'books'
  author: string; // Nom d'affichage
  createdAt: any;
  updatedAt: any;
  status: 'draft' | 'writing' | 'editing' | 'published';
  pages: MangaPage[]; // Changé de 'panels' vers 'pages'
  currentPageId?: string;
  templateId?: string;
  isPublished: boolean;
  description?: string;
  coverImage?: string;
  genre?: string;
  tags?: string[];
  totalPages: number;
  type: 'manga'; // Identificateur de type
}

class MangaProjectService {
  private db = db;

  // Fonction utilitaire pour nettoyer les données
  private cleanData = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanData(item)).filter(item => item !== null);
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = this.cleanData(obj[key]);
        if (value !== null && value !== undefined) {
          cleaned[key] = value;
        }
      });
      return Object.keys(cleaned).length > 0 ? cleaned : null;
    }
    
    return obj;
  };

  // Créer une page par défaut
  private createDefaultPage(pageNumber: number = 1): MangaPage {
    return {
      id: pageNumber.toString(),
      pageNumber,
      order: pageNumber - 1,
      title: `Page ${pageNumber}`,
      panels: [
        {
          id: '1',
          x: 5,
          y: 5,
          width: 90,
          height: 90,
          paths: [],
          textBubbles: [],
          order: 0,
        }
      ],
    };
  }

  // Créer un nouveau projet manga
  async createProject(projectData: {
    title: string;
    authorId: string;
    authorUid: string;
    author: string;
    pages?: MangaPage[];
    templateId?: string;
    description?: string;
    genre?: string;
  }): Promise<string> {
    try {
      const projectRef = doc(collection(this.db, 'books'));
      const defaultPages = projectData.pages || [this.createDefaultPage()];
      
      const project: MangaProject = {
        id: projectRef.id,
        title: projectData.title,
        authorId: projectData.authorId,
        authorUid: projectData.authorUid,
        author: projectData.author,
        status: 'draft',
        type: 'manga',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pages: defaultPages,
        currentPageId: defaultPages[0].id,
        isPublished: false,
        totalPages: defaultPages.length,
        tags: [],
        genre: projectData.genre || 'Manga',
        templateId: projectData.templateId,
        description: projectData.description,
      };

      const cleanedProject = this.cleanData(project);
      await setDoc(projectRef, cleanedProject);
      console.log('Projet manga créé dans books:', projectRef.id);
      return projectRef.id;
    } catch (error) {
      console.error('Erreur création projet manga:', error);
      throw error;
    }
  }

  // Récupérer un projet par ID depuis 'books'
  async getProject(projectId: string): Promise<MangaProject | null> {
    try {
      const projectRef = doc(this.db, 'books', projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const data = projectSnap.data();
        // Vérifier que c'est bien un projet manga
        if (data.type === 'manga') {
          return data as MangaProject;
        }
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du projet:', error);
      throw error;
    }
  }

  // Ajouter une nouvelle page
  async addPage(projectId: string, insertAfterPageNumber?: number): Promise<MangaPage> {
    try {
      const project = await this.getProject(projectId);
      if (!project) throw new Error('Projet non trouvé');

      const newPageNumber = insertAfterPageNumber ? insertAfterPageNumber + 1 : project.pages.length + 1;
      const newPage = this.createDefaultPage(newPageNumber);

      // Réorganiser les numéros de page si insertion au milieu
      let updatedPages = [...project.pages];
      if (insertAfterPageNumber) {
        // Décaler les pages suivantes
        updatedPages = updatedPages.map(page => {
          if (page.pageNumber >= newPageNumber) {
            return { ...page, pageNumber: page.pageNumber + 1, order: page.order + 1 };
          }
          return page;
        });
      }

      updatedPages.push(newPage);
      updatedPages.sort((a, b) => a.pageNumber - b.pageNumber);

      await this.updateProject(projectId, {
        pages: updatedPages,
        totalPages: updatedPages.length,
        updatedAt: serverTimestamp(),
      });

      return newPage;
    } catch (error) {
      console.error('Erreur ajout page:', error);
      throw error;
    }
  }

  // Supprimer une page
  async deletePage(projectId: string, pageId: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) throw new Error('Projet non trouvé');
      if (project.pages.length <= 1) throw new Error('Impossible de supprimer la dernière page');

      const pageToDelete = project.pages.find(p => p.id === pageId);
      if (!pageToDelete) throw new Error('Page non trouvée');

      // Filtrer la page supprimée et réorganiser
      let updatedPages = project.pages
        .filter(p => p.id !== pageId)
        .map((page, index) => ({
          ...page,
          pageNumber: index + 1,
          order: index,
        }));

      // Mettre à jour la page courante si nécessaire
      let newCurrentPageId = project.currentPageId;
      if (project.currentPageId === pageId) {
        newCurrentPageId = updatedPages[0]?.id || null;
      }

      await this.updateProject(projectId, {
        pages: updatedPages,
        totalPages: updatedPages.length,
        currentPageId: newCurrentPageId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur suppression page:', error);
      throw error;
    }
  }

  // Sauvegarder une page spécifique
  async savePage(projectId: string, pageId: string, pageData: Partial<MangaPage>): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) throw new Error('Projet non trouvé');

      const updatedPages = project.pages.map(page => {
        if (page.id === pageId) {
          return { ...page, ...this.cleanData(pageData) };
        }
        return page;
      });

      await this.updateProject(projectId, {
        pages: updatedPages,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur sauvegarde page:', error);
      throw error;
    }
  }

  // Sauvegarder les dessins d'un panneau dans une page
  async savePanelDrawings(projectId: string, pageId: string, panelId: string, paths: DrawingPath[]): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) throw new Error('Projet non trouvé');

      const updatedPages = project.pages.map(page => {
        if (page.id === pageId) {
          const updatedPanels = page.panels.map(panel => {
            if (panel.id === panelId) {
              return { ...panel, paths: this.cleanData(paths) };
            }
            return panel;
          });
          return { ...page, panels: updatedPanels };
        }
        return page;
      });

      await this.updateProject(projectId, {
        pages: updatedPages,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur sauvegarde dessins:', error);
      throw error;
    }
  }

  // Mettre à jour les métadonnées du projet
  async updateProject(projectId: string, updates: Partial<MangaProject>): Promise<void> {
    try {
      const projectRef = doc(this.db, 'books', projectId);
      const cleanedUpdates = this.cleanData(updates);
      await updateDoc(projectRef, cleanedUpdates);
    } catch (error) {
      console.error('Erreur mise à jour projet:', error);
      throw error;
    }
  }

  // Mettre à jour la page courante
  async setCurrentPage(projectId: string, pageId: string): Promise<void> {
    try {
      await this.updateProject(projectId, {
        currentPageId: pageId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Erreur changement page courante:', error);
      throw error;
    }
  }

  // Dupliquer une page
  async duplicatePage(projectId: string, pageId: string): Promise<MangaPage> {
    try {
      const project = await this.getProject(projectId);
      if (!project) throw new Error('Projet non trouvé');

      const pageToClone = project.pages.find(p => p.id === pageId);
      if (!pageToClone) throw new Error('Page non trouvée');

      const newPageNumber = project.pages.length + 1;
      const duplicatedPage: MangaPage = {
        ...pageToClone,
        id: Date.now().toString(),
        pageNumber: newPageNumber,
        order: newPageNumber - 1,
        title: `${pageToClone.title} (Copie)`,
      };

      const updatedPages = [...project.pages, duplicatedPage];

      await this.updateProject(projectId, {
        pages: updatedPages,
        totalPages: updatedPages.length,
        updatedAt: serverTimestamp(),
      });

      return duplicatedPage;
    } catch (error) {
      console.error('Erreur duplication page:', error);
      throw error;
    }
  }
}

export const mangaProjectService = new MangaProjectService();