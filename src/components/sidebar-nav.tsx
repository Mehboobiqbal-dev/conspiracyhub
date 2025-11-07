'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
    Gauge,
    MessageSquareQuote,
    Swords,
    Trophy,
    Hourglass,
    ShieldCheck,
} from "lucide-react";

const navItems = [
    {
        href: "/dashboard",
        icon: MessageSquareQuote,
        label: "Simulator",
    },
    {
        href: "/arenas",
        icon: Swords,
        label: "Arenas",
    },
    {
        href: "/tournaments",
        icon: Trophy,
        label: "Tournaments",
    },
    {
        href: "/time-capsule",
        icon: Hourglass,
        label: "Time Capsule",
    },
    {
        href: "/analytics",
        icon: Gauge,
        label: "Analytics",
    },
    {
        href: "/moderation",
        icon: ShieldCheck,
        label: "Moderation",
    },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        <SidebarMenu>
            {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={item.label}
                        className="text-base"
                    >
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}
