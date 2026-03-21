
import { Inter, Outfit, Cinzel, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/utils";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
});

const outfit = Outfit({
    subsets: ["latin"],
    variable: '--font-outfit',
});

const cinzel = Cinzel({
    subsets: ["latin"],
    variable: '--font-cinzel',
});

const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: '--font-playfair',
});

export const metadata = {
    metadataBase: new URL("https://awscc-ddu.vercel.app"),
    title: {
        default: "AWS Cloud Club | Dharmsinh Desai University (DDU)",
        template: "%s | AWS Cloud Club DDU"
    },
    description: "Official AWS Cloud Club at Dharmsinh Desai University (DDU), Nadiad. Join the elite community of student cloud builders, learn AWS services, and accelerate your career in cloud computing.",
    keywords: [
        "AWS Cloud Club",
        "AWS Cloud Club DDU",
        "DDU Nadiad",
        "Dharmsinh Desai University",
        "Cloud Computing Student Club",
        "AWS Services",
        "AWS Student Community",
        "DDU Cloud Club",
        "AWS Gujarat",
        "Cloud Builder Community",
        "AWS Certifications",
        "Cloud Workshops",
        "DDU IT Department",
        "AWS Cloud Club Nadiad"
    ],
    authors: [{ name: "AWS Cloud Club DDU", url: "https://awscc-ddu.vercel.app" }],
    creator: "AWS Cloud Club DDU",
    publisher: "AWS Cloud Club DDU",
    robots: {
        index: true,
        follow: true,
        nocache: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: "/",
    },
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    openGraph: {
        title: "AWS Cloud Club | DDU Nadiad",
        description: "Official Student Community for Cloud Innovation at Dharmsinh Desai University (DDU). Accelerate your cloud journey with student builders.",
        url: "/", 
        siteName: "AWS Cloud Club DDU",
        images: [
            {
                url: "/images/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "AWS Cloud Club DDU",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AWS Cloud Club | DDU Nadiad",
        description: "Join the Student Cloud Builder Community at DDU.",
        images: ["/images/og-image.jpg"],
    },
    icons: {
        icon: [
            { url: "/favicon.png" },
            { url: "/favicon.png", sizes: "32x32", type: "image/png" },
            { url: "/favicon.png", sizes: "16x16", type: "image/png" },
        ],
        apple: "/favicon.png",
    },
    category: "technology",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="scroll-smooth" suppressHydrationWarning>
            <body className={cn(
                inter.variable,
                outfit.variable,
                cinzel.variable,
                playfair.variable,
                "font-sans min-h-screen bg-background text-foreground flex flex-col selection:bg-brand-aws/30 relative"
            )}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {/* Global Background Blobs */}
                    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none opacity-50 dark:opacity-100">
                        <div className="absolute top-[20%] left-[-20%] w-[50%] h-[50%] bg-brand-aws/5 dark:bg-brand-aws/5 rounded-full blur-[120px] animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-blue/10 dark:bg-brand-blue/10 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>
                    </div>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
