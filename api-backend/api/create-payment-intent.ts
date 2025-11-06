import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-10-29.clover',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('--- Stripe PaymentIntent API called ---');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  if (req.method !== 'POST') {
    console.log('Rejected: Method not allowed');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { amount, currency = 'eur', metadata, bookId } = req.body;
    if (!amount) {
      console.log('Rejected: Amount is required');
      res.status(400).json({ error: 'Amount is required' });
      return;
    }
    console.log('Creating PaymentIntent with:', { amount, currency, metadata, bookId });
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { ...metadata, bookId },
    });
    console.log('PaymentIntent created:', paymentIntent.id);
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: error.message, 
      details: error, 
      raw: error.raw,
      type: error.type,
      code: error.code,
      param: error.param,
      stripeMessage: error.raw && error.raw.message ? error.raw.message : undefined
    });
  }
}
