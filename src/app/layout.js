
import localFont from "next/font/local";
import { Cinzel, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/utils";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = localFont({
    src: [
        {
            path: "../../public/fonts/AmazonEmber_Lt.ttf",
            weight: "300",
            style: "normal",
        },
        {
            path: "../../public/fonts/AmazonEmber_Rg.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../../public/fonts/AmazonEmber_Md.ttf",
            weight: "500",
            style: "normal",
        },
        {
            path: "../../public/fonts/AmazonEmber_Bd.ttf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-inter",
});

const outfit = localFont({
    src: [
        {
            path: "../../public/fonts/AmazonEmberDisplay_Lt.ttf",
            weight: "300",
            style: "normal",
        },
        {
            path: "../../public/fonts/AmazonEmberDisplay_Rg.ttf",
            weight: "400",
            style: "normal",
        },
        {
            path: "../../public/fonts/AmazonEmberDisplay_Md.ttf",
            weight: "500",
            style: "normal",
        },
        {
            path: "../../public/fonts/AmazonEmberDisplay_Bd.ttf",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-outfit",
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
  metadataBase: new URL('https://aws.ddu.ac.in'),
  title: {
    default: 'AWS Student Builder Group DDU | Cloud Community Nadiad, Gujarat',
    template: '%s | AWS SBG DDU Nadiad',
  },
  description:
    'Official AWS Student Builder Group at Dharmsinh Desai University (DDU), Nadiad, Gujarat. Learn AWS cloud computing, join workshops, attend community events, and build your cloud career.',
  keywords: [
    'AWS DDU', 'AWS DDIT', 'aws ddu', 'aws ddit',
    'AWS Student Builder Group DDU',
    'AWS Student Builder Group Nadiad',
    'AWS Student Community DDU',
    'Dharmsinh Desai University cloud club',
    'DDU Nadiad AWS',
    'DDIT Nadiad cloud computing',
    'cloud computing students Gujarat',
    'AWS community Nadiad',
    'AWS community Gujarat',
    'AWS SBG DDU',
    'AWS Student Community Day Nadiad 2026',
    'SCD DDU 2026',
    'AWS cloud club Nadiad',
    'AWS certification students DDU',
  ],
  authors: [{ name: 'AWS Student Builder Group DDU', url: 'https://aws.ddu.ac.in' }],
  creator: 'AWS Student Builder Group DDU',
  publisher: 'Dharmsinh Desai University',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://aws.ddu.ac.in',
    siteName: 'AWS Student Builder Group DDU',
    title: 'AWS Student Builder Group DDU | Cloud Community Nadiad, Gujarat',
    description:
      'Official AWS Student Builder Group at Dharmsinh Desai University (DDU), Nadiad. Learn AWS, attend events, build cloud skills.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AWS Student Builder Group at Dharmsinh Desai University DDU Nadiad Gujarat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AWS Student Builder Group DDU | Nadiad, Gujarat',
    description: 'Official AWS Student Builder Group at DDU Nadiad. Cloud community for students.',
    images: ['/images/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://aws.ddu.ac.in',
  },
  verification: {
    google: '8b56877f3cf27078',
  },
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "EducationalOrganization",
                            "name": "AWS Student Builder Group DDU",
                            "alternateName": ["AWSCC DDU", "aws ddu", "aws ddit", "aws nadiad", "AWS Cloud Club DDU", "AWS Student Community Nadiad"],
                            "url": "https://aws.ddu.ac.in",
                            "logo": "https://aws.ddu.ac.in/images/og-image.jpg",
                            "description": "The official AWS Student Builder Group at Dharmsinh Desai University (DDU). A student-led cloud community focused on AWS services, cloud computing, and technical skill development.",
                            "parentOrganization": {
                                "@type": "CollegeOrUniversity",
                                "name": "Dharmsinh Desai University",
                                "url": "https://www.ddu.ac.in/"
                            },
                            "address": {
                                "@type": "PostalAddress",
                                "addressLocality": "Nadiad",
                                "addressRegion": "Gujarat",
                                "addressCountry": "IN"
                            },
                            "sameAs": [
                                "https://aws.ddu.ac.in"
                            ]
                        })
                    }}
                />
            </body>
        </html>
    );
}
