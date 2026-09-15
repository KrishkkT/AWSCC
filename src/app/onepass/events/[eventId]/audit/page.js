'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOnePass } from '@/components/onepass/OnePassContext';
import {
    ScrollText, Search, Filter, Clock, Shield, User,
    RefreshCw, AlertCircle, Sparkles, CheckCircle2, ShieldAlert
} from 'lucide-react';

export default function AuditLogsPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const router = useRouter();
    const { user, loading: authLoading } = useOnePass();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                eventId,
                action: actionFilter,
                role: roleFilter
            });
            const res = await fetch(`/api/onepass/audit?${queryParams.toString()}`);
            if (res.status === 401 || res.status === 403) {
                return;
            }
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user?.role === 'ADMIN') {
            fetchAuditLogs();
        }
    }, [eventId, actionFilter, roleFilter, authLoading, user]);

    if (!authLoading && user && user.role !== 'ADMIN') {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20 shadow-lg">
                    <ShieldAlert className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-white">Administrator Access Only</h2>
                <p className="text-xs text-slate-400">Audit logs and governance trails are restricted to event administrators.</p>
                <Link
                    href={`/onepass/events/${eventId}/overview`}
                    className="inline-block px-5 py-2.5 bg-[#151c2e] hover:bg-[#1a2540] text-xs font-semibold text-white rounded-xl border border-[#1a2540] transition"
                >
                    Back to Event Overview
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Audit & Governance Log</h1>
                <p className="text-xs text-slate-400 mt-1">
                    Immutable event operations ledger: records check-ins, meal claims, track gate scans, and administrative overrides.
                </p>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
            <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-[#0073BB]"
            >
                <option value="">All Action Types</option>
                <option value="CHECK_IN">CHECK_IN</option>
                <option value="CLAIM_RESOURCE">CLAIM_RESOURCE</option>
                <option value="ADMIN_OVERRIDE">ADMIN_OVERRIDE</option>
                <option value="IMPORT_ATTENDEES">IMPORT_ATTENDEES</option>
                <option value="CREATE_EVENT">CREATE_EVENT</option>
            </select>

            <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#151c2e] border border-[#1a2540] rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-[#0073BB]"
            >
                <option value="">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="VOLUNTEER">VOLUNTEER</option>
            </select>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-[#151c2e] border border-[#1a2540] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-[#0C111D] border-b border-[#1a2540] text-slate-400 font-mono uppercase text-[10px]">
                        <tr>
                            <th className="px-5 py-3.5">Timestamp</th>
                            <th className="px-4 py-3.5">Actor</th>
                            <th className="px-4 py-3.5">Action</th>
                            <th className="px-4 py-3.5">Entity</th>
                            <th className="px-5 py-3.5">Audit Metadata</th>
                            <th className="px-4 py-3.5 text-right">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a2540] text-slate-300">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-[#0073BB]" />
                                    <span>Loading audit entries...</span>
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No audit records found matching filters.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-[#1a2540]/40 transition">
                                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="font-semibold text-white">{log.actor_name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{log.actor_role}</div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="px-2 py-0.5 rounded bg-[#0073BB]/15 text-[#4F8EF7] font-mono text-[10px] font-bold border border-[#0073BB]/30">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                                        {log.entity_type}
                                    </td>
                                    <td className="px-5 py-3.5 max-w-xs truncate text-[11px] text-slate-300 font-mono">
                                        {JSON.stringify(log.metadata || {})}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                                            {log.result}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    );
}
