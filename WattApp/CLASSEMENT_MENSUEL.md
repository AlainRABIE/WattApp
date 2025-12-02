# 🏆 Système de Classement Mensuel

Ce système calcule et affiche automatiquement le livre le plus lu de chaque mois.

## 📋 Fonctionnalités

### 1. **Calcul automatique mensuel**
- ✅ Exécution automatique le **1er de chaque mois à 00:01** (Europe/Paris)
- ✅ Analyse tous les livres et leurs statistiques
- ✅ Calcule les moyennes de notes
- ✅ Classe par nombre de lectures
- ✅ Sauvegarde le Top 10 dans Firestore

### 2. **Affichage du livre du mois**
- ✅ Badge "👑 Livre du mois" sur la page du livre gagnant
- ✅ Widget sur la page d'accueil
- ✅ Page dédiée au classement complet (`/ranking/monthly`)

### 3. **Historique des classements**
- ✅ Conservation de l'historique mensuel
- ✅ Consultation des classements passés

## 🚀 Mise en place

### Étape 1 : Déployer les Firebase Functions

```bash
cd functions
npm install
npm install firebase-admin --save
firebase deploy --only functions
```

Cela déploiera 2 fonctions :
- `calculateMonthlyRanking` - Cron automatique mensuel
- `triggerMonthlyRanking` - Déclenchement manuel via HTTP

### Étape 2 : Tester le système

Pour tester immédiatement (sans attendre le 1er du mois) :

1. **Via Firebase Console** :
   - Allez sur https://console.firebase.google.com
   - Sélectionnez votre projet
   - Functions → triggerMonthlyRanking → Tester

2. **Via HTTP** :
   ```bash
   curl -X POST https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/triggerMonthlyRanking
   ```

3. **Via le code** :
   ```typescript
   import { MonthlyRankingService } from './services/MonthlyRankingService';
   
   // Calculer le classement maintenant
   const ranking = await MonthlyRankingService.calculateMonthlyRanking();
   console.log('Livre du mois:', ranking.topBook?.title);
   ```

### Étape 3 : Vérifier dans Firestore

Ouvrez Firestore Console et vérifiez la collection `monthlyRankings` :

```
monthlyRankings/
  ├─ 2025-12/
  │   ├─ month: "2025-12"
  │   ├─ year: 2025
  │   ├─ monthNumber: 12
  │   ├─ topBook: { bookId, title, author, reads, avgRating }
  │   ├─ topBooks: [ ... top 10 ... ]
  │   └─ generatedAt: Timestamp
```

## 📱 Utilisation dans l'app

### 1. Composant BookOfTheMonth

Affiche le livre du mois actuel avec une couronne 👑 :

```tsx
import { BookOfTheMonth } from '../components/BookOfTheMonth';

<BookOfTheMonth style={{ marginHorizontal: 20 }} />
```

### 2. Page de classement complète

Navigation vers le classement :

```tsx
router.push('/ranking/monthly');
```

### 3. Vérifier si un livre est le livre du mois

```typescript
const isTopBook = await MonthlyRankingService.isBookOfTheMonth(bookId);
```

### 4. Badge automatique

Le badge "👑 Livre du mois" s'affiche automatiquement sur la page de détail du livre gagnant.

## 🎨 Personnalisation

### Changer le nombre de livres dans le Top

Dans `MonthlyRankingService.ts` :

```typescript
const topBooks = booksWithStats.slice(0, 20); // Au lieu de 10
```

### Changer la fréquence du calcul

Dans `functions/src/index.ts`, modifier le cron :

```typescript
.schedule('1 0 1 * *') // Actuellement: 1er jour à 00:01
// Exemples:
.schedule('0 0 * * 0') // Chaque dimanche à minuit
.schedule('0 12 1 * *') // 1er jour à midi
```

### Critères de classement personnalisés

Actuellement classé par **nombre de lectures**. Pour classer par note :

```typescript
// Dans calculateMonthlyRanking()
booksWithStats.sort((a, b) => {
  // Par note moyenne (puis lectures en cas d'égalité)
  if (b.avgRating !== a.avgRating) {
    return b.avgRating - a.avgRating;
  }
  return b.reads - a.reads;
});
```

## 🔧 API du Service

### `MonthlyRankingService`

```typescript
// Obtenir le classement du mois dernier
const ranking = await MonthlyRankingService.getMonthlyRanking();

// Obtenir le classement d'un mois spécifique
const decRanking = await MonthlyRankingService.getMonthlyRanking('2025-12');

// Obtenir le livre #1 du mois
const topBook = await MonthlyRankingService.getCurrentMonthTopBook();

// Vérifier si un livre est #1
const isTop = await MonthlyRankingService.isBookOfTheMonth('book_123');

// Obtenir l'historique (6 derniers mois)
const history = await MonthlyRankingService.getAllRankings(6);

// Calculer manuellement
const newRanking = await MonthlyRankingService.calculateMonthlyRanking();

// Obtenir le nom du mois en français
const monthName = MonthlyRankingService.getMonthName(12); // "Décembre"
```

## 📊 Structure de données

### MonthlyBook

```typescript
{
  bookId: string;
  title: string;
  author: string;
  coverImage: string;
  reads: number;
  avgRating: number;
  rank: number; // 1, 2, 3...
}
```

### MonthlyRanking

```typescript
{
  month: string;        // "2025-12"
  year: number;         // 2025
  monthNumber: number;  // 12
  topBook: MonthlyBook | null;
  topBooks: MonthlyBook[]; // Top 10
  generatedAt: Date;
}
```

## 🎯 Règles Firestore

Ajoutez ces règles dans `firestore.rules` :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Classements mensuels : lecture publique, écriture admin
    match /monthlyRankings/{monthKey} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## 🐛 Dépannage

### Le classement ne se calcule pas automatiquement

1. Vérifiez que les functions sont déployées :
   ```bash
   firebase functions:list
   ```

2. Consultez les logs :
   ```bash
   firebase functions:log
   ```

3. Vérifiez le fuseau horaire (doit être Europe/Paris)

### Le composant ne s'affiche pas

1. Vérifiez que le classement existe dans Firestore
2. Déclenchez manuellement : `triggerMonthlyRanking`
3. Vérifiez les logs de la console

### Aucun livre dans le classement

- Assurez-vous d'avoir des livres avec `reads > 0`
- Vérifiez que les livres ont un statut valide
- Consultez les logs de calcul

## 📈 Améliorations futures

- [ ] Notifications push au gagnant
- [ ] Récompenses pour le livre du mois
- [ ] Classement par genre/catégorie
- [ ] Graphiques d'évolution
- [ ] Trophées pour les auteurs
- [ ] Partage social du classement

## 🔐 Sécurité

- ✅ Le calcul s'effectue côté serveur (Firebase Functions)
- ✅ Les données sont en lecture seule pour les utilisateurs
- ✅ Seules les Functions peuvent écrire les classements
- ✅ Pas d'accès direct aux clés API depuis le client

## 💡 Conseils

1. **Testez avant production** : Utilisez `triggerMonthlyRanking` pour tester
2. **Sauvegardez l'historique** : Ne supprimez jamais les anciens classements
3. **Monitoring** : Configurez des alertes sur les Functions
4. **Performance** : Le calcul peut prendre du temps avec beaucoup de livres (optimisez si nécessaire)

---

📝 **Dernière mise à jour** : Décembre 2025
👨‍💻 **Développé pour** : WattApp
