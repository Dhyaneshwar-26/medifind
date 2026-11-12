import { requireSupabase } from '../lib/supabase';

export interface ContactMessageInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
  /** Hidden honeypot field. Real users never fill this in. */
  company?: string;
}

export interface ContactMessageResult {
  id: string;
}

const GENERIC_ERROR =
  'Your message could not be sent right now. Please check your connection and try again in a few minutes.';

/**
 * Delivers a Contact Us message through the `contact` Supabase Edge Function.
 *
 * The Resend API key never reaches the browser: the Edge Function holds it in
 * Supabase Secrets and performs server-side validation before sending. Success
 * is only reported when the function confirms that Resend accepted the email.
 */
export async function sendContactMessage(
  input: ContactMessageInput
): Promise<ContactMessageResult> {
  const client = requireSupabase();

  const { data, error } = await client.functions.invoke('contact', {
    body: {
      name: input.name.trim(),
      email: input.email.trim(),
      subject: (input.subject ?? '').trim(),
      message: input.message.trim(),
      company: (input.company ?? '').trim(),
    },
  });

  if (error) {
    let message = GENERIC_ERROR;
    const context = (error as { context?: Response }).context;

    if (context && typeof context.status === 'number') {
      if (context.status === 404) {
        message =
          'The contact email service is not deployed yet. Please try again later or use the support email shown on this page.';
      } else if (context.status === 429) {
        message =
          'Too many messages were sent from this connection. Please wait a little while and try again.';
      } else if (context.status === 400 || context.status === 422) {
        try {
          const payload = (await context.json()) as { error?: unknown };
          if (typeof payload.error === 'string' && payload.error.trim()) {
            message = payload.error;
          }
        } catch {
          // Keep the generic message when the body is not readable.
        }
      } else if (context.status === 503) {
        message =
          'Email delivery is not configured yet. Please try again later or use the support email shown on this page.';
      }
    } else if (error.name === 'FunctionsFetchError') {
      message =
        'The contact email service could not be reached. It may not be deployed yet, or your internet connection is offline. Please try again in a few minutes.';
    }

    throw new Error(message);
  }

  if (!data || data.ok !== true) {
    throw new Error('The email service did not confirm delivery. Please try again.');
  }

  return { id: typeof data.id === 'string' ? data.id : '' };
}
