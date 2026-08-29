'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Settings, Play, ShieldAlert, CheckCircle2, AlertTriangle,
    Database, ArrowLeft, RefreshCw, Sparkles, Terminal, Lock
} from 'lucide-react';
import { useOnePass } from '@/components/onepass/OnePassContext';

export default function OnePassSettingsPage() {
    const { user } = useOnePass();
    const [runningTest, setRunningTest] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testCapacity, setTestCapacity] = useState(1);
    const [testAttempts, setTestAttempts] = useState(10);

    const runConcurrencyTest = async () => {
        setRunningTest(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/onepass/test/concurrency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capacity: testCapacity,
                    attempts: testAttempts
                })
            });
            const data = await res.json();
            setTestResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setRunningTest(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-[#1a2540]">
                <Link href="/onepass/dashboard" className="p-2 bg-[#151c2e] hover:bg-[#1a2540] rounded-xl text-slate-400 hover:text-white transition">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">OnePass Platform Settings & Test Bench</h1>
                    <p className="text-xs text-slate-400 mt-0.5">System diagnostics, concurrency test suite, and database state.</p>
                </div>
            </div>

            {/* Concurrency Stress Test Card */}
            <div className="p-6 sm:p-8 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-6 shadow-2xl">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                        <Terminal className="w-5 h-5 text-[#0073BB]" />
                        <h2 className="text-lg font-bold text-white">Automated Concurrency Stress Test</h2>
                    </div>
                    <p className="text-xs text-slate-400">
                        Verifies Section 17 & 70 of the specification: Tests simultaneous seat assignment requests under extreme load to prove that mutex locks prevent track over-allocation.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#0C111D] rounded-2xl border border-[#1a2540] text-xs font-mono">
                    <div className="space-y-1">
                        <label className="text-slate-400">Track Capacity (Target seats):</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={testCapacity}
                            onChange={(e) => setTestCapacity(parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-slate-400">Concurrent Simultaneous Requests:</label>
                        <input
                            type="number"
                            min="2"
                            max="100"
                            value={testAttempts}
                            onChange={(e) => setTestAttempts(parseInt(e.target.value, 10) || 2)}
                            className="w-full bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-white outline-none focus:border-[#0073BB]"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={runConcurrencyTest}
                        disabled={runningTest}
                        className="flex items-center space-x-2 px-6 py-3 bg-[#0073BB] hover:bg-[#0073BB]/90 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-[#0073BB]/20"
                    >
                        {runningTest ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Firing {testAttempts} Concurrent Requests...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Execute Concurrency Stress Test</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Test Output Box */}
                {testResult && (
                    <div className={`p-6 rounded-2xl border space-y-4 animate-fade-in ${testResult.is_concurrency_safe ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-red-950/30 border-red-500/50'}`}>
                        <div className="flex items-center space-x-2">
                            {testResult.is_concurrency_safe ? (
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            )}
                            <h3 className="font-bold text-white text-base">{testResult.verdict}</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                            <div className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540]">
                                <div className="text-slate-400">Attempted</div>
                                <div className="text-lg font-bold text-white">{testResult.results.total_attempted}</div>
                            </div>
                            <div className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540]">
                                <div className="text-slate-400">Assigned</div>
                                <div className="text-lg font-bold text-emerald-400">{testResult.results.successful_assignments}</div>
                            </div>
                            <div className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540]">
                                <div className="text-slate-400">Rejected (Full)</div>
                                <div className="text-lg font-bold text-amber-400">{testResult.results.rejected_track_full}</div>
                            </div>
                            <div className="p-3 bg-[#0C111D] rounded-xl border border-[#1a2540]">
                                <div className="text-slate-400">Final Capacity</div>
                                <div className="text-lg font-bold text-[#4F8EF7]">{testResult.results.final_track_occupancy}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Architecture Details Card */}
            <div className="p-6 bg-[#151c2e]/70 border border-[#1a2540] rounded-3xl space-y-3 text-xs text-slate-400">
                <h3 className="text-sm font-bold text-white">System Architecture & Isolation</h3>
                <p>
                    OnePass is configured at <code className="text-[#4F8EF7]">https://aws.ddu.ac.in/onepass</code> as an independent operations platform. All data is scoped strictly by <code className="text-white">event_id</code>, guaranteeing total separation between consecutive conference editions (2026, 2027, 2028, etc.).
                </p>
            </div>
        </div>
    );
}
