import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  MapPin,
  Sparkles,
  ArrowRight,
  PhoneCall,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bot,
} from "lucide-react";
import { Button } from "@real-estate-scrapper/ui/components/button";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardComponent,
});

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  new: { label: "New Leads", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", icon: Sparkles },
  contacted: { label: "Contacted", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20", icon: PhoneCall },
  interested: { label: "Interested", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  follow_up: { label: "Follow-up", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock },
  not_interested: { label: "Not Interested", color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20", icon: XCircle },
  bad_data: { label: "Bad Data", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20", icon: HelpCircle },
};

function DashboardComponent() {
  const { session } = Route.useRouteContext();
  const statsQuery = useQuery(trpc.stats.overview.queryOptions());

  const data = statsQuery.data;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {session.data?.user?.name || "Team"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real Estate Builder Lead Intelligence & Outreach Engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leads" search={{}}>
            <Button size="sm" className="gap-2 shadow-xs">

              <Users className="h-4 w-4" />
              <span>Browse Leads</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </Link>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-border/50 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Builders</span>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight">{data.totalLeads}</span>
                <span className="text-xs text-muted-foreground font-medium">Pan-India</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New This Week</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-blue-500">+{data.newThisWeek}</span>
                <span className="text-xs text-emerald-500 font-medium font-mono">Justdial & RERA</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Follow-ups Due</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <CalendarCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-amber-500">{data.followUpsDue}</span>
                <span className="text-xs text-muted-foreground font-medium">Needs Action</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Projects</span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold tracking-tight text-purple-500">{data.totalProjects}</span>
                <span className="text-xs text-muted-foreground font-medium">Verified RERA</span>
              </div>
            </div>
          </div>

          {/* Pipeline Breakdown & Cities */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Lead Status Pipeline */}
            <div className="md:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Outreach Pipeline</h2>
                  <p className="text-xs text-muted-foreground">Distribution of builder leads across sales stages</p>
                </div>
                <Link to="/leads" search={{}}>
                  <Button variant="ghost" size="xs" className="gap-1 text-xs">

                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex my-4">
                {Object.entries(data.statusCounts).map(([status, count]) => {
                  if (count === 0 || data.totalLeads === 0) return null;
                  const pct = (count / data.totalLeads) * 100;
                  const bgClass =
                    status === "new"
                      ? "bg-blue-500"
                      : status === "contacted"
                        ? "bg-purple-500"
                        : status === "interested"
                          ? "bg-emerald-500"
                          : status === "follow_up"
                            ? "bg-amber-500"
                            : status === "not_interested"
                              ? "bg-slate-400"
                              : "bg-rose-400";
                  return (
                    <div
                      key={status}
                      style={{ width: `${pct}%` }}
                      className={`${bgClass} transition-all duration-300`}
                      title={`${STATUS_CONFIG[status]?.label}: ${count} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>

              {/* Status Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                  const count = data.statusCounts[statusKey] || 0;
                  const Icon = config.icon;
                  return (
                    <Link
                      key={statusKey}
                      to="/leads"
                      search={{ status: statusKey as any }}
                      className={`p-3 rounded-lg border ${config.bg} transition-all hover:scale-[1.02] flex items-center justify-between`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                        <div className="text-xl font-bold">{count}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Top Builder Markets */}
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Top Builder Hubs</h2>
                    <p className="text-xs text-muted-foreground">Highest lead density cities</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.topCities.map((cityData) => {
                    const maxCount = data.topCities[0]?.count || 1;
                    const pct = (cityData.count / maxCount) * 100;
                    return (
                      <Link
                        key={cityData.city}
                        to="/leads"
                        search={{ city: cityData.city }}
                        className="group flex flex-col gap-1 text-sm hover:opacity-90"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {cityData.city}
                          </span>
                          <span className="font-mono text-muted-foreground font-medium">{cityData.count} builders</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
