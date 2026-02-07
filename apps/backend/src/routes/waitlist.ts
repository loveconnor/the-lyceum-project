import { Router } from 'express';
import { getSupabaseAdmin } from '../supabaseAdmin';
import { Resend } from 'resend';

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const waitlistFromEmail = process.env.WAITLIST_FROM_EMAIL;

router.post('/', async (req, res) => {
  const { email, source, metadata } = req.body ?? {};

  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingSignup, error: existingSignupError } = await supabase
      .from('waitlist_signups')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingSignupError) {
      console.error('Failed to check existing waitlist signup:', existingSignupError);
      return res.status(500).json({ error: 'Failed to save waitlist signup.' });
    }

    if (existingSignup) {
      return res.status(409).json({ error: 'You are already on the waitlist with this email.' });
    }

    const { error } = await supabase
      .from('waitlist_signups')
      .upsert(
        {
          email: normalizedEmail,
          source: typeof source === 'string' ? source : 'landing',
          metadata: metadata && typeof metadata === 'object' ? metadata : null,
        },
        { onConflict: 'email' },
      );

    if (error) {
      console.error('Failed to save waitlist signup:', error);
      return res.status(500).json({ error: 'Failed to save waitlist signup.' });
    }

    // Send confirmation email via Resend REST
    if (resendClient && waitlistFromEmail) {
      const emailContent = {
        from: waitlistFromEmail,
        to: normalizedEmail,
        subject: "Welcome to The Lyceum Project Waitlist! 🎓",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Lyceum</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #0284c7; margin: 0; font-size: 28px; font-weight: 700;">The Lyceum Project</h1>
                <p style="color: #64748b; margin: 8px 0 0; font-size: 16px;">AI-Powered Personalized Learning</p>
              </div>
              
              <div style="background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 32px; border-left: 4px solid #22c55e;">
                <h2 style="color: #16a34a; margin: 0 0 16px; font-size: 24px;">🎉 You're on the waitlist!</h2>
                <p style="margin: 0; font-size: 16px; color: #334155;">Thanks for your interest in The Lyceum Project. We're building something special – an AI-powered learning platform that creates personalized paths just for you.</p>
              </div>
              
              <div style="margin-bottom: 32px;">
                <h3 style="color: #1e293b; margin: 0 0 16px; font-size: 20px;">What to expect:</h3>
                <ul style="padding-left: 20px; margin: 0;">
                  <li style="margin-bottom: 8px; color: #475569;">🤖 <strong>AI Tutor</strong> - Get personalized help and explanations</li>
                  <li style="margin-bottom: 8px; color: #475569;">🛤️ <strong>Custom Learning Paths</strong> - Tailored to your interests and skill level</li>
                  <li style="margin-bottom: 8px; color: #475569;">🔬 <strong>Hands-On Labs</strong> - Learn by doing, not just reading</li>
                  <li style="margin-bottom: 8px; color: #475569;">📊 <strong>Progress Tracking</strong> - See your learning journey unfold</li>
                </ul>
              </div>
              
              <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;"><strong>💡 Heads up:</strong> We'll send you an email as soon as we're ready to launch. No spam, just the good stuff!</p>
              </div>
              
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
                <p style="margin: 0;">Questions? Just reply to this email.</p>
                <p style="margin: 8px 0 0;">Built with ❤️ by The Lyceum Project Team</p>
              </div>
            </body>
          </html>
        `,
        text: `Welcome to The Lyceum Project Waitlist!

🎉 You're on the waitlist!

Thanks for your interest in The Lyceum Project. We're building something special – an AI-powered learning platform that creates personalized paths just for you.

What to expect:
• AI Tutor - Get personalized help and explanations
• Custom Learning Paths - Tailored to your interests and skill level  
• Hands-On Labs - Learn by doing, not just reading
• Progress Tracking - See your learning journey unfold

We'll send you an email as soon as we're ready to launch. No spam, just the good stuff!

Questions? Just reply to this email.

Built with ❤️ by The Lyceum Project Team`,
      };

      resendClient.emails
        .send(emailContent)
        .then(() => {
          console.log(`Waitlist confirmation email sent to: ${normalizedEmail}`);
        })
        .catch((err) => {
          console.warn('Resend email failed for waitlist signup:', err);
        });
    } else {
      console.log('Email sending disabled: missing RESEND_API_KEY or WAITLIST_FROM_EMAIL');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected waitlist error:', err);
    return res.status(500).json({ error: 'Unexpected error saving waitlist signup.' });
  }
});

export default router;
