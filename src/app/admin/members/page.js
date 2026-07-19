"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Search, Shield, Mail, UserCheck, Crown, X, Check, Trash2, Loader2, RotateCcw } from "lucide-react";
import Toast from "@/components/Toast";
import { logActivity } from "@/utils/logger";

export default function AdminMembers() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [feedback, setFeedback] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMember, setNewMember] = useState({ full_name: '', email: '', role: 'member' });
    const [submitting, setSubmitting] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const supabase = createClient();

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        // Try sorting by created_at, fallback to id if it fails (before migration is applied)
        let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error && error.code === '42703') { // Column does not exist
            console.warn('created_at not found, falling back to basic select');
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('profiles')
                .select('*');
            if (fallbackError) {
                console.error('Fallback fetch error:', fallbackError);
                showFeedback('Failed to load members', 'error');
            } else {
                setMembers(fallbackData || []);
            }
        } else if (error) {
            console.error('Fetch members error:', error);
            showFeedback('Failed to load members', 'error');
        } else {
            setMembers(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    async function handleAddMember(e) {
        e.preventDefault();
        setSubmitting(true);
        // We'll use service role or a specialized API for this since standard client can't create users
        // For now, we'll insert into profiles directly if allowed, or suggest an alternative flow
        const { data, error } = await supabase
            .from('profiles')
            .insert([{
                id: crypto.randomUUID(), // This is a placeholder; real auth requires admin user creation
                full_name: newMember.full_name,
                email: newMember.email,
                role: newMember.role,
                is_active: true
            }]);

        if (error) {
            console.error('Add member error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        } else {
            await logActivity(supabase, 'Added Member', `Added new member: ${newMember.full_name} (${newMember.role})`, 'success');
            showFeedback('Member added successfully!');
            setShowAddModal(false);
            setNewMember({ full_name: '', email: '', role: 'member' });
            fetchMembers();

            // Send welcome email
            try {
                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: newMember.email,
                        type: 'memberactivation',
                        data: { name: newMember.full_name }
                    })
                });
            } catch (err) {
                console.error('Email send error:', err);
            }
        }
        setSubmitting(false);
    }

    function showFeedback(message, type = 'success') {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3000);
    }

    async function updateRole(memberId, newRole) {
        setProcessingId(memberId);
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId);
        if (error) {
            console.error('Role update error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        } else {
            const mName = members.find(m => m.id === memberId)?.full_name || memberId;
            await logActivity(supabase, 'Updated Member Role', `Changed role of ${mName} to ${newRole}`, 'info');
            showFeedback(`Role updated to ${newRole}`);
            fetchMembers();
        }
        setProcessingId(null);
    }

    async function deleteMember(memberId) {
        if (!confirm('Are you sure you want to delete this member?')) return;

        setProcessingId(memberId);
        const mName = members.find(m => m.id === memberId)?.full_name || memberId;
        const { error } = await supabase.from('profiles').delete().eq('id', memberId);
        if (error) {
            console.error('Delete member error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        } else {
            await logActivity(supabase, 'Deleted Member', `Deleted member: ${mName}`, 'warning');
            showFeedback('Member deleted successfully');
            fetchMembers();
        }
        setProcessingId(null);
    }

    async function toggleActive(memberId, currentStatus) {
        setProcessingId(memberId);
        const newStatus = !currentStatus;
        const mName = members.find(m => m.id === memberId)?.full_name || memberId;
        const { error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', memberId);
        if (error) {
            console.error('Toggle active error:', error);
            showFeedback(`Error: ${error.message}`, 'error');
        } else {
            await logActivity(supabase, 'Toggled Member Status', `Set ${mName} to ${newStatus ? 'active' : 'inactive'}`, 'info');
            showFeedback(newStatus ? 'Member activated' : 'Member deactivated');
            fetchMembers();
        }
        setProcessingId(null);
    }

    const roleColors = {
        Leader: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        captain: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
        faculty: 'bg-brand-teal/10 text-brand-teal border-brand-teal/20',
        core: 'bg-white/10 text-white/70 border-white/20',
        member: 'bg-white/5 text-white/40 border-white/10',
    };

    const roleIcons = {
        Leader: <Crown size={14} />,
        captain: <Crown size={14} />,
        faculty: <Shield size={14} />,
        core: <UserCheck size={14} />,
        member: <Users size={14} />,
    };

    const filtered = members.filter(m => {
        const matchesSearch = (m.full_name || m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === 'all' || m.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-8">
            {/* Feedback Toast */}
            {feedback && (
                <Toast
                    message={feedback.message}
                    type={feedback.type}
                    onClose={() => setFeedback(null)}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
                        Member <span className="text-brand-cyan">Directory</span>
                    </motion.h1>
                    <p className="text-white/40 font-medium">Manage roles, activation status, and permissions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAddModal(true)} className="btn-primary px-6 py-3 flex items-center gap-2 text-sm shadow-[0_0_30px_rgba(0,194,255,0.1)]">
                        <Users size={18} /> Add Member
                    </button>
                    <div className="glass-card !rounded-xl !p-3 border-white/5 text-sm font-bold">
                        <span className="text-white/40">Total: </span>
                        <span className="text-brand-cyan">{members.length}</span>
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 !rounded-2xl border-brand-cyan/20 max-w-md w-full relative shadow-2xl">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                                <Users size={20} />
                            </div>
                            <h3 className="text-xl font-black text-white">Add New Member</h3>
                        </div>

                        <form onSubmit={handleAddMember} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Full Name</label>
                                <input required type="text" value={newMember.full_name} onChange={e => setNewMember({ ...newMember, full_name: e.target.value })} placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Email Address</label>
                                <input required type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="john@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Initial Role</label>
                                <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-cyan outline-none font-bold">
                                    <option value="member">Member</option>
                                    <option value="core">Core</option>
                                    <option value="Leader">Leader</option>
                                    <option value="captain">Captain</option>
                                    <option value="faculty">Faculty</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" disabled={submitting} className="btn-primary flex-grow py-4 text-sm font-black uppercase tracking-widest disabled:opacity-50">
                                    {submitting ? 'Creating...' : 'Create Member'}
                                </button>
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-6 py-4 text-sm font-black uppercase tracking-widest !rounded-xl">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex-grow max-w-sm group focus-within:border-brand-cyan/50 transition-all">
                    <Search size={16} className="text-white/20 group-focus-within:text-brand-cyan" />
                    <input type="text" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white placeholder-white/20 w-full font-bold" />
                </div>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold outline-none focus:border-brand-cyan/50 cursor-pointer">
                    <option value="all">All Roles</option>
                    <option value="faculty">Faculty</option>
                    <option value="Leader">Leader</option>
                    <option value="captain">Captain</option>
                    <option value="core">Core</option>
                    <option value="member">Member</option>
                </select>
            </div>

            {/* Members List */}
            {loading ? (
                <div className="text-white/20 font-black uppercase tracking-[0.5em] animate-pulse py-20 text-center">Loading Members...</div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-16 text-center border-white/5 !rounded-2xl">
                    <Users size={48} className="text-white/10 mx-auto mb-6" />
                    <p className="text-white/30 font-bold">No members found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((member, i) => (
                        <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card !rounded-2xl p-5 !py-4 border-white/5 hover:border-white/10 transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-black text-sm shrink-0">
                                        {(member.full_name || member.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-white text-sm truncate">{member.full_name || 'Unnamed'}</div>
                                        <div className="text-xs text-white/30 flex items-center gap-1 truncate"><Mail size={12} className="shrink-0" /> {member.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                                    {/* Role Badge */}
                                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${roleColors[member.role] || roleColors.member}`}>
                                        {roleIcons[member.role]} {member.role}
                                    </div>

                                    {/* Active Toggle */}
                                    <button
                                        disabled={processingId === member.id}
                                        onClick={() => toggleActive(member.id, member.is_active)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${member.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'} disabled:opacity-50`}
                                    >
                                        {processingId === member.id ? <Loader2 size={10} className="animate-spin" /> : null}
                                        {member.is_active ? 'Active' : 'Inactive'}
                                    </button>

                                    {/* Role Selector */}
                                    <div className="relative">
                                        <select
                                            disabled={processingId === member.id}
                                            value={member.role}
                                            onChange={e => updateRole(member.id, e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none focus:border-brand-cyan/50 cursor-pointer disabled:opacity-50 appearance-none pr-8"
                                        >
                                            <option value="member">Member</option>
                                            <option value="core">Core</option>
                                            <option value="Leader">Leader</option>
                                            <option value="captain">Captain</option>
                                            <option value="faculty">Faculty</option>
                                        </select>
                                        {processingId === member.id ? (
                                            <Loader2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-brand-cyan" />
                                        ) : (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
                                                <RotateCcw size={10} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        disabled={processingId === member.id}
                                        onClick={() => deleteMember(member.id)}
                                        className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all ml-1 disabled:opacity-50"
                                    >
                                        {processingId === member.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
