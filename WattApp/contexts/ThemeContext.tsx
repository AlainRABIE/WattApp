import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme as useThemeHook } from '../hooks/useTheme';
import { AppTheme } from '../services/ThemeService';

interface ThemeContextType {
  theme: AppTheme;
  isLoading: boolean;
  changeTheme: (themeKey: string) => Promise<void>;
  currentThemeKey: string;
  allThemes: Record<string, AppTheme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const themeData = useThemeHook();

  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};
