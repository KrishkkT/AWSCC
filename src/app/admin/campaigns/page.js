'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import * as xlsx from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Send, Upload, FileSpreadsheet, Paperclip, X, Check,
    AlertCircle, CheckCircle2, Users, Eye, Sparkles, Sliders,
    Layers, RefreshCw, FileText, Image as ImageIcon, Video,
    FileArchive, FileCheck, ArrowRight, Smartphone, Monitor,
    Code, ShieldCheck, Trash2, Plus, Info, Palette, ExternalLink
} from 'lucide-react';
import { THEME_PRESETS, interpolateVariables, buildMinimalistEmailHtml } from '@/lib/minimalistEmailTemplate';

export default function AdminCampaignStudioPage() {
    const supabase = createClient();

    // ─────────────────────────────────────────────────────────────
    // User & Permissions State
    // ─────────────────────────────────────────────────────────────
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // ─────────────────────────────────────────────────────────────
    // Recipient Source State
    // ─────────────────────────────────────────────────────────────
    // 'UPLOAD' | 'MEMBERS' | 'EVENTS' | 'MANUAL'
    const [recipientSource, setRecipientSource] = useState('UPLOAD');

    // Uploaded Excel / CSV data
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [uploadedData, setUploadedData] = useState([]);
    const [uploadedColumns, setUploadedColumns] = useState([]);
    const [emailColumnKey, setEmailColumnKey] = useState('');
    const [nameColumnKey, setNameColumnKey] = useState('');
    const [deduplicate, setDeduplicate] = useState(true);

    // Database Audience
    const [dbMembers, setDbMembers] = useState([]);
    const [dbEvents, setDbEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [eventAttendees, setEventAttendees] = useState([]);
    const [loadingAudience, setLoadingAudience] = useState(false);

    // Manual Recipient List
    const [manualEmailsText, setManualEmailsText] = useState('');

    // Search query for preview table
    const [tableSearch, setTableSearch] = useState('');
    const [showRecipientModal, setShowRecipientModal] = useState(false);

    // ─────────────────────────────────────────────────────────────
    // Customization & Minimalist Styling
    // ─────────────────────────────────────────────────────────────
    const [activeThemeKey, setActiveThemeKey] = useState('slate');
    const [customThemeColors, setCustomThemeColors] = useState({
        bg: '#090D16',
        cardBg: '#0F172A',
        borderColor: '#1E293B',
        accentColor: '#38BDF8',
        textColor: '#F8FAFC',
        mutedColor: '#94A3B8',
        isDark: true
    });

    const activeTheme = useMemo(() => {
        if (activeThemeKey === 'custom') return customThemeColors;
        return THEME_PRESETS[activeThemeKey] || THEME_PRESETS.slate;
    }, [activeThemeKey, customThemeColors]);

    // Header Customization
    const [headerConfig, setHeaderConfig] = useState({
        enabled: true,
        style: 'accent_bar', // 'accent_bar' | 'clean_badge' | 'monoline' | 'pure_text' | 'none'
        title: 'AWS Cloud Community',
        subtitle: 'Official Member & Participant Notice',
        badgeText: 'AWS SBG DDU'
    });

    // Footer Customization
    const [footerConfig, setFooterConfig] = useState({
        enabled: true,
        style: 'minimal_line', // 'minimal_line' | 'signoff' | 'detailed' | 'none'
        customText: 'AWS Student Builder Group • Dharmsinh Desai University',
        showUnsubscribe: true
    });

    // Call to Action (CTA) Button Customization
    const [buttonConfig, setButtonConfig] = useState({
        enabled: false,
        text: 'Access Portal',
        url: 'https://aws.ddu.ac.in',
        style: 'filled' // 'filled' | 'outline' | 'pill'
    });

    // ─────────────────────────────────────────────────────────────
    // Compose Form State
    // ─────────────────────────────────────────────────────────────
    const [subject, setSubject] = useState('Important Update from AWS Student Builder Group');
    const [messageBody, setMessageBody] = useState(
        `Hello {{name}},\n\nWe are writing to share an important announcement regarding our upcoming initiatives and activities at AWS Student Builder Group DDU.\n\nKey Highlights:\n• Continuous cloud workshops and certifications\n• New project tracks and mentorship sessions\n• Community events and exclusive delegate access\n\nPlease find the attached documents for complete details and guidelines.\n\nWarm regards,\nAWS Student Builder Group Team`
    );

    // Preset Templates
    const EMAIL_PRESETS = [
        {
            id: 'ANNOUNCEMENT',
            title: 'Minimalist Club Announcement',
            badge: 'General',
            subject: 'Important Community Update: {{event_name}}',
            body: `Hello {{name}},\n\nWe are pleased to bring you the latest announcement from the AWS Student Builder Group DDU chapter.\n\n• Session / Agenda: Review upcoming schedules and important deadlines.\n• What to prepare: Please keep your portal access ready.\n\nIf you have any questions or require support, reply directly to this email or reach us through our official Discord/WhatsApp groups.\n\nBest regards,\nAWS Student Builder Group Team`,
            headerTitle: 'Community Announcement',
            headerSubtitle: 'AWS Student Builder Group • DDU Chapter'
        },
        {
            id: 'EVENT_INVITE',
            title: 'Event Invitation & RSVP',
            badge: 'Invitation',
            subject: 'Exclusive Invitation: Join us for {{event_name}}',
            body: `Dear {{name}},\n\nYou are cordially invited to participate in our upcoming hands-on session:\n\n📅 Event: {{event_name}}\n📍 Venue: {{venue}}\n🎫 Category / Role: {{role}}\n\nPlease confirm your attendance by clicking the button below or keeping this email handy at the registration counter.\n\nLooking forward to seeing you there!\nOrganizing Team`,
            headerTitle: 'Exclusive Event Invitation',
            headerSubtitle: 'Confirm Your Participation'
        },
        {
            id: 'CERTIFICATE_NOTICE',
            title: 'Certificate & Achievement Release',
            badge: 'Certificates',
            subject: '🎓 Your Verified Certificate for {{event_name}} is Ready',
            body: `Dear {{name}},\n\nCongratulations on successfully participating in {{event_name}}!\n\nYour verified certificate of participation has been issued and linked to your email address ({{email}}).\n\nPlease refer to the attached document or visit our verification portal to download your high-resolution copy.\n\nKeep building,\nAWS Student Builder Group DDU`,
            headerTitle: 'Certificate Issued',
            headerSubtitle: 'Academic & Community Recognition'
        },
        {
            id: 'BLANK',
            title: 'Custom Blank Canvas',
            badge: 'Freeform',
            subject: 'Announcement',
            body: `Hello {{name}},\n\n[Write your customized message here...]\n\nRegards,\nAWS Team`,
            headerTitle: 'Announcement',
            headerSubtitle: ''
        }
    ];

    // ─────────────────────────────────────────────────────────────
    // Attachments State (Images, Videos, PDFs, Anything)
    // ─────────────────────────────────────────────────────────────
    // Array of { file, filename, size, formattedSize, contentType, base64Content, isBase64: true }
    const [attachments, setAttachments] = useState([]);
    const [attachmentError, setAttachmentError] = useState('');

    // ─────────────────────────────────────────────────────────────
    // Preview & Inspector State
    // ─────────────────────────────────────────────────────────────
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
    const [previewMode, setPreviewMode] = useState('visual'); // 'visual' | 'code'
    const [copiedTag, setCopiedTag] = useState('');

    // ─────────────────────────────────────────────────────────────
    // Sending & Dispatch State
    // ─────────────────────────────────────────────────────────────
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
    const [broadcastResult, setBroadcastResult] = useState(null);

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const attachmentInputRef = useRef(null);

    // ─────────────────────────────────────────────────────────────
    // 1. Initial Load: Profile & Database Audiences
    // ─────────────────────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    setProfile(prof || { email: user.email, full_name: user.email, role: 'admin' });
                    setTestEmail(user.email || '');
                }

                // Fetch Database Audience Meta
                const res = await fetch('/api/admin/campaigns');
                if (res.ok) {
                    const data = await res.json();
                    setDbMembers(data.members || []);
                    setDbEvents(data.events || []);
                }
            } catch (err) {
                console.error('[Admin Campaigns Init Error]:', err);
            } finally {
                setLoadingProfile(false);
            }
        }
        init();
    }, [supabase]);

    // Fetch Event Attendees when event selected
    useEffect(() => {
        if (!selectedEventId) {
            setEventAttendees([]);
            return;
        }
        async function fetchAttendees() {
            setLoadingAudience(true);
            try {
                const res = await fetch(`/api/admin/campaigns?action=event-attendees&eventId=${selectedEventId}`);
                if (res.ok) {
                    const data = await res.json();
                    setEventAttendees(data.recipients || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingAudience(false);
            }
        }
        fetchAttendees();
    }, [selectedEventId]);

    // ─────────────────────────────────────────────────────────────
    // 2. Resolve Active Recipients List
    // ─────────────────────────────────────────────────────────────
    const resolvedRecipients = useMemo(() => {
        let list = [];

        if (recipientSource === 'UPLOAD') {
            list = uploadedData.map((row, idx) => {
                const email = emailColumnKey ? String(row[emailColumnKey] || '').trim() : '';
                const name = nameColumnKey ? String(row[nameColumnKey] || '').trim() : '';
                return {
                    ...row,
                    email: email || row.email || row.Email || '',
                    name: name || row.name || row.Name || `Recipient #${idx + 1}`,
                    first_name: (name || row.name || row.Name || 'Recipient').split(' ')[0]
                };
            });
        } else if (recipientSource === 'MEMBERS') {
            list = dbMembers.map(m => ({
                ...m,
                name: m.name || m.full_name || 'Member',
                first_name: (m.name || m.full_name || 'Member').split(' ')[0],
                email: m.email
            }));
        } else if (recipientSource === 'EVENTS') {
            const currentEvent = dbEvents.find(e => e.id === selectedEventId);
            list = eventAttendees.map(a => ({
                ...a,
                event_name: currentEvent?.title || 'AWS Event',
                venue: currentEvent?.location || 'Campus Center'
            }));
        } else if (recipientSource === 'MANUAL') {
            const raw = manualEmailsText
                .split(/[\n,;]+/)
                .map(s => s.trim())
                .filter(s => s && s.includes('@'));
            list = raw.map((em, idx) => ({
                email: em,
                name: em.split('@')[0],
                first_name: em.split('@')[0]
            }));
        }

        // Filter valid emails
        list = list.filter(r => r.email && r.email.includes('@'));

        // Deduplicate if enabled
        if (deduplicate) {
            const seen = new Set();
            const unique = [];
            for (const r of list) {
                const em = r.email.toLowerCase().trim();
                if (!seen.has(em)) {
                    seen.add(em);
                    unique.push(r);
                }
            }
            return unique;
        }

        return list;
    }, [
        recipientSource, uploadedData, emailColumnKey, nameColumnKey,
        dbMembers, eventAttendees, selectedEventId, dbEvents,
        manualEmailsText, deduplicate
    ]);

    // Active sample recipient for live preview
    const sampleRecipient = useMemo(() => {
        if (resolvedRecipients.length > 0) {
            return resolvedRecipients[Math.min(previewIndex, resolvedRecipients.length - 1)];
        }
        return {
            name: profile?.full_name || 'Alex Mercer',
            first_name: (profile?.full_name || 'Alex').split(' ')[0],
            email: profile?.email || 'alex@example.com',
            role: 'Student Delegate',
            company: 'Dharmsinh Desai University',
            event_name: 'AWS Cloud Day 2026',
            venue: 'Main Campus Auditorium'
        };
    }, [resolvedRecipients, previewIndex, profile]);

    // ─────────────────────────────────────────────────────────────
    // 3. Dynamic Tag Suggestions List
    // ─────────────────────────────────────────────────────────────
    const availableTags = useMemo(() => {
        const base = [
            { tag: '{{name}}', label: 'Full Name' },
            { tag: '{{first_name}}', label: 'First Name' },
            { tag: '{{email}}', label: 'Email' }
        ];

        if (recipientSource === 'UPLOAD' && uploadedColumns.length > 0) {
            const custom = uploadedColumns.map(col => ({
                tag: `{{${col}}}`,
                label: col
            }));
            return [...base, ...custom.filter(c => !base.some(b => b.tag.toLowerCase() === c.tag.toLowerCase()))];
        }

        if (recipientSource === 'EVENTS') {
            return [
                ...base,
                { tag: '{{event_name}}', label: 'Event Name' },
                { tag: '{{venue}}', label: 'Venue' },
                { tag: '{{certificate_status}}', label: 'Certificate Status' }
            ];
        }

        if (recipientSource === 'MEMBERS') {
            return [
                ...base,
                { tag: '{{role}}', label: 'Member Role' }
            ];
        }

        return base;
    }, [recipientSource, uploadedColumns]);

    // ─────────────────────────────────────────────────────────────
    // 4. Excel & CSV File Upload Handler
    // ─────────────────────────────────────────────────────────────
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedFileName(file.name);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = xlsx.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    alert('Uploaded file contains no data rows.');
                    return;
                }

                const cols = Object.keys(data[0] || {});
                setUploadedColumns(cols);
                setUploadedData(data);

                // Auto detect email column
                const detectedEmail = cols.find(c => {
                    const lc = c.toLowerCase().trim();
                    return lc.includes('email') || lc === 'mail';
                });
                if (detectedEmail) setEmailColumnKey(detectedEmail);
                else setEmailColumnKey(cols[0]);

                // Auto detect name column
                const detectedName = cols.find(c => {
                    const lc = c.toLowerCase().trim();
                    return lc.includes('name') || lc === 'full_name' || lc === 'attendee';
                });
                if (detectedName) setNameColumnKey(detectedName);

                setRecipientSource('UPLOAD');
            } catch (err) {
                console.error('File parsing error:', err);
                alert(`Failed to parse file: ${err.message}`);
            }
        };

        reader.readAsBinaryString(file);
    };

    // ─────────────────────────────────────────────────────────────
    // 5. File Attachments Handler (Images, Videos, PDFs, Docs, etc.)
    // ─────────────────────────────────────────────────────────────
    const handleAttachmentUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setAttachmentError('');

        // Limit individual file size to 15MB, total 25MB (standard safe SMTP payload)
        const MAX_FILE_SIZE = 15 * 1024 * 1024;

        files.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                setAttachmentError(`File "${file.name}" exceeds 15MB size limit.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1];
                const formattedSize = file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(file.size / 1024)} KB`;

                setAttachments(prev => [
                    ...prev.filter(p => p.filename !== file.name),
                    {
                        filename: file.name,
                        size: file.size,
                        formattedSize,
                        contentType: file.type || 'application/octet-stream',
                        content: base64Data,
                        isBase64: true
                    }
                ]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input value
        if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    };

    const removeAttachment = (filename) => {
        setAttachments(prev => prev.filter(a => a.filename !== filename));
    };

    // ─────────────────────────────────────────────────────────────
    // 6. Insert Dynamic Tag at Cursor
    // ─────────────────────────────────────────────────────────────
    const insertTag = (tag) => {
        if (!textareaRef.current) {
            setMessageBody(prev => prev + ' ' + tag);
            return;
        }
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const newText = text.substring(0, start) + ' ' + tag + ' ' + text.substring(end);
        setMessageBody(newText);
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(''), 1500);

        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + tag.length + 2;
        }, 50);
    };

    // ─────────────────────────────────────────────────────────────
    // 7. Apply Preset Template
    // ─────────────────────────────────────────────────────────────
    const applyPreset = (presetId) => {
        const found = EMAIL_PRESETS.find(p => p.id === presetId);
        if (!found) return;

        setSubject(found.subject);
        setMessageBody(found.body);
        if (found.headerTitle !== undefined) {
            setHeaderConfig(prev => ({
                ...prev,
                title: found.headerTitle,
                subtitle: found.headerSubtitle || ''
            }));
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 8. Generate Live Preview HTML
    // ─────────────────────────────────────────────────────────────
    const livePreviewHtml = useMemo(() => {
        const interpolatedSubject = interpolateVariables(subject, sampleRecipient);
        const interpolatedBody = interpolateVariables(messageBody, sampleRecipient);
        const interpolatedBtnUrl = buttonConfig.url ? interpolateVariables(buttonConfig.url, sampleRecipient) : '';
        const interpolatedHeaderTitle = headerConfig.title ? interpolateVariables(headerConfig.title, sampleRecipient) : '';

        return buildMinimalistEmailHtml({
            title: interpolatedSubject,
            preheader: interpolatedSubject,
            rawBody: interpolatedBody,
            header: {
                ...headerConfig,
                title: interpolatedHeaderTitle || headerConfig.title
            },
            footer: footerConfig,
            theme: activeTheme,
            button: {
                ...buttonConfig,
                url: interpolatedBtnUrl
            },
            attachments
        });
    }, [
        subject, messageBody, sampleRecipient, headerConfig, footerConfig,
        activeTheme, buttonConfig, attachments
    ]);

    // ─────────────────────────────────────────────────────────────
    // 9. Send Test Email
    // ─────────────────────────────────────────────────────────────
    const handleSendTest = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            alert('Please enter a valid test email address.');
            return;
        }

        setIsSendingTest(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'test',
                    testEmail: testEmail.trim(),
                    recipients: [sampleRecipient],
                    subject,
                    messageBody,
                    header: headerConfig,
                    footer: footerConfig,
                    theme: activeTheme,
                    button: buttonConfig,
                    attachments
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to dispatch test email');

            setTestResult({
                success: true,
                message: `Test email sent successfully to ${testEmail}!`
            });
        } catch (err) {
            setTestResult({
                success: false,
                error: err.message
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 10. Broadcast Campaign to All Recipients
    // ─────────────────────────────────────────────────────────────
    const handleBroadcast = async () => {
        if (resolvedRecipients.length === 0) {
            alert('No valid recipients to send to.');
            return;
        }

        setIsBroadcasting(true);
        setBroadcastResult(null);

        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'broadcast',
                    recipients: resolvedRecipients,
                    subject,
                    messageBody,
                    header: headerConfig,
                    footer: footerConfig,
                    theme: activeTheme,
                    button: buttonConfig,
                    attachments
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Broadcast failed');

            setBroadcastResult({
                success: true,
                total: data.totalTargeted,
                sent: data.sentCount,
                failed: data.failedCount,
                errors: data.errors || []
            });
        } catch (err) {
            setBroadcastResult({
                success: false,
                error: err.message
            });
        } finally {
            setIsBroadcasting(false);
        }
    };

    // Helper for file type icons
    const getFileIcon = (mime = '', name = '') => {
        if (mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name)) return <ImageIcon size={14} className="text-emerald-400" />;
        if (mime.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(name)) return <Video size={14} className="text-purple-400" />;
        if (mime.includes('pdf') || /\.pdf$/i.test(name)) return <FileText size={14} className="text-rose-400" />;
        if (/\.(zip|tar|gz|rar)$/i.test(name)) return <FileArchive size={14} className="text-amber-400" />;
        return <Paperclip size={14} className="text-sky-400" />;
    };

    return (
        <div className="space-y-8 pb-16">
            
            {/* ══════════════════════════════════════════════════════
                STUDIO HEADER
            ══════════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                            Operations Node
                        </span>
                        <span className="text-white/40 text-xs">•</span>
                        <span className="text-white/40 text-xs font-mono">Custom Minimalist Broadcaster</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        Email Campaign <span className="text-brand-cyan">Studio</span>
                    </h1>
                    <p className="text-white/60 text-sm mt-1 max-w-2xl">
                        Compose minimalist, highly customizable HTML campaigns with file attachments, universal variable tags, and CSV/Excel spreadsheet integration.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowRecipientModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Users size={15} className="text-brand-cyan" />
                        <span>Recipients: <strong className="text-white">{resolvedRecipients.length}</strong></span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setBroadcastModalOpen(true)}
                        disabled={resolvedRecipients.length === 0}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-aws to-brand-blue hover:opacity-95 text-white text-xs font-black tracking-wide shadow-lg shadow-brand-aws/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Send size={15} />
                        <span>Broadcast Campaign</span>
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                MAIN WORKSPACE GRID
            ══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* ──────────────────────────────────────────────────
                    LEFT COLUMN: Recipient Source & Editor (7 Cols)
                ────────────────────────────────────────────────── */}
                <div className="xl:col-span-7 space-y-6">

                    {/* 1. RECIPIENT SOURCE CARD */}
                    <div className="bg-[#0b101b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2">
                                <Users size={16} className="text-brand-cyan" /> 1. Recipient Audience
                            </h3>

                            {/* Source Switcher Tabs */}
                            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 text-xs font-bold">
                                {[
                                    { id: 'UPLOAD', label: 'CSV / Excel' },
                                    { id: 'MEMBERS', label: 'Club Members' },
                                    { id: 'EVENTS', label: 'Event Attendees' },
                                    { id: 'MANUAL', label: 'Manual Input' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setRecipientSource(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                                            recipientSource === tab.id
                                                ? 'bg-brand-cyan text-brand-dark font-black shadow-xs'
                                                : 'text-white/60 hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* SOURCE TAB 1: CSV / EXCEL UPLOAD */}
                        {recipientSource === 'UPLOAD' && (
                            <div className="space-y-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/15 hover:border-brand-cyan/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.04] group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-white mb-1">
                                        {uploadedFileName ? `Current File: ${uploadedFileName}` : 'Upload CSV or Excel Spreadsheet'}
                                    </p>
                                    <p className="text-xs text-white/50">
                                        Click or drop your .csv, .xlsx, or .xls file here. All columns will automatically turn into dynamic tags!
                                    </p>
                                </div>

                                {uploadedData.length > 0 && (
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={15} className="text-emerald-400" />
                                                <span className="font-bold text-white">{uploadedData.length} Rows Imported</span>
                                                <span className="text-white/40">({uploadedColumns.length} columns detected)</span>
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer text-white/70 hover:text-white">
                                                <input
                                                    type="checkbox"
                                                    checked={deduplicate}
                                                    onChange={e => setDeduplicate(e.target.checked)}
                                                    className="rounded border-white/20 bg-white/5 text-brand-cyan focus:ring-0"
                                                />
                                                <span className="text-[11px] font-bold">Deduplicate Emails</span>
                                            </label>
                                        </div>

                                        {/* Column Mappings */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                                    Email Column (Required)
                                                </label>
                                                <select
                                                    value={emailColumnKey}
                                                    onChange={e => setEmailColumnKey(e.target.value)}
                                                    className="w-full bg-[#05080f] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                                >
                                                    {uploadedColumns.map(col => (
                                                        <option key={col} value={col}>{col}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                                    Name Column (Optional)
                                                </label>
                                                <select
                                                    value={nameColumnKey}
                                                    onChange={e => setNameColumnKey(e.target.value)}
                                                    className="w-full bg-[#05080f] border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                                >
                                                    <option value="">-- Auto Detect --</option>
                                                    {uploadedColumns.map(col => (
                                                        <option key={col} value={col}>{col}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SOURCE TAB 2: CLUB MEMBERS */}
                        {recipientSource === 'MEMBERS' && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-brand-cyan" />
                                        <span className="text-sm font-bold text-white">Registered Club Members</span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-cyan/10 text-brand-cyan">
                                        {dbMembers.length} Members in DB
                                    </span>
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed">
                                    Broadcast directly to verified core, leaders, faculty, and student members synchronized in Supabase profiles.
                                </p>
                            </div>
                        )}

                        {/* SOURCE TAB 3: EVENT ATTENDEES */}
                        {recipientSource === 'EVENTS' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                        Select Target Event
                                    </label>
                                    <select
                                        value={selectedEventId}
                                        onChange={e => setSelectedEventId(e.target.value)}
                                        className="w-full bg-[#05080f] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                    >
                                        <option value="">-- Choose an Event to Load Participants --</option>
                                        {dbEvents.map(evt => (
                                            <option key={evt.id} value={evt.id}>
                                                {evt.title} ({evt.status || 'Active'}) - {evt.date || 'TBA'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedEventId && (
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between text-xs">
                                        <span className="text-white/60">
                                            {loadingAudience ? 'Loading participants...' : `${eventAttendees.length} Registered Attendees Found`}
                                        </span>
                                        <span className="font-mono text-brand-cyan font-bold">{eventAttendees.length} Ready</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SOURCE TAB 4: MANUAL EMAILS */}
                        {recipientSource === 'MANUAL' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                                    Paste Email Addresses (Separated by comma or new lines)
                                </label>
                                <textarea
                                    rows={4}
                                    value={manualEmailsText}
                                    onChange={e => setManualEmailsText(e.target.value)}
                                    placeholder="john@example.com, sarah@college.edu&#10;david@domain.org"
                                    className="w-full bg-[#05080f] border border-white/15 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-brand-cyan resize-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* 2. MINIMALIST CUSTOMIZATION & STYLING CONTROLS */}
                    <div className="bg-[#0b101b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2">
                                <Palette size={16} className="text-brand-cyan" /> 2. Minimalist Theme & Layout
                            </h3>
                            <span className="text-[10px] font-mono text-white/40 uppercase">Deliverability Optimized</span>
                        </div>

                        {/* Theme Preset Selector */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-2">
                                Color Format (Minimalist Presets)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {Object.values(THEME_PRESETS).map(th => {
                                    const isSelected = activeThemeKey === th.id;
                                    return (
                                        <button
                                            key={th.id}
                                            type="button"
                                            onClick={() => setActiveThemeKey(th.id)}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-white/10 border-brand-cyan ring-1 ring-brand-cyan shadow-md'
                                                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-white">{th.name}</span>
                                                <span
                                                    className="w-3.5 h-3.5 rounded-full border border-white/30"
                                                    style={{ backgroundColor: th.accentColor }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-white/40 truncate">{th.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Minimalist Header Configuration */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={headerConfig.enabled}
                                        onChange={e => setHeaderConfig({ ...headerConfig, enabled: e.target.checked })}
                                        className="rounded border-white/20 bg-white/5 text-brand-cyan"
                                    />
                                    <span>Minimalist Header</span>
                                </label>

                                {headerConfig.enabled && (
                                    <select
                                        value={headerConfig.style}
                                        onChange={e => setHeaderConfig({ ...headerConfig, style: e.target.value })}
                                        className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-brand-cyan font-bold"
                                    >
                                        <option value="accent_bar">Accent Bar</option>
                                        <option value="clean_badge">Minimal Badge</option>
                                        <option value="monoline">Monoline</option>
                                        <option value="pure_text">Pure Typography</option>
                                    </select>
                                )}
                            </div>

                            {headerConfig.enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                            Header Title
                                        </label>
                                        <input
                                            type="text"
                                            value={headerConfig.title}
                                            onChange={e => setHeaderConfig({ ...headerConfig, title: e.target.value })}
                                            placeholder="e.g. AWS Cloud Community"
                                            className="w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                            Badge / Tagline
                                        </label>
                                        <input
                                            type="text"
                                            value={headerConfig.badgeText}
                                            onChange={e => setHeaderConfig({ ...headerConfig, badgeText: e.target.value })}
                                            placeholder="e.g. AWS SBG DDU"
                                            className="w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Minimalist Footer Configuration */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={footerConfig.enabled}
                                        onChange={e => setFooterConfig({ ...footerConfig, enabled: e.target.checked })}
                                        className="rounded border-white/20 bg-white/5 text-brand-cyan"
                                    />
                                    <span>Minimalist Footer</span>
                                </label>

                                {footerConfig.enabled && (
                                    <select
                                        value={footerConfig.style}
                                        onChange={e => setFooterConfig({ ...footerConfig, style: e.target.value })}
                                        className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-brand-cyan font-bold"
                                    >
                                        <option value="minimal_line">Single-line Clean</option>
                                        <option value="signoff">Team Signoff</option>
                                        <option value="detailed">Operational Notice</option>
                                    </select>
                                )}
                            </div>

                            {footerConfig.enabled && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                        Footer Text
                                    </label>
                                    <input
                                        type="text"
                                        value={footerConfig.customText}
                                        onChange={e => setFooterConfig({ ...footerConfig, customText: e.target.value })}
                                        placeholder="e.g. AWS Student Builder Group • DDU"
                                        className="w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Action Button (CTA) Option */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={buttonConfig.enabled}
                                        onChange={e => setButtonConfig({ ...buttonConfig, enabled: e.target.checked })}
                                        className="rounded border-white/20 bg-white/5 text-brand-cyan"
                                    />
                                    <span>Call-To-Action (CTA) Button</span>
                                </label>

                                {buttonConfig.enabled && (
                                    <select
                                        value={buttonConfig.style}
                                        onChange={e => setButtonConfig({ ...buttonConfig, style: e.target.value })}
                                        className="bg-[#05080f] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white outline-none font-bold"
                                    >
                                        <option value="filled">Filled Button</option>
                                        <option value="pill">Pill Rounded</option>
                                        <option value="outline">Outline Border</option>
                                    </select>
                                )}
                            </div>

                            {buttonConfig.enabled && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                            Button Text
                                        </label>
                                        <input
                                            type="text"
                                            value={buttonConfig.text}
                                            onChange={e => setButtonConfig({ ...buttonConfig, text: e.target.value })}
                                            placeholder="e.g. View Portal"
                                            className="w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                            Destination URL
                                        </label>
                                        <input
                                            type="text"
                                            value={buttonConfig.url}
                                            onChange={e => setButtonConfig({ ...buttonConfig, url: e.target.value })}
                                            placeholder="https://... or {{link}}"
                                            className="w-full bg-[#05080f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-brand-cyan"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. EMAIL CONTENT COMPOSER & ATTACHMENTS */}
                    <div className="bg-[#0b101b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2">
                                <FileText size={16} className="text-brand-cyan" /> 3. Compose Email Content
                            </h3>

                            {/* Preset Dropdown */}
                            <select
                                onChange={e => applyPreset(e.target.value)}
                                defaultValue=""
                                className="bg-[#05080f] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-brand-cyan"
                            >
                                <option value="" disabled>Load Preset Template...</option>
                                {EMAIL_PRESETS.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Line */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                Subject Line
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Enter email subject line..."
                                className="w-full bg-[#05080f] border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-brand-cyan"
                            />
                        </div>

                        {/* Dynamic Tags Variable Toolbar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-white/40">
                                    Click tag to insert into message:
                                </label>
                                {copiedTag && (
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold animate-pulse">
                                        ✓ Inserted {copiedTag}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#05080f] border border-white/10 rounded-xl no-scrollbar">
                                {availableTags.map(item => (
                                    <button
                                        key={item.tag}
                                        type="button"
                                        onClick={() => insertTag(item.tag)}
                                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-brand-cyan/20 border border-white/10 hover:border-brand-cyan/40 text-[11px] font-mono font-bold text-white/80 hover:text-brand-cyan transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <span>{item.tag}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Message Body */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1">
                                Message Body (Supports Paragraphs & Bullet Points)
                            </label>
                            <textarea
                                ref={textareaRef}
                                rows={10}
                                value={messageBody}
                                onChange={e => setMessageBody(e.target.value)}
                                placeholder="Write your personalized email message here..."
                                className="w-full bg-[#05080f] border border-white/15 rounded-xl p-4 text-sm text-white font-sans leading-relaxed outline-none focus:border-brand-cyan resize-y"
                            />
                        </div>

                        {/* ATTACHMENTS (Images, Videos, PDFs, Anything) */}
                        <div className="pt-3 border-t border-white/5 space-y-3">
                            <input
                                ref={attachmentInputRef}
                                type="file"
                                multiple
                                onChange={handleAttachmentUpload}
                                className="hidden"
                            />

                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-wider text-white/70 flex items-center gap-2">
                                    <Paperclip size={14} className="text-brand-cyan" /> Attachments (Image, Video, PDF, Docs, Zip)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => attachmentInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Plus size={13} className="text-brand-cyan" />
                                    <span>Add Files</span>
                                </button>
                            </div>

                            {attachmentError && (
                                <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                                    <AlertCircle size={14} /> {attachmentError}
                                </p>
                            )}

                            {attachments.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {attachments.map(att => (
                                            <div
                                                key={att.filename}
                                                className="flex items-center justify-between p-2.5 bg-[#05080f] border border-white/10 rounded-xl text-xs"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                                    {getFileIcon(att.contentType, att.filename)}
                                                    <span className="font-bold text-white truncate max-w-[160px]">
                                                        {att.filename}
                                                    </span>
                                                    <span className="text-[10px] text-white/40 font-mono shrink-0">
                                                        ({att.formattedSize})
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(att.filename)}
                                                    className="p-1 rounded-md text-white/40 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-white/40">
                                        {attachments.length} file{attachments.length > 1 ? 's' : ''} attached. Files will be delivered directly as Nodemailer attachments to each recipient.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    onClick={() => attachmentInputRef.current?.click()}
                                    className="border border-dashed border-white/10 rounded-xl p-3 text-center cursor-pointer hover:border-white/20 transition-all bg-white/[0.01]"
                                >
                                    <p className="text-xs text-white/40">
                                        No files attached yet. Click &quot;Add Files&quot; to attach flyers, schedules, PDFs, or media.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* ──────────────────────────────────────────────────
                    RIGHT COLUMN: Live Interactive Preview & Send (5 Cols)
                ────────────────────────────────────────────────── */}
                <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-24">
                    
                    {/* PREVIEW CONTAINER */}
                    <div className="bg-[#0b101b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                        
                        {/* Preview Top Bar */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-brand-cyan" />
                                <span className="text-xs font-black uppercase tracking-[0.15em] text-white">Live Email Preview</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Desktop vs Mobile Toggle */}
                                <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('desktop')}
                                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                            previewDevice === 'desktop' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                                        }`}
                                        title="Desktop View"
                                    >
                                        <Monitor size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('mobile')}
                                        className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                            previewDevice === 'mobile' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                                        }`}
                                        title="Mobile View"
                                    >
                                        <Smartphone size={14} />
                                    </button>
                                </div>

                                {/* Visual vs Code Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setPreviewMode(previewMode === 'visual' ? 'code' : 'visual')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                                        previewMode === 'code'
                                            ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                    }`}
                                >
                                    {previewMode === 'code' ? 'HTML Code' : 'Visual'}
                                </button>
                            </div>
                        </div>

                        {/* Attendee Navigation Slider */}
                        {resolvedRecipients.length > 0 && (
                            <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl text-xs font-bold">
                                <span className="text-white/60">
                                    Simulating: <strong className="text-white">{sampleRecipient.name}</strong> ({sampleRecipient.email})
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={previewIndex <= 0}
                                        onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white text-[11px] cursor-pointer"
                                    >
                                        &larr; Prev
                                    </button>
                                    <span className="text-[10px] font-mono text-white/40 px-1">
                                        {previewIndex + 1}/{resolvedRecipients.length}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={previewIndex >= resolvedRecipients.length - 1}
                                        onClick={() => setPreviewIndex(prev => Math.min(resolvedRecipients.length - 1, prev + 1))}
                                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white text-[11px] cursor-pointer"
                                    >
                                        Next &rarr;
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Subject Preview Header */}
                        <div className="px-3 py-2 bg-[#05080f] border border-white/10 rounded-xl space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-white/40">Subject Line Preview</div>
                            <div className="text-xs font-bold text-white truncate">
                                {interpolateVariables(subject, sampleRecipient) || '(No subject)'}
                            </div>
                        </div>

                        {/* Rendered HTML Sandbox Frame */}
                        <div className={`mx-auto transition-all ${previewDevice === 'mobile' ? 'max-w-[360px]' : 'w-full'}`}>
                            {previewMode === 'visual' ? (
                                <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                                    <iframe
                                        title="Email Preview"
                                        srcDoc={livePreviewHtml}
                                        className="w-full h-[520px] bg-transparent border-0"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#05080f] p-3">
                                    <textarea
                                        readOnly
                                        rows={18}
                                        value={livePreviewHtml}
                                        className="w-full bg-transparent text-[11px] font-mono text-white/70 outline-none resize-none no-scrollbar"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ──────────────────────────────────────────
                            TEST DISPATCH BOX
                        ────────────────────────────────────────── */}
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-wider text-white/40">
                                Send Inbox Test Preview
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={e => setTestEmail(e.target.value)}
                                    placeholder="Enter test email address..."
                                    className="flex-1 bg-[#05080f] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono outline-none focus:border-brand-cyan"
                                />
                                <button
                                    type="button"
                                    onClick={handleSendTest}
                                    disabled={isSendingTest || !testEmail}
                                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                                >
                                    {isSendingTest ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                    <span>Send Test</span>
                                </button>
                            </div>

                            {testResult && (
                                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                                    testResult.success
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                    {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                                    <span>{testResult.message || testResult.error}</span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>

            {/* ══════════════════════════════════════════════════════
                RECIPIENTS INSPECTOR MODAL
            ══════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {showRecipientModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0b101b] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div>
                                    <h3 className="text-xl font-black text-white">Target Recipients Directory</h3>
                                    <p className="text-xs text-white/50 mt-0.5">
                                        Showing {resolvedRecipients.length} resolved email addresses ready for campaign dispatch.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowRecipientModal(false)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search filter */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={tableSearch}
                                    onChange={e => setTableSearch(e.target.value)}
                                    placeholder="Filter by name, email, or metadata..."
                                    className="flex-1 bg-[#05080f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-brand-cyan"
                                />
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#05080f] text-white/40 font-mono text-[10px] uppercase sticky top-0">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Email Address</th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Extra Fields</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {resolvedRecipients
                                            .filter(r => {
                                                const q = tableSearch.toLowerCase();
                                                return (r.email || '').toLowerCase().includes(q) ||
                                                    (r.name || '').toLowerCase().includes(q);
                                            })
                                            .slice(0, 100)
                                            .map((r, i) => (
                                                <tr key={i} className="hover:bg-white/[0.02]">
                                                    <td className="p-3 text-white/40 font-mono">{i + 1}</td>
                                                    <td className="p-3 font-bold text-brand-cyan">{r.email}</td>
                                                    <td className="p-3 text-white">{r.name}</td>
                                                    <td className="p-3 text-white/50 font-mono text-[11px] truncate max-w-xs">
                                                        {Object.entries(r)
                                                            .filter(([k]) => !['email', 'name', 'first_name'].includes(k))
                                                            .map(([k, v]) => `${k}: ${v}`)
                                                            .join(' • ') || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-between items-center text-xs text-white/40 pt-2">
                                <span>Showing up to first 100 entries in table</span>
                                <button
                                    onClick={() => setShowRecipientModal(false)}
                                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold"
                                >
                                    Close Inspector
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════
                BROADCAST CONFIRMATION & EXECUTION MODAL
            ══════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {broadcastModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#0b101b] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
                        >
                            {!broadcastResult ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-aws/10 text-brand-aws border border-brand-aws/20 flex items-center justify-center shrink-0">
                                            <Send size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white">Confirm Campaign Dispatch</h3>
                                            <p className="text-xs text-white/50">Ready to initiate mass SMTP broadcast</p>
                                        </div>
                                    </div>

                                    {/* Campaign Breakdown */}
                                    <div className="bg-[#05080f] rounded-2xl p-4 border border-white/10 space-y-3 text-xs">
                                        <div className="flex justify-between py-1 border-b border-white/5">
                                            <span className="text-white/50">Total Target Audience:</span>
                                            <strong className="text-white font-mono">{resolvedRecipients.length} Recipients</strong>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-white/5">
                                            <span className="text-white/50">Subject Line:</span>
                                            <strong className="text-white truncate max-w-[220px]">{subject}</strong>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-white/5">
                                            <span className="text-white/50">Attachments Attached:</span>
                                            <strong className="text-white font-mono">{attachments.length} File{attachments.length !== 1 ? 's' : ''}</strong>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-white/50">Color Scheme:</span>
                                            <strong className="text-brand-cyan">{activeTheme.name}</strong>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-medium leading-relaxed">
                                        ⚠️ Once launched, each recipient will receive an individualized email with personalized tag substitutions. Ensure your test email looked accurate before continuing.
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            disabled={isBroadcasting}
                                            onClick={() => setBroadcastModalOpen(false)}
                                            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isBroadcasting}
                                            onClick={handleBroadcast}
                                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-aws to-brand-blue hover:opacity-95 text-white text-xs font-black tracking-wide shadow-lg shadow-brand-aws/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {isBroadcasting ? (
                                                <>
                                                    <RefreshCw size={14} className="animate-spin" />
                                                    <span>Broadcasting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={14} />
                                                    <span>Launch Broadcast</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* BROADCAST RESULTS */}
                                    <div className="text-center space-y-3">
                                        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${
                                            broadcastResult.success && broadcastResult.failed === 0
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            {broadcastResult.success && broadcastResult.failed === 0 ? (
                                                <CheckCircle2 size={32} />
                                            ) : (
                                                <AlertCircle size={32} />
                                            )}
                                        </div>

                                        <h3 className="text-2xl font-black text-white">
                                            {broadcastResult.success && broadcastResult.failed === 0 ? 'Campaign Completed!' : 'Broadcast Finished with Notices'}
                                        </h3>
                                        <p className="text-xs text-white/60">
                                            SMTP mass dispatch process completed. Action has been written to the audit log.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">Targeted</div>
                                            <div className="text-2xl font-black text-white">{broadcastResult.total || 0}</div>
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400/70 mb-1">Delivered</div>
                                            <div className="text-2xl font-black text-emerald-400">{broadcastResult.sent || 0}</div>
                                        </div>
                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-rose-400/70 mb-1">Failed</div>
                                            <div className="text-2xl font-black text-rose-400">{broadcastResult.failed || 0}</div>
                                        </div>
                                    </div>

                                    {broadcastResult.errors && broadcastResult.errors.length > 0 && (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-1 max-h-32 overflow-y-auto">
                                            <span className="font-bold text-rose-400 block">Delivery Warnings:</span>
                                            {broadcastResult.errors.map((e, idx) => (
                                                <p key={idx} className="text-rose-300 font-mono text-[11px]">
                                                    • {e.email}: {e.error}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBroadcastModalOpen(false);
                                            setBroadcastResult(null);
                                        }}
                                        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                                    >
                                        Done & Close
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
