import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";

export const metadata = {
    title: "Admin Portal | AWS Cloud Club",
    description: "Secure Management Portal",
};

export default function AdminLayout({ children }) {
    return (
        <div className="h-screen bg-brand-dark flex overflow-hidden">
            <AdminSidebar />
            <div className="flex-grow flex flex-col h-screen lg:ml-[72px] transition-all duration-300 relative overflow-hidden">
                <AdminTopBar />
                <main className="flex-grow p-6 lg:p-10 relative overflow-y-auto no-scrollbar scroll-smooth">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none z-0"></div>
                    <div className="relative z-10 max-w-7xl mx-auto h-full pb-24">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

