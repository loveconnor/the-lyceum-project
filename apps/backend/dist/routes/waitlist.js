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
            resendClient.emails
                .send({
                from: waitlistFromEmail,
                to: normalizedEmail,
                subject: 'You’re on the Lyceum waitlist',
                text: `Thanks for signing up, we’ll notify you as soon as we open access.`,
            })
                .catch((err) => {
                console.warn('Resend email failed for waitlist signup:', err);
            });
        }
        return res.status(200).json({ success: true });
    }
    catch (err) {
        console.error('Unexpected waitlist error:', err);
        return res.status(500).json({ error: 'Unexpected error saving waitlist signup.' });
    }
});
exports.default = router;
