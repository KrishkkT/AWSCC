import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendEmail, delay } from '@/lib/emailService';
import { buildMinimalistEmailHtml, interpolateVariables, extractNameFromEmail } from '@/lib/minimalistEmailTemplate';
import { logActivity } from '@/utils/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_ROLES = ['admin', 'Leader', 'faculty', 'captain', 'core'];

async function verifyAdminAuth() {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
        return { authorized: false, status: 401, error: 'Unauthorized: Session missing' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || !ALLOWED_ROLES.includes(profile.role)) {
        return { authorized: false, status: 403, error: 'Forbidden: Insufficient privileges' };
    }

    return { authorized: true, user, profile, supabase };
}

export async function GET(req) {
    try {
        const auth = await verifyAdminAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { supabase } = auth;
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        if (action === 'event-attendees') {
            const eventId = searchParams.get('eventId');
            if (!eventId) {
                return NextResponse.json({ error: 'eventId required' }, { status: 400 });
            }

            const { data: registrations, error } = await supabase
                .from('event_registrations')
                .select('full_name, email, certificate_issued, created_at')
                .eq('event_id', eventId);

            if (error) throw error;

            const recipients = (registrations || [])
                .filter(r => r.email && r.email.includes('@'))
                .map(r => ({
                    name: r.full_name || 'Participant',
                    first_name: (r.full_name || 'Participant').split(' ')[0],
                    email: r.email,
                    certificate_status: r.certificate_issued ? 'Issued' : 'Pending'
                }));

            return NextResponse.json({
                recipients,
                count: recipients.length
            });
        }

        // Default: Get audience sources summary
        const [membersRes, eventsRes] = await Promise.all([
            supabase.from('profiles').select('id, full_name, email, role').order('created_at', { ascending: false }),
            supabase.from('events').select('id, title, date, location, status').order('created_at', { ascending: false }).limit(25)
        ]);

        const members = (membersRes.data || [])
            .filter(m => m.email && m.email.includes('@'))
            .map(m => ({
                name: m.full_name || 'Member',
                first_name: (m.full_name || 'Member').split(' ')[0],
                email: m.email,
                role: m.role || 'Member'
            }));

        return NextResponse.json({
            membersCount: members.length,
            membersSample: members.slice(0, 5),
            members,
            events: eventsRes.data || []
        });

    } catch (err) {
        console.error('[Admin Campaigns GET Error]:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await verifyAdminAuth();
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { supabase, profile } = auth;
        const body = await req.json();

        const {
            mode = 'broadcast', // 'test' | 'broadcast'
            testEmail,
            recipients = [],
            subject = 'Announcement',
            messageBody = '',
            header = {},
            footer = {},
            theme = {},
            button = {},
            attachments = [] // Array of { filename, content, contentType, isBase64, size }
        } = body;

        if (!subject || !messageBody) {
            return NextResponse.json({ error: 'Subject and message body are required' }, { status: 400 });
        }

        // Sanitized attachments for nodemailer
        const mailAttachments = (attachments || []).map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
            isBase64: att.isBase64 !== false,
            encoding: 'base64'
        }));

        // ══════════════════════════════════════════════════════
        // TEST MODE
        // ══════════════════════════════════════════════════════
        if (mode === 'test') {
            const targetTestEmail = testEmail || profile.email;
            if (!targetTestEmail) {
                return NextResponse.json({ error: 'Test recipient email is required' }, { status: 400 });
            }

            const derivedTestName = extractNameFromEmail(targetTestEmail);
            let sampleContext = (recipients && recipients[0]) ? { ...recipients[0] } : null;

            if (!sampleContext) {
                sampleContext = {
                    name: derivedTestName || profile.full_name || 'Sample Recipient',
                    first_name: (derivedTestName || profile.full_name || 'Sample').split(' ')[0],
                    email: targetTestEmail,
                    role: profile.role || 'Administrator',
                    organization: 'AWS Cloud Club DDU'
                };
            } else {
                sampleContext.email = targetTestEmail;
                const isGeneric = !sampleContext.name ||
                    sampleContext.name.toLowerCase() === targetTestEmail.toLowerCase() ||
                    /^(sample recipient|recipient|member|participant|\$\{\s*name\s*\}|\{\{\s*name\s*\}\})$/i.test(String(sampleContext.name).trim());

                if (isGeneric && derivedTestName) {
                    sampleContext.name = derivedTestName;
                    sampleContext.first_name = derivedTestName.split(' ')[0];
                }
            }

            const interpolatedSubject = `[TEST] ` + interpolateVariables(subject, sampleContext);
            const interpolatedBody = interpolateVariables(messageBody, sampleContext);
            const interpolatedBtnUrl = button?.url ? interpolateVariables(button.url, sampleContext) : '';
            const interpolatedHeaderTitle = header?.title ? interpolateVariables(header.title, sampleContext) : '';

            const testHtml = buildMinimalistEmailHtml({
                title: interpolatedSubject,
                preheader: interpolatedSubject,
                rawBody: interpolatedBody,
                header: {
                    ...header,
                    title: interpolatedHeaderTitle || header?.title
                },
                footer,
                theme,
                button: {
                    ...button,
                    url: interpolatedBtnUrl
                },
                attachments: mailAttachments
            });

            const sendRes = await sendEmail({
                to: targetTestEmail,
                subject: interpolatedSubject,
                html: testHtml,
                attachments: mailAttachments
            });

            if (!sendRes.success) {
                return NextResponse.json({ error: sendRes.error || 'Failed to dispatch test email' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                testSent: true,
                to: targetTestEmail,
                message: `Test email successfully sent to ${targetTestEmail}`
            });
        }

        // ══════════════════════════════════════════════════════
        // BROADCAST MODE
        // ══════════════════════════════════════════════════════
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients provided for broadcast' }, { status: 400 });
        }

        // Clean & deduplicate recipients by lowercase email
        const uniqueRecipients = [];
        const seenEmails = new Set();

        for (const r of recipients) {
            const email = (r.email || r['Email'] || r['email address'] || '').trim().toLowerCase();
            if (email && email.includes('@') && !seenEmails.has(email)) {
                seenEmails.add(email);
                const derivedName = extractNameFromEmail(email);
                const currentName = r.name ? String(r.name).trim() : '';
                const isGeneric = !currentName ||
                    currentName.toLowerCase() === email.toLowerCase() ||
                    /^(sample recipient|recipient|member|participant|\$\{\s*name\s*\}|\{\{\s*name\s*\}\})$/i.test(currentName);

                const finalName = !isGeneric ? currentName : (derivedName || currentName || 'Recipient');
                uniqueRecipients.push({
                    ...r,
                    email,
                    name: finalName,
                    first_name: r.first_name || finalName.split(' ')[0]
                });
            }
        }

        if (uniqueRecipients.length === 0) {
            return NextResponse.json({ error: 'No valid recipient email addresses found' }, { status: 400 });
        }

        let sentCount = 0;
        let failedCount = 0;
        const errors = [];

        // Chunk sending with 5 parallel dispatches & 100ms pause
        const CHUNK_SIZE = 5;
        for (let i = 0; i < uniqueRecipients.length; i += CHUNK_SIZE) {
            const chunk = uniqueRecipients.slice(i, i + CHUNK_SIZE);
            const promises = chunk.map(async (recipient) => {
                try {
                    const personalizedSubject = interpolateVariables(subject, recipient);
                    const personalizedBody = interpolateVariables(messageBody, recipient);
                    const personalizedBtnUrl = button?.url ? interpolateVariables(button.url, recipient) : '';
                    const personalizedHeaderTitle = header?.title ? interpolateVariables(header.title, recipient) : '';

                    const html = buildMinimalistEmailHtml({
                        title: personalizedSubject,
                        preheader: personalizedSubject,
                        rawBody: personalizedBody,
                        header: {
                            ...header,
                            title: personalizedHeaderTitle || header?.title
                        },
                        footer,
                        theme,
                        button: {
                            ...button,
                            url: personalizedBtnUrl
                        },
                        attachments: mailAttachments
                    });

                    const res = await sendEmail({
                        to: recipient.email,
                        subject: personalizedSubject,
                        html,
                        attachments: mailAttachments
                    });

                    if (res.success) {
                        sentCount++;
                    } else {
                        failedCount++;
                        if (errors.length < 10) {
                            errors.push({ email: recipient.email, error: res.error || 'Failed to deliver' });
                        }
                    }
                } catch (err) {
                    failedCount++;
                    if (errors.length < 10) {
                        errors.push({ email: recipient.email, error: err.message || 'Dispatch error' });
                    }
                }
            });

            await Promise.allSettled(promises);

            if (i + CHUNK_SIZE < uniqueRecipients.length) {
                await delay(120);
            }
        }

        // Audit Log entry
        await logActivity(
            supabase,
            'EMAIL_CAMPAIGN_BROADCAST',
            `Admin ${profile.full_name || profile.email} broadcasted email campaign "${subject}" to ${uniqueRecipients.length} recipients (${sentCount} sent, ${failedCount} failed, ${mailAttachments.length} attachments)`,
            failedCount > 0 && sentCount === 0 ? 'error' : (failedCount > 0 ? 'warning' : 'success'),
            {
                subject,
                totalTargeted: uniqueRecipients.length,
                sentCount,
                failedCount,
                attachmentsCount: mailAttachments.length
            }
        );

        return NextResponse.json({
            success: true,
            totalTargeted: uniqueRecipients.length,
            sentCount,
            failedCount,
            errors
        });

    } catch (err) {
        console.error('[Admin Campaigns POST Error]:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
