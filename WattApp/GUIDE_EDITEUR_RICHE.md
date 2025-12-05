# Guide d'utilisation de l'éditeur de texte riche

## ✅ Modifications effectuées

### 1. Installation des dépendances
- `react-native-pell-rich-editor` : Éditeur de texte riche
- `react-native-webview` : Dépendance requise pour l'éditeur

### 2. Nouveau composant créé
**Fichier**: `app/write/components/RichTextEditor.tsx`

Ce composant wrapper facilite l'utilisation de l'éditeur riche avec une API propre.

### 3. Intégration dans l'éditeur principal
**Fichier**: `app/write/editor/[projectId].tsx`

- Remplacement du `TextInput` par le `RichTextEditor`
- Ajout de nouvelles actions de formatage (gras, souligné)
- Mise à jour de la fonction `applyColor` pour utiliser l'API du rich text

## 🎨 Fonctionnalités disponibles

### Formatage de texte
1. **Gras** : Nouveau bouton ajouté dans la barre d'outils
2. **Italique** : Fonctionnel
3. **Souligné** : Nouveau bouton ajouté
4. **Couleur** : Maintenant fonctionne sur le texte sélectionné ! ✨

### Comment utiliser le changement de couleur

1. **Sélectionnez le texte** que vous voulez colorer (maintenez et glissez)
2. **Cliquez sur l'icône palette** dans la barre d'outils
3. **Choisissez une couleur** parmi les 16 couleurs prédéfinies
4. La couleur s'applique **uniquement au texte sélectionné** ! 🎉

### Alignement
- Gauche
- Centre
- Droite

## 🔧 API du RichTextEditor

Le composant expose ces méthodes via ref :

```typescript
// Changer la couleur du texte sélectionné
richEditorRef.current?.setForeColor('#FF6B6B');

// Appliquer le gras
richEditorRef.current?.setBold();

// Appliquer l'italique
richEditorRef.current?.setItalic();

// Aligner le texte
richEditorRef.current?.setTextAlign('center');

// Récupérer le contenu HTML
const html = await richEditorRef.current?.getContentHtml();
```

## ⚠️ Important

L'éditeur utilise du **HTML en interne** pour le formatage. Le contenu est sauvegardé en HTML, ce qui permet :
- Plusieurs couleurs dans le même texte
- Formatage mixte (gras + italique + couleur)
- Préservation du formatage lors de la sauvegarde

## 🚀 Pour tester

1. Lancez l'application : `npm start`
2. Allez dans l'éditeur
3. Tapez du texte
4. Sélectionnez une partie du texte
5. Cliquez sur l'icône palette de couleurs
6. Choisissez une couleur
7. Le texte sélectionné change de couleur ! ✅

## 📝 Notes techniques

- Le composant `RichTextEditor` utilise une WebView en interne
- Le contenu est stocké en HTML
- La conversion texte brut ↔ HTML est automatique
- Les statistiques (nombre de mots) fonctionnent toujours correctement

## 🎯 Prochaines améliorations possibles

- Ajouter un sélecteur de couleur personnalisé
- Permettre de surligner le texte (highlight)
- Ajouter des titres (H1, H2, H3)
- Insérer des images
- Ajouter des liens hypertexte
