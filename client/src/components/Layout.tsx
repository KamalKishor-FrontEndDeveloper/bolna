import { Link, useLocation } from "wouter";
import { Bot, Phone, Activity, Settings, LayoutDashboard, Menu, X, BookOpen, Layers, LogOut, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApiKey } from "@/hooks/use-api-keys";
import { useAuth } from "@/contexts/AuthContext";import { useToast } from '@/hooks/use-toast';
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
    { href: "/batches", label: "Batches", icon: Layers },
    { href: "/phone-numbers", label: "Phone Numbers", icon: Phone },
    { href: "/calls", label: "Phone Calls", icon: Phone },
    { href: "/executions", label: "History", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const NavContent = () => {
    const { logout, user, wallet, tierPlan } = useAuth();
    
    return (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="p-6">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ThinkVoicelogo - AI voice assistant platform" className="h-14 w-auto" />
            </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-[#FAF5FF] text-[#5B2E91] font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}>
              <item.icon className={cn("w-5 h-5", isActive ? "text-[#5B2E91]" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-4">
        <div className="p-4 rounded-xl border border-orange-100/50" style={{ background: 'linear-gradient(90deg, #D7B4F1 0%, #F6E4C0 100%)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-900/80">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium">Wallet Balance</span>
            </div>
            {tierPlan && (
              <span className="text-[10px] font-bold tracking-wider text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-orange-100 uppercase">{tierPlan}</span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900">₹{wallet.toFixed(2)}</div>
        </div>

        <div className="flex items-center gap-3 px-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/workspace'}>
           <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
              {user?.name?.charAt(0) || 'U'}
           </div>
           <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
           </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>


    </div>
    );
  };

  function ImpersonationBanner() {
    const auth = useAuth();
    const isImpersonating = (auth as Partial<{ isImpersonating: boolean }>).isImpersonating ?? false;
    const { toast } = useToast();

    if (!isImpersonating) return null;

    const stop = async () => {
      try {
        const token = localStorage.getItem('token');
        // Tell server to record impersonation end
        await fetch('/api/super-admin/impersonation/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({})
        });
      } catch (err) {
        // ignore server errors
      }

      const prev = localStorage.getItem('prev_token');
      if (prev) {
        localStorage.setItem('token', prev);
        localStorage.removeItem('prev_token');
        toast({ title: 'Stopped impersonation', description: 'Session restored.' });
        window.location.href = '/super-admin';
      } else {
        toast({ title: 'Stopped impersonation', description: 'No previous session found. Please sign in.' });
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    };

    return (
      <div className="rounded-md p-3 bg-yellow-50 border border-yellow-200 text-yellow-900 flex items-center justify-between">
        <div>You are impersonating a tenant account. Actions you take will be as that tenant.</div>
        <div>
          <button onClick={stop} className="px-3 py-1 rounded bg-yellow-200 hover:bg-yellow-300">Stop Impersonation</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <aside className="hidden lg:flex lg:flex-col w-64 h-full border-r bg-card shadow-sm z-10">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden transition-opacity duration-300",
        isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
        <div className={cn(
          "absolute inset-y-0 left-0 w-64 bg-card transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <NavContent />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="lg:hidden h-16 border-b bg-card flex items-center px-4 justify-between">
          <h1 className="text-lg font-bold">Bolna</h1>
          <button onClick={() => setIsMobileOpen(true)} className="p-2">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
            <ImpersonationBanner />
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
