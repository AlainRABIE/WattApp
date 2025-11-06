import * as functions from 'firebase-functions';
import * as express from 'express';
// @ts-ignore
const stripe = require('stripe')('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'); // Mets ta clé secrète Stripe ici

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