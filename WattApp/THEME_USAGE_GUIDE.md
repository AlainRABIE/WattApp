# Guide d'utilisation des thèmes

## Configuration
Le système de thèmes est déjà configuré dans `_layout.tsx` avec le `ThemeContextProvider`.

## Utilisation dans les composants

### 1. Importer le hook useTheme
```tsx
import { useTheme } from '../contexts/ThemeContext';
```

### 2. Utiliser les couleurs du thème
```tsx
export default function MyComponent() {
  const { theme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Titre</Text>
      <Text style={{ color: theme.colors.textSecondary }}>Sous-titre</Text>
      
      <TouchableOpacity 
        style={{ 
          backgroundColor: theme.colors.primary,
          padding: 16,
          borderRadius: 12
        }}
      >
        <Text style={{ color: theme.colors.background }}>Bouton</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3. Couleurs disponibles
```tsx
theme.colors.primary        // Couleur principale (#FFA94D par défaut)
theme.colors.secondary      // Couleur secondaire
theme.colors.background     // Fond principal
theme.colors.surface        // Fond des cartes/surfaces
theme.colors.text           // Texte principal
theme.colors.textSecondary  // Texte secondaire
theme.colors.accent         // Couleur d'accent
theme.colors.border         // Bordures
theme.colors.success        // Vert de succès
theme.colors.warning        // Orange d'avertissement
theme.colors.error          // Rouge d'erreur
```

### 4. Utiliser avec des styles dynamiques
```tsx
<LinearGradient
  colors={[theme.colors.primary, theme.colors.secondary]}
  style={styles.gradient}
>
  ...
</LinearGradient>

<ActivityIndicator color={theme.colors.primary} />

<Ionicons name="heart" size={24} color={theme.colors.primary} />
```

### 5. Combiner avec StyleSheet (approche hybride)
```tsx
const MyComponent = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Titre</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

## Thèmes disponibles

1. **Orange** (Défaut) 🧡
2. **Violet** 💜
3. **Bleu** 💙
4. **Vert** 💚
5. **Rouge** ❤️
6. **Or** ✨
7. **Sombre** 🌙
8. **Clair** ☀️

## Changer de thème

L'utilisateur peut changer de thème depuis: **Paramètres → Apparence → Thème de l'application**

Le thème est automatiquement sauvegardé dans Firestore et appliqué dans toute l'application.

## Exemple complet

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ExampleScreen() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          Mon Écran
        </Text>
      </LinearGradient>
      
      {/* Carte */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="star" size={32} color={theme.colors.primary} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Titre de la carte
        </Text>
        <Text style={[styles.cardDescription, { color: theme.colors.textSecondary }]}>
          Description de la carte
        </Text>
      </View>
      
      {/* Bouton */}
      <TouchableOpacity>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.button}
        >
          <Text style={[styles.buttonText, { color: theme.colors.background }]}>
            Action
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  cardDescription: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```
