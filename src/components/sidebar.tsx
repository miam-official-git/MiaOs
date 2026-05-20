"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Calendar,
  ClipboardList,
  GraduationCap,
  DollarSign,
  MessageCircle,
  BarChart3,
  Settings2,
  Menu,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/", label: "דשבורד", icon: LayoutDashboard },
  { href: "/leads", label: "לידים", icon: Users },
  { href: "/contacts", label: "אנשי קשר", icon: UserCircle },
  { href: "/calendar", label: "יומן", icon: Calendar },
  { href: "/bookings", label: "הזמנות", icon: ClipboardList },
  { href: "/lessons", label: "שיעורים", icon: GraduationCap },
  { href: "/finance", label: "כספים", icon: DollarSign },
  { href: "/simulator", label: "סימולטור", icon: MessageCircle },
  { href: "/reports", label: "דוחות", icon: BarChart3 },
  { href: "/settings", label: "הגדרות", icon: Settings2 },
];

function SidebarContent() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-lg font-bold tracking-tight">Mia-OS</span>
        <button
          onClick={toggleTheme}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Footer - user area */}
      <div className="flex items-center gap-3 p-4">
        <Avatar size="sm">
          <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 truncate text-sm font-medium text-sidebar-foreground">
          {user?.email ?? '...'}
        </span>
        <button
          onClick={signOut}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title="התנתק"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Desktop sidebar - always visible on md+ */
export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0">
      <div className="fixed inset-y-0 start-0 w-60 border-e border-sidebar-border">
        <SidebarContent />
      </div>
    </aside>
  );
}

/** Mobile sidebar - hamburger toggle via Sheet */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground" />
        }
      >
        <Menu className="size-5" />
        <span className="sr-only">תפריט</span>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton className="w-60 p-0 bg-sidebar border-sidebar-border">
        <SheetTitle className="sr-only">תפריט ניווט</SheetTitle>
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

/** Theme toggle for mobile header */
export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
