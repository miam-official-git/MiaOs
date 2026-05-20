import { DesktopSidebar, MobileSidebar, ThemeToggleButton } from "@/components/sidebar";
import { AuthProvider } from "@/components/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { ThemeProvider } from "@/components/theme-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <ThemeProvider>
        <div className="flex min-h-screen">
          {/* Main content area - takes remaining space */}
          <main className="flex-1 overflow-x-hidden md:ms-60">
            {/* Mobile header */}
            <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm md:hidden">
              <ThemeToggleButton />
              <span className="flex-1 text-sm font-bold text-foreground">Mia-OS</span>
              <MobileSidebar />
            </header>

            <div className="p-4 md:p-6">{children}</div>
          </main>

          {/* Desktop sidebar - fixed on the right (RTL end) */}
          <DesktopSidebar />
        </div>
        </ThemeProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
