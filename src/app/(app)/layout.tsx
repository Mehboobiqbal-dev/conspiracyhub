'use client';
import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { Logo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Echo Chamber Simulator',
    '/analytics': 'Personal Analytics',
    '/arenas': 'Multiplayer Arenas',
    '/tournaments': 'Global Tournaments',
    '/time-capsule': 'Opinion Time Capsule',
    '/moderation': 'AI-Assisted Moderation',
    '/report': 'Meme Report'
};

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const pageTitle = Object.keys(pageTitles).find(key => pathname.startsWith(key));
    const title = pageTitle ? pageTitles[pageTitle] : 'Opinion Arena Network';
    const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar-1');

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-3">
                        <Logo className="size-8 text-primary" />
                        <span className="font-headline text-xl text-sidebar-foreground">OAN</span>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarNav />
                </SidebarContent>
                <SidebarFooter>
                    <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                            {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt="User Avatar" data-ai-hint={userAvatar.imageHint}/>}
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-sidebar-foreground">Demo User</span>
                            <span className="text-xs text-sidebar-foreground/70">user@oan.com</span>
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header className="flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                         <SidebarTrigger className="md:hidden" />
                         <h1 className="font-headline text-xl">{title}</h1>
                    </div>
                    {/* Placeholder for future header actions */}
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
