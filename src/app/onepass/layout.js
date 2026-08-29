'use client';

import React from 'react';
import { OnePassProvider } from '@/components/onepass/OnePassContext';

export default function OnePassRootLayout({ children }) {
    return (
        <OnePassProvider>
            <div className="min-h-screen bg-[#0C111D] text-white font-sans selection:bg-[#0073BB]/30 selection:text-white antialiased">
                {children}
            </div>
        </OnePassProvider>
    );
}
