import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export const metadata = {
    title: "Admin Portal | AWS Cloud Club",
    description: "Secure Management Portal",
};

export default function AdminLayout({ children }) {
    return (
        <div className="min-h-screen bg-brand-dark flex overflow-hidden">
            {/* Sidebar (Desktop) */}
            <AdminSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative lg:ml-[72px]">
                {/* Background Animation Layers */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-brand-aws/5 rounded-full blur-[120px] animate-pulse-slow"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-[120px] animate-pulse-slow delay-700"></div>
                    <div className="absolute inset-0 bg-slate-grid opacity-[0.03]"></div>
                </div>

                <AdminTopBar />

                <main className="flex-1 p-6 lg:p-12 relative z-10">
                    <AdminLayoutClient>
                        {children}
                    </AdminLayoutClient>
                </main>
            </div>
        </div>
    );
}
