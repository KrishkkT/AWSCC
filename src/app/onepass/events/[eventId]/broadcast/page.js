'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useOnePass } from '@/components/onepass/OnePassContext';
import {
    Mail, Send, Sparkles, Users, Filter, CheckCircle2, AlertCircle,
    Layers, BookOpen, Coffee, Award, Clock, RefreshCw, ChevronRight,
    HelpCircle, MapPin, Eye, Edit3, Code, Check
} from 'lucide-react';

export default function OnePassBroadcastPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user, isAdmin } = useOnePass();

    const [event, setEvent] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Audience state
    const [audience, setAudience] = useState('ALL'); // 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'TRACK' | 'WORKSHOP'
    const [filterId, setFilterId] = useState('');
    const [recipientCount, setRecipientCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(false);

    // Form & Tab state
    const [activeTab, setActiveTab] = useState('EDIT'); // 'EDIT' | 'PREVIEW'
    const [selectedTemplate, setSelectedTemplate] = useState('LOCATION_GUIDANCE');
    const [subject, setSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [testEmail, setTestEmail] = useState(user?.email || '');
    const [copiedTag, setCopiedTag] = useState('');

    // Status state
    const [isSending, setIsSending] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const [testResult, setTestResult] = useState(null);

    // Templates preset
    const TEMPLATES = [
        {
            id: 'LOCATION_GUIDANCE',
            title: '📍 Session Room & Venue Guidance',
            badge: 'Post Check-In',
            subject: '📍 Your Session Location & Room Guidance for {{event_name}}',
            body: `Hello {{name}},\n\nWelcome to {{event_name}}!\n\nHere is your confirmed session details:\n• Allocated Session: {{session}}\n• Location / Room: {{location}}\n• Event Venue: {{venue}}\n• Booking ID: {{booking_id}}\n\nPlease head to {{location}} for your session. Please keep this email handy on your mobile phone for entrance admission.\n\nEnjoy the event!`
        },
        {
            id: 'MEAL_ANNOUNCEMENT',
            title: '🍱 Lunch & Refreshment Counters Open',
            badge: 'Hospitality',
            subject: '🍱 Lunch & Refreshment Counters are Now OPEN at {{venue}}',
            body: `Hello {{name}},\n\nLunch and refreshment counters are now active at the hospitality dining area!\n\n• Please keep this email handy on your mobile phone at the food desk to claim your meal voucher.\n• Food service is open until designated session restart.\n\nEnjoy your meal!`
        },
        {
            id: 'SWAG_ANNOUNCEMENT',
            title: '🎁 Swag Distribution Desk Active',
            badge: 'Goodies',
            subject: '🎁 Official Swag Kits are Ready for Pickup at {{event_name}}',
            body: `Hello {{name}},\n\nOfficial attendee swag kits and community badges are now available for pickup at the Main Distribution Desk.\n\n• Location / Room: Ground Floor Registration & Swag Lobby\n• Requirement: Please keep this email handy on your mobile phone (Booking ID: {{booking_id}})\n\nGrab your exclusive goodies!`
        },
        {
            id: 'KEYNOTE_ALERT',
            title: '⏰ Keynote Starting in 10 Minutes',
            badge: 'Stage Alert',
            subject: '⏰ Keynote Starting Soon in the Main Auditorium!',
            body: `Hello {{name}},\n\nThe opening Keynote for {{event_name}} is starting in 10 minutes at the Main Auditorium.\n\nPlease take your seats promptly. Keep this email handy on your mobile phone if requested.`
        },
        {
            id: 'CUSTOM',
            title: '✍️ Custom Broadcast Announcement',
            badge: 'Freeform',
            subject: 'Important Announcement from {{event_name}}',
            body: `Hello {{name}},\n\nWe have an important update regarding {{event_name}}:\n\n[Write your announcement message here...]\n\nPlease keep this email handy on your mobile phone.\n\nRegards,\nOrganizing Team`
        }
    ];

    // Supported Dynamic Tags
    const DYNAMIC_TAGS = [
        { tag: '{{name}}', label: 'Attendee Full Name', sample: 'Alex Mercer' },
        { tag: '{{first_name}}', label: 'First Name Only', sample: 'Alex' },
        { tag: '{{session}}', label: 'Allocated Track or Workshop', sample: 'Track 1: Cloud & AI Architectures' },
        { tag: '{{location}}', label: 'Room / Lab Location', sample: 'Hall A / Ground Floor' },
        { tag: '{{booking_id}}', label: 'Booking ID', sample: 'BK-SCD-8821' },
        { tag: '{{venue}}', label: 'Event Venue', sample: event?.venue || 'Campus Auditorium Complex' },
        { tag: '{{event_name}}', label: 'Event Name', sample: event?.name || 'AWS Community Day Gujarat' },
        { tag: '{{email}}', label: 'Email Address', sample: 'alex.mercer@example.com' }
    ];

    // Load event, tracks & workshops
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [evtRes, trkRes, wkRes] = await Promise.all([
                    fetch(`/api/onepass/events/${eventId}`),
                    fetch(`/api/onepass/tracks?eventId=${eventId}`),
                    fetch(`/api/onepass/workshops?eventId=${eventId}`)
                ]);
                const evtData = await evtRes.json();
                const trkData = await trkRes.json();
                const wkData = await wkRes.json();
                setEvent(evtData.event || null);
                setTracks(trkData.tracks || []);
                setWorkshops(wkData.workshops || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingData(false);
            }
        };
        loadMetadata();
    }, [eventId]);

    // Apply template
    const applyTemplate = (tplId) => {
        const tpl = TEMPLATES.find(t => t.id === tplId);
        if (tpl) {
            setSelectedTemplate(tplId);
            setSubject(tpl.subject);
            setMessageBody(tpl.body);
        }
    };

    // Initialize default template on first load
    useEffect(() => {
        applyTemplate('LOCATION_GUIDANCE');
    }, []);

    // Insert Tag into Textarea
    const handleInsertTag = (tag) => {
        setMessageBody(prev => prev + ' ' + tag);
        setCopiedTag(tag);
        setTimeout(() => setCopiedTag(''), 1500);
    };

    // Update audience count
    useEffect(() => {
        const fetchAudienceCount = async () => {
            setLoadingCount(true);
            try {
                const queryParams = new URLSearchParams({
                    eventId,
                    audience,
                    ...(filterId ? { filterId } : {})
                });
                const res = await fetch(`/api/onepass/broadcast?${queryParams}`);
                const data = await res.json();
                setRecipientCount(data.count || 0);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingCount(false);
            }
        };
        if (eventId) {
            fetchAudienceCount();
        }
    }, [eventId, audience, filterId]);

    // Handle Send Broadcast Campaign
    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        if (recipientCount === 0) {
            alert('Cannot send campaign: 0 recipients matched the selected audience.');
            return;
        }

        if (!confirm(`Are you sure you want to broadcast this email campaign to ${recipientCount} attendees?`)) {
            return;
        }

        setIsSending(true);
        setSendResult(null);

        try {
            const res = await fetch('/api/onepass/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    audience,
                    filterId: filterId || null,
                    subject,
                    messageBody,
                    templateType: selectedTemplate
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send campaign');
            setSendResult(data);
        } catch (err) {
            setSendResult({ success: false, error: err.message });
        } finally {
            setIsSending(false);
        }
    };

    // Handle Send Test Email
    const handleSendTest = async () => {
        if (!testEmail.trim()) {
            alert('Please enter your email address for the test preview.');
            return;
        }

        setIsSendingTest(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/onepass/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    subject,
                    messageBody,
                    testEmail: testEmail.trim(),
                    templateType: selectedTemplate
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Test send failed');
            setTestResult({ success: true, message: `Test email with simulated dynamic tags sent to ${testEmail}` });
        } catch (err) {
            setTestResult({ success: false, error: err.message });
        } finally {
            setIsSendingTest(false);
        }
    };

    // Simulated Preview Content
    const simulatedPreview = () => {
        const sampleSession = workshops[0]?.name || tracks[0]?.name || 'Track 1: Cloud & AI Architectures';
        const sampleLocation = workshops[0]?.location || tracks[0]?.location || 'Hall A / Ground Floor';
        const eventTitle = event?.name || 'AWS Community Day';
        const venueTitle = event?.venue || 'Campus Auditorium Complex';

        let previewText = messageBody
            .replace(/{{name}}/gi, 'Alex Mercer')
            .replace(/{{first_name}}/gi, 'Alex')
            .replace(/{{email}}/gi, 'alex.mercer@example.com')
            .replace(/{{booking_id}}/gi, 'BK-SCD-8821')
            .replace(/{{session}}/gi, sampleSession)
            .replace(/{{location}}/gi, sampleLocation)
            .replace(/{{event_name}}/gi, eventTitle)
            .replace(/{{venue}}/gi, venueTitle);

        let previewSub = subject
            .replace(/{{name}}/gi, 'Alex Mercer')
            .replace(/{{first_name}}/gi, 'Alex')
            .replace(/{{session}}/gi, sampleSession)
            .replace(/{{event_name}}/gi, eventTitle)
            .replace(/{{venue}}/gi, venueTitle);

        return { previewSub, previewText };
    };

    const { previewSub, previewText } = simulatedPreview();

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0073BB]/15 text-[#4F8EF7] flex items-center justify-center border border-[#0073BB]/30">
                            <Mail className="w-4 h-4" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Email Campaign Broadcast Desk</h1>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Send targeted session routing, meal notices, swag alerts, and custom announcements with live dynamic tags.
                    </p>
                </div>
            </div>

            {/* Template Selector Grid */}
            <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF9900]" />
                    <span>Choose Campaign Template</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.id}
                            type="button"
                            onClick={() => applyTemplate(tpl.id)}
                            className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                                selectedTemplate === tpl.id
                                    ? 'bg-[#0073BB]/15 border-[#0073BB] text-white shadow-lg shadow-[#0073BB]/15'
                                    : 'bg-[#151c2e] border-[#1a2540] text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                        >
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0C111D] border border-[#1a2540] text-[#4F8EF7] self-start">
                                {tpl.badge}
                            </span>
                            <span className="text-xs font-bold leading-snug">{tpl.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSendBroadcast} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Message Editor & Live Preview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-5 shadow-xl">
                        
                        {/* Tab Switcher */}
                        <div className="flex items-center justify-between border-b border-[#1a2540] pb-3">
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('EDIT')}
                                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        activeTab === 'EDIT'
                                            ? 'bg-[#0073BB] text-white'
                                            : 'bg-[#0C111D] text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Compose Message</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('PREVIEW')}
                                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        activeTab === 'PREVIEW'
                                            ? 'bg-[#0073BB] text-white'
                                            : 'bg-[#0C111D] text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Live Attendee Preview</span>
                                </button>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">Dynamic Placeholders Enabled</span>
                        </div>

                        {activeTab === 'EDIT' ? (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-white">Email Subject Line</label>
                                    <input
                                        type="text"
                                        required
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Enter email subject line..."
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB] transition font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-white">Email Message Body</label>
                                    <textarea
                                        rows={10}
                                        required
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        placeholder="Type your broadcast message..."
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB] transition font-mono leading-relaxed"
                                    />
                                </div>

                                {/* Click-to-Insert Dynamic Tags Toolbar */}
                                <div className="p-3.5 bg-[#0C111D] border border-[#1a2540] rounded-xl space-y-2.5">
                                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5">
                                            <Code className="w-3.5 h-3.5 text-[#FF9900]" />
                                            <span>Click to Insert Dynamic Tag:</span>
                                        </div>
                                        {copiedTag && <span className="text-emerald-400 text-[10px] font-mono">Inserted {copiedTag}!</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DYNAMIC_TAGS.map((t) => (
                                            <button
                                                key={t.tag}
                                                type="button"
                                                onClick={() => handleInsertTag(t.tag)}
                                                className="px-2.5 py-1 bg-[#151c2e] hover:bg-[#0073BB]/30 hover:border-[#0073BB] border border-[#1a2540] rounded-lg text-[#4F8EF7] text-[11px] font-mono transition flex items-center space-x-1"
                                                title={`Inserts sample value: ${t.sample}`}
                                            >
                                                <span>{t.tag}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Live Preview Card */
                            <div className="space-y-4">
                                <div className="p-3 bg-[#0C111D] border border-[#1a2540] rounded-xl text-xs space-y-1">
                                    <div className="text-slate-400"><strong>Subject:</strong> <span className="text-white font-medium">{previewSub}</span></div>
                                    <div className="text-slate-400"><strong>Simulated Sample:</strong> <span className="text-[#4F8EF7] font-mono">Alex Mercer (BK-SCD-8821)</span></div>
                                </div>

                                <div className="p-6 bg-[#070B14] border border-[#1E293B] rounded-2xl space-y-4 shadow-inner">
                                    <div className="border-b border-[#1E293B] pb-3 flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0073BB]/20 text-[#4F8EF7] uppercase border border-[#0073BB]/30">
                                            {selectedTemplate.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500">HTML Client Rendering</span>
                                    </div>
                                    <div className="text-xs text-slate-200 space-y-3 font-sans leading-relaxed whitespace-pre-wrap">
                                        {previewText}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right 1 Col: Audience Targeting & Dispatch */}
                <div className="space-y-6">
                    {/* Audience Selector Card */}
                    <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-6 space-y-5 shadow-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-[#1a2540]">
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-[#4F8EF7]" />
                                <h3 className="font-semibold text-white text-xs">Target Audience</h3>
                            </div>
                            <div className="text-xs font-mono font-bold text-emerald-400">
                                {loadingCount ? 'Counting...' : `${recipientCount} recipients`}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {[
                                { id: 'ALL', label: 'All Registered Attendees' },
                                { id: 'CHECKED_IN', label: 'Checked-In Attendees Only' },
                                { id: 'NOT_CHECKED_IN', label: 'Awaiting Check-In (Pending Arrival)' },
                                { id: 'TRACK', label: 'Specific Track Session' },
                                { id: 'WORKSHOP', label: 'Specific Workshop Lab' },
                            ].map((opt) => (
                                <label
                                    key={opt.id}
                                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                                        audience === opt.id
                                            ? 'bg-[#0073BB]/10 border-[#0073BB] text-white font-medium'
                                            : 'bg-[#0C111D] border-[#1a2540] text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="audience"
                                        checked={audience === opt.id}
                                        onChange={() => {
                                            setAudience(opt.id);
                                            setFilterId('');
                                        }}
                                        className="text-[#0073BB] focus:ring-0"
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Sub-selector for Track */}
                        {audience === 'TRACK' && (
                            <div className="space-y-1.5 pt-2">
                                <label className="text-[11px] text-slate-400 font-medium">Select Track:</label>
                                <select
                                    value={filterId}
                                    onChange={(e) => setFilterId(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">-- Choose Track --</option>
                                    {tracks.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.occupancy || 0} attendees)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Sub-selector for Workshop */}
                        {audience === 'WORKSHOP' && (
                            <div className="space-y-1.5 pt-2">
                                <label className="text-[11px] text-slate-400 font-medium">Select Workshop:</label>
                                <select
                                    value={filterId}
                                    onChange={(e) => setFilterId(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0073BB]"
                                >
                                    <option value="">-- Choose Workshop --</option>
                                    {workshops.map((w) => (
                                        <option key={w.id} value={w.id}>{w.name} ({w.occupancy || 0} attendees)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Send Campaign Button */}
                        <button
                            type="submit"
                            disabled={isSending || recipientCount === 0}
                            className="w-full flex items-center justify-center space-x-2 py-3.5 bg-gradient-to-r from-[#0073BB] to-[#4F8EF7] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xl shadow-[#0073BB]/25"
                        >
                            {isSending ? (
                                <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Broadcasting ({recipientCount} emails)...</span>
                                </div>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Launch Campaign ({recipientCount})</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Test Email Preview Card */}
                    <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl p-5 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">Send Test Preview</span>
                            <span className="text-[10px] text-slate-400 font-mono">With Sample Tags</span>
                        </div>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0073BB]"
                        />
                        <button
                            type="button"
                            onClick={handleSendTest}
                            disabled={isSendingTest}
                            className="w-full py-2 bg-[#0C111D] hover:bg-[#1a2540] border border-[#1a2540] text-slate-300 hover:text-white text-xs font-medium rounded-xl transition"
                        >
                            {isSendingTest ? 'Sending preview...' : 'Send Test to My Email'}
                        </button>
                        {testResult && (
                            <div className={`p-2.5 rounded-xl text-[11px] ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                {testResult.message || testResult.error}
                            </div>
                        )}
                    </div>

                    {/* Broadcast Result Feedback */}
                    {sendResult && (
                        <div className={`p-4 rounded-2xl border space-y-2 shadow-lg ${sendResult.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
                            <div className="flex items-center space-x-2 font-bold text-xs">
                                {sendResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                                <span>{sendResult.success ? 'Campaign Dispatched Successfully!' : 'Campaign Failed'}</span>
                            </div>
                            {sendResult.success && (
                                <div className="text-xs space-y-1 font-mono">
                                    <div>• Targeted: {sendResult.totalTargeted}</div>
                                    <div>• Successfully Sent: {sendResult.sentCount}</div>
                                    {sendResult.failedCount > 0 && <div>• Failed: {sendResult.failedCount}</div>}
                                </div>
                            )}
                            {sendResult.error && <p className="text-xs">{sendResult.error}</p>}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
