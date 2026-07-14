import Link from "next/link";
import { HelpCircle, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Global Background Grid Pattern */}
            <div className="absolute inset-0 bg-slate-grid opacity-30 pointer-events-none"></div>

            {/* Glowing Blobs */}
            <div className="absolute top-[20%] left-[-20%] w-[50%] h-[50%] bg-brand-aws/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-blue/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 card-professional p-12 max-w-lg border-brand-aws/20 bg-brand-navy/30 backdrop-blur-md">
                <div className="w-20 h-20 bg-brand-aws/10 rounded-2xl flex items-center justify-center mb-8 mx-auto border border-brand-aws/20">
                    <HelpCircle size={40} className="text-brand-aws animate-pulse" />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight leading-tight">
                    404 <br />
                    <span className="text-brand-aws">Region Unreachable</span>
                </h1>
                
                <p className="text-slate-400 mb-10 leading-relaxed font-medium">
                    The stack resource you are trying to access does not exist in this region or has been decommissioned.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="btn-aws !px-10 py-3.5 flex items-center justify-center gap-2"
                    >
                        <Home size={18} />
                        Return Home
                    </Link>
                    <Link href="/contact" className="btn-outline !px-10 py-3.5">
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
}
