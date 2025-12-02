# 📬 Guide du Système de Notifications

## 🎯 Types de Notifications Implémentées

### ✅ **Actives (déjà intégrées dans l'app)**

#### 1. ⭐ Nouvelle note (`new_rating`)
- **Déclencheur** : Un lecteur note votre livre
- **Bénéficiaire** : L'auteur du livre
- **Localisation** : `app/book/[bookId].tsx` → fonction `handleSubmitRating()`
- **Message** : "{Nom} a noté votre livre '{Titre}' avec {X} étoiles"
- **Couleur** : Or (#FFD700)

#### 2. 💬 Nouveau commentaire (`new_comment`)
- **Déclencheur** : Un lecteur laisse un commentaire sur votre livre
- **Bénéficiaire** : L'auteur du livre
- **Localisation** : `app/book/[bookId].tsx` → fonction `handleSubmitRating()`
- **Message** : "{Nom} a commenté votre livre '{Titre}'"
- **Couleur** : Violet (#9C27B0)

#### 3. 💰 Achat de livre (`new_purchase`)
- **Déclencheur** : Quelqu'un achète votre livre
- **Bénéficiaire** : L'auteur du livre
- **Localisation** : `services/PaymentService.ts` → fonction `handlePaymentSuccess()`
- **Message** : "{Nom} a acheté votre livre '{Titre}' pour {Montant}€"
- **Couleur** : Vert (#4CAF50)

#### 4. 👥 Nouveau follower (`new_follower`)
- **Déclencheur** : Quelqu'un vous suit
- **Bénéficiaire** : L'auteur suivi
- **Localisation** : `services/FollowService.ts` → fonction `followUser()`
- **Message** : "{Nom} a commencé à vous suivre"
- **Couleur** : Bleu clair (#4FC3F7)

#### 5. 📚 Livre publié (`book_published`)
- **Déclencheur** : Un auteur que vous suivez publie un nouveau livre
- **Bénéficiaire** : Tous les followers de l'auteur
- **Localisation** :
  - `app/write/[templateId].tsx` → lors de la publication
  - `app/write/publish-manga.tsx` → lors de la publication d'un manga
- **Message** : "{Auteur} a publié un nouveau livre : '{Titre}'"
- **Couleur** : Orange (#FF9800)

---

### 🔨 **Prêtes mais non intégrées**

#### 6. 📄 Nouveau chapitre (`chapter_added`)
- **Quand l'intégrer** : Lors de l'ajout d'un chapitre à un livre existant
- **Où l'intégrer** : Dans la fonction de création de chapitre
- **Code à utiliser** :
```typescript
await NotificationService.notifyChapterAdded(
  authorId,      // ID de l'auteur
  bookId,        // ID du livre
  bookTitle,     // Titre du livre
  chapterNumber, // Numéro du chapitre
  chapterTitle   // Titre du chapitre (optionnel)
);
```

#### 7. 🏆 Livre du mois (`book_of_month`)
- **Quand l'intégrer** : Quand le classement mensuel est calculé
- **Où l'intégrer** : Dans `MonthlyRankingService.ts` après le calcul
- **Code à utiliser** :
```typescript
await NotificationService.notifyBookOfTheMonth(
  authorId,   // ID de l'auteur du livre #1
  bookId,     // ID du livre gagnant
  bookTitle,  // Titre du livre
  month,      // Mois (ex: "Décembre 2025")
  coverImage  // Image de couverture (optionnel)
);
```

#### 8. 🏅 Achievement (`achievement`)
- **Quand l'intégrer** : Système de gamification (à créer)
- **Exemples** :
  - Premier livre publié
  - 100 lectures atteintes
  - 10 avis reçus
- **Code à utiliser** :
```typescript
await NotificationService.notifyAchievement(
  userId,
  achievementTitle,  // Ex: "Premier livre publié"
  achievementIcon    // Ex: "📚"
);
```

#### 9. ✉️ Message (`message`)
- **Quand l'intégrer** : Système de messagerie privée (à créer)
- **Code à utiliser** :
```typescript
await NotificationService.notifyMessage(
  recipientUserId,
  senderUserId,
  senderName,
  messagePreview  // Premiers caractères du message
);
```

#### 10. ℹ️ Système (`system`)
- **Usage** : Notifications administratives/annonces
- **Exemples** :
  - Nouvelle fonctionnalité disponible
  - Maintenance programmée
  - Mise à jour importante
- **Code à utiliser** :
```typescript
await NotificationService.notifySystem(
  userId,
  title,
  message,
  actionUrl  // Optionnel
);
```

---

## 🎨 Interface Utilisateur

### 📱 Composants

1. **NotificationBell** (`app/components/NotificationBell.tsx`)
   - Badge rouge avec compteur de notifications non lues
   - Icône remplie/outline selon état
   - Ouverture du modal au clic

2. **NotificationModal** (`app/components/NotificationModal.tsx`)
   - Modal compact affichant les 10 dernières notifications
   - Actions : Marquer tout comme lu, Voir tout
   - Navigation vers page complète

3. **Page Notifications** (`app/notifications.tsx`)
   - Liste complète des notifications
   - Pull-to-refresh
   - Filtres et actions groupées

### 🎯 Placement dans l'App

- **Header home** : Entre le portefeuille et l'avatar
- **Position** : `Wallet → 🔔 Notifications → Avatar`

---

## 🔥 Configuration Firebase

### Index Firestore Requis

**Collection** : `notifications`

**Index composite** :
- `userId` (Ascending)
- `createdAt` (Descending)

**Créer l'index** :
1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Firestore Database → Indexes
3. Ou cliquer sur le lien dans l'erreur lors du premier test

### Structure de Données

```typescript
notifications/{notificationId}
{
  userId: string,           // ID du destinataire
  type: NotificationType,   // Type de notification
  title: string,            // Titre
  message: string,          // Message
  read: boolean,            // Lue/Non lue
  createdAt: Timestamp,     // Date de création
  actionUrl?: string,       // URL de navigation
  metadata?: object,        // Données additionnelles
  expoPushToken?: string    // Token pour push notifications
}
```

---

## 🚀 Flux de Fonctionnement

### Scénario 1 : Suivi d'un auteur

1. Utilisateur A clique "Suivre" sur le profil de l'auteur B
2. `FollowService.followUser()` est appelé
3. Document créé dans `follows` collection
4. **Notification envoyée** à l'auteur B : "A a commencé à vous suivre"
5. Badge rouge apparaît sur la cloche de l'auteur B
6. Notification push envoyée (si configuré)

### Scénario 2 : Publication d'un livre

1. Auteur B publie un nouveau livre
2. `FollowService.notifyFollowersBookPublished()` est appelé
3. Récupère tous les followers de B
4. **Notification envoyée** à chaque follower : "B a publié un nouveau livre : 'Titre'"
5. Chaque follower voit le badge rouge et peut cliquer pour voir le livre

### Scénario 3 : Achat et avis

1. Lecteur C achète et lit le livre de l'auteur B
2. C laisse une note 5⭐ et un commentaire
3. **2 notifications envoyées** à l'auteur B :
   - "C a noté votre livre 'Titre' avec 5 étoiles"
   - "C a commenté votre livre 'Titre'"
4. B ouvre le modal → Clique sur la notification → Redirigé vers la page du livre

---

## 📊 Statistiques et Monitoring

### Compteurs en Temps Réel

```typescript
// Nombre de notifications non lues
NotificationService.getUnreadCount(userId)

// S'abonner aux changements
NotificationService.subscribeToNotifications(userId, (notifications) => {
  // Mise à jour automatique de l'UI
})
```

### Actions Disponibles

```typescript
// Marquer comme lue
NotificationService.markAsRead(notificationId)

// Marquer toutes comme lues
NotificationService.markAllAsRead(userId)

// Supprimer une notification
NotificationService.deleteNotification(notificationId)

// Supprimer toutes
NotificationService.deleteAllNotifications(userId)
```

---

## 🎨 Personnalisation

### Icônes par Type

```typescript
const icons = {
  new_follower: 'person-add',
  new_comment: 'chatbubble',
  new_rating: 'star',
  new_purchase: 'cash',
  book_published: 'book',
  chapter_added: 'document-text',
  book_of_month: 'trophy',
  achievement: 'medal',
  message: 'mail',
  system: 'information-circle',
}
```

### Couleurs par Type

```typescript
const colors = {
  new_follower: '#4FC3F7',   // Bleu clair
  new_comment: '#9C27B0',    // Violet
  new_rating: '#FFD700',     // Or
  new_purchase: '#4CAF50',   // Vert
  book_published: '#FF9800', // Orange
  chapter_added: '#3F51B5',  // Indigo
  book_of_month: '#FFD700',  // Or
  achievement: '#FF6B35',    // Rouge orangé
  message: '#2196F3',        // Bleu
  system: '#607D8B',         // Gris bleu
}
```

---

## 🔔 Push Notifications (Expo)

### Configuration

Les push notifications sont configurées via `expo-notifications`.

**Initialisation** : `app/_layout.tsx`
```typescript
NotificationService.initialize(user.uid)
```

**Token Expo** : Sauvegardé dans `users/{userId}.expoPushToken`

**Envoi** : Automatique lors de la création d'une notification

---

## 📝 Checklist d'Intégration Future

### Pour activer les notifications chapitres :
- [ ] Trouver la fonction de création de chapitre
- [ ] Ajouter `NotificationService.notifyChapterAdded()`
- [ ] Notifier uniquement les lecteurs du livre (à implémenter)

### Pour activer les notifications livre du mois :
- [ ] Intégrer dans `MonthlyRankingService.calculateMonthlyRanking()`
- [ ] Notifier l'auteur du livre #1

### Pour le système de gamification :
- [ ] Créer un service `AchievementService`
- [ ] Définir les achievements (milestones)
- [ ] Déclencher `notifyAchievement()` sur chaque milestone

### Pour la messagerie :
- [ ] Créer un service `ChatService`
- [ ] Intégrer `notifyMessage()` lors de l'envoi

---

## 🐛 Troubleshooting

### Les notifications n'apparaissent pas
1. Vérifier que l'index Firebase est créé et actif
2. Vérifier les logs : `console.log` dans `NotificationService`
3. Vérifier que `userId` correspond bien au destinataire

### Le badge ne se met pas à jour
1. Vérifier que `subscribeToNotifications()` est appelé
2. Vérifier le `useEffect` dans `home.tsx`
3. Force refresh : fermer/rouvrir l'app

### Push notifications ne fonctionnent pas
1. Vérifier que `expo-notifications` est installé
2. Tester sur un appareil physique (pas simulateur)
3. Vérifier que le token Expo est sauvegardé dans Firestore

---

## 📚 Ressources

- **Service principal** : `services/NotificationService.ts`
- **Service de suivi** : `services/FollowService.ts`
- **Modal** : `app/components/NotificationModal.tsx`
- **Page complète** : `app/notifications.tsx`
- **Composant cloche** : `app/components/NotificationBell.tsx`

---

**Dernière mise à jour** : 2 décembre 2025
