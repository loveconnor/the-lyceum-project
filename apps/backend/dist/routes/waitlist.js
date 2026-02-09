"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabaseAdmin_1 = require("../supabaseAdmin");
const resend_1 = require("resend");
const router = (0, express_1.Router)();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new resend_1.Resend(resendApiKey) : null;
const waitlistFromEmail = process.env.WAITLIST_FROM_EMAIL;
router.post('/', async (req, res) => {
    const { email, source, metadata } = req.body ?? {};
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    try {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
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
            .upsert({
            email: normalizedEmail,
            source: typeof source === 'string' ? source : 'landing',
            metadata: metadata && typeof metadata === 'object' ? metadata : null,
        }, { onConflict: 'email' });
        if (error) {
            console.error('Failed to save waitlist signup:', error);
            return res.status(500).json({ error: 'Failed to save waitlist signup.' });
        }
        // Send confirmation email via Resend REST
        if (resendClient && waitlistFromEmail) {
            const emailContent = {
                from: waitlistFromEmail,
                to: normalizedEmail,
                subject: "Welcome to the Lyceum Waitlist",
                html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Lyceum</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #fafafa;">
              <!-- Email Container -->
              <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 48px 32px; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">Lyceum</h1>
                  <p style="margin: 8px 0 0; font-size: 16px; color: #d1fae5; font-weight: 500;">AI-Powered Learning Platform</p>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 48px 32px;">
                  
                  <!-- Welcome Section -->
                  <div style="margin-bottom: 32px;">
                    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3;">Welcome to the waitlist</h2>
                    <p style="margin: 0; font-size: 16px; color: #6b7280; line-height: 1.6;">Thank you for your interest in Lyceum. You have been successfully added to our waitlist and will be among the first to receive access when we launch.</p>
                  </div>
                  
                  <!-- Features Card -->
                  <div style="background: #ffffff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px; margin-bottom: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                    <h3 style="margin: 0 0 24px; font-size: 18px; font-weight: 600; color: #111827;">Platform Features</h3>
                    
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
                      <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">Intelligent Tutoring System</h4>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Receive personalized guidance and explanations tailored to your learning style and pace.</p>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
                      <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">Adaptive Learning Paths</h4>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Custom curricula designed to match your interests, goals, and current skill level.</p>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
                      <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">Interactive Laboratories</h4>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Hands-on learning experiences that reinforce theoretical concepts through practical application.</p>
                    </div>
                    
                    <div>
                      <h4 style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #111827;">Progress Analytics</h4>
                      <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">Comprehensive tracking and insights into your learning journey and skill development.</p>
                    </div>
                  </div>
                  
                  <!-- Info Alert -->
                  <div style="background: #eff6ff; border: 1px solid #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td style="width: 32px; vertical-align: top; padding-top: 1px;">
                          <svg style="width: 20px; height: 20px; color: #3b82f6;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </td>
                        <td style="vertical-align: top;">
                          <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #1e40af;">Next Steps</h4>
                          <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;">We will notify you via email as soon as the platform becomes available. Your data is secure and will not be shared with third parties.</p>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Footer -->
                  <div style="text-align: center; padding-top: 32px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Questions or feedback?</p>
                    <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">Reply to this email or contact our support team</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 13px;">© 2026 Lyceum</p>
                  </div>
                  
                </div>
              </div>
              
              <!-- Email Spacer -->
              <div style="height: 40px;"></div>
            </body>
          </html>
        `,
                text: `Welcome to the Lyceum Waitlist

Thank you for your interest in Lyceum. You have been successfully added to our waitlist and will be among the first to receive access when we launch.

Platform Features:

Intelligent Tutoring System
Receive personalized guidance and explanations tailored to your learning style and pace.

Adaptive Learning Paths
Custom curricula designed to match your interests, goals, and current skill level.

Interactive Laboratories
Hands-on learning experiences that reinforce theoretical concepts through practical application.

Progress Analytics
Comprehensive tracking and insights into your learning journey and skill development.

Next Steps:
We will notify you via email as soon as the platform becomes available. Your data is secure and will not be shared with third parties.

Questions or feedback? Reply to this email or contact our support team.

© 2026 Lyceum`,
            };
            resendClient.emails
                .send(emailContent)
                .then(() => {
                console.log(`Waitlist confirmation email sent to: ${normalizedEmail}`);
            })
                .catch((err) => {
                console.warn('Resend email failed for waitlist signup:', err);
            });
        }
        else {
            console.log('Email sending disabled: missing RESEND_API_KEY or WAITLIST_FROM_EMAIL');
        }
        return res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Unexpected waitlist error:', err);
        return res.status(500).json({ error: 'Unexpected error saving waitlist signup.' });
    }
});
exports.default = router;
