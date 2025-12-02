import * as functions from 'firebase-functions';
import * as express from 'express';
import * as admin from 'firebase-admin';

// @ts-ignore
const stripe = require('stripe')('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');

// Initialiser Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ==================== PAIEMENT STRIPE ====================
export const createPaymentIntent = functions.https.onRequest(
  async (req: functions.https.Request, res: express.Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }
    try {
      const { amount, bookId } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // en centimes
        currency: 'eur',
        metadata: { bookId }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  }
);

// ==================== CLASSEMENT MENSUEL ====================

/**
 * Fonction programmée qui s'exécute le 1er de chaque mois à 00:01
 * Calcule le classement des livres les plus lus du mois précédent
 */
export const calculateMonthlyRanking = functions.pubsub
  .schedule('1 0 1 * *') // Cron: 00:01 le 1er jour de chaque mois
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    try {
      console.log('Calcul du classement mensuel démarré...');

      // Obtenir le mois précédent
      const now = new Date();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      // Récupérer tous les livres
      const booksSnapshot = await db.collection('books').get();
      const booksWithStats: any[] = [];

      for (const bookDoc of booksSnapshot.docs) {
        const bookData = bookDoc.data();

        // Calculer la moyenne des notes
        const ratingsSnapshot = await db
          .collection('books')
          .doc(bookDoc.id)
          .collection('ratings')
          .get();

        let totalRating = 0;
        let ratingCount = 0;

        ratingsSnapshot.forEach((ratingDoc) => {
          const rating = ratingDoc.data().rating;
          if (typeof rating === 'number') {
            totalRating += rating;
            ratingCount++;
          }
        });

        const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

        booksWithStats.push({
          bookId: bookDoc.id,
          title: bookData.title || 'Sans titre',
          author: bookData.author || 'Auteur inconnu',
          coverImage: bookData.cover || bookData.coverImage || '',
          reads: bookData.reads || 0,
          avgRating,
          rank: 0,
        });
      }

      // Trier par nombre de lectures (décroissant)
      booksWithStats.sort((a, b) => b.reads - a.reads);

      // Assigner les rangs
      booksWithStats.forEach((book, index) => {
        book.rank = index + 1;
      });

      // Garder le top 10
      const topBooks = booksWithStats.slice(0, 10);
      const topBook = topBooks.length > 0 ? topBooks[0] : null;

      // Sauvegarder dans Firestore
      await db.collection('monthlyRankings').doc(monthKey).set({
        month: monthKey,
        year,
        monthNumber: month,
        topBook,
        topBooks,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Classement mensuel calculé pour ${monthKey}:`, {
        topBook: topBook?.title,
        totalBooks: booksWithStats.length,
      });

      return null;
    } catch (error) {
      console.error('Erreur calcul classement mensuel:', error);
      throw error;
    }
  });

/**
 * Fonction HTTP pour déclencher manuellement le calcul du classement
 * Utile pour tester ou recalculer un mois spécifique
 */
export const triggerMonthlyRanking = functions.https.onRequest(
  async (req: functions.https.Request, res: express.Response) => {
    res.set('Access-Control-Allow-Origin', '*');
    
    try {
      // Utiliser le même code que la fonction programmée
      const now = new Date();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      const booksSnapshot = await db.collection('books').get();
      const booksWithStats: any[] = [];

      for (const bookDoc of booksSnapshot.docs) {
        const bookData = bookDoc.data();
        const ratingsSnapshot = await db
          .collection('books')
          .doc(bookDoc.id)
          .collection('ratings')
          .get();

        let totalRating = 0;
        let ratingCount = 0;

        ratingsSnapshot.forEach((ratingDoc) => {
          const rating = ratingDoc.data().rating;
          if (typeof rating === 'number') {
            totalRating += rating;
            ratingCount++;
          }
        });

        const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

        booksWithStats.push({
          bookId: bookDoc.id,
          title: bookData.title || 'Sans titre',
          author: bookData.author || 'Auteur inconnu',
          coverImage: bookData.cover || bookData.coverImage || '',
          reads: bookData.reads || 0,
          avgRating,
          rank: 0,
        });
      }

      booksWithStats.sort((a, b) => b.reads - a.reads);
      booksWithStats.forEach((book, index) => {
        book.rank = index + 1;
      });

      const topBooks = booksWithStats.slice(0, 10);
      const topBook = topBooks.length > 0 ? topBooks[0] : null;

      await db.collection('monthlyRankings').doc(monthKey).set({
        month: monthKey,
        year,
        monthNumber: month,
        topBook,
        topBooks,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        monthKey,
        topBook: topBook?.title,
        totalBooks: booksWithStats.length,
      });
    } catch (error: any) {
      console.error('Erreur:', error);
      res.status(500).json({ error: error.message });
    }
  }
);