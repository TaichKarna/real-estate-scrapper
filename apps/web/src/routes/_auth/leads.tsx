import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Search,
  Filter,
  PhoneCall,
  ExternalLink,
  MapPin,
  Calendar,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Sparkles,
  Award,
  Globe,
  Mail,
  User,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
  Download,
  CopyCheck,
  Link2,
  FileSpreadsheet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@real-estate-scrapper/ui/components/button";
import { Input } from "@real-estate-scrapper/ui/components/input";
import { toast } from "sonner";
import z from "zod";

import { trpc, trpcClient } from "@/utils/trpc";

const searchSchema = z.object({
  status: z.enum(["new", "contacted", "interested", "follow_up", "not_interested", "bad_data"]).optional(),
  type: z.enum([
    "Builder / Developer",
    "Real Estate Agent",
    "Rental Agent",
    "Plot / Land Dealer",
    "Property Consultant",
  ]).optional(),
  city: z.string().optional(),
  source: z.enum(["justdial", "rera", "website", "google", "seed", "manual"]).optional(),
  search: z.string().optional(),
  page: z.number().optional(),
});


export const Route = createFileRoute("/_auth/leads")({
  validateSearch: (search) => searchSchema.parse(search),
  component: LeadsComponent,
});

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  new: { label: "New", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500" },
  contacted: { label: "Contacted", bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-500" },
  interested: { label: "Interested", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500" },
  follow_up: { label: "Follow-up", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500" },
  not_interested: { label: "Not Interested", bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-400" },
  bad_data: { label: "Bad Data", bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-500" },
};

const TYPE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  "Builder / Developer": { label: "Builder / Dev", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500" },
  "Real Estate Agent": { label: "Agent / Broker", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500" },
  "Rental Agent": { label: "Rental Agent", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500" },
  "Plot / Land Dealer": { label: "Plot & Land", bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-500" },
  "Property Consultant": { label: "Consultant", bg: "bg-cyan-500/10 border-cyan-500/20", text: "text-cyan-500" },
};

function LeadsComponent() {
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const [searchInput, setSearchInput] = useState(searchParams.search || "");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>(searchParams.status || "all");
  const [isExporting, setIsExporting] = useState(false);

  const queryParams = {
    search: searchParams.search,
    type: searchParams.type,
    status: activeTab === "all" ? undefined : (activeTab as any),
    city: searchParams.city,
    source: searchParams.source,
    page: searchParams.page || 1,
    limit: 20,
  };

  const leadsQuery = useQuery(trpc.leads.list.queryOptions(queryParams));
  const filterOptsQuery = useQuery(trpc.leads.filterOptions.queryOptions());
  const selectedLeadQuery = useQuery({
    ...trpc.leads.byId.queryOptions({ id: selectedLeadId || "" }),
    enabled: Boolean(selectedLeadId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: trpc.leads.update.mutationOptions().mutationFn,
    onSuccess: () => {
      toast.success("Lead status updated");
      leadsQuery.refetch();
      if (selectedLeadId) selectedLeadQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const addNoteMutation = useMutation({
    mutationFn: trpc.leads.addNote.mutationOptions().mutationFn,
    onSuccess: () => {
      toast.success("Note added");
      selectedLeadQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: trpc.leads.bulkUpdateStatus.mutationOptions().mutationFn,
    onSuccess: (data) => {
      toast.success(`Updated ${data.count} leads`);
      setSelectedIds([]);
      leadsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const exportExcelMutation = useMutation(trpc.leads.exportExcel.mutationOptions());

  const [newNote, setNewNote] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({ ...prev, search: searchInput || undefined, page: 1 }),
    });
  };

  const toggleSelectAll = () => {
    if (!leadsQuery.data) return;
    if (selectedIds.length === leadsQuery.data.items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leadsQuery.data.items.map((item) => item.id));
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const requestCallMutation = useMutation({
    mutationFn: trpc.calls.request.mutationOptions().mutationFn,
  });

  const handleCallClick = (
    phone: string,
    name: string,
    leadId?: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    if (leadId) {
      requestCallMutation.mutate({ leadId, phone });
    }
    window.location.href = `tel:${phone}`;
    toast.info(`Dialing ${name} (${phone})`);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Search & Tabs Header */}
      <div className="border-b border-border/40 bg-card/50 p-4 space-y-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Builder Leads</h1>
              <p className="text-xs text-muted-foreground">
                {leadsQuery.data?.total ?? 0} leads found across India
              </p>
            </div>
          </div>

          {/* Search Bar & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search builder, phone, city..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-9">
                Search
              </Button>
            </form>

            <Link to="/leads/duplicates">
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
                <CopyCheck className="h-3.5 w-3.5 text-amber-500" />
                <span>Duplicates</span>
              </Button>
            </Link>

            <Button
              size="sm"
              disabled={isExporting || exportExcelMutation.isPending}
              className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
              onClick={async () => {
                try {
                  setIsExporting(true);
                  toast.info("Generating Excel workbook on backend...");

                  const res = await exportExcelMutation.mutateAsync({
                    search: searchParams.search,
                    type: searchParams.type,
                    status: activeTab === "all" ? undefined : (activeTab as any),
                    city: searchParams.city,
                    source: searchParams.source,
                  });

                  if (res.count === 0) {
                    toast.error("No leads to export");
                    return;
                  }

                  const byteCharacters = atob(res.base64);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = res.filename;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${res.count} leads to Excel (${res.filename})!`);
                } catch (err: any) {
                  toast.error(`Export failed: ${err.message}`);
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>{isExporting || exportExcelMutation.isPending ? "Generating..." : "Export Excel"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isExporting}
              className="h-9 gap-1.5 text-xs"
              onClick={async () => {
                try {
                  setIsExporting(true);
                  const res = await trpcClient.leads.list.query({
                    search: searchParams.search,
                    type: searchParams.type,
                    status: activeTab === "all" ? undefined : (activeTab as any),
                    city: searchParams.city,
                    source: searchParams.source,
                    limit: 2000,
                    page: 1,
                    sortBy: "score",
                    sortOrder: "desc",
                  });

                  const items = res.items || [];
                  if (items.length === 0) {
                    toast.error("No leads to export");
                    return;
                  }

                  const headers = [
                    "Company Name",
                    "Type",
                    "Score",
                    "Status",
                    "Contact Person",
                    "Primary Phone",
                    "All Phones",
                    "Emails",
                    "Website",
                    "Website Domain",
                    "Full Address",
                    "Locality",
                    "City",
                    "State",
                    "Pincode",
                    "RERA Numbers",
                    "Active Projects",
                    "Total Projects",
                    "Rating",
                    "Review Count",
                    "Categories",
                    "Sources",
                    "Notes",
                    "Created Date",
                  ];

                  const rows = items.map((l) => [
                    `"${(l.name || "").replace(/"/g, '""')}"`,
                    `"${(l.type || "Real Estate Agent").replace(/"/g, '""')}"`,
                    l.score || 0,
                    `"${l.status || "new"}"`,
                    `"${(l.contactPerson || "").replace(/"/g, '""')}"`,
                    `"${l.primaryPhone || ""}"`,
                    `"${(l.phones || []).join("; ").replace(/"/g, '""')}"`,
                    `"${(l.emails || []).join("; ").replace(/"/g, '""')}"`,
                    `"${l.website || ""}"`,
                    `"${(l as any).websiteDomain || ""}"`,
                    `"${(l.address || "").replace(/"/g, '""')}"`,
                    `"${(l.locality || "").replace(/"/g, '""')}"`,
                    `"${(l.city || "").replace(/"/g, '""')}"`,
                    `"${(l.state || "").replace(/"/g, '""')}"`,
                    `"${l.pincode || ""}"`,
                    `"${(l.reraNumbers || []).join("; ")}"`,
                    l.activeProjectCount || 0,
                    l.projectCount || 0,
                    l.rating || "",
                    l.reviewCount || 0,
                    `"${(l.categories || []).join("; ").replace(/"/g, '""')}"`,
                    `"${(l.sources || []).join("; ")}"`,
                    `"${(l.notes || "").replace(/"/g, '""')}"`,
                    `"${new Date(l.createdAt).toLocaleDateString("en-IN")}"`,
                  ]);

                  // Include UTF-8 BOM so Excel opens special characters and commas seamlessly
                  const csvStr = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
                  const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `RealEstate_Leads_${new Date().toISOString().split("T")[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${items.length} leads to CSV`);
                } catch (err: any) {
                  toast.error(`CSV export failed: ${err.message}`);
                } finally {
                  setIsExporting(false);
                }
              }}
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>
          </div>
        </div>


        {/* Status Tabs & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => {
                setActiveTab("all");
                navigate({ search: (p) => ({ ...p, status: undefined, page: 1 }) });
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All Leads
            </button>
            {Object.entries(STATUS_BADGES).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  navigate({ search: (p) => ({ ...p, status: key as any, page: 1 }) });
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === key
                    ? `${config.bg} ${config.text} font-bold border`
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>

          {/* Filters dropdowns */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={searchParams.type || ""}
              onChange={(e) =>
                navigate({
                  search: (p) => ({ ...p, type: (e.target.value as any) || undefined, page: 1 }),
                })
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
            >
              <option value="">All Types</option>
              {filterOptsQuery.data?.types?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={searchParams.city || ""}
              onChange={(e) =>
                navigate({
                  search: (p) => ({ ...p, city: e.target.value || undefined, page: 1 }),
                })
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Cities</option>
              {filterOptsQuery.data?.cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={searchParams.source || ""}
              onChange={(e) =>
                navigate({
                  search: (p) => ({ ...p, source: (e.target.value as any) || undefined, page: 1 }),
                })
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Sources</option>
              {filterOptsQuery.data?.sources.map((src) => (
                <option key={src} value={src}>
                  {src.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table + Side Drawer container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-auto">
          {/* Bulk Action Bar (when selected) */}
          {selectedIds.length > 0 && (
            <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-primary">
                {selectedIds.length} lead(s) selected
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Set Status:</span>
                {Object.entries(STATUS_BADGES).map(([statusKey, config]) => (
                  <Button
                    key={statusKey}
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      bulkStatusMutation.mutate({
                        leadIds: selectedIds,
                        status: statusKey as any,
                      })
                    }
                    className="h-6 text-[10px]"
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {leadsQuery.isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 w-full rounded-md bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : leadsQuery.data?.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-bold text-base">No builder leads found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Try adjusting your search query, city filters, or status tabs to view leads.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-[10px] tracking-wider z-10">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length === leadsQuery.data?.items.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-input"
                    />
                  </th>
                  <th className="p-3">Builder / Company</th>
                  <th className="p-3">Contact Person</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">City & Location</th>
                  <th className="p-3">Sources</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {leadsQuery.data?.items.map((lead) => {
                  const statusConfig = STATUS_BADGES[lead.status] || STATUS_BADGES.new;
                  const isSelected = selectedLeadId === lead.id;
                  const isChecked = selectedIds.includes(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                      } ${isChecked ? "bg-muted/20" : ""}`}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectLead(lead.id, e as any)}
                          className="rounded border-input"
                        />
                      </td>

                      {/* Builder Name & Type */}
                      <td className="p-3">
                        <div className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{lead.name}</span>
                          {lead.type && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                TYPE_BADGES[lead.type]?.bg || "bg-muted text-muted-foreground border-border"
                              } ${TYPE_BADGES[lead.type]?.text || "text-foreground"}`}
                            >
                              {TYPE_BADGES[lead.type]?.label || lead.type}
                            </span>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={lead.website}
                              className="text-primary/70 hover:text-primary"
                            >
                              <Globe className="h-3 w-3" />
                            </a>
                          )}
                          {lead.activeProjectCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-500 font-medium">
                              {lead.activeProjectCount} proj
                            </span>
                          )}
                        </div>
                        {lead.categories.length > 0 && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-xs mt-0.5">
                            {lead.categories.slice(0, 2).join(" • ")}
                          </div>
                        )}
                      </td>

                      {/* Contact Person */}
                      <td className="p-3 text-muted-foreground">
                        {lead.contactPerson ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-primary/70 shrink-0" />
                            <span>{lead.contactPerson}</span>
                          </div>
                        ) : (
                          <span className="italic opacity-50">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="p-3 font-mono font-medium">
                        {lead.primaryPhone || (lead.phones && lead.phones.length > 0) ? (
                          <div className="flex items-center gap-1.5">
                            <span>{lead.primaryPhone || lead.phones[0]}</span>
                            <button
                              onClick={(e) =>
                                handleCallClick(
                                  (lead.primaryPhone || lead.phones[0])!,
                                  lead.name,
                                  lead.id,
                                  e,
                                )
                              }
                              className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                              title="Call Builder"
                            >
                              <PhoneCall className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>

                      {/* City */}
                      <td className="p-3">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{lead.city || "—"}</span>
                        </div>
                        {lead.locality && (
                          <div className="text-[10px] text-muted-foreground pl-4">
                            {lead.locality}
                          </div>
                        )}
                      </td>

                      {/* Sources */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.sources.map((src) => (
                            <span
                              key={src}
                              className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-muted text-muted-foreground border border-border"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="p-3 font-mono">
                        <span
                          className={`font-bold ${
                            lead.score >= 85
                              ? "text-emerald-500"
                              : lead.score >= 70
                                ? "text-amber-500"
                                : "text-slate-400"
                          }`}
                        >
                          {lead.score}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              id: lead.id,
                              status: e.target.value as any,
                            })
                          }
                          className={`px-2 py-1 rounded text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} focus:outline-none`}
                        >
                          {Object.entries(STATUS_BADGES).map(([k, cfg]) => (
                            <option key={k} value={k}>
                              {cfg.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination Footer */}
          {leadsQuery.data && leadsQuery.data.totalPages > 1 && (
            <div className="border-t border-border p-3 flex items-center justify-between text-xs bg-card/30">
              <span className="text-muted-foreground">
                Page {leadsQuery.data.page} of {leadsQuery.data.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={leadsQuery.data.page <= 1}
                  onClick={() =>
                    navigate({ search: (p) => ({ ...p, page: (p.page || 1) - 1 }) })
                  }
                >
                  <ChevronLeft className="h-3 w-3" />
                  <span>Prev</span>
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={leadsQuery.data.page >= leadsQuery.data.totalPages}
                  onClick={() =>
                    navigate({ search: (p) => ({ ...p, page: (p.page || 1) + 1 }) })
                  }
                >
                  <span>Next</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Lead Detail Drawer (Side Drawer) */}
        {selectedLeadId && (
          <div className="w-96 border-l border-border bg-card flex flex-col h-full shadow-lg z-20 shrink-0">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lead Details
              </span>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedLeadQuery.isLoading ? (
              <div className="p-6 space-y-4">
                <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-20 rounded bg-muted animate-pulse" />
              </div>
            ) : selectedLeadQuery.data ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Builder Header */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg font-bold text-foreground">
                      {selectedLeadQuery.data.name}
                    </h2>
                    {selectedLeadQuery.data.type && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          TYPE_BADGES[selectedLeadQuery.data.type]?.bg || "bg-muted text-muted-foreground border-border"
                        } ${TYPE_BADGES[selectedLeadQuery.data.type]?.text || "text-foreground"}`}
                      >
                        {selectedLeadQuery.data.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {selectedLeadQuery.data.locality
                        ? `${selectedLeadQuery.data.locality}, ${selectedLeadQuery.data.city}`
                        : selectedLeadQuery.data.city}
                    </span>
                  </p>
                </div>

                {/* Primary Contact Actions */}
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                  <div className="text-xs font-semibold text-emerald-500 flex items-center justify-between">
                    <span>Contact Info</span>
                    <span className="font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      Score: {selectedLeadQuery.data.score}/100
                    </span>
                  </div>

                  {selectedLeadQuery.data.contactPerson && (
                    <div className="text-xs flex items-center gap-1.5 text-foreground">
                      <User className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-medium">{selectedLeadQuery.data.contactPerson}</span>
                    </div>
                  )}

                  {selectedLeadQuery.data.primaryPhone && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="font-mono text-xs font-bold">
                        {selectedLeadQuery.data.primaryPhone}
                      </span>
                      <Button
                        size="xs"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() =>
                          handleCallClick(
                            selectedLeadQuery.data.primaryPhone!,
                            selectedLeadQuery.data.name,
                            selectedLeadQuery.data.id,
                          )
                        }
                      >
                        <PhoneCall className="h-3 w-3" />
                        <span>Call</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status & Follow-up controls */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Update Pipeline Status
                  </label>
                  <select
                    value={selectedLeadQuery.data.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({
                        id: selectedLeadQuery.data.id,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:outline-none"
                  >
                    {Object.entries(STATUS_BADGES).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Additional Info */}
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Company Details
                  </div>
                  {selectedLeadQuery.data.emails.length > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span>{selectedLeadQuery.data.emails.join(", ")}</span>
                    </div>
                  )}
                  {selectedLeadQuery.data.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <a
                        href={selectedLeadQuery.data.website.startsWith("http") ? selectedLeadQuery.data.website : `https://${selectedLeadQuery.data.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline flex items-center gap-1 font-medium"
                      >
                        <span>{selectedLeadQuery.data.website.replace(/^https?:\/\//i, "")}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}
                  {selectedLeadQuery.data.sourcesRows?.map((src) =>
                    src.sourceUrl ? (
                      <div key={src.id} className="flex items-center gap-2 text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline flex items-center gap-1 capitalize"
                        >
                          <span>{src.source} Detail Profile</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    ) : null,
                  )}
                </div>

                {/* RERA Projects */}
                {selectedLeadQuery.data.projects.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                      Verified RERA Projects ({selectedLeadQuery.data.projects.length})
                    </div>
                    <div className="space-y-1.5">
                      {selectedLeadQuery.data.projects.map((p) => (
                        <div key={p.id} className="p-2.5 rounded border border-border bg-muted/20 text-xs">
                          <div className="font-semibold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground flex justify-between mt-1">
                            <span>Status: {p.projectStatus || "Ongoing"}</span>
                            <span>{p.reraNumber}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity & Notes */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Activity & Notes
                  </div>

                  {/* Add note input */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add a call note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      size="xs"
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      onClick={() => {
                        addNoteMutation.mutate({
                          leadId: selectedLeadQuery.data.id,
                          body: newNote.trim(),
                        });
                        setNewNote("");
                      }}
                    >
                      Save
                    </Button>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedLeadQuery.data.activities.map((act) => (
                      <div key={act.id} className="p-2 rounded bg-muted/30 border border-border/40 text-[11px]">
                        <div className="text-foreground">{act.body}</div>
                        <div className="text-[9px] text-muted-foreground mt-1">
                          {new Date(act.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
