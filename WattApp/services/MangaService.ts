import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';

export interface MangaProject {
  id: string;
  userId: string;
  title: string;
  synopsis: string;
  description: string;
  author: string;
  price: number;
  currency: 'EUR' | 'USD';
  isFree: boolean;
  tags: string[];
  category: string;
  genre: string[];
  targetAudience: 'children' | 'teen' | 'adult' | 'all';
  language: string;
  coverImageUrl?: string;
  previewPages: number;
  totalPages: number;
  publishDate: Date;
  lastModified: Date;
  isPublished: boolean;
  isDraft: boolean;
  rating: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
  copyrightInfo: string;
  collaborators: string[];
  socialLinks: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  
  // Analytics
  views: number;
  downloads: number;
  likes: number;
  rating_average: number;
  rating_count: number;
  
  // Content
  pages: MangaPage[];
  chapters?: MangaChapter[];
  
  // Metadata
  fileSize: number;
  format: 'web' | 'print' | 'both';
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
}

export interface MangaPage {
  id: string;
  pageNumber: number;
  imageUrl: string;
  drawingData?: string; // SVG path data
  textBubbles: TextBubble[];
  panels: PanelData[];
  isPreview: boolean;
}

export interface TextBubble {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderRadius: number;
  };
  type: 'speech' | 'thought' | 'narration' | 'sound';
}

export interface PanelData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderWidth: number;
  borderColor: string;
  backgroundColor?: string;
}

export interface MangaChapter {
  id: string;
  title: string;
  chapterNumber: number;
  pageStart: number;
  pageEnd: number;
  publishDate: Date;
  isPublished: boolean;
}

export interface MangaTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnailUrl: string;
  templateData: {
    width: number;
    height: number;
    panels: PanelData[];
    textBubbles: TextBubble[];
  };
  isPublic: boolean;
  createdBy: string;
  downloads: number;
  tags: string[];
}

export interface UserMangaStats {
  totalPublished: number;
  totalDrafts: number;
  totalViews: number;
  totalDownloads: number;
  totalEarnings: number;
  followersCount: number;
}

