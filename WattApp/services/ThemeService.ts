import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';

export interface AppTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  icon: string;
}

export const appThemes: Record<string, AppTheme> = {
  orange: {
    name: 'Orange (Défaut)',
    colors: {
      primary: '#FFA94D',
      secondary: '#FF8C42',
      background: '#181818',
      surface: '#232323',
      text: '#ffffff',
      textSecondary: '#aaaaaa',
      accent: '#4FC3F7',
      border: '#333333',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    },
    icon: '🧡'
  },
  purple: {
    name: 'Violet',
    colors: {
      primary: '#9C27B0',
      secondary: '#7B1FA2',
      background: '#1A1A2E',
      surface: '#16213E',
      text: '#ffffff',
      textSecondary: '#B0B0B0',
      accent: '#E91E63',
      border: '#3D3D5C',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    },
    icon: '💜'
  },
  blue: {
    name: 'Bleu',
    colors: {
      primary: '#2196F3',
      secondary: '#1976D2',
      background: '#0D1B2A',
      surface: '#1B263B',
      text: '#ffffff',
      textSecondary: '#94A3B8',
      accent: '#00BCD4',
      border: '#334155',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    },
    icon: '💙'
  },
  green: {
    name: 'Vert',
    colors: {
      primary: '#4CAF50',
      secondary: '#388E3C',
      background: '#1B2E1B',
      surface: '#2E3F2E',
      text: '#ffffff',
      textSecondary: '#A5C9A5',
      accent: '#8BC34A',
      border: '#4A5D4A',
      success: '#66BB6A',
      warning: '#FF9800',
      error: '#F44336',
    },
    icon: '💚'
  },
  red: {
    name: 'Rouge',
    colors: {
      primary: '#F44336',
      secondary: '#D32F2F',
      background: '#2E1B1B',
      surface: '#3F2E2E',
      text: '#ffffff',
      textSecondary: '#C9A5A5',
      accent: '#FF5722',
      border: '#5D4A4A',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#EF5350',
    },
    icon: '❤️'
  },
  gold: {
    name: 'Or',
    colors: {
      primary: '#FFD700',
      secondary: '#FFC107',
      background: '#2E2B1B',
      surface: '#3F3C2E',
      text: '#ffffff',
      textSecondary: '#C9C5A5',
      accent: '#FFEB3B',
      border: '#5D5A4A',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
    },
    icon: '✨'
  },
  dark: {
    name: 'Sombre',
    colors: {
      primary: '#BB86FC',
      secondary: '#3700B3',
      background: '#121212',
      surface: '#1E1E1E',
      text: '#ffffff',
      textSecondary: '#AAAAAA',
      accent: '#03DAC6',
      border: '#2C2C2C',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#CF6679',
    },
    icon: '🌙'
  },
  light: {
    name: 'Clair',
    colors: {
      primary: '#6200EE',
      secondary: '#3700B3',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#000000',
      textSecondary: '#666666',
      accent: '#018786',
      border: '#E0E0E0',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#B00020',
    },
    icon: '☀️'
  }
};

class ThemeService {
  private currentTheme: string = 'orange';
  private listeners: Array<(theme: AppTheme) => void> = [];

  async loadUserTheme(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      try {
        const themeRef = doc(db, 'users', user.uid, 'preferences', 'theme');
        const themeSnap = await getDoc(themeRef);
        
        if (themeSnap.exists() && themeSnap.data().selected) {
          this.currentTheme = themeSnap.data().selected;
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      }
    }
    
    return this.currentTheme;
  }

  async saveUserTheme(themeKey: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      try {
        const themeRef = doc(db, 'users', user.uid, 'preferences', 'theme');
        await setDoc(themeRef, { 
          selected: themeKey,
          updatedAt: new Date()
        }, { merge: true });
        
        this.currentTheme = themeKey;
        this.notifyListeners();
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du thème:', error);
      }
    }
  }

  getCurrentTheme(): AppTheme {
    return appThemes[this.currentTheme] || appThemes.orange;
  }

  getCurrentThemeKey(): string {
    return this.currentTheme;
  }

  setTheme(themeKey: string): void {
    if (appThemes[themeKey]) {
      this.currentTheme = themeKey;
      this.notifyListeners();
    }
  }

  subscribe(listener: (theme: AppTheme) => void): () => void {
    this.listeners.push(listener);
    // Retourne une fonction de désabonnement
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const theme = this.getCurrentTheme();
    this.listeners.forEach(listener => listener(theme));
  }

  getAllThemes(): Record<string, AppTheme> {
    return appThemes;
  }
}

export const themeService = new ThemeService();