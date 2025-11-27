// API route: /api/stripe/onboard
// Permet de générer un lien d'onboarding Stripe Connect pour un utilisateur

// import { NextApiRequest, NextApiResponse } from 'next'; // Retiré, inutile pour Node.js/Firebase
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialisation Stripe (remplacez par votre clé secrète)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-10-29.clover' });

// Initialisation Firebase Admin si besoin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}


// Handler Express/Firebase compatible
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const { uid, email } = req.body;
  if (!uid || !email) return res.status(400).json({ error: 'Missing uid or email' });

  try {
    // Récupère ou crée le compte Stripe Connect pour l'utilisateur
    const userRef = admin.firestore().collection('users').doc(uid);
    const userSnap = await userRef.get();
    let stripeAccountId = userSnap.get('stripeAccountId');

    if (!stripeAccountId) {
      // Crée un compte Stripe Connect Express
      const account = await stripe.accounts.create({
        type: 'express',
        email,
      });
      stripeAccountId = account.id;
      await userRef.update({ stripeAccountId });
    }

    // Crée un lien d'onboarding
    const origin = req.headers.origin || 'https://votre-app.com';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/settings`,
      return_url: `${origin}/settings?stripe=success`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Stripe onboarding error' });
  }
}
