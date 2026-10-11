import { Link } from "@tanstack/react-router";
import { Building2, Phone, LayoutDashboard, Users, Bot, CopyCheck } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/leads", label: "Leads", icon: Users },
    { to: "/jobs", label: "Scrape Jobs", icon: Bot },
    { to: "/leads/duplicates", label: "Duplicates", icon: CopyCheck },
  ] as const;


  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-foreground hover:opacity-90 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="hidden font-bold sm:inline-block text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              LeadEngine
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{
                  className: "bg-muted text-foreground font-semibold shadow-xs",
                }}
                inactiveProps={{
                  className: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs sm:text-sm"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
