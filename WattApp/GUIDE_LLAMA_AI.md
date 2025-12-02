/**
 * Guide d'utilisation de l'Assistant IA LLama 3.1
 * 
 * Ce guide explique comment configurer et utiliser l'assistant d'écriture IA
 * dans votre application WattApp.
 */

# 🚀 Configuration de l'Assistant IA LLama 3.1

## 📋 Prérequis

1. Un compte Together AI (https://api.together.xyz/)
2. Une clé API Together AI
3. Axios installé (déjà fait ✅)

## 🔧 Installation et Configuration

### Étape 1: Obtenir une clé API

1. Créez un compte sur https://api.together.xyz/
2. Allez dans "API Keys" dans votre dashboard
3. Créez une nouvelle clé API
4. Copiez la clé (elle commence généralement par 'sk-...')

### Étape 2: Configurer la clé API

Ouvrez le fichier `constants/llamaConfig.ts` et remplacez:

```typescript
API_KEY: 'YOUR_TOGETHER_API_KEY_HERE'
```

Par votre vraie clé API:

```typescript
API_KEY: 'sk-votre-cle-api-ici'
```

**⚠️ IMPORTANT:** Ne commitez jamais votre clé API sur Git !

### Étape 3: Initialiser le service

Dans votre composant principal ou dans `App.tsx`, initialisez le service:

```typescript
import LLamaAIService from './services/LLamaAIService';
import { LLAMA_AI_CONFIG } from './constants/llamaConfig';

// Au démarrage de l'app
useEffect(() => {
  LLamaAIService.initialize(LLAMA_AI_CONFIG.API_KEY);
}, []);
```

## 🎯 Fonctionnalités Disponibles

### 1. Complétion de texte
Continue automatiquement votre texte de manière naturelle.

```typescript
const completion = await LLamaAIService.completeText(
  "Il était une fois dans un royaume lointain",
  "", // contexte précédent
  'llama-3.1-8b'
);
```

### 2. Amélioration de texte
Améliore le style, la grammaire, la clarté ou l'émotion.

```typescript
const improved = await LLamaAIService.improveText(
  "Le chat est sur le tapis.",
  'style', // 'style' | 'grammar' | 'clarity' | 'emotion'
  'llama-3.1-8b'
);
```

### 3. Génération de dialogue
Crée des dialogues réalistes entre personnages.

```typescript
const dialogue = await LLamaAIService.generateDialogue(
  "Marie", // Personnage 1
  "Jean",  // Personnage 2
  "Dans un café parisien, ils se rencontrent après 10 ans",
  "nostalgique"
);
```

### 4. Description détaillée
Génère des descriptions riches et évocatrices.

```typescript
const description = await LLamaAIService.generateDescription(
  "Une forêt enchantée au clair de lune",
  'poétique', // 'poétique' | 'réaliste' | 'sombre' | 'joyeux'
  'moyen'     // 'court' | 'moyen' | 'long'
);
```

### 5. Résumé
Résume un texte long en quelques phrases.

```typescript
const summary = await LLamaAIService.summarizeText(
  longText,
  'court', // 'très court' | 'court' | 'moyen'
  'llama-3.1-8b'
);
```

### 6. Analyse de style
Analyse votre style d'écriture et donne des conseils.

```typescript
const analysis = await LLamaAIService.analyzeWritingStyle(
  yourText,
  'llama-3.1-70b' // Utiliser le modèle 70B pour meilleure analyse
);

console.log(analysis.analysis);      // Analyse générale
console.log(analysis.strengths);     // Points forts
console.log(analysis.improvements);  // Suggestions d'amélioration
```

### 7. Génération de titres
Suggère des titres accrocheurs pour vos chapitres ou livres.

```typescript
const titles = await LLamaAIService.generateTitles(
  chapterContent,
  'chapitre', // 'chapitre' | 'livre'
  5           // nombre de suggestions
);
```

### 8. Brainstorming créatif
Génère des idées créatives pour vos histoires.

```typescript
const ideas = await LLamaAIService.brainstorm(
  "Un détective qui peut voir dans le passé",
  "thriller fantastique",
  5 // nombre d'idées
);
```

### 9. Développement d'intrigue
Suggère des développements possibles pour votre histoire.

```typescript
const plotIdeas = await LLamaAIService.suggestPlotDevelopment(
  "Marie découvre qu'elle a des pouvoirs magiques...",
  "fantasy",
  'llama-3.1-70b' // 70B recommandé pour créativité
);
```

## 💡 Utilisation dans l'Éditeur

L'assistant IA est déjà intégré dans `AdvancedWritingEditor`. Pour l'utiliser:

1. Ouvrez l'éditeur d'écriture
2. Cliquez sur le bouton "✨ IA" dans la barre d'outils
3. Choisissez une fonctionnalité
4. Suivez les instructions à l'écran

### Raccourcis utiles:

- **Sélectionnez du texte** avant d'ouvrir l'assistant pour l'améliorer ou le remplacer
- Utilisez **Compléter** quand vous avez un blocage d'écriture
- Utilisez **Analyser** pour obtenir des retours sur votre style
- Utilisez **Brainstorm** pour générer de nouvelles idées

## ⚙️ Choix du Modèle

### LLama 3.1 8B (Recommandé par défaut)
- ✅ Rapide
- ✅ Moins coûteux
- ✅ Parfait pour: complétion, amélioration, dialogue
- ⚠️ Moins créatif pour analyses complexes

### LLama 3.1 70B (Premium)
- ✅ Plus intelligent et créatif
- ✅ Meilleur pour: analyse de style, brainstorming, développement d'intrigue
- ⚠️ Plus lent
- ⚠️ Plus coûteux

**Conseil:** Utilisez 8B pour le travail quotidien, 70B pour les analyses approfondies.

## 🔐 Sécurité

### Bonnes pratiques:

1. **Ne partagez JAMAIS votre clé API**
2. Ajoutez `llamaConfig.ts` dans `.gitignore`
3. Utilisez des variables d'environnement en production:

```typescript
// Dans llamaConfig.ts
API_KEY: process.env.TOGETHER_API_KEY || 'fallback'
```

4. Surveillez votre utilisation sur le dashboard Together AI
5. Mettez en place des limites de taux si nécessaire

## 💰 Coûts

Together AI fonctionne sur un modèle pay-as-you-go:

- **LLama 3.1 8B:** ~$0.20 / 1M tokens
- **LLama 3.1 70B:** ~$0.88 / 1M tokens

**Estimation pour un usage typique:**
- 1000 complétions de texte (~300 tokens chacune) ≈ $0.06
- 100 analyses de style (~500 tokens chacune) ≈ $0.05

Together AI offre généralement des crédits gratuits au démarrage.

## 🐛 Dépannage

### Erreur: "Service non initialisé"
→ Assurez-vous d'appeler `LLamaAIService.initialize()` au démarrage

### Erreur: "Invalid API key"
→ Vérifiez que votre clé API est correcte dans `llamaConfig.ts`

### Erreur: "Network timeout"
→ Vérifiez votre connexion internet ou augmentez le timeout

### Réponses lentes
→ Utilisez le modèle 8B au lieu du 70B pour plus de rapidité

## 🔄 Alternatives

Si Together AI ne fonctionne pas, vous pouvez utiliser:

1. **Groq** (très rapide) - Modifiez `LLamaAIService.ts`:
```typescript
private static baseURL = 'https://api.groq.com/openai/v1';
```

2. **Replicate** - Consultez la documentation Replicate

3. **OpenRouter** - Accès à plusieurs modèles

## 📚 Ressources

- Documentation Together AI: https://docs.together.ai/
- Documentation LLama 3.1: https://ai.meta.com/llama/
- Support: Ouvrez une issue sur GitHub

## 🎉 Exemples d'utilisation complète

```typescript
import LLamaAIService from './services/LLamaAIService';

// Initialisation au démarrage
useEffect(() => {
  LLamaAIService.initialize(LLAMA_AI_CONFIG.API_KEY);
}, []);

// Dans votre composant
const handleAIAssist = async () => {
  try {
    // Compléter le texte
    const completion = await LLamaAIService.completeText(
      currentText,
      previousContext
    );
    
    // Mettre à jour le contenu
    setContent(content + completion);
  } catch (error) {
    Alert.alert('Erreur IA', error.message);
  }
};
```

## ✨ Conseils d'utilisation

1. **Contexte:** Plus vous donnez de contexte, meilleurs sont les résultats
2. **Température:** 0.7-0.8 pour équilibre créativité/cohérence
3. **Prompts clairs:** Soyez précis dans vos demandes
4. **Itération:** N'hésitez pas à regénérer si le résultat ne convient pas
5. **Combinaison:** Combinez plusieurs fonctionnalités pour de meilleurs résultats

---

**Bon courage avec votre assistant d'écriture IA ! 🚀📝**
