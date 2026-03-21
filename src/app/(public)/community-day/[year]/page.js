import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import CommunityDayClient from "@/components/CommunityDayClient";

export async function generateMetadata({ params }) {
    const { year } = await params;
    
    const supabase = await createClient();
    const { data } = await supabase
        .from('community_events')
        .select('title')
        .eq('year', parseInt(year))
        .single();
        
    return {
        title: data ? `${data.title} | AWS Cloud Club` : `AWS Community Day ${year}`,
        description: "Join us for the ultimate student cloud computing event of the year.",
    };
}

export default async function CommunityDayPage({ params }) {
    const { year } = await params;
    const supabase = await createClient();

    const { data: event, error } = await supabase
        .from('community_events')
        .select('*')
        .eq('year', parseInt(year))
        .single();

    if (error || !event || !event.is_active) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjMwIiByPSIxIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iOTAiIHI9IjAuNSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjUwIiByPSIxIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzUwIiBjeT0iMTIwIiByPSIwLjUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjIyMCIgcj0iMSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjI4MCIgcj0iMSIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjMzMCIgcj0iMC41IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMzIwIiBjeT0iMzIwIiByPSIxIiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat" />
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-cyan/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-brand-aws/5 rounded-full blur-[150px] mix-blend-screen animate-pulse-slow"></div>
                
                <div className="relative z-10 glass-card p-10 md:p-14 max-w-2xl border-brand-cyan/20 rounded-[2rem] shadow-2xl shadow-brand-cyan/5 banner-hover group">
                    <div className="w-20 h-20 mx-auto bg-brand-cyan/10 text-brand-cyan rounded-full flex items-center justify-center mb-8 border border-brand-cyan/30 group-hover:scale-110 transition-transform duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">You're Early to the Party!</h1>
                    
                    <p className="text-muted-foreground text-lg mb-8 leading-relaxed max-w-xl mx-auto">
                        Oh, you reached here! Don't worry, the <strong>AWS Community Day {year}</strong> is currently being heavily organized by our team.<br/><br/>
                        Stay tuned on our socials. This page will be super active once the event is fully announced with early-bird tickets and exclusive speakers!
                    </p>
                    
                    <a href="/">
                        <button className="btn-primary py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(0,194,255,0.2)] hover:shadow-[0_0_30px_rgba(0,194,255,0.4)] transition-all font-black uppercase tracking-[0.2em] text-xs">
                            Return Home
                        </button>
                    </a>
                </div>
            </div>
        );
    }

    return (
        <CommunityDayClient event={event} />
    );
}
