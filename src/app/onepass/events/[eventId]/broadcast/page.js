'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useOnePass } from '@/components/onepass/OnePassContext';
import * as xlsx from 'xlsx';
import {
    Mail, Send, Sparkles, Users, Filter, CheckCircle2, AlertCircle,
    Layers, BookOpen, Coffee, Award, Clock, RefreshCw, ChevronRight,
    HelpCircle, MapPin, Eye, Edit3, Code, Check, MessageSquare,
    FileSpreadsheet, Upload, Phone, Smartphone, ShieldCheck, Zap
} from 'lucide-react';
import { interpolateTemplate } from '@/lib/onepass/template';


export default function OnePassBroadcastPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user, isAdmin } = useOnePass();

    const [event, setEvent] = useState(null);
    const [tracks, setTracks] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Channel: 'WHATSAPP' | 'EMAIL'
    const [channel, setChannel] = useState('WHATSAPP');
    const [openwaOnline, setOpenwaOnline] = useState(false);
    const [checkingOpenwa, setCheckingOpenwa] = useState(false);

    // Recipient Source: 'DATABASE' | 'EXCEL'
    const [recipientSource, setRecipientSource] = useState('DATABASE');
    const [excelRecipients, setExcelRecipients] = useState([]);
    const [excelHeaders, setExcelHeaders] = useState([]);
    const [excelFileName, setExcelFileName] = useState('');

    // Audience state (for Database mode)
    const [audience, setAudience] = useState('ALL'); // 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN' | 'TRACK' | 'WORKSHOP'
    const [filterId, setFilterId] = useState('');
    const [recipientCount, setRecipientCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(false);
    const [sampleAttendees, setSampleAttendees] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);


    // KonfHub Direct Sync State
    const [showKonfHubSync, setShowKonfHubSync] = useState(false);
    const [konfhubApiKey, setKonfhubApiKey] = useState('');
    const [konfhubEventId, setKonfhubEventId] = useState('');
    const [syncingKonfhub, setSyncingKonfhub] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);

    // Form state
    const [activeTab, setActiveTab] = useState('EDIT'); // 'EDIT' | 'PREVIEW'
    const [selectedTemplate, setSelectedTemplate] = useState('KONFHUB_TICKET_PASS');
    const [subject, setSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [testPhone, setTestPhone] = useState('');
    const [testEmail, setTestEmail] = useState(user?.email || '');
    const [copiedTag, setCopiedTag] = useState('');

    // Status state
    const [isSending, setIsSending] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const [testResult, setTestResult] = useState(null);

    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);



    // WhatsApp Presets
    // WhatsApp Presets
    const WA_TEMPLATES = [
        {
            id: 'KONFHUB_TICKET_PASS',
            title: '🎟️ Official KonfHub Ticket & E-Pass Link',
            badge: 'Ticket Dispatch',
            body: `🎟️ *Your Entry Ticket for {{event_name}}*

Hello *{{name}}*, 👋

Your registration is confirmed for *{{event_name}}*! 🚀

📋 *Confirmed Ticket Details:*
• *Attendee:* {{name}}
• *Ticket Type:* {{ticket}}
• *Booking ID:* {{booking_id}}
• *Badge / Check-In Counter:* *{{counter}}*
• *Venue:* {{venue}}

📲 *View Your Digital E-Ticket & Entry QR Code:*
{{pass_link}}

Please keep your QR pass or Booking ID (*{{booking_id}}*) ready at *{{counter}}* upon arrival for instant badge printing & entry.

See you at the event!
_AWS Student Builder Group, DDU_`
        },
        {
            id: 'TICKET_COUNTER',
            title: '🏷️ Badge Counter & Registration Desk',
            badge: 'Entrance Rush',
            body: `🎉 *AWS Students Community Day 2026*

Hello *{{name}}*! 👋
Your entry badge is ready for pickup!

📍 *Venue:* {{venue}}
🏷️ *ID Card / Badge Counter:* *{{counter}}*
🎟️ *Ticket Type:* {{ticket}}
🆔 *Booking ID:* {{booking_id}}

📲 *Your Digital Pass:* {{pass_link}}

Please head directly to *{{counter}}* at the entrance lobby to collect your physical badge & welcome kit.

See you there!
_AWS Student Builder Group, DDU_`
        },
        {
            id: 'CHECKED_IN_CONFIRMATION',
            title: '✅ Check-In Confirmed & Session Guidance',
            badge: 'Post Check-In',
            body: `✅ *Welcome to {{event_name}}!*

Hello *{{name}}*, 👋
Your check-in is *Confirmed* (Check-In Time: *{{checkin_time}}*).

📍 *Your Allocated Session Details:*
• *Session:* {{session}}
• *Location / Room:* {{location}}
• *Booking ID:* {{booking_id}}
• *Ticket Type:* {{ticket}}
• *Status:* {{checkin_status}}

📲 *View Your Digital Pass & QR:*
{{pass_link}}

Please be seated in *{{location}}* 5 minutes prior to session commencement. Have a wonderful learning experience!

_AWS Student Builder Group, DDU_`
        },
        {
            id: 'SESSION_GUIDANCE',
            title: '📍 Room & Track Guidance',
            badge: 'Track / Workshop',
            body: `📍 *Session Room & Hall Guidance*

Hi *{{first_name}}*,
Welcome to *{{event_name}}*!

Here is your allocated session details:
• *Session:* {{session}}
• *Location / Room:* {{location}}
• *Booking ID:* {{booking_id}}
• *Ticket Type:* {{ticket}}
• *Check-in Status:* {{checkin_status}}

Please be seated in {{location}} 5 minutes before session commencement. Enjoy learning!`
        },
        {
            id: 'FOOD_ALERT',
            title: '🍱 Lunch & Food Desk Open',
            badge: 'Hospitality',
            body: `🍱 *Lunch & Refreshment Counters are Now OPEN!*

Hello *{{name}}*,
Lunch service is now active in the hospitality dining lawn.

• Please show this WhatsApp confirmation (Booking ID: *{{booking_id}}*) or E-Ticket ({{pass_link}}) at the food desk.
• Food counters will be open until the afternoon session restart.

Enjoy your meal!`
        },
        {
            id: 'SWAG_ALERT',
            title: '🎁 Swag Distribution Desk Active',
            badge: 'Goodies',
            body: `🎁 *Official Swag Kits Ready for Pickup!*

Hello *{{name}}*,
Your official AWS community swag kit is available for collection at the Swag Desk (*{{counter}}*).

Keep your Booking ID (*{{booking_id}}*) handy for verification. Grab yours now!`
        },
        {
            id: 'CUSTOM',
            title: '✍️ Custom WhatsApp Announcement',
            badge: 'Freeform',
            body: `📢 *Announcement from {{event_name}}*

Hello *{{name}}*,

[Type your custom announcement text here...]

• Your Booking ID: {{booking_id}}
• Check-in Status: {{checkin_status}}
• Your Pass Link: {{pass_link}}

Regards,
*AWS Student Builder Group, DDU*`
        }
    ];

    // Email Presets
    const EMAIL_TEMPLATES = [
        {
            id: 'KONFHUB_TICKET_PASS',
            title: '🎟️ Official KonfHub Ticket & E-Pass Link',
            badge: 'Ticket Dispatch',
            subject: '🎟️ Your Confirmed Ticket & Entry Pass for {{event_name}} (Booking: {{booking_id}})',
            body: `Hello {{name}},\n\nYour registration is confirmed for {{event_name}}!\n\n📋 Confirmed Ticket Details:\n• Attendee Name: {{name}}\n• Ticket Type: {{ticket}}\n• Booking ID: {{booking_id}}\n• Assigned Badge Counter: {{counter}}\n• Event Venue: {{venue}}\n\n📲 Access Your Digital E-Ticket & Entry QR Code:\n{{pass_link}}\n\nPlease show your QR pass at {{counter}} upon arrival for instant badge check-in.\n\nSee you at the event!\nAWS Community Team`
        },
        {
            id: 'CHECKED_IN_CONFIRMATION',
            title: '✅ Check-In Confirmed & Session Guidance',
            badge: 'Post Check-In',
            subject: '✅ Check-In Confirmed: Welcome to {{event_name}}! (Room: {{location}})',
            body: `Hello {{name}},\n\nWelcome to {{event_name}}! Your entry check-in is confirmed at {{checkin_time}}.\n\n📍 Your Allocated Session Details:\n• Session: {{session}}\n• Location / Room: {{location}}\n• Venue: {{venue}}\n• Booking ID: {{booking_id}}\n• Check-in Status: {{checkin_status}}\n\n📲 Digital Pass:\n{{pass_link}}\n\nPlease be seated in {{location}} 5 minutes before the session starts.\n\nEnjoy the event!\nAWS Community Team`
        },
        {
            id: 'LOCATION_GUIDANCE',
            title: '📍 Session Room & Venue Guidance',
            badge: 'Track / Workshop',
            subject: '📍 Your Session Location & Room Guidance for {{event_name}}',
            body: `Hello {{name}},\n\nWelcome to {{event_name}}!\n\nHere is your confirmed session details:\n• Allocated Session: {{session}}\n• Location / Room: {{location}}\n• Event Venue: {{venue}}\n• Booking ID: {{booking_id}}\n\nPlease head to {{location}} for your session.\n\nEnjoy the event!`
        },
        {
            id: 'MEAL_ANNOUNCEMENT',
            title: '🍱 Lunch & Refreshment Counters Open',
            badge: 'Hospitality',
            subject: '🍱 Lunch & Refreshment Counters are Now OPEN at {{venue}}',
            body: `Hello {{name}},\n\nLunch and refreshment counters are now active at the hospitality dining area!\n\n• Please show this email at the food desk to claim your meal.\n\nEnjoy your meal!`
        },
        {
            id: 'CUSTOM',
            title: '✍️ Custom Email Announcement',
            badge: 'Freeform',
            subject: 'Important Announcement from {{event_name}}',
            body: `Hello {{name}},\n\nWe have an important update regarding {{event_name}}:\n\n[Write your announcement message here...]\n\nRegards,\nOrganizing Team`
        }
    ];

    // Default Dynamic Tags
    const BASE_TAGS = [
        { tag: '{{name}}', label: 'Attendee Full Name', sample: 'Rahul Sharma' },
        { tag: '{{first_name}}', label: 'First Name', sample: 'Rahul' },
        { tag: '{{phone}}', label: 'Phone Number', sample: '+91 98765 43210' },
        { tag: '{{email}}', label: 'Email Address', sample: 'rahul@example.com' },
        { tag: '{{ticket}}', label: 'Ticket / Category', sample: 'Student Delegate Pass' },
        { tag: '{{booking_id}}', label: 'Booking ID', sample: 'KH-SCD-8821' },
        { tag: '{{counter}}', label: 'Assigned Counter', sample: 'Counter 3' },
        { tag: '{{pass_link}}', label: 'Digital E-Ticket Link', sample: 'https://aws.ddu.ac.in/onepass/events/.../badge/...' },
        { tag: '{{session}}', label: 'Track / Workshop', sample: 'Agentic AI Masterclass' },
        { tag: '{{location}}', label: 'Room / Hall', sample: 'Hall A / Lab 301' },
        { tag: '{{checkin_status}}', label: 'Check-In Status', sample: 'Checked In' },
        { tag: '{{checkin_time}}', label: 'Check-In Time', sample: '09:45 AM' },
        { tag: '{{checked_in_by}}', label: 'Checked In By', sample: 'Desk 1' },
        { tag: '{{venue}}', label: 'Venue', sample: event?.venue || 'DDU Campus, Nadiad' },
        { tag: '{{event_name}}', label: 'Event Name', sample: event?.name || 'AWS Students Community Day 2026' }
    ];

    // Check OpenWA Health
    const checkOpenWA = async () => {
        setCheckingOpenwa(true);
        try {
            const res = await fetch('/api/onepass/whatsapp/send');
            const data = await res.json();
            setOpenwaOnline(data.status === 'connected');
        } catch {
            setOpenwaOnline(false);
        } finally {
            setCheckingOpenwa(false);
        }
    };

    useEffect(() => {
        checkOpenWA();
    }, []);

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
    const applyTemplate = (tplId, tplChannel = channel) => {
        const list = tplChannel === 'WHATSAPP' ? WA_TEMPLATES : EMAIL_TEMPLATES;
        const tpl = list.find(t => t.id === tplId) || list[0];
        if (tpl) {
            setSelectedTemplate(tpl.id);
            if (tpl.subject) setSubject(tpl.subject);
            setMessageBody(tpl.body);
        }
    };

    // Change channel
    const handleChannelChange = (newChannel) => {
        setChannel(newChannel);
        applyTemplate('TICKET_COUNTER', newChannel);
    };

    // Initialize default template on first load
    useEffect(() => {
        applyTemplate('TICKET_COUNTER', 'WHATSAPP');
    }, []);

    // Insert Tag into Textarea
    const handleInsertTag = (tag) => {
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

    // Formatting Helpers for WhatsApp
    const insertFormatting = (prefix, suffix = prefix) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const selected = text.substring(start, end) || 'text';
        const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
        setMessageBody(newText);
        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = start + prefix.length;
            textareaRef.current.selectionEnd = start + prefix.length + selected.length;
        }, 50);
    };

    // Handle Excel File Upload
    const handleExcelUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExcelFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = xlsx.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    alert('Excel sheet contains no rows.');
                    return;
                }

                // Extract all column headers
                const headers = Object.keys(data[0] || {});
                setExcelHeaders(headers);

                // Clean recipients with intelligent KonfHub column detection
                const recipients = data.map((row, idx) => {
                    const keys = Object.keys(row);
                    let phone = '';
                    let name = '';
                    let email = '';
                    let ticket = '';
                    let bookingId = '';
                    let counter = '';
                    let passLink = '';
                    let session = '';
                    let location = '';
                    let checkinStatus = '';
                    let checkinTime = '';
                    let checkedInBy = '';

                    for (const k of keys) {
                        const lk = k.toLowerCase().trim();
                        if (!phone && ['phone', 'mobile', 'contact', 'whatsapp', 'phone number', 'mobile number'].some(s => lk.includes(s))) {
                            phone = String(row[k] || '').trim();
                        }
                        if (!name && ['name', 'full name', 'attendee name', 'first name', 'buyer name'].some(s => lk.includes(s))) {
                            name = String(row[k] || '').trim();
                        }
                        if (!email && ['email', 'email address', 'email id'].some(s => lk.includes(s))) {
                            email = String(row[k] || '').trim();
                        }
                        if (!ticket && ['ticket', 'ticket name', 'ticket type', 'category', 'pass'].some(s => lk.includes(s))) {
                            ticket = String(row[k] || '').trim();
                        }
                        if (!bookingId && ['booking', 'booking id', 'order id', 'order', 'ticket id', 'registration id'].some(s => lk.includes(s))) {
                            bookingId = String(row[k] || '').trim();
                        }
                        if (!counter && ['counter', 'desk', 'booth', 'registration counter', 'counter desk'].some(s => lk.includes(s))) {
                            counter = String(row[k] || '').trim();
                        }
                        if (!passLink && ['pdf', 'ticket url', 'ticket pdf', 'download', 'invoice', 'pass link', 'qr'].some(s => lk.includes(s))) {
                            passLink = String(row[k] || '').trim();
                        }
                        if (!session && ['session', 'track', 'workshop', 'track name', 'workshop name', 'session name'].some(s => lk.includes(s))) {
                            session = String(row[k] || '').trim();
                        }
                        if (!location && ['location', 'room', 'hall', 'venue room', 'lab'].some(s => lk.includes(s))) {
                            location = String(row[k] || '').trim();
                        }
                        if (!checkinStatus && ['check-in status', 'checkin status', 'checked in', 'status', 'attendance'].some(s => lk.includes(s))) {
                            checkinStatus = String(row[k] || '').trim();
                        }
                        if (!checkinTime && ['check-in time', 'checkin time', 'checked in at', 'time'].some(s => lk.includes(s))) {
                            checkinTime = String(row[k] || '').trim();
                        }
                        if (!checkedInBy && ['checked in by', 'volunteer', 'staff'].some(s => lk.includes(s))) {
                            checkedInBy = String(row[k] || '').trim();
                        }
                    }

                    const resolvedBookingId = bookingId || row['Booking ID'] || row['Order ID'] || row['Ticket ID'] || `KH-${1000 + idx}`;
                    const resolvedPass = passLink || `https://aws.ddu.ac.in/onepass/events/${eventId}/badge/${resolvedBookingId}`;

                    return {
                        ...row,
                        phone: phone || row.Phone || row.Mobile || '',
                        name: name || row.Name || `Attendee #${idx + 1}`,
                        first_name: (name || row.Name || 'Attendee').split(' ')[0],
                        email: email || row.Email || '',
                        ticket: ticket || row['Ticket Type'] || row['Ticket Name'] || 'Paid Attendee Pass',
                        ticket_type: ticket || row['Ticket Type'] || row['Ticket Name'] || 'Paid Attendee Pass',
                        booking_id: resolvedBookingId,
                        counter: counter || row.Counter || row['Counter Desk'] || `Counter ${Math.floor(idx / 30) + 1}`,
                        pass_link: resolvedPass,
                        ticket_url: resolvedPass,
                        session: session || row.Session || row.Track || row.Workshop || 'Main Track',
                        location: location || row.Location || row.Room || row.Hall || 'Main Auditorium / Hall A',
                        checkin_status: checkinStatus || row['Check-in Status'] || row.Status || 'Checked In',
                        check_in_status: checkinStatus || row['Check-in Status'] || row.Status || 'CHECKED_IN',
                        checkin_time: checkinTime || row['Check-in Time'] || '09:30 AM',
                        check_in_time: checkinTime || row['Check-in Time'] || new Date().toISOString(),
                        checked_in_by: checkedInBy || row['Checked In By'] || 'Registration Desk'
                    };
                }).filter(r => r.phone && String(r.phone).replace(/\D/g, '').length >= 10);


                setExcelRecipients(recipients);
                setRecipientSource('EXCEL');
            } catch (err) {
                console.error('Excel parse error:', err);
                alert(`Failed to parse Excel file: ${err.message}`);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Update database audience count
    useEffect(() => {
        if (recipientSource === 'EXCEL') {
            setRecipientCount(excelRecipients.length);
            return;
        }

        const fetchAudienceCount = async (syncCloud = true) => {
            setLoadingCount(true);
            try {
                const queryParams = new URLSearchParams({
                    eventId,
                    audience,
                    channel,
                    ...(filterId ? { filterId } : {}),
                    ...(syncCloud ? { sync: 'true' } : {})
                });
                const res = await fetch(`/api/onepass/broadcast?${queryParams}`);
                const data = await res.json();
                setRecipientCount(data.count || 0);
                if (Array.isArray(data.sample)) {
                    setSampleAttendees(data.sample);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingCount(false);
            }
        };
        if (eventId) {
            fetchAudienceCount(true);
        }
    }, [eventId, audience, filterId, channel, recipientSource, excelRecipients]);

    // Live Sync from KonfHub API
    const handleSyncKonfhub = async (e) => {
        if (e) e.preventDefault();
        if (!konfhubEventId || !konfhubApiKey) {
            alert('Please enter both KonfHub Event ID and API Key.');
            return;
        }

        setSyncingKonfhub(true);
        setSyncStatus(null);
        try {
            const res = await fetch('/api/onepass/sync/konfhub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    konfhubEventId: konfhubEventId.trim(),
                    konfhubApiKey: konfhubApiKey.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to sync with KonfHub API');

            setSyncStatus({
                success: true,
                message: `✅ Synced ${data.totalFetched} attendees from KonfHub (${data.added} new, ${data.updated} updated)!`
            });

            // Refresh audience count and real samples
            const queryParams = new URLSearchParams({
                eventId,
                audience,
                channel,
                ...(filterId ? { filterId } : {})
            });
            const freshRes = await fetch(`/api/onepass/broadcast?${queryParams}`);
            const freshData = await freshRes.json();
            setRecipientCount(freshData.count || data.totalFetched);
            if (Array.isArray(freshData.sample)) {
                setSampleAttendees(freshData.sample);
            }
            setShowKonfHubSync(false);
        } catch (err) {
            setSyncStatus({ success: false, error: err.message });
        } finally {
            setSyncingKonfhub(false);
        }
    };

    // Current active preview attendee
    const activeAttendeeList = recipientSource === 'EXCEL' && excelRecipients.length > 0
        ? excelRecipients
        : (sampleAttendees.length > 0 ? sampleAttendees : [
            {
                name: 'Attendee #1',
                first_name: 'Attendee',
                phone: '+91 9XXXXXXXXX',
                email: 'attendee1@ddu.ac.in',
                counter: 'Counter 1',
                ticket: 'KonfHub Registered Pass',
                ticket_type: 'KonfHub Registered Pass',
                booking_id: 'KH-ORDER-1001',
                pass_link: `https://aws.ddu.ac.in/onepass/events/${eventId}/badge/KH-ORDER-1001`,
                session: 'Track 1: Cloud & GenAI',
                location: 'Main Auditorium / Hall A',
                check_in_status: 'CHECKED_IN',
                checkin_status: 'Checked In',
                check_in_time: new Date().toISOString(),
                checkin_time: '09:45 AM',
                checked_in_by: 'Registration Desk 1',
                venue: event?.venue || 'DDU Campus, Nadiad',
                event_name: event?.name || 'AWS Students Community Day 2026'
            },
            {
                name: 'Attendee #2',
                first_name: 'Attendee',
                phone: '+91 9XXXXXXXXX',
                email: 'attendee2@ddu.ac.in',
                counter: 'Counter 2',
                ticket: 'Workshop / VIP Pass',
                ticket_type: 'Workshop / VIP Pass',
                booking_id: 'KH-ORDER-1002',
                pass_link: `https://aws.ddu.ac.in/onepass/events/${eventId}/badge/KH-ORDER-1002`,
                session: 'Workshop: Serverless Microservices',
                location: 'Computer Lab 301',
                check_in_status: 'CHECKED_IN',
                checkin_status: 'Checked In',
                check_in_time: new Date().toISOString(),
                checkin_time: '10:15 AM',
                checked_in_by: 'Registration Desk 2',
                venue: event?.venue || 'DDU Campus, Nadiad',
                event_name: event?.name || 'AWS Students Community Day 2026'
            }
        ]);

    const currentPreviewAttendee = activeAttendeeList[previewIndex] || activeAttendeeList[0] || {};


    const KH_EVENT_ID = 'ab9168b3-c610-4edc-bb16-b45f9517820c';
    const [passLinkType, setPassLinkType] = useState('KONFHUB'); // 'KONFHUB' | 'ONEPASS' | 'CUSTOM'
    const [customPassUrlTemplate, setCustomPassUrlTemplate] = useState(`https://files.konfhub.com/${KH_EVENT_ID}/tickets/{{booking_id}}_ticket.pdf`);
    const [passBaseUrl, setPassBaseUrl] = useState('https://aws.ddu.ac.in');

    // Live preview text generator with robust universal interpolation
    const getPreviewMessage = () => {
        let passLink = '';
        const bookingId = currentPreviewAttendee.booking_id || currentPreviewAttendee.bookingId || currentPreviewAttendee['Booking ID'] || '933008fc';
        const rawTicket = currentPreviewAttendee.ticket_pdf || currentPreviewAttendee.ticket_url || currentPreviewAttendee['Ticket URL'] || currentPreviewAttendee['Ticket PDF'] || currentPreviewAttendee.pass_link;

        if (passLinkType === 'KONFHUB') {
            passLink = rawTicket && (rawTicket.includes('konfhub') || rawTicket.startsWith('http'))
                ? rawTicket
                : (bookingId ? `https://files.konfhub.com/${KH_EVENT_ID}/tickets/${bookingId}_ticket.pdf` : (rawTicket || 'https://konfhub.com'));
        } else if (passLinkType === 'CUSTOM' && customPassUrlTemplate) {
            passLink = interpolateTemplate(customPassUrlTemplate, {
                ...currentPreviewAttendee,
                booking_id: bookingId
            });
        } else if (passLinkType === 'ONEPASS') {
            passLink = `${(passBaseUrl || 'https://aws.ddu.ac.in').replace(/\/$/, '')}/onepass/events/${eventId}/badge/${bookingId}`;
        } else {
            passLink = rawTicket || `${(passBaseUrl || 'https://aws.ddu.ac.in').replace(/\/$/, '')}/onepass/events/${eventId}/badge/${bookingId}`;
        }

        const ticketUrl = currentPreviewAttendee.ticket_url || passLink;

        return interpolateTemplate(messageBody, {
            ...currentPreviewAttendee,
            booking_id: bookingId,
            pass_link: passLink,
            ticket_url: ticketUrl
        }, {
            venue: event?.venue || 'Dharmsinh Desai University (DDU)',
            eventName: event?.name || 'AWS Students Community Day 2026',
            passLink
        });
    };

    // Send Test Message
    const handleSendTest = async () => {
        if (channel === 'WHATSAPP' && !testPhone) {
            alert('Please enter a test phone number (e.g. 9876543210)');
            return;
        }
        if (channel === 'EMAIL' && !testEmail) {
            alert('Please enter a test email address');
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
                    channel,
                    subject: channel === 'EMAIL' ? subject : undefined,
                    messageBody,
                    testPhone: channel === 'WHATSAPP' ? testPhone : undefined,
                    testEmail: channel === 'EMAIL' ? testEmail : undefined,
                    templateType: selectedTemplate,
                    passBaseUrl: passBaseUrl.trim(),
                    passLinkType,
                    customPassUrlTemplate
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send test message');
            setTestResult({ success: true, message: `Test message sent successfully to ${channel === 'WHATSAPP' ? testPhone : testEmail}!` });
        } catch (err) {
            setTestResult({ success: false, error: err.message });
        } finally {
            setIsSendingTest(false);
        }
    };

    // Handle Send Broadcast Campaign
    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        const total = recipientSource === 'EXCEL' ? excelRecipients.length : recipientCount;

        if (total === 0) {
            alert('Cannot send campaign: 0 recipients matched.');
            return;
        }

        if (channel === 'WHATSAPP' && !openwaOnline) {
            if (!confirm('Warning: OpenWA Gateway appears offline at http://localhost:2785. Make sure your Docker container is running! Do you still want to proceed?')) {
                return;
            }
        }

        if (!confirm(`Are you sure you want to broadcast this ${channel} campaign to ${total} recipients?`)) {
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
                    channel,
                    audience: recipientSource === 'DATABASE' ? audience : undefined,
                    filterId: recipientSource === 'DATABASE' ? (filterId || null) : undefined,
                    subject: channel === 'EMAIL' ? subject : undefined,
                    messageBody,
                    templateType: selectedTemplate,
                    customRecipients: recipientSource === 'EXCEL' ? excelRecipients : undefined,
                    passBaseUrl: passBaseUrl.trim(),
                    passLinkType,
                    customPassUrlTemplate
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* ══════════════════════════════════════
                    HEADER & CHANNEL TABS
                ══════════════════════════════════════ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20 uppercase">
                                Broadcaster
                            </span>
                            {channel === 'WHATSAPP' && (
                                <button
                                    onClick={checkOpenWA}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                        openwaOnline
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${openwaOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                                    {checkingOpenwa ? 'Checking...' : openwaOnline ? 'OpenWA Gateway Online' : 'OpenWA Offline (Port 2785)'}
                                </button>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                            Multi-Channel Broadcaster
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Send personalized WhatsApp &amp; Email updates, tickets, and counter badges directly to attendees.
                        </p>
                    </div>

                    {/* Channel Selector */}
                    <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shrink-0">
                        <button
                            type="button"
                            onClick={() => handleChannelChange('WHATSAPP')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                channel === 'WHATSAPP'
                                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <MessageSquare size={16} /> WhatsApp
                        </button>
                        <button
                            type="button"
                            onClick={() => handleChannelChange('EMAIL')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                                channel === 'EMAIL'
                                    ? 'bg-[#4F8EF7] text-white shadow-lg shadow-[#4F8EF7]/20'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Mail size={16} /> Email
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    MAIN BROADCAST STUDIO GRID
                ══════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: Controls, Source & Editor */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* 1. Recipient Audience Selector */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Users size={16} className="text-[#FF9900]" /> 1. Select Recipients Source
                                </h3>
                                
                                {channel === 'WHATSAPP' && (
                                    <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setRecipientSource('DATABASE')}
                                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                                recipientSource === 'DATABASE'
                                                    ? 'bg-slate-800 text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                        >
                                            KonfHub / Database
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRecipientSource('EXCEL')}
                                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                                recipientSource === 'EXCEL'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                        >
                                            Upload Excel (.xlsx)
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Excel Upload Mode */}
                            {recipientSource === 'EXCEL' && channel === 'WHATSAPP' ? (
                                <div className="space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition-all group"
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            className="hidden"
                                            onChange={handleExcelUpload}
                                        />
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
                                            <FileSpreadsheet size={24} />
                                        </div>
                                        {excelFileName ? (
                                            <div>
                                                <p className="font-bold text-white text-sm">{excelFileName}</p>
                                                <p className="text-emerald-400 font-mono text-xs mt-1">
                                                    ✅ {excelRecipients.length} valid phone numbers ready
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-bold text-slate-200 text-sm">Click to upload your Attendee Excel / CSV sheet</p>
                                                <p className="text-slate-500 text-xs mt-1 font-mono">Supports .xlsx, .xls, .csv with Name, Phone, Counter, etc.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Database Mode */
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Audience Filter</label>
                                        <select
                                            value={audience}
                                            onChange={(e) => { setAudience(e.target.value); setFilterId(''); }}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7] font-medium"
                                        >
                                            <option value="ALL">All Event Attendees</option>
                                            <option value="CHECKED_IN">Checked-In Attendees Only</option>
                                            <option value="NOT_CHECKED_IN">Pending Check-In (Reminders)</option>
                                            <option value="TRACK">Specific Track Audience</option>
                                            <option value="WORKSHOP">Specific Workshop Audience</option>
                                        </select>
                                    </div>

                                    {audience === 'TRACK' && (
                                        <div>
                                            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Select Track</label>
                                            <select
                                                value={filterId}
                                                onChange={(e) => setFilterId(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]"
                                            >
                                                <option value="">-- Choose Track --</option>
                                                {tracks.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.room || 'Room TBA'})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {audience === 'WORKSHOP' && (
                                        <div>
                                            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Select Workshop</label>
                                            <select
                                                value={filterId}
                                                onChange={(e) => setFilterId(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7]"
                                            >
                                                <option value="">-- Choose Workshop --</option>
                                                {workshops.map(w => (
                                                    <option key={w.id} value={w.id}>{w.title} ({w.room || 'Lab TBA'})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-xs font-mono text-slate-400">Targeted Audience Size:</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    setLoadingCount(true);
                                                    try {
                                                        const queryParams = new URLSearchParams({
                                                            eventId,
                                                            audience,
                                                            channel,
                                                            ...(filterId ? { filterId } : {}),
                                                            sync: 'true'
                                                        });
                                                        const res = await fetch(`/api/onepass/broadcast?${queryParams}`);
                                                        const data = await res.json();
                                                        setRecipientCount(data.count || 0);
                                                        if (Array.isArray(data.sample)) {
                                                            setSampleAttendees(data.sample);
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    } finally {
                                                        setLoadingCount(false);
                                                    }
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                                title="Re-fetch latest check-in statuses from deployed server database"
                                            >
                                                <RefreshCw size={12} className={loadingCount ? 'animate-spin' : ''} />
                                                Sync Live Check-Ins
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowKonfHubSync(!showKonfHubSync)}
                                                className="px-2.5 py-1 rounded-lg bg-[#FF9900]/10 hover:bg-[#FF9900]/20 border border-[#FF9900]/30 text-[#FF9900] text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                            >
                                                <RefreshCw size={12} className={syncingKonfhub ? 'animate-spin' : ''} />
                                                Sync KonfHub
                                            </button>
                                            <span className="font-mono text-sm font-black text-white">
                                                {loadingCount ? 'Counting...' : `${recipientCount} recipients`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* KonfHub Sync Drawer */}
                                    {showKonfHubSync && (
                                        <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-950 border border-[#FF9900]/40 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                                    <Zap size={14} className="text-[#FF9900]" /> KonfHub Direct API Sync
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKonfHubSync(false)}
                                                    className="text-slate-500 hover:text-white text-xs font-mono"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={konfhubEventId}
                                                    onChange={(e) => setKonfhubEventId(e.target.value)}
                                                    placeholder="KonfHub Event ID / Slug"
                                                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF9900] font-mono"
                                                />
                                                <input
                                                    type="password"
                                                    value={konfhubApiKey}
                                                    onChange={(e) => setKonfhubApiKey(e.target.value)}
                                                    placeholder="KonfHub API Key (Bearer Token)"
                                                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF9900] font-mono"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between pt-1">
                                                <p className="text-[10px] font-mono text-slate-500">
                                                    Fetches attendee names, phones, tickets, and e-ticket PDFs directly.
                                                </p>
                                                <button
                                                    type="button"
                                                    disabled={syncingKonfhub}
                                                    onClick={handleSyncKonfhub}
                                                    className="px-4 py-2 rounded-xl bg-[#FF9900] hover:bg-[#e08800] text-slate-950 font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
                                                >
                                                    {syncingKonfhub ? 'Syncing...' : 'Fetch Attendees Now'}
                                                </button>
                                            </div>
                                            {syncStatus && (
                                                <div className={`p-2.5 rounded-xl text-xs font-mono ${syncStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {syncStatus.message || syncStatus.error}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>

                        {/* 2. Template Selector */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <Sparkles size={16} className="text-[#FF9900]" /> 2. Choose Campaign Preset
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(channel === 'WHATSAPP' ? WA_TEMPLATES : EMAIL_TEMPLATES).map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => applyTemplate(tpl.id)}
                                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                            selectedTemplate === tpl.id
                                                ? 'bg-slate-800 border-[#FF9900] shadow-md'
                                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-white">{tpl.title}</span>
                                            {selectedTemplate === tpl.id && <Check size={14} className="text-[#FF9900]" />}
                                        </div>
                                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                                            {tpl.badge}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Message Editor */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Edit3 size={16} className="text-[#FF9900]" /> 3. Message Template
                                </h3>
                                
                                {channel === 'WHATSAPP' && (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <button
                                            type="button"
                                            onClick={() => insertFormatting('*')}
                                            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-xs font-bold font-mono border border-slate-800"
                                            title="Bold"
                                        >
                                            *B*
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertFormatting('_')}
                                            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-xs italic font-mono border border-slate-800"
                                            title="Italic"
                                        >
                                            _I_
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => insertFormatting('~')}
                                            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded-lg text-xs line-through font-mono border border-slate-800"
                                            title="Strikethrough"
                                        >
                                            ~S~
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Email Subject Line (if Email channel) */}
                            {channel === 'EMAIL' && (
                                <div>
                                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Subject Line</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="e.g. 📍 Your Session Guidance for SCD 2026"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4F8EF7] font-medium"
                                    />
                                </div>
                            )}

                            {/* Ticket Pass Link / KonfHub URL Controller */}
                            <div className="p-4 rounded-2xl bg-[#090E17] border border-slate-800 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <label className="text-[11px] font-mono font-bold text-[#FF9900] uppercase tracking-wider flex items-center gap-1.5">
                                        🎟️ Ticket / Pass Link Target (&#123;&#123;pass_link&#125;&#125; / &#123;&#123;ticket_url&#125;&#125;)
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-400">Controls what attendees receive when clicking their pass link</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPassLinkType('KONFHUB')}
                                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                                            passLinkType === 'KONFHUB'
                                                ? 'bg-[#FF9900]/15 border-[#FF9900] text-white shadow-sm'
                                                : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#FF9900]">
                                            🎟️ KonfHub Ticket
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight">
                                            Official KonfHub PDF: <span className="font-mono text-slate-300">files.konfhub.com/.../tickets/...</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPassLinkType('ONEPASS')}
                                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                                            passLinkType === 'ONEPASS'
                                                ? 'bg-[#0073BB]/20 border-[#4F8EF7] text-white shadow-sm'
                                                : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#4F8EF7]">
                                            🎫 OnePass E-Badge
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight">
                                            Digital pass at <span className="font-mono text-slate-300">aws.ddu.ac.in/.../badge</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPassLinkType('CUSTOM')}
                                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                                            passLinkType === 'CUSTOM'
                                                ? 'bg-purple-500/15 border-purple-400 text-white shadow-sm'
                                                : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-purple-400">
                                            ⚙️ Custom URL
                                        </div>
                                        <div className="text-[10px] text-slate-400 leading-tight">
                                            Custom template pattern or IP
                                        </div>
                                    </button>
                                </div>

                                {passLinkType === 'ONEPASS' && (
                                    <div className="pt-2 border-t border-slate-800/60 space-y-2">
                                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                                            <span>OnePass Base Domain:</span>
                                            <span className="font-mono text-[#4F8EF7]">{passBaseUrl}/onepass/events/{eventId}/badge/&#123;&#123;booking_id&#125;&#125;</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-2">
                                            <input
                                                type="text"
                                                value={passBaseUrl}
                                                onChange={(e) => setPassBaseUrl(e.target.value)}
                                                placeholder="https://aws.ddu.ac.in"
                                                className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#0073BB]"
                                            />
                                            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setPassBaseUrl('https://aws.ddu.ac.in')}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                                        passBaseUrl === 'https://aws.ddu.ac.in'
                                                            ? 'bg-[#0073BB]/30 text-white border-[#4F8EF7]'
                                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                                    }`}
                                                >
                                                    🌐 Official Domain
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPassBaseUrl('http://172.20.10.7:4000')}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                                        passBaseUrl === 'http://172.20.10.7:4000'
                                                            ? 'bg-[#0073BB]/30 text-white border-[#4F8EF7]'
                                                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                                    }`}
                                                >
                                                    📱 Local LAN IP
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {passLinkType === 'CUSTOM' && (
                                    <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                                        <div className="text-[10px] text-slate-400">
                                            Enter Custom Pass URL Template (e.g. <span className="font-mono text-purple-300">https://konfhub.com/tickets/&#123;&#123;booking_id&#125;&#125;</span>):
                                        </div>
                                        <input
                                            type="text"
                                            value={customPassUrlTemplate}
                                            onChange={(e) => setCustomPassUrlTemplate(e.target.value)}
                                            placeholder="https://konfhub.com/tickets/{{booking_id}}"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Dynamic Variable Chips */}
                            <div>
                                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                                    Click to Insert Dynamic Variable:
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                                    {(recipientSource === 'EXCEL' && excelHeaders.length > 0
                                        ? excelHeaders.map(h => ({ tag: `{{${h}}}`, label: h }))
                                        : BASE_TAGS
                                    ).map((tagObj, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleInsertTag(tagObj.tag)}
                                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-[#FF9900]/20 hover:text-[#FF9900] border border-slate-800 hover:border-[#FF9900]/40 text-slate-300 text-xs font-mono font-medium transition-all cursor-pointer"
                                        >
                                            {tagObj.tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Textarea */}
                            <div>
                                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Message Body</label>
                                <textarea
                                    ref={textareaRef}
                                    rows={9}
                                    value={messageBody}
                                    onChange={(e) => setMessageBody(e.target.value)}
                                    placeholder="Type your broadcast message here..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-[#4F8EF7] font-mono leading-relaxed resize-y"
                                />
                            </div>

                            {/* 4. Test Send Section */}
                            <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
                                <input
                                    type={channel === 'WHATSAPP' ? 'tel' : 'email'}
                                    value={channel === 'WHATSAPP' ? testPhone : testEmail}
                                    onChange={(e) => channel === 'WHATSAPP' ? setTestPhone(e.target.value) : setTestEmail(e.target.value)}
                                    placeholder={channel === 'WHATSAPP' ? 'Enter test phone (e.g. 9876543210)' : 'Enter test email address'}
                                    className="w-full sm:flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#4F8EF7]"
                                />
                                <button
                                    type="button"
                                    disabled={isSendingTest}
                                    onClick={handleSendTest}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                                >
                                    {isSendingTest ? 'Sending...' : `Send Test ${channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}`}
                                </button>
                            </div>

                            {testResult && (
                                <div className={`p-3 rounded-xl text-xs font-mono ${testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {testResult.message || testResult.error}
                                </div>
                            )}

                            {/* 5. Final Send Broadcast Button */}
                            <button
                                type="button"
                                disabled={isSending || recipientCount === 0}
                                onClick={handleSendBroadcast}
                                className={`w-full py-4 rounded-2xl font-bold font-mono text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl ${
                                    channel === 'WHATSAPP'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                                        : 'bg-[#4F8EF7] hover:bg-[#3b7ad6] text-white shadow-[#4F8EF7]/20'
                                }`}
                            >
                                <Send size={18} />
                                {isSending ? 'Broadcasting Campaign...' : `Broadcast to ${recipientCount} Attendees Now`}
                            </button>

                            {sendResult && (
                                <div className={`p-4 rounded-2xl space-y-2 font-mono text-xs ${sendResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                                    <p className="font-bold text-sm">
                                        {sendResult.success ? '🎉 Broadcast Complete!' : '❌ Broadcast Error'}
                                    </p>
                                    {sendResult.sentCount !== undefined && (
                                        <p>✅ Successfully Sent: {sendResult.sentCount} / {sendResult.totalTargeted || recipientCount}</p>
                                    )}
                                    {sendResult.failedCount > 0 && (
                                        <p className="text-red-400">⚠️ Failed: {sendResult.failedCount}</p>
                                    )}
                                    {sendResult.error && <p className="text-red-400">{sendResult.error}</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Live Mobile Preview & Attendee Inspector */}
                    <div className="lg:col-span-5 sticky top-8 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Smartphone size={16} className="text-[#FF9900]" /> Live Message & Data Inspector
                                </h3>
                                <div className="flex items-center gap-1.5">
                                    {activeAttendeeList.slice(0, 4).map((att, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setPreviewIndex(idx)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                                previewIndex === idx
                                                    ? 'bg-[#FF9900] text-slate-950 shadow'
                                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            #{idx + 1} {att.first_name || att.name?.split(' ')[0] || ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Data Inspection Card */}
                            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5">
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                        <ShieldCheck size={13} /> Dynamic Data Active
                                    </span>
                                    <span className="text-slate-500">
                                        Inspecting Attendee {previewIndex + 1} of {recipientSource === 'EXCEL' ? excelRecipients.length : recipientCount}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">NAME &#123;&#123;name&#125;&#125;</span>
                                        <span className="text-white font-bold truncate block">{currentPreviewAttendee.name || 'Rahul Sharma'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">TICKET &#123;&#123;ticket&#125;&#125;</span>
                                        <span className="text-amber-400 font-bold truncate block">{currentPreviewAttendee.ticket || currentPreviewAttendee.ticket_type || 'General Pass'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">COUNTER &#123;&#123;counter&#125;&#125;</span>
                                        <span className="text-emerald-400 font-bold block">{currentPreviewAttendee.counter || currentPreviewAttendee.counter_assigned || 'Counter 1'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">BOOKING ID &#123;&#123;booking_id&#125;&#125;</span>
                                        <span className="text-sky-400 font-bold truncate block">{currentPreviewAttendee.booking_id || 'BK-SCD-8821'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">STATUS &#123;&#123;checkin_status&#125;&#125;</span>
                                        <span className={`font-bold truncate block ${currentPreviewAttendee.checkin_status === 'Checked In' || currentPreviewAttendee.check_in_status === 'CHECKED_IN' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {currentPreviewAttendee.checkin_status || 'Checked In'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">CHECK-IN TIME &#123;&#123;checkin_time&#125;&#125;</span>
                                        <span className="text-purple-300 font-bold truncate block">{currentPreviewAttendee.checkin_time || '09:45 AM'}</span>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-900">
                                        <span className="text-slate-500 block text-[10px]">SESSION & LOCATION &#123;&#123;session&#125;&#125; &bull; &#123;&#123;location&#125;&#125;</span>
                                        <span className="text-indigo-300 font-medium truncate block">
                                            {currentPreviewAttendee.session || 'Track 1: Cloud & GenAI'} &bull; {currentPreviewAttendee.location || 'Main Auditorium / Hall A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {channel === 'WHATSAPP' ? (
                                /* WhatsApp Mockup */
                                <div className="bg-[#0b141a] border-4 border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-sm mx-auto">
                                    {/* WA Top Bar */}
                                    <div className="bg-[#1f2c34] p-3 flex items-center gap-3 border-b border-slate-800">
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                                            AWS
                                        </div>
                                        <div>
                                            <p className="text-white text-xs font-bold leading-none">AWS Community Day DDU</p>
                                            <p className="text-emerald-400 text-[10px] font-mono mt-0.5">Official Verified • Direct Gateway</p>
                                        </div>
                                    </div>

                                    {/* WA Chat Body */}
                                    <div className="p-4 min-h-[320px] max-h-[440px] overflow-y-auto space-y-3 bg-[#0b141a]" style={{ backgroundImage: 'radial-gradient(#1f2c34 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                                        <div className="flex justify-center">
                                            <span className="bg-[#182229] text-slate-400 text-[10px] font-mono px-2.5 py-1 rounded-lg">
                                                TODAY
                                            </span>
                                        </div>

                                        <div className="bg-[#005c4b] text-slate-100 rounded-2xl rounded-tl-none p-3.5 text-xs font-sans leading-relaxed shadow-md max-w-[95%] whitespace-pre-wrap">
                                            {getPreviewMessage()}
                                            <div className="text-[9px] text-emerald-200/60 text-right mt-1 flex items-center justify-end gap-1 font-mono">
                                                <span>10:30 AM</span>
                                                <span className="text-sky-300">✓✓</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Email Mockup */
                                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-sm mx-auto text-xs font-sans">
                                    <div className="border-b border-slate-800 pb-3 space-y-1">
                                        <p className="text-slate-400 text-[11px]"><strong className="text-white">Subject:</strong> {subject || '(No Subject)'}</p>
                                        <p className="text-slate-400 text-[11px]"><strong className="text-white">To:</strong> {currentPreviewAttendee.email || 'attendee@example.com'}</p>
                                    </div>
                                    <div className="text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                                        {getPreviewMessage()}
                                    </div>
                                </div>
                            )}

                            <p className="text-center text-[11px] text-slate-500 font-mono">
                                🔒 Every attendee receives their own distinct Name, Ticket Type, Booking ID, Counter, and Digital Pass Link.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

