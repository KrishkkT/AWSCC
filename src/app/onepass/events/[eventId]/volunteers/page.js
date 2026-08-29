'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    ShieldAlert, UserPlus, Key, CheckCircle2, Shield, User,
    Mail, Lock, Sparkles, RefreshCw, X, ShieldCheck, Trash2, Edit2
} from 'lucide-react';
import { useOnePass } from '@/components/onepass/OnePassContext';

export default function VolunteersManagementPage() {
    const params = useParams();
    const eventId = params?.eventId;
    const { user } = useOnePass();

    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedVolunteer, setSelectedVolunteer] = useState(null);

    // Add Form
    const [newVol, setNewVol] = useState({
        name: '',
        email: '',
        password: '',
        permissions: ['CHECK_IN', 'VIEW_DASHBOARD']
    });

    // Edit Form
    const [editPermissions, setEditPermissions] = useState([]);
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const ALL_PERMISSIONS = [
        { key: 'CHECK_IN', label: 'Check-In Station', desc: 'Can scan attendee QR and assign tracks' },
        { key: 'TRACK_ACCESS', label: 'Track Access Gate', desc: 'Can scan attendees at track entrances' },
        { key: 'WORKSHOP_ACCESS', label: 'Workshop Access', desc: 'Can scan and verify workshop eligibility' },
        { key: 'FOOD', label: 'Food & Meals', desc: 'Can distribute breakfast, lunch, hi-tea' },
        { key: 'SWAG', label: 'Swag Distribution', desc: 'Can scan and mark swag kits as claimed' },
        { key: 'VIEW_DASHBOARD', label: 'View Live Dashboard', desc: 'Can monitor operational metrics' },
    ];

    const fetchVolunteers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/onepass/volunteers?eventId=${eventId}`);
            const data = await res.json();
            setVolunteers(data.event_volunteers || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVolunteers();
    }, [eventId]);

    const handleCreateVolunteer = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/volunteers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    ...newVol
                })
            });
            if (res.ok) {
                setAddModalOpen(false);
                setNewVol({ name: '', email: '', password: '', permissions: ['CHECK_IN', 'VIEW_DASHBOARD'] });
                fetchVolunteers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create volunteer');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleSavePermissions = async (e) => {
        e.preventDefault();
        if (!selectedVolunteer) return;
        setSaving(true);
        try {
            const res = await fetch('/api/onepass/volunteers', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedVolunteer.user_id,
                    eventId,
                    permissions: editPermissions,
                    newPassword: newPassword || undefined
                })
            });
            if (res.ok) {
                setEditModalOpen(false);
                setNewPassword('');
                fetchVolunteers();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveVolunteer = async (userId, userName) => {
        if (!confirm(`Are you sure you want to remove volunteer "${userName}" from this event?`)) return;
        try {
            const res = await fetch(`/api/onepass/volunteers?userId=${userId}&eventId=${eventId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchVolunteers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to remove volunteer');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const togglePermission = (permKey, state, setState) => {
        if (state.includes(permKey)) {
            setState(state.filter(k => k !== permKey));
        } else {
            setState([...state, permKey]);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a2540]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Volunteers & Access Control</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Granular role-based permissions matrix for event-day operations staff.
                    </p>
                </div>

                <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold text-xs rounded-xl transition shadow-md"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Volunteer Account</span>
                </button>
            </div>

            {/* Volunteers Grid */}
            {volunteers.length === 0 ? (
                <div className="p-8 text-center bg-[#151c2e] rounded-3xl border border-[#1a2540] text-slate-500 text-xs">
                    No volunteers assigned to this event yet. Click <strong>Add Volunteer Account</strong> to invite operations staff.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {volunteers.map((ev) => {
                        const volUser = ev.user;
                        if (!volUser) return null;
                        const perms = ev.permissions || [];

                        return (
                            <div key={ev.id} className="p-6 bg-[#151c2e] border border-[#1a2540] rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-[#0C111D] flex items-center justify-center text-white font-bold text-sm border border-[#1a2540]">
                                                {volUser.name?.[0] || 'V'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-sm">{volUser.name}</h3>
                                                <div className="text-[11px] text-slate-400 font-mono">{volUser.email}</div>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                            ACTIVE
                                        </span>
                                    </div>

                                    {/* Active Permissions Pills */}
                                    <div className="space-y-1.5 pt-2 border-t border-[#1a2540]">
                                        <div className="text-[10px] font-mono uppercase text-slate-400">Authorized Modules:</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {perms.map((p) => (
                                                <span key={p} className="px-2 py-0.5 bg-[#0073BB]/10 text-[#4F8EF7] border border-[#0073BB]/30 rounded-lg text-[10px] font-mono font-medium">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-[#1a2540]">
                                    <button
                                        onClick={() => handleRemoveVolunteer(ev.user_id, volUser.name)}
                                        className="flex items-center space-x-1 px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-[#0C111D] rounded-xl text-xs transition"
                                        title="Remove Volunteer from Event"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Remove</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setSelectedVolunteer(ev);
                                            setEditPermissions(ev.permissions || []);
                                            setEditModalOpen(true);
                                        }}
                                        className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#1a2540] hover:bg-[#0073BB] text-white rounded-xl text-xs font-medium transition"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Permissions</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Volunteer Modal */}
            {addModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <div className="space-y-0.5">
                                <h2 className="text-lg font-bold text-white">Create Volunteer Account</h2>
                                <p className="text-xs text-slate-400">Creates credentials and assigns permissions for this event.</p>
                            </div>
                            <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateVolunteer} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-slate-300 font-medium">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Pooja Sharma"
                                    value={newVol.name}
                                    onChange={(e) => setNewVol({ ...newVol, name: e.target.value })}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="pooja@onepass.ddu.ac.in"
                                        value={newVol.email}
                                        onChange={(e) => setNewVol({ ...newVol, email: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-slate-300 font-medium">Password</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={newVol.password}
                                        onChange={(e) => setNewVol({ ...newVol, password: e.target.value })}
                                        className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#0073BB]"
                                    />
                                </div>
                            </div>

                            {/* Permissions Checkbox Grid */}
                            <div className="space-y-2 pt-2 border-t border-[#1a2540]">
                                <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                    Assign Permissions:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_PERMISSIONS.map((perm) => {
                                        const isChecked = newVol.permissions.includes(perm.key);
                                        return (
                                            <button
                                                type="button"
                                                key={perm.key}
                                                onClick={() => togglePermission(perm.key, newVol.permissions, (p) => setNewVol({ ...newVol, permissions: p }))}
                                                className={`p-2.5 rounded-xl border text-left transition text-[11px] flex items-center justify-between ${
                                                    isChecked
                                                        ? 'bg-[#0073BB]/15 border-[#0073BB] text-[#4F8EF7] font-semibold'
                                                        : 'bg-[#0C111D] border-[#1a2540] text-slate-400'
                                                }`}
                                            >
                                                <span>{perm.label}</span>
                                                {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl shadow-md"
                                >
                                    {saving ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Volunteer Modal */}
            {editModalOpen && selectedVolunteer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#151c2e] border border-[#1a2540] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-2 border-b border-[#1a2540]">
                            <div className="space-y-0.5">
                                <h2 className="text-lg font-bold text-white">Permissions for {selectedVolunteer.user?.name}</h2>
                                <p className="text-xs text-slate-400">{selectedVolunteer.user?.email}</p>
                            </div>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePermissions} className="space-y-4 text-xs">
                            <div className="space-y-2">
                                <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                    Toggle Permitted Modules:
                                </label>
                                <div className="space-y-2">
                                    {ALL_PERMISSIONS.map((perm) => {
                                        const isChecked = editPermissions.includes(perm.key);
                                        return (
                                            <button
                                                type="button"
                                                key={perm.key}
                                                onClick={() => togglePermission(perm.key, editPermissions, setEditPermissions)}
                                                className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                                                    isChecked
                                                        ? 'bg-[#0073BB]/15 border-[#0073BB] text-white font-semibold'
                                                        : 'bg-[#0C111D] border-[#1a2540] text-slate-400'
                                                }`}
                                            >
                                                <div>
                                                    <div className="font-semibold text-white">{perm.label}</div>
                                                    <div className="text-[10px] text-slate-400">{perm.desc}</div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${isChecked ? 'bg-[#0073BB] border-[#0073BB] text-white' : 'border-slate-700'}`}>
                                                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-[#1a2540]">
                                <label className="text-slate-300 font-medium">Reset Password (Optional)</label>
                                <input
                                    type="password"
                                    placeholder="Leave blank to keep unchanged"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#0C111D] border border-[#1a2540] rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#0073BB]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-[#0073BB] hover:bg-[#0073BB]/90 text-white font-bold rounded-xl shadow-md"
                                >
                                    {saving ? 'Saving...' : 'Save Permissions'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
