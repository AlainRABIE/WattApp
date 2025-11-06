import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-10-29.clover',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { amount, currency = 'eur', bookId, bookTitle, successUrl, cancelUrl } = req.body;
    if (!amount || !bookTitle || !successUrl || !cancelUrl) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: bookTitle,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { bookId },
    });
    res.status(200).json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message, details: error });
  }
}
