import { Link, useLocation } from "wouter";
import { Bot, Phone, Activity, Settings, LayoutDashboard, Menu, X, BookOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApiKey } from "@/hooks/use-api-keys";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { hasKey } = useApiKey();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agents", label: "Agents", icon: Bot },
    { href: "/knowledgebase", label: "Knowledge Base", icon: BookOpen },
    { href: "/calls", label: "Phone Calls", icon: Phone },
    { href: "/executions", label: "History", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          Bolna.ai
        </h1>
        <p className="text-xs text-slate-400 mt-1">Nectar Innovations</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-primary text-white shadow-lg shadow-primary/25" 
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}>
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={cn(
          "px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2",
          hasKey ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        )}>
          <div className={cn("w-2 h-2 rounded-full", hasKey ? "bg-green-400" : "bg-red-400")} />
          {hasKey ? "API Connected" : "No API Key"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-border shadow-xl shadow-slate-200/50 z-10">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
        isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
        <div className={cn(
          "absolute inset-y-0 left-0 w-64 bg-slate-900 transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <NavContent />
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border bg-white flex items-center px-4 justify-between">
          <h1 className="text-lg font-display font-bold text-slate-900">Bolna.ai</h1>
          <button onClick={() => setIsMobileOpen(true)} className="p-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
