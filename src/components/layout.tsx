import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu, X, BookText } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>

        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookText className="size-4" />
          </span>
          <span>Documentação Max</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full">
        {/* Sidebar desktop */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-sidebar-border lg:block">
          <Sidebar />
        </aside>

        {/* Drawer mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className={cn(
                "absolute left-0 top-14 h-[calc(100vh-3.5rem)] w-72 border-r border-sidebar-border shadow-xl",
              )}
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Conteúdo */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
