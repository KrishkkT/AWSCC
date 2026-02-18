export default function Loading() {
    return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-white/5"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin"></div>
                </div>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Loading...</p>
            </div>
        </div>
    );
}
