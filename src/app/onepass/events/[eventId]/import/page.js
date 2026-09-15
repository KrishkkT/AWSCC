'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    UploadCloud, FileText, CheckCircle2, AlertTriangle, AlertCircle,
    ArrowRight, RefreshCw, Download, Layers, ShieldCheck, Sparkles,
    SplitSquareHorizontal, Users, Plus, Trash2, Check, Settings2, Hash
} from 'lucide-react';

export default function KonfHubImportPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);
    const [file, setFile] = useState(null);
    const [rawRows, setRawRows] = useState([]);
    const [headers, setHeaders] = useState([]);

    // Column Mapping state
    const [mapping, setMapping] = useState({
        name: '',
        email: '',
        phone: '',
        booking_id: '',
        registration_id: '',
        ticket_type: '',
        qr_identifier: ''
    });

    // Counter Allocation Configuration
    const [enableCounters, setEnableCounters] = useState(true);
    const [counterRules, setCounterRules] = useState([
        { id: '1', name: 'Workshop', pattern: 'workshop', capacity: 30, startCounter: 1, prefix: 'Counter ' },
        { id: '2', name: 'Tracks / General', pattern: '*', capacity: 30, startCounter: '', prefix: 'Counter ' }
    ]);

    // Validation & Import Summary State
    const [validationResult, setValidationResult] = useState(null);
    const [validating, setValidating] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importSummary, setImportSummary] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        parseUploadedFile(selectedFile);
    };

    const parseUploadedFile = (uploadedFile) => {
        setErrorMsg('');
        const fileName = uploadedFile.name.toLowerCase();

        if (fileName.endsWith('.csv')) {
            Papa.parse(uploadedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        const rowKeys = Object.keys(results.data[0]);
                        setHeaders(rowKeys);
                        setRawRows(results.data);
                        autoDetectMapping(rowKeys);
                        setCurrentStep(2);
                    } else {
                        setErrorMsg('The uploaded CSV appears to be empty.');
                    }
                },
                error: (err) => {
                    setErrorMsg(`Failed to parse CSV: ${err.message}`);
                }
            });
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (jsonData.length > 0) {
                        const rowKeys = Object.keys(jsonData[0]);
                        setHeaders(rowKeys);
                        setRawRows(jsonData);
                        autoDetectMapping(rowKeys);
                        setCurrentStep(2);
                    } else {
                        setErrorMsg('The Excel sheet contains no rows.');
                    }
                } catch (err) {
                    setErrorMsg(`Failed to parse Excel file: ${err.message}`);
                }
            };
            reader.readAsArrayBuffer(uploadedFile);
        } else {
            setErrorMsg('Please upload a valid .csv or .xlsx file exported from KonfHub.');
        }
    };

    const autoDetectMapping = (keys) => {
        const findKey = (patterns) => {
            return keys.find(k => {
                const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                return patterns.some(p => lower.includes(p));
            }) || '';
        };

        setMapping({
            name: findKey(['fullname', 'attendeename', 'buyername', 'name']),
            email: findKey(['email', 'emailaddress', 'buyeremail']),
            phone: findKey(['phone', 'contact', 'mobile', 'cell']),
            booking_id: findKey(['bookingid', 'orderid', 'ticketid', 'booking']),
            registration_id: findKey(['registrationid', 'regid', 'reference']),
            ticket_type: findKey(['tickettype', 'ticketname', 'ticket', 'category']),
            qr_identifier: findKey(['qrcode', 'qridentifier', 'qrid', 'qr', 'barcode'])
        });
    };

    // Live calculation of Counter Distribution based on rawRows & counterRules
    const counterDistribution = useMemo(() => {
        if (!enableCounters || rawRows.length === 0) return { groups: [], totalCounters: 0, totalAllocated: 0 };

        const processedIndices = new Set();
        let currentCounterNumber = 1;
        const groups = [];
        let totalCountersCount = 0;
        let totalAllocatedCount = 0;

        for (let rIdx = 0; rIdx < counterRules.length; rIdx++) {
            const rule = counterRules[rIdx];
            const capacity = Math.max(1, parseInt(rule.capacity) || 30);
            const prefix = rule.prefix !== undefined ? rule.prefix : 'Counter ';

            let startNum = (rule.startCounter !== '' && rule.startCounter !== null && rule.startCounter !== undefined && !isNaN(parseInt(rule.startCounter)))
                ? parseInt(rule.startCounter)
                : currentCounterNumber;

            const matchedIndices = [];
            for (let i = 0; i < rawRows.length; i++) {
                if (processedIndices.has(i)) continue;
                const row = rawRows[i];
                const tType = (row[mapping.ticket_type] || row['Ticket Type'] || row['Ticket'] || '').toLowerCase();
                if (rule.pattern === '*' || !rule.pattern) {
                    matchedIndices.push(i);
                } else if (tType.includes(rule.pattern.toLowerCase().trim())) {
                    matchedIndices.push(i);
                }
            }

            matchedIndices.forEach(idx => processedIndices.add(idx));

            const countersInGroup = [];
            const numCounters = Math.ceil(matchedIndices.length / capacity) || 0;

            for (let c = 0; c < numCounters; c++) {
                const cNum = startNum + c;
                const startIndex = c * capacity;
                const endIndex = Math.min(startIndex + capacity, matchedIndices.length);
                const count = endIndex - startIndex;

                countersInGroup.push({
                    name: `${prefix}${cNum}`,
                    number: cNum,
                    count,
                    rangeStr: `${startIndex + 1} - ${endIndex}`
                });
            }

            const endNum = numCounters > 0 ? startNum + numCounters - 1 : startNum;
            if (matchedIndices.length > 0) {
                currentCounterNumber = endNum + 1;
            }

            groups.push({
                ...rule,
                startNum,
                endNum,
                matchedCount: matchedIndices.length,
                counters: countersInGroup
            });

            totalCountersCount += numCounters;
            totalAllocatedCount += matchedIndices.length;
        }

        return {
            groups,
            totalCounters: totalCountersCount,
            totalAllocated: totalAllocatedCount
        };
    }, [enableCounters, counterRules, rawRows, mapping.ticket_type]);

    const runValidation = async () => {
        setValidating(true);
        setErrorMsg('');
        try {
            const effectiveRules = enableCounters ? counterRules.map((r, i) => {
                const distGroup = counterDistribution.groups[i];
                return {
                    ...r,
                    startCounter: distGroup ? distGroup.startNum : r.startCounter
                };
            }) : [];

            const res = await fetch('/api/onepass/attendees/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    rows: rawRows,
                    mapping,
                    counter_rules: effectiveRules,
                    dryRun: true
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Validation failed');

            setValidationResult(data.summary);
            setCurrentStep(3);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setValidating(false);
        }
    };

    const executeImport = async () => {
        setImporting(true);
        setErrorMsg('');
        try {
            const effectiveRules = enableCounters ? counterRules.map((r, i) => {
                const distGroup = counterDistribution.groups[i];
                return {
                    ...r,
                    startCounter: distGroup ? distGroup.startNum : r.startCounter
                };
            }) : [];

            const res = await fetch('/api/onepass/attendees/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    rows: rawRows,
                    mapping,
                    counter_rules: effectiveRules,
                    dryRun: false
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import failed');

            setImportSummary(data.summary);
            setCurrentStep(4);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setImporting(false);
        }
    };

    const updateCounterRule = (id, key, value) => {
        setCounterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));
    };

    const addCounterRule = () => {
        const nextId = `${Date.now()}`;
        setCounterRules(prev => [
            ...prev,
            { id: nextId, name: `Group ${prev.length + 1}`, pattern: '', capacity: 30, startCounter: '', prefix: 'Counter ' }
        ]);
    };

    const removeCounterRule = (id) => {
        if (counterRules.length <= 1) return;
        setCounterRules(prev => prev.filter(r => r.id !== id));
    };

    const downloadErrorReport = () => {
        if (!validationResult) return;
        const allErrors = [
            ...(validationResult.duplicate_records || []).map(r => ({ Row: r.row_number, Name: r.name, Email: r.email, Booking_ID: r.booking_id, Type: 'DUPLICATE', Issues: r.errors.join('; ') })),
            ...(validationResult.invalid_records || []).map(r => ({ Row: r.row_number, Name: r.name, Email: r.email, Booking_ID: r.booking_id, Type: 'INVALID', Issues: r.errors.join('; ') }))
        ];

        const csv = Papa.unparse(allErrors);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `konfhub_import_errors_${eventId}_${Date.now()}.csv`;
        a.click();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="pb-4 border-b border-[#1a2540]">
                <h1 className="text-2xl font-bold text-white tracking-tight">KonfHub Attendee Importer</h1>
                <p className="text-xs text-slate-400 mt-1">
                    Multi-step validation wizard for importing attendees with automatic physical registration counter allocation.
                </p>
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                {[
                    { num: 1, title: 'Upload File' },
                    { num: 2, title: 'Map Columns' },
                    { num: 3, title: 'Validate & Counters' },
                    { num: 4, title: 'Complete' }
                ].map((s) => (
                    <div
                        key={s.num}
                        className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition ${
                            currentStep === s.num
                                ? 'bg-[#0073BB]/10 border-[#0073BB] text-[#4F8EF7] font-bold'
                                : currentStep > s.num
                                ? 'bg-[#151c2e] border-[#1a2540] text-emerald-400'
                                : 'bg-[#0C111D] border-[#1a2540] text-slate-600'
                        }`}
                    >
                        <span>{s.num}.</span>
                        <span>{s.title}</span>
                    </div>
                ))}
            </div>

            {errorMsg && (
                <div className="p-4 bg-red-950/40 border border-red-800 rounded-2xl text-xs text-red-300 flex items-center space-x-2.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* STEP 1: Upload File */}
            {currentStep === 1 && (
                <div className="p-10 bg-[#151c2e] border-2 border-dashed border-[#1a2540] rounded-3xl text-center space-y-4 shadow-xl">
                    <div className="w-14 h-14 bg-[#0073BB]/10 text-[#4F8EF7] rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                        <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-white">Upload KonfHub Attendee Export</h2>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Supports .CSV and .XLSX spreadsheets exported from KonfHub registration manager.
                        </p>
                    </div>

                    <label className="inline-flex items-center space-x-2 px-6 py-3 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-lg shadow-[#0073BB]/20">
                        <FileText className="w-4 h-4" />
                        <span>Select File from Computer</span>
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                    </label>
                </div>
            )}

            {/* STEP 2: Map Columns */}
            {currentStep === 2 && (
                <div className="bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-[#1a2540]">
                        <div>
                            <h2 className="text-lg font-bold text-white">Map KonfHub Spreadsheet Columns</h2>
                            <p className="text-xs text-slate-400">Match the fields in your uploaded file ({file?.name}) to OnePass fields.</p>
                        </div>
                        <span className="text-xs font-mono text-[#4F8EF7] font-semibold">{rawRows.length} Rows Detected</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {[
                            { key: 'name', label: 'Full Name * (Required)', desc: 'Attendee display name' },
                            { key: 'email', label: 'Email Address * (Required)', desc: 'Must be unique per attendee' },
                            { key: 'phone', label: 'Phone Number', desc: 'Contact mobile number' },
                            { key: 'ticket_type', label: 'Ticket Category / Type', desc: 'Used for Workshop vs Tracks counter allocation' },
                            { key: 'booking_id', label: 'Booking / Order ID', desc: 'KonfHub booking identifier' },
                            { key: 'registration_id', label: 'Registration ID', desc: 'Reference registration number' },
                            { key: 'qr_identifier', label: 'QR Code Identifier', desc: 'If blank, OnePass generates unique QR automatically' },
                        ].map((field) => (
                            <div key={field.key} className="p-3.5 bg-[#0C111D] rounded-2xl border border-[#1a2540] space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-semibold text-slate-200">{field.label}</label>
                                    <span className="text-[10px] text-slate-400">{field.desc}</span>
                                </div>
                                <select
                                    value={mapping[field.key]}
                                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                    className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB] font-mono"
                                >
                                    <option value="">-- Auto Detect / Leave Unmapped --</option>
                                    {headers.map((h) => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-[#1a2540]">
                        <button
                            onClick={() => setCurrentStep(1)}
                            className="px-4 py-2 text-slate-400 hover:text-white rounded-xl text-xs"
                        >
                            Back
                        </button>
                        <button
                            onClick={runValidation}
                            disabled={validating || !mapping.name || !mapping.email}
                            className="flex items-center space-x-2 px-6 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md"
                        >
                            {validating ? (
                                <span>Validating rows...</span>
                            ) : (
                                <>
                                    <span>Continue to Counters & Validation</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Validate, Configure Counters & Preview */}
            {currentStep === 3 && validationResult && (
                <div className="space-y-6">
                    {/* Validation Stat Badges */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                        <div className="p-4 bg-[#151c2e] rounded-2xl border border-[#1a2540] space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase">Total Rows</span>
                            <div className="text-2xl font-bold text-white">{validationResult.total_rows}</div>
                        </div>

                        <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-800/40 space-y-1">
                            <span className="text-[10px] text-emerald-400 uppercase">Valid to Import</span>
                            <div className="text-2xl font-bold text-emerald-400">{validationResult.valid_count}</div>
                        </div>

                        <div className="p-4 bg-amber-950/20 rounded-2xl border border-amber-800/40 space-y-1">
                            <span className="text-[10px] text-amber-400 uppercase">Duplicate Rows</span>
                            <div className="text-2xl font-bold text-amber-400">{validationResult.duplicate_count}</div>
                        </div>

                        <div className="p-4 bg-red-950/20 rounded-2xl border border-red-800/40 space-y-1">
                            <span className="text-[10px] text-red-400 uppercase">Invalid Rows</span>
                            <div className="text-2xl font-bold text-red-400">{validationResult.invalid_count}</div>
                        </div>
                    </div>

                    {/* Counter Allocation Configuration Card */}
                    <div className="bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center text-[#FF9900]">
                                    <SplitSquareHorizontal className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        Registration Counter Allocation
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30">
                                            SMART PARTITION
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Divide attendees into numbered physical desks (e.g. 30 per counter for Workshop, then continue for Tracks).
                                    </p>
                                </div>
                            </div>

                            <label className="flex items-center space-x-2 cursor-pointer bg-[#0C111D] px-4 py-2 rounded-xl border border-[#1a2540]">
                                <input
                                    type="checkbox"
                                    checked={enableCounters}
                                    onChange={(e) => setEnableCounters(e.target.checked)}
                                    className="w-4 h-4 rounded text-[#0073BB] focus:ring-0 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-slate-200">Enable Counter Assignment</span>
                            </label>
                        </div>

                        {enableCounters && (
                            <div className="space-y-6">
                                {/* Rules Grid */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                                            Partition Rules & Capacities
                                        </span>
                                        <button
                                            type="button"
                                            onClick={addCounterRule}
                                            className="text-xs text-[#4F8EF7] hover:underline flex items-center gap-1 font-semibold"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Another Group
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {counterRules.map((rule, idx) => {
                                            const distGroup = counterDistribution.groups[idx];
                                            const isWorkshop = rule.name.toLowerCase().includes('workshop') || rule.pattern.toLowerCase().includes('workshop');

                                            return (
                                                <div
                                                    key={rule.id}
                                                    className={`p-5 rounded-2xl border transition-all ${
                                                        isWorkshop
                                                            ? 'bg-[#FF9900]/5 border-[#FF9900]/20'
                                                            : 'bg-[#0073BB]/5 border-[#0073BB]/20'
                                                    }`}
                                                >
                                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                                                                isWorkshop ? 'bg-[#FF9900] text-slate-950' : 'bg-[#0073BB] text-white'
                                                            }`}>
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <input
                                                                    type="text"
                                                                    value={rule.name}
                                                                    onChange={(e) => updateCounterRule(rule.id, 'name', e.target.value)}
                                                                    className="bg-transparent font-bold text-white text-sm outline-none border-b border-transparent hover:border-white/20 focus:border-[#4F8EF7]"
                                                                    placeholder="Group Name (e.g. Workshop)"
                                                                />
                                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                                    Matched: <strong className="text-white">{distGroup?.matchedCount || 0} attendees</strong>
                                                                    {distGroup?.counters?.length > 0 && (
                                                                        <span> → {distGroup.counters.length} counters ({distGroup.counters[0].name} to {distGroup.counters[distGroup.counters.length - 1].name})</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {counterRules.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeCounterRule(rule.id)}
                                                                className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition"
                                                                title="Delete Group"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-400 uppercase">Match Ticket Type</label>
                                                            <input
                                                                type="text"
                                                                value={rule.pattern}
                                                                onChange={(e) => updateCounterRule(rule.id, 'pattern', e.target.value)}
                                                                placeholder="e.g. workshop or *"
                                                                className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                                                            />
                                                            <span className="text-[9px] text-slate-500">* matches all remaining</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-400 uppercase">Attendees per Counter</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={rule.capacity}
                                                                onChange={(e) => updateCounterRule(rule.id, 'capacity', e.target.value)}
                                                                className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                                                            />
                                                            <span className="text-[9px] text-slate-500">Default: 30 attendees</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-400 uppercase">Starting Counter #</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={rule.startCounter !== undefined && rule.startCounter !== null ? rule.startCounter : ''}
                                                                onChange={(e) => updateCounterRule(rule.id, 'startCounter', e.target.value)}
                                                                placeholder={distGroup ? `Auto (${distGroup.startNum})` : 'Auto'}
                                                                className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                                                            />
                                                            <span className="text-[9px] text-slate-500">
                                                                {rule.startCounter ? `Fixed at ${rule.startCounter}` : `Auto-starts at ${distGroup?.startNum || 1}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Live Visual Distribution Preview */}
                                <div className="p-5 bg-[#0C111D] border border-[#1a2540] rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b border-[#1a2540] pb-3">
                                        <div className="flex items-center space-x-2">
                                            <Sparkles className="w-4 h-4 text-[#FF9900]" />
                                            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                                                Live Allocation Preview ({counterDistribution.totalAllocated} attendees → {counterDistribution.totalCounters} Counters)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                        {counterDistribution.groups.flatMap(g => g.counters.map(c => ({ ...c, category: g.name }))).map((c, idx) => {
                                            const isWorkshop = c.category.toLowerCase().includes('workshop');

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-2.5 rounded-xl border text-center font-mono space-y-1 ${
                                                        isWorkshop
                                                            ? 'bg-[#FF9900]/10 border-[#FF9900]/30 text-[#FF9900]'
                                                            : 'bg-[#0073BB]/10 border-[#0073BB]/30 text-[#4F8EF7]'
                                                    }`}
                                                >
                                                    <div className="font-bold text-xs text-white">{c.name}</div>
                                                    <div className="text-[10px] font-semibold">{c.count} Attendees</div>
                                                    <div className="text-[9px] text-slate-400 font-sans">{c.category}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Duplicate / Error Details if any */}
                    {(validationResult.invalid_records?.length > 0 || validationResult.duplicate_records?.length > 0) && (
                        <div className="p-5 bg-[#151c2e] rounded-3xl border border-red-800/40 space-y-3 text-xs shadow-xl">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-amber-400 flex items-center space-x-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Validation Warnings ({validationResult.invalid_count + validationResult.duplicate_count} rows will be skipped)</span>
                                </div>
                                <button
                                    onClick={downloadErrorReport}
                                    className="flex items-center space-x-1 px-3 py-1 bg-[#0C111D] hover:bg-[#1a2540] border border-[#1a2540] text-slate-200 text-xs rounded-xl font-mono"
                                >
                                    <Download className="w-3 h-3" />
                                    <span>Download Error CSV</span>
                                </button>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px] text-slate-400 font-mono divide-y divide-[#1a2540]">
                                {[...(validationResult.duplicate_records || []), ...(validationResult.invalid_records || [])].slice(0, 10).map((r, idx) => (
                                    <div key={idx} className="pt-1.5 flex items-center justify-between">
                                        <span>Row {r.row_number}: <strong>{r.name}</strong> ({r.email})</span>
                                        <span className="text-red-400">{r.errors.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-[#1a2540]">
                        <button
                            onClick={() => setCurrentStep(2)}
                            className="px-4 py-2 text-slate-400 hover:text-white rounded-xl text-xs"
                        >
                            Adjust Mapping
                        </button>
                        <button
                            onClick={executeImport}
                            disabled={importing || validationResult.valid_count === 0}
                            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                            {importing ? (
                                <span>Importing & Assigning Counters...</span>
                            ) : (
                                <>
                                    <span>Commit & Import {validationResult.valid_count} Records with Counters</span>
                                    <CheckCircle2 className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: Import Complete Summary */}
            {currentStep === 4 && importSummary && (
                <div className="bg-[#151c2e] border border-[#1a2540] rounded-3xl p-8 text-center space-y-6 shadow-xl">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-white">Attendee Import Successfully Processed</h2>
                        <p className="text-xs text-slate-400">
                            The attendee roster and registration counters are active and ready for check-in operations.
                        </p>
                    </div>

                    <div className="max-w-md mx-auto p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Total File Rows:</span>
                            <span className="text-white font-bold">{importSummary.total_rows}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                            <span>Imported into OnePass:</span>
                            <span className="font-bold">{importSummary.imported_count}</span>
                        </div>
                        {importSummary.counters?.length > 0 && (
                            <div className="flex items-center justify-between text-[#FF9900]">
                                <span>Counters Assigned:</span>
                                <span className="font-bold">{importSummary.counters.length} Counters ({importSummary.counters[0]?.counter} - {importSummary.counters[importSummary.counters.length - 1]?.counter})</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-amber-400">
                            <span>Duplicates Skipped:</span>
                            <span className="font-bold">{importSummary.duplicate_count}</span>
                        </div>
                        <div className="flex items-center justify-between text-red-400">
                            <span>Invalid Rows:</span>
                            <span className="font-bold">{importSummary.invalid_count}</span>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-3 pt-4">
                        <button
                            onClick={() => {
                                setFile(null);
                                setRawRows([]);
                                setCurrentStep(1);
                            }}
                            className="px-5 py-2.5 bg-[#1a2540] hover:bg-[#0073BB] text-white rounded-xl text-xs font-semibold"
                        >
                            Import Another File
                        </button>
                        <button
                            onClick={() => router.push(`/onepass/events/${eventId}/attendees`)}
                            className="px-6 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white rounded-xl text-xs font-bold shadow-md"
                        >
                            View Attendees & Counters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