class MangaService {
  // CRUD operations for manga projects
  async createMangaProject(projectData: Omit<MangaProject, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'mangaProjects'), {
        ...projectData,
        publishDate: serverTimestamp(),
        lastModified: serverTimestamp(),
        views: 0,
        downloads: 0,
        likes: 0,
        rating_average: 0,
        rating_count: 0,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating manga project:', error);
      throw error;
    }
  }

  async getMangaProject(projectId: string): Promise<MangaProject | null> {
    try {
      const docRef = doc(db, 'mangaProjects', projectId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as MangaProject;
      }
      return null;
    } catch (error) {
      console.error('Error getting manga project:', error);
      throw error;
    }
  }

  async updateMangaProject(projectId: string, updates: Partial<MangaProject>): Promise<void> {
    try {
      const docRef = doc(db, 'mangaProjects', projectId);
      await updateDoc(docRef, {
        ...updates,
        lastModified: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating manga project:', error);
      throw error;
    }
  }

  async deleteMangaProject(projectId: string): Promise<void> {
    try {
      // Delete associated files from storage
      const project = await this.getMangaProject(projectId);
      if (project) {
        if (project.coverImageUrl) {
          await this.deleteFile(project.coverImageUrl);
        }
        
        // Delete page images
        for (const page of project.pages) {
          if (page.imageUrl) {
            await this.deleteFile(page.imageUrl);
          }
        }
      }
      
      // Delete the document
      await deleteDoc(doc(db, 'mangaProjects', projectId));
    } catch (error) {
      console.error('Error deleting manga project:', error);
      throw error;
    }
  }

  // User's manga projects
  async getUserMangaProjects(userId: string, includePublished = true, includeDrafts = true): Promise<MangaProject[]> {
    try {
      const constraints = [where('userId', '==', userId)];
      
      if (!includePublished) {
        constraints.push(where('isPublished', '==', false));
      }
      if (!includeDrafts) {
        constraints.push(where('isDraft', '==', false));
      }
      
      const q = query(
        collection(db, 'mangaProjects'),
        ...constraints,
        orderBy('lastModified', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MangaProject));
    } catch (error) {
      console.error('Error getting user manga projects:', error);
      throw error;
    }
  }

  // Published manga for marketplace
  async getPublishedManga(
    category?: string,
    genre?: string,
    limit_count = 20,
    orderByField: 'publishDate' | 'views' | 'rating_average' = 'publishDate'
  ): Promise<MangaProject[]> {
    try {
      const constraints = [
        where('isPublished', '==', true),
        where('isDraft', '==', false)
      ];
      
      if (category) {
        constraints.push(where('category', '==', category));
      }
      
      if (genre) {
        constraints.push(where('genre', 'array-contains', genre));
      }
      
      const q = query(
        collection(db, 'mangaProjects'),
        ...constraints,
        orderBy(orderByField, 'desc'),
        limit(limit_count)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MangaProject));
    } catch (error) {
      console.error('Error getting published manga:', error);
      throw error;
    }
  }

  // Search manga
  async searchManga(searchTerm: string): Promise<MangaProject[]> {
    try {
      // Firebase doesn't support full-text search, so we'll search by title and tags
      const titleQuery = query(
        collection(db, 'mangaProjects'),
        where('isPublished', '==', true),
        where('title', '>=', searchTerm),
        where('title', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      
      const tagsQuery = query(
        collection(db, 'mangaProjects'),
        where('isPublished', '==', true),
        where('tags', 'array-contains-any', [searchTerm]),
        limit(10)
      );
      
      const [titleSnapshot, tagsSnapshot] = await Promise.all([
        getDocs(titleQuery),
        getDocs(tagsQuery)
      ]);
      
      const results = new Map<string, MangaProject>();
      
      titleSnapshot.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() } as MangaProject);
      });
      
      tagsSnapshot.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() } as MangaProject);
      });
      
      return Array.from(results.values());
    } catch (error) {
      console.error('Error searching manga:', error);
      throw error;
    }
  }

  // File storage operations - DISABLED (no Firebase Storage)
  async uploadFile(file: Blob, path: string): Promise<string> {
    /*
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    */
    throw new Error('File upload disabled - no Firebase Storage');
  }

  async deleteFile(url: string): Promise<void> {
    /*
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw error for file deletion failures
    }
    */
    console.warn('File deletion disabled - no Firebase Storage');
  }

  // Cover image upload
  async uploadCoverImage(projectId: string, imageBlob: Blob): Promise<string> {
    const path = `manga/${projectId}/cover.jpg`;
    return await this.uploadFile(imageBlob, path);
  }

  // Page image upload
  async uploadPageImage(projectId: string, pageNumber: number, imageBlob: Blob): Promise<string> {
    const path = `manga/${projectId}/pages/page_${pageNumber}.jpg`;
    return await this.uploadFile(imageBlob, path);
  }

  // Analytics
  async incrementViews(projectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'mangaProjects', projectId);
      await updateDoc(docRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }

  async incrementDownloads(projectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'mangaProjects', projectId);
      await updateDoc(docRef, {
        downloads: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing downloads:', error);
    }
  }

  // User stats
  async getUserStats(userId: string): Promise<UserMangaStats> {
    try {
      const userProjectsQuery = query(
        collection(db, 'mangaProjects'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(userProjectsQuery);
      const projects = querySnapshot.docs.map(doc => doc.data() as MangaProject);
      
      const stats: UserMangaStats = {
        totalPublished: projects.filter(p => p.isPublished && !p.isDraft).length,
        totalDrafts: projects.filter(p => p.isDraft).length,
        totalViews: projects.reduce((sum, p) => sum + (p.views || 0), 0),
        totalDownloads: projects.reduce((sum, p) => sum + (p.downloads || 0), 0),
        totalEarnings: 0, // Would be calculated from sales data
        followersCount: 0, // Would come from user followers collection
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Templates management
  async createTemplate(templateData: Omit<MangaTemplate, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'mangaTemplates'), {
        ...templateData,
        downloads: 0,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async getPublicTemplates(): Promise<MangaTemplate[]> {
    try {
      const q = query(
        collection(db, 'mangaTemplates'),
        where('isPublic', '==', true),
        orderBy('downloads', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MangaTemplate));
    } catch (error) {
      console.error('Error getting public templates:', error);
      throw error;
    }
  }

  async incrementTemplateDownloads(templateId: string): Promise<void> {
    try {
      const docRef = doc(db, 'mangaTemplates', templateId);
      await updateDoc(docRef, {
        downloads: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing template downloads:', error);
    }
  }

  // Real-time subscriptions
  subscribeToMangaProject(projectId: string, callback: (project: MangaProject | null) => void) {
    const docRef = doc(db, 'mangaProjects', projectId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as MangaProject);
      } else {
        callback(null);
      }
    });
  }

  subscribeToUserProjects(userId: string, callback: (projects: MangaProject[]) => void) {
    const q = query(
      collection(db, 'mangaProjects'),
      where('userId', '==', userId),
      orderBy('lastModified', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MangaProject));
      callback(projects);
    });
  }

  // Publish operations
  async publishManga(projectId: string): Promise<void> {
    try {
      await this.updateMangaProject(projectId, {
        isPublished: true,
        isDraft: false,
        publishDate: new Date(),
      });
    } catch (error) {
      console.error('Error publishing manga:', error);
      throw error;
    }
  }

  async unpublishManga(projectId: string): Promise<void> {
    try {
      await this.updateMangaProject(projectId, {
        isPublished: false,
        isDraft: true,
      });
    } catch (error) {
      console.error('Error unpublishing manga:', error);
      throw error;
    }
  }

  // Page operations
  async savePage(projectId: string, pageData: MangaPage): Promise<void> {
    try {
      const project = await this.getMangaProject(projectId);
      if (!project) throw new Error('Project not found');
      
      const updatedPages = project.pages.filter(p => p.id !== pageData.id);
      updatedPages.push(pageData);
      updatedPages.sort((a, b) => a.pageNumber - b.pageNumber);
      
      await this.updateMangaProject(projectId, {
        pages: updatedPages,
        totalPages: updatedPages.length,
      });
    } catch (error) {
      console.error('Error saving page:', error);
      throw error;
    }
  }

  async deletePage(projectId: string, pageId: string): Promise<void> {
    try {
      const project = await this.getMangaProject(projectId);
      if (!project) throw new Error('Project not found');
      
      const pageToDelete = project.pages.find(p => p.id === pageId);
      if (pageToDelete?.imageUrl) {
        await this.deleteFile(pageToDelete.imageUrl);
      }
      
      const updatedPages = project.pages.filter(p => p.id !== pageId);
      
      await this.updateMangaProject(projectId, {
        pages: updatedPages,
        totalPages: updatedPages.length,
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  }
}

export const mangaService = new MangaService();