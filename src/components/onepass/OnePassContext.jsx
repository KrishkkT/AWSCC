'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const OnePassContext = createContext(null);

export function OnePassProvider({ children }) {
    const [user, setUser] = useState(null);
    const [eventAssignments, setEventAssignments] = useState([]);
    const [availableEvents, setAvailableEvents] = useState([]);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchSession = async () => {
        try {
            const res = await fetch('/api/onepass/auth/me');
            const data = await res.json();
            if (data.authenticated && data.user) {
                setUser(data.user);
                setEventAssignments(data.event_assignments || []);
                setAvailableEvents(data.available_events || []);
            } else {
                setUser(null);
                setEventAssignments([]);
                setAvailableEvents([]);
            }
        } catch (e) {
            console.error('[OnePass] Failed to fetch session', e);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSession();
    }, []);

    const logout = async () => {
        try {
            await fetch('/api/onepass/auth/logout', { method: 'POST' });
            setUser(null);
            router.push('/onepass/login');
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const hasPermission = (eventId, permission) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        const assignment = eventAssignments.find(a => a.event_id === eventId);
        if (!assignment || !assignment.permissions) return false;
        return assignment.permissions.includes(permission);
    };

    return (
        <OnePassContext.Provider value={{
            user,
            setUser,
            loading,
            eventAssignments,
            availableEvents,
            currentEvent,
            setCurrentEvent,
            fetchSession,
            logout,
            hasPermission
        }}>
            {children}
        </OnePassContext.Provider>
    );
}

export function useOnePass() {
    const context = useContext(OnePassContext);
    if (!context) {
        throw new Error('useOnePass must be used within a OnePassProvider');
    }
    return context;
}
