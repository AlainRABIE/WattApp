import { useState, useEffect } from 'react';
import { themeService, AppTheme } from '../services/ThemeService';

export const useTheme = () => {
  const [theme, setTheme] = useState<AppTheme>(themeService.getCurrentTheme());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger le thème de l'utilisateur au démarrage
    const loadTheme = async () => {
      setIsLoading(true);
      try {
        await themeService.loadUserTheme();
        setTheme(themeService.getCurrentTheme());
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();

    // S'abonner aux changements de thème
    const unsubscribe = themeService.subscribe((newTheme: AppTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  const changeTheme = async (themeKey: string) => {
    try {
      await themeService.saveUserTheme(themeKey);
    } catch (error) {
      console.error('Erreur lors du changement de thème:', error);
    }
  };

  return {
    theme,
    isLoading,
    changeTheme,
    currentThemeKey: themeService.getCurrentThemeKey(),
    allThemes: themeService.getAllThemes()
  };
};