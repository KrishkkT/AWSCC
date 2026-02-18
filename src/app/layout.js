import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "AWS Cloud Club | DDU",
    description: "Official Cloud Club Management Platform for Dharmsinh Desai University",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={cn(inter.className, "min-h-screen bg-brand-dark flex flex-col")}>
                {children}
            </body>
        </html>
    );
}
