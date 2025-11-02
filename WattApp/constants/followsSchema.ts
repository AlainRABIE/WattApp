// Structure des collections Firebase pour le système de follows/abonnements

/*
Collection: follows
Document ID: {followerId}_{followedUserId}
Structure:
{
  followerId: string,          // ID de l'utilisateur qui suit
  followerName: string,        // Nom de l'utilisateur qui suit
  followedUserId: string,      // ID de l'utilisateur suivi
  followedUserName: string,    // Nom de l'utilisateur suivi
  createdAt: timestamp,        // Date de création du suivi
}

Collection: userStats
Document ID: {userId}
Structure:
{
  followersCount: number,      // Nombre d'abonnés
  followingCount: number,      // Nombre d'abonnements
  booksCount: number,          // Nombre de livres publiés
  totalReads: number,          // Total des lectures de tous ses livres
  updatedAt: timestamp,        // Dernière mise à jour
}

Collection: users (extension des profils utilisateurs)
Document ID: {userId}
Structure ajoutée:
{
  bio?: string,                // Biographie de l'auteur
  photoURL?: string,           // Photo de profil
  isAuthor?: boolean,          // Si l'utilisateur est auteur
  joinedAt?: timestamp,        // Date d'inscription
}

Règles de sécurité Firestore suggérées:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les follows
    match /follows/{followId} {
      allow read: if true; // Lecture publique pour les statistiques
      allow write: if request.auth != null && 
                      request.auth.uid == resource.data.followerId;
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.followerId;
      allow delete: if request.auth != null && 
                       request.auth.uid == resource.data.followerId;
    }
    
    // Règles pour les statistiques utilisateurs
    match /userStats/{userId} {
      allow read: if true; // Lecture publique
      allow write: if request.auth != null; // Seuls les utilisateurs connectés
    }
    
    // Extension des règles pour les profils utilisateurs
    match /users/{userId} {
      allow read: if true; // Profils publics
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

Instructions d'utilisation:
1. Créer ces collections dans Firestore
2. Ajouter les règles de sécurité
3. Les statistiques se mettent à jour automatiquement via les listeners
4. Le système de follow/unfollow est géré par le composant AuthorProfile
*/

export const FIRESTORE_COLLECTIONS = {
  FOLLOWS: 'follows',
  USER_STATS: 'userStats',
  USERS: 'users',
  BOOKS: 'books',
  CHATS: 'chats',
  MESSAGES: 'messages'
};

export const FOLLOW_FUNCTIONS = {
  // Fonction utilitaire pour créer l'ID de document follow
  createFollowId: (followerId: string, followedUserId: string) => 
    `${followerId}_${followedUserId}`,
    
  // Fonction pour mettre à jour les statistiques utilisateur
  updateUserStats: async (userId: string, increment: { [key: string]: number }) => {
    // Cette fonction sera implémentée dans le service si nécessaire
    console.log('Update user stats:', userId, increment);
  }
};