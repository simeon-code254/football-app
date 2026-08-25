// Billing.
//
// -- THIS IS A SEAM, NOT AN INTEGRATION --
//
// There is no payment provider wired into this project. No Stripe key, no
// Daraja (M-Pesa) credentials, no webhook endpoint, nothing in
// supabase/functions that could receive one. Canvas screen 82 draws M-Pesa as
// the default method and a card as the alternative, which settles WHAT to
// build but not that it has been built.
//
// So every function below throws `NotWired`. That is deliberate and is the
// honest shape for this: the screens are complete and correct, the money path
// is a single named boundary, and nothing anywhere pretends a payment
// succeeded. A stub that silently resolved would produce an app that shows
// "Payment confirmed" and grants a verification badge for free -- which for a
// badge whose entire value is that it cannot be obtained without paying and
// being checked would be worse than no screen at all.
//
// WHAT REAL INTEGRATION NEEDS, roughly:
//   1. An Edge Function holding the provider credentials (never the client).
//   2. For M-Pesa: an STK push, then a callback URL the provider can reach.
//      The callback is the source of truth, not the client's response.
//   3. A `payments` table written ONLY by service_role, mirroring the
//      scouts/clubs verification_status lock -- a client that can write its own
//      payment row can grant itself a badge.
//   4. `scouts.verification_status` / `clubs.verification_status` moved to
//      'pending' by that function, never by this file.
export type PaymentMethod = 'mpesa' | 'card';

export type PaymentIntent = {
  /** Minor units, to avoid float arithmetic on money. */
  amountCents: number;
  currency: 'USD' | 'KES';
  description: string;
  method: PaymentMethod;
};

export type PaymentReceipt = {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
  description: string;
  paidAt: string;
};

/** Thrown by everything here until a provider is connected. */
export class NotWiredError extends Error {
  constructor(what: string) {
    super(
      `${what} is not connected yet. Matobev has no payment provider configured — ` +
        `see src/repositories/billingRepository.ts for what integration requires.`
    );
    this.name = 'NotWiredError';
  }
}

export async function startPayment(_intent: PaymentIntent): Promise<PaymentReceipt> {
  throw new NotWiredError('Payments');
}

export async function listReceipts(_profileId: string): Promise<PaymentReceipt[]> {
  throw new NotWiredError('Billing history');
}

export async function getDefaultMethod(
  _profileId: string
): Promise<{ method: PaymentMethod; label: string } | null> {
  throw new NotWiredError('Saved payment methods');
}

/** True when a provider is configured. Screens use this to explain themselves. */
export const BILLING_ENABLED = false;
