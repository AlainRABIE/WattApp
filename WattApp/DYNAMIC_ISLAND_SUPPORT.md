# Support du Dynamic Island

## Vue d'ensemble

L'application intègre maintenant un support complet du **Dynamic Island** (iPhone 14 Pro et versions ultérieures) et des zones sécurisées (safe areas) pour tous les appareils iOS et Android.

## Fonctionnalités

### 📱 Adaptation automatique
- **Dynamic Island** : Le contenu ne se cache jamais sous le Dynamic Island sur iPhone 14 Pro/15 Pro
- **Notch** : Support complet des encoches (iPhone X à iPhone 13)
- **Navigation** : Le BottomNav s'adapte aux boutons virtuels Android et à l'indicateur Home iOS
- **Responsive** : Détection automatique téléphone/tablette (< 768px = téléphone)

### 🎨 Composants adaptés

#### BottomNav (`app/components/BottomNav.tsx`)
```tsx
const insets = useSafeAreaInsets();
const isPhone = width < 768;

// Bottom padding dynamique
paddingBottom: Math.max(insets.bottom, 6)

// Styles téléphone
pillPhone: {
  width: '98%',
  paddingVertical: 4,
  paddingHorizontal: 6,
}
```

#### Profile (`app/profile.tsx`)
```tsx
const insets = useSafeAreaInsets();

// Header adapté au Dynamic Island
paddingTop: Math.max(insets.top, 10) + 10
```

#### Home (`app/home/home.tsx`)
```tsx
const insets = useSafeAreaInsets();

// Avatar position avec Dynamic Island
const topOffset = Math.max(insets.top, 10) + 8;
```

## Valeurs des insets

### iPhone avec Dynamic Island (14 Pro+)
- `insets.top` : ~59px (Dynamic Island)
- `insets.bottom` : ~34px (indicateur Home)

### iPhone avec encoche (X-13)
- `insets.top` : ~44px (encoche)
- `insets.bottom` : ~34px (indicateur Home)

### iPhone sans encoche (SE, 8)
- `insets.top` : ~20px (status bar)
- `insets.bottom` : 0px

### Android
- `insets.top` : StatusBar.currentHeight (variable)
- `insets.bottom` : 0-48px (boutons virtuels si présents)

## Breakpoints responsive

```tsx
const isPhone = width < 768;  // Téléphone
const isTablet = width >= 768; // Tablette/Desktop
```

### Styles téléphone
- BottomNav pill : 98% largeur
- Icônes : 22px au lieu de 26px
- Bulle active : 46px au lieu de 54px
- Padding réduit partout

### Styles tablette
- BottomNav pill : 95% largeur (max 720px)
- Icônes : 26px
- Bulle active : 54px
- Spacing plus généreux

## Tests recommandés

### Simulateurs iOS
1. iPhone 15 Pro (Dynamic Island)
2. iPhone 13 Pro (encoche)
3. iPhone SE (pas d'encoche)
4. iPad Pro (tablette)

### Émulateurs Android
1. Pixel 7 (boutons virtuels)
2. Samsung Galaxy (One UI)
3. Tablette 10"

### Orientations
- Portrait ✅
- Paysage ✅ (responsive basé sur largeur)

## Migration d'autres pages

Pour adapter d'autres pages :

```tsx
// 1. Importer le hook
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 2. Dans le composant
const insets = useSafeAreaInsets();

// 3. Headers en haut
style={{
  paddingTop: Math.max(insets.top, 10) + 10
}}

// 4. Contenu en bas
style={{
  paddingBottom: Math.max(insets.bottom, 10)
}}
```

## Package requis

```json
"react-native-safe-area-context": "~5.6.0"
```

Déjà installé dans le projet ✅

## Avantages

✅ Aucun contenu masqué par le Dynamic Island  
✅ Navigation accessible sur tous les appareils  
✅ Design cohérent iOS/Android  
✅ Support automatique des futurs modèles  
✅ Meilleure expérience utilisateur  

## Notes de développement

- `useSafeAreaInsets()` doit être appelé dans un composant React (pas dans StyleSheet.create)
- Toujours utiliser `Math.max(insets.value, fallback)` pour garantir un minimum d'espace
- Tester sur appareil réel pour validation finale (simulateur peut différer)
