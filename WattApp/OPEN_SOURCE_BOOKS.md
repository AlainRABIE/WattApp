# 📚 Import de Livres Open Source - Guide d'utilisation

## Vue d'ensemble

Cette fonctionnalité vous permet d'importer automatiquement des livres classiques du domaine public dans votre application WattApp. C'est parfait pour tester l'application avec du vrai contenu !

## 🎯 Livres disponibles

### Classiques français

1. **Alice au pays des merveilles** - Lewis Carroll
   - Genre: Fantasy, Aventure, Enfants
   - Source: Project Gutenberg

2. **Les Aventures de Sherlock Holmes** - Arthur Conan Doyle
   - Genre: Mystère, Policier
   - Source: Project Gutenberg

3. **Orgueil et Préjugés** - Jane Austen
   - Genre: Romance, Classique
   - Source: Project Gutenberg

4. **Vingt mille lieues sous les mers** - Jules Verne
   - Genre: Science-Fiction, Aventure
   - Source: Project Gutenberg

5. **Les Trois Mousquetaires** - Alexandre Dumas
   - Genre: Aventure, Historique
   - Source: Project Gutenberg

6. **Dracula** - Bram Stoker
   - Genre: Horreur, Gothic
   - Source: Project Gutenberg

7. **Le Comte de Monte-Cristo** - Alexandre Dumas
   - Genre: Aventure, Drame
   - Source: Project Gutenberg

8. **Frankenstein** - Mary Shelley
   - Genre: Science-Fiction, Horreur
   - Source: Project Gutenberg

9. **Moby Dick** - Herman Melville
   - Genre: Aventure, Maritime
   - Source: Project Gutenberg

10. **Guerre et Paix** - Léon Tolstoï
    - Genre: Historique, Drame
    - Source: Project Gutenberg

## 🚀 Comment utiliser

### Méthode 1: Import individuel

1. Allez dans votre **Profil**
2. Cliquez sur le bouton vert **"Importer des livres gratuits (Test)"**
3. Choisissez un livre dans la liste
4. Cliquez sur le livre pour l'importer
5. Confirmez l'import
6. Le livre sera ajouté à votre bibliothèque avec:
   - ✅ Titre et auteur
   - ✅ Description complète
   - ✅ Couverture (depuis Project Gutenberg)
   - ✅ Extrait du contenu (premiers chapitres)
   - ✅ Catégories et genres
   - ✅ Tags appropriés

### Méthode 2: Import de tous les livres

1. Allez dans votre **Profil**
2. Cliquez sur **"Importer des livres gratuits (Test)"**
3. Cliquez sur **"📥 Tout importer (10 livres)"**
4. Confirmez
5. Attendez quelques minutes (environ 2-3 minutes pour tous les livres)
6. Tous les livres seront importés automatiquement

## 🔧 Fonctionnalités techniques

### Service OpenSourceBooksService

Le service gère:
- ✅ Liste des livres disponibles
- ✅ Import individuel avec progression
- ✅ Import en batch (plusieurs livres)
- ✅ Téléchargement des couvertures
- ✅ Téléchargement du contenu texte
- ✅ Upload vers Firebase Storage
- ✅ Création dans Firestore

### Structure de l'import

```typescript
{
  title: "Le titre du livre",
  author: "L'auteur",
  description: "Description complète",
  coverUrl: "URL Project Gutenberg",
  downloadUrl: "URL du texte",
  category: "Catégorie principale",
  genres: ["Genre1", "Genre2"],
  tags: ["tag1", "tag2"],
  language: "fr",
}
```

### Caractéristiques des livres importés

- **Statut**: Publié (isPublished: true)
- **Type**: Complété (status: 'completed')
- **Prix**: Gratuit (isFree: true)
- **Copyright**: Domaine public
- **Source**: Project Gutenberg
- **Format**: Texte + Couverture

## 📊 Progression de l'import

Pendant l'import, vous verrez:
1. **Création du livre** (10%)
2. **Téléchargement de la couverture** (30%)
3. **Upload de la couverture** (50%)
4. **Téléchargement du contenu** (80%)
5. **Import terminé** (100%)

