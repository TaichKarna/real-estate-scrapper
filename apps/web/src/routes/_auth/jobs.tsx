import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Play,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  Building2,
  FileSpreadsheet,
  Globe,
  Activity,
  Layers,
  StopCircle,
  FileText,
  Terminal,
} from "lucide-react";
import { Button } from "@real-estate-scrapper/ui/components/button";
import { Input } from "@real-estate-scrapper/ui/components/input";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/jobs")({
  component: JobsComponent,
});

const JOB_TYPE_LABELS: Record<string, { label: string; icon: typeof Building2; color: string }> = {
  justdial: { label: "Justdial Scraper", icon: Building2, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  rera: { label: "RERA Registry", icon: FileSpreadsheet, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  enrich: { label: "Website Enricher", icon: Globe, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  dedupe: { label: "Deduplication Engine", icon: Layers, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
};

function JobsComponent() {
  const queryClient = useQueryClient();
  const workerStatusQuery = useQuery(trpc.jobs.workerStatus.queryOptions(undefined, { refetchInterval: 10000 }));
  const jobsQuery = useQuery(trpc.jobs.list.queryOptions({}, { refetchInterval: 5000 }));
  const schedulesQuery = useQuery(trpc.jobs.listSchedules.queryOptions());

  const [activeTab, setActiveTab] = useState<"jobs" | "wizard" | "schedules">("jobs");
  const [selectedLogJob, setSelectedLogJob] = useState<any | null>(null);

  const [selectedType, setSelectedType] = useState<"justdial" | "rera" | "enrich" | "dedupe">("justdial");
  const [cityInput, setCityInput] = useState("Pune");
  const [maxResults, setMaxResults] = useState(30);

  // New Schedule State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedName, setSchedName] = useState("Weekly Pune Scrape");
  const [schedCron, setSchedCron] = useState("0 9 * * 1"); // Mondays 9am

  const createJobMutation = useMutation(
    trpc.jobs.create.mutationOptions({
      onSuccess: () => {
        toast.success("Scrape job queued successfully");
        jobsQuery.refetch();
        setActiveTab("jobs");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const cancelJobMutation = useMutation(
    trpc.jobs.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Job cancellation requested");
        jobsQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const createScheduleMutation = useMutation(
    trpc.jobs.createSchedule.mutationOptions({
      onSuccess: () => {
        toast.success("Recurring schedule created!");
        setShowScheduleModal(false);
        schedulesQuery.refetch();
        setActiveTab("schedules");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteScheduleMutation = useMutation(
    trpc.jobs.deleteSchedule.mutationOptions({
      onSuccess: () => {
        toast.success("Schedule removed");
        schedulesQuery.refetch();
      },
    }),
  );

  const handleStartJob = (e: React.FormEvent) => {
    e.preventDefault();
    const citiesArr = cityInput.split(",").map((c) => c.trim()).filter(Boolean);
    if (citiesArr.length === 0) {
      toast.error("Please enter at least one target city");
      return;
    }

    createJobMutation.mutate({
      type: selectedType,
      cities: citiesArr,
      categories: ["Builders & Developers"],
      maxResults,
    });
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const citiesArr = cityInput.split(",").map((c) => c.trim()).filter(Boolean);
    createScheduleMutation.mutate({
      name: schedName,
      type: selectedType,
      cron: schedCron,
      cities: citiesArr,
      maxResults,
    });
  };

  const isWorkerOnline = workerStatusQuery.data?.online ?? false;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Scrape Jobs & Worker Automation
            </h1>
            {/* Worker Heartbeat Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isWorkerOnline
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/20"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isWorkerOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span>{isWorkerOnline ? "Worker Online" : "Worker Offline"}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Schedule and run Playwright web scrapers for Justdial, state RERAs, and lead enrichment
          </p>
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!isWorkerOnline && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-500 flex items-start gap-3 text-xs sm:text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Background Scraper Worker is Offline</span>
            <span>
              To execute queued scrape jobs automatically, start the worker daemon in your terminal with:{" "}
              <code className="bg-background/80 px-1.5 py-0.5 rounded font-mono text-foreground font-semibold">
                npm run dev:worker
              </code>
            </span>
          </div>
        </div>
      )}

      {/* Prominent Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "jobs"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Recent Scrape Jobs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
              {(jobsQuery.data?.items || []).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("wizard")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "wizard"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Launch New Scraper</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "schedules"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Automated Schedules</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
              {(schedulesQuery.data || []).length}
            </span>
          </button>
        </div>

        {activeTab === "jobs" && (
          <Button
            size="xs"
            onClick={() => setActiveTab("wizard")}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Launch New Scrape Job</span>
          </Button>
        )}
      </div>

      {/* Tab Content 1: Recent Scrape Jobs (Default front & center view) */}
      {activeTab === "jobs" && (
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Recent Scrape Jobs</h2>
              <p className="text-xs text-muted-foreground">Live status, progress, and history of worker jobs</p>
            </div>
            <Button variant="ghost" size="xs" onClick={() => jobsQuery.refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          {jobsQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (jobsQuery.data?.items || []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No scrape jobs recorded yet. Click "Launch New Scraper" above to trigger your first job!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Job ID & Type</th>
                    <th className="p-3">Target Params</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Found / New</th>
                    <th className="p-3">Started At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  {(jobsQuery.data?.items || []).map((job) => {
                    const cfg = JOB_TYPE_LABELS[job.type] || { label: job.type, color: "bg-muted text-muted-foreground" };
                    const citiesStr = (job.params as any)?.cities?.join(", ") || "N/A";
                    const pct = Math.min(100, Math.round(job.progress || 0));

                    return (
                      <tr key={job.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedLogJob(job)}>
                        <td className="p-3">
                          <div className="font-mono font-bold text-foreground text-[11px]">{job.id.slice(0, 8)}</div>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <div>Cities: <span className="text-foreground font-semibold">{citiesStr}</span></div>
                          <div className="text-[10px]">Max: {(job.params as any)?.maxResults || 50}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              job.status === "done"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : job.status === "running"
                                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse"
                                  : job.status === "failed"
                                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                    : "bg-slate-500/10 text-slate-400"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          <div>
                            <span className="text-foreground font-bold">{job.foundCount}</span> found
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            <span className="text-emerald-500 font-bold">+{job.newCount}</span> new
                            {job.updatedCount > 0 && <span> · <span className="text-primary font-bold">{job.updatedCount}</span> enriched</span>}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-[11px]">
                          {job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : "-"}
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedLogJob(job)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Logs</span>
                            </Button>
                            {(job.status === "queued" || job.status === "running") && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-rose-500 hover:text-rose-600 gap-1 text-[11px]"
                                onClick={() => cancelJobMutation.mutate({ id: job.id })}
                              >
                                <StopCircle className="h-3.5 w-3.5" />
                                <span>Cancel</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Scrape Wizard */}
      {activeTab === "wizard" && (
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>New Scrape Wizard</span>
            </h2>
            <p className="text-xs text-muted-foreground">Configure and trigger a new lead generation job</p>
          </div>

          <form onSubmit={handleStartJob} className="space-y-5">
            {/* Source Selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Data Source
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["justdial", "rera", "enrich", "dedupe"] as const).map((typeKey) => {
                  const cfg = JOB_TYPE_LABELS[typeKey];
                  const Icon = cfg.icon;
                  const isSelected = selectedType === typeKey;
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setSelectedType(typeKey)}
                      className={`p-3 rounded-lg border text-left flex flex-col gap-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "border-border/50 bg-background/50 hover:border-border text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-semibold">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Cities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Target Cities / State
                </label>
                <Input
                  type="text"
                  placeholder="Pune, Mumbai, Bengaluru..."
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">Comma-separated city names</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Max Listings
                  </label>
                  <div className="flex items-center gap-1">
                    {[50, 100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMaxResults(preset)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                          maxResults === preset
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min={5}
                    max={1000}
                    step={25}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <Input
                    type="number"
                    min={5}
                    max={1000}
                    value={maxResults}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxResults(isNaN(val) ? 50 : Math.min(1000, Math.max(5, val)));
                    }}
                    className="w-20 h-8 text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="sm" className="gap-2" disabled={createJobMutation.isPending}>
                <Play className="h-4 w-4 fill-current" />
                <span>Start Scrape Job Now</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowScheduleModal(true)}
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule Recurring</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content 3: Automated Schedules */}
      {activeTab === "schedules" && (
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs max-w-2xl space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span>Automated Schedules</span>
              </h2>
              <p className="text-xs text-muted-foreground">Cron-based recurring lead pulls</p>
            </div>
            <Button size="xs" onClick={() => setShowScheduleModal(true)} className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>New Schedule</span>
            </Button>
          </div>

          {schedulesQuery.isLoading ? (
            <div className="h-32 rounded-lg bg-muted/20 animate-pulse" />
          ) : (schedulesQuery.data || []).length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
              No active schedules set. Click "New Schedule" to run scrapes every week.
            </div>
          ) : (
            <div className="space-y-3">
              {(schedulesQuery.data || []).map((sched) => (
                <div key={sched.id} className="p-3 rounded-lg border border-border/50 bg-background/50 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold">{sched.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Cron: {sched.cron}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-rose-500 hover:text-rose-600"
                    onClick={() => deleteScheduleMutation.mutate({ id: sched.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Log Viewer Modal */}
      {selectedLogJob && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedLogJob(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-primary" />
                  <span>Job Logs: {selectedLogJob.id.slice(0, 8)}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {JOB_TYPE_LABELS[selectedLogJob.type]?.label || selectedLogJob.type} · Status:{" "}
                  <span className="font-bold text-foreground uppercase">{selectedLogJob.status}</span>
                </p>
              </div>
              <Button variant="ghost" size="xs" onClick={() => setSelectedLogJob(null)}>
                ✕
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 bg-background/80 p-3 rounded-lg font-mono text-xs border border-border/50 max-h-[50vh]">
              {(selectedLogJob.log || []).length === 0 ? (
                <div className="text-muted-foreground text-center py-6">No logs recorded for this job.</div>
              ) : (
                (selectedLogJob.log as any[]).map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-0.5 leading-relaxed">
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(entry.at).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-1 rounded text-[9px] font-bold shrink-0 uppercase ${
                        entry.level === "error"
                          ? "bg-rose-500/20 text-rose-400"
                          : entry.level === "warn"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {entry.level}
                    </span>
                    <span className="text-foreground break-all">{entry.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border/40">
              <span>
                Found: <b className="text-foreground">{selectedLogJob.foundCount}</b> | New:{" "}
                <b className="text-emerald-500">+{selectedLogJob.newCount}</b>
              </span>
              <Button size="xs" variant="outline" onClick={() => setSelectedLogJob(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">New Recurring Schedule</h3>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Schedule Name</label>
                <Input
                  type="text"
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Cron Expression</label>
                <Input
                  type="text"
                  value={schedCron}
                  onChange={(e) => setSchedCron(e.target.value)}
                  className="h-9 text-xs font-mono"
                  placeholder="0 9 * * 1"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Example: <code>0 9 * * 1</code> (Every Monday at 9:00 AM)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