## 💡 Cas d'usage

### Pour les développeurs
- ✅ Tester l'affichage des livres
- ✅ Tester la recherche
- ✅ Tester les filtres par catégorie/genre
- ✅ Tester la lecture
- ✅ Avoir du contenu de démo

### Pour les utilisateurs
- ✅ Découvrir des classiques
- ✅ Lire des livres gratuits
- ✅ Tester l'application avec du vrai contenu
- ✅ Voir des exemples de livres bien formatés

## ⚙️ Configuration

Le service est déjà configuré dans:
- `services/OpenSourceBooksService.ts` - Service principal
- `app/profile.tsx` - Bouton et modal d'import

## 🔍 Détails techniques

### Limites de taille

Pour éviter de dépasser les limites Firestore:
- Le contenu texte est limité à **50KB** (environ 50 pages)
- Les images sont redimensionnées automatiquement
- Un message indique si le contenu complet n'est pas disponible

### Sources des livres

- **Project Gutenberg**: https://www.gutenberg.org
  - Plus de 70,000 livres gratuits
  - Domaine public
  - Plusieurs langues disponibles

### Gestion des erreurs

Le service gère automatiquement:
- ❌ Échec de téléchargement de couverture → Continue sans couverture
- ❌ Échec de téléchargement de contenu → Livre créé quand même
- ❌ Erreur réseau → Message d'erreur clair
- ❌ Utilisateur non authentifié → Erreur appropriée

## 🎨 Interface utilisateur

### Bouton principal
- **Couleur**: Vert (#4CAF50) pour se distinguer
- **Position**: Section profil, avant le bouton de déconnexion
- **Texte**: "Importer des livres gratuits (Test)"

### Modal d'import
- **Design**: Dark theme cohérent
- **Liste**: Scrollable avec tous les livres
- **Cartes**: Titre, auteur, genres visibles
- **Actions**: Import individuel ou tout importer

## 📝 Ajouter plus de livres

Pour ajouter d'autres livres à la liste:

```typescript
// Dans OpenSourceBooksService.ts
{
  id: 'mon-livre-unique',
  title: 'Titre du livre',
  author: 'Nom de l\'auteur',
  description: 'Description complète...',
  language: 'fr',
  coverUrl: 'https://url-de-la-couverture.jpg',
  downloadUrl: 'https://url-du-texte.txt',
  category: 'Catégorie',
  genres: ['Genre1', 'Genre2'],
  tags: ['tag1', 'tag2'],
}
```

## 🚀 Extensions possibles

### Fonctionnalités futures

1. **API Project Gutenberg**
   - Recherche directe dans la base Gutenberg
   - Import de n'importe quel livre
   - Filtrage par langue, catégorie

2. **Autres sources**
   - Wikisource (textes en français)
   - Internet Archive
   - Google Books (domaine public)

3. **Formats additionnels**
   - Support EPUB
   - Support PDF
   - Support MOBI

4. **Traductions automatiques**
   - Import de livres en anglais
   - Traduction automatique

5. **Métadonnées enrichies**
   - Note moyenne des lecteurs
   - Année de publication
   - Biographie de l'auteur

## ⚡ Performance

### Import individuel
- Durée: ~10-30 secondes par livre
- Dépend de la taille de la couverture et du texte

### Import en batch
- Durée: ~2-3 minutes pour 10 livres
- Pause de 1 seconde entre chaque livre
- Progression affichée en temps réel

## 🔐 Sécurité

- ✅ Authentification requise pour importer
- ✅ Livres associés à votre compte utilisateur
- ✅ Upload vers Firebase Storage sécurisé
- ✅ Règles de sécurité Firebase appliquées

## 📞 Support

En cas de problème:
1. Vérifiez votre connexion internet
2. Assurez-vous d'être connecté
3. Vérifiez que Firebase Storage est activé
4. Consultez les logs dans la console

---

**Version:** 1.0.0  
**Date:** 29 décembre 2025  
**Source:** Project Gutenberg (domaine public)
