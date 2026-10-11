import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CopyCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@real-estate-scrapper/ui/components/button";
import { trpc } from "@/utils/trpc";
import { useState } from "react";

export const Route = createFileRoute("/_auth/leads/duplicates")({
  component: DuplicatesComponent,
});

function DuplicatesComponent() {
  const queryClient = useQueryClient();
  const duplicatesQuery = useQuery(trpc.leads.detectDuplicates.queryOptions());

  const mergeMutation = useMutation(
    trpc.leads.mergeLeads.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.leads.detectDuplicates.queryFilter());
        queryClient.invalidateQueries(trpc.leads.list.queryFilter());
      },
    }),
  );

  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());

  const matches = (duplicatesQuery.data || []).filter((m) => {
    const pairKey = `${m.leadA.id}:${m.leadB.id}`;
    return !dismissedPairs.has(pairKey);
  });

  const handleMerge = (primaryId: string, secondaryId: string) => {
    mergeMutation.mutate({ primaryLeadId: primaryId, secondaryLeadId: secondaryId });
  };

  const handleDismiss = (pairKey: string) => {
    setDismissedPairs((prev) => new Set(prev).add(pairKey));
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Duplicate Lead Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {matches.length} Matches
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Review and merge duplicate builder listings from Justdial and state RERA portals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leads" search={{}}>
            <Button variant="outline" size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span>Back to Leads</span>
            </Button>
          </Link>
        </div>
      </div>

      {duplicatesQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-border/50 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-12 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 w-16 h-16 mx-auto flex items-center justify-center">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">No Duplicate Leads Found!</h2>
          <p className="text-sm text-muted-foreground">
            Your builder database is completely clean. All phone numbers, RERA IDs, and company names are unique.
          </p>
          <Link to="/leads" search={{}}>
            <Button size="sm" className="mt-2">
              Browse All Leads
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {matches.map((match) => {
            const pairKey = `${match.leadA.id}:${match.leadB.id}`;
            const confPct = Math.round(match.confidence * 100);

            return (
              <div
                key={pairKey}
                className="rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-border space-y-5"
              >
                {/* Match Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Match Reason:
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      {match.reason === "exact_phone"
                        ? "Exact Phone Match"
                        : match.reason === "exact_rera"
                          ? "Exact RERA Registration Match"
                          : match.reason === "exact_website"
                            ? "Exact Website Domain Match"
                            : "Fuzzy Name & City Similarity"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confidence:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                        confPct >= 90
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}
                    >
                      {confPct}% Match
                    </span>
                  </div>
                </div>

                {/* Side by side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Lead A */}
                  <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Listing 1
                        </span>
                        <h3 className="text-base font-bold text-foreground">{match.leadA.name}</h3>
                      </div>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        Score: {match.leadA.score || 50}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {match.leadA.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{match.leadA.city}</span>
                        </div>
                      )}
                      {match.leadA.phones && match.leadA.phones.length > 0 && (
                        <div className="flex items-center gap-2 text-foreground font-mono">
                          <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{match.leadA.phones.join(", ")}</span>
                        </div>
                      )}
                      {match.leadA.emails && match.leadA.emails.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          <span>{match.leadA.emails.join(", ")}</span>
                        </div>
                      )}
                      {match.leadA.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-purple-500" />
                          <span className="truncate">{match.leadA.website}</span>
                        </div>
                      )}
                      {match.leadA.reraNumbers && match.leadA.reraNumbers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-mono">RERA: {match.leadA.reraNumbers.join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full mt-2 gap-2"
                      disabled={mergeMutation.isPending}
                      onClick={() => handleMerge(match.leadA.id, match.leadB.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Keep Listing 1 (Merge Listing 2 into it)</span>
                    </Button>
                  </div>

                  {/* Lead B */}
                  <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Listing 2
                        </span>
                        <h3 className="text-base font-bold text-foreground">{match.leadB.name}</h3>
                      </div>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        Score: {match.leadB.score || 50}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {match.leadB.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{match.leadB.city}</span>
                        </div>
                      )}
                      {match.leadB.phones && match.leadB.phones.length > 0 && (
                        <div className="flex items-center gap-2 text-foreground font-mono">
                          <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{match.leadB.phones.join(", ")}</span>
                        </div>
                      )}
                      {match.leadB.emails && match.leadB.emails.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-blue-500" />
                          <span>{match.leadB.emails.join(", ")}</span>
                        </div>
                      )}
                      {match.leadB.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-purple-500" />
                          <span className="truncate">{match.leadB.website}</span>
                        </div>
                      )}
                      {match.leadB.reraNumbers && match.leadB.reraNumbers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-mono">RERA: {match.leadB.reraNumbers.join(", ")}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-2"
                      disabled={mergeMutation.isPending}
                      onClick={() => handleMerge(match.leadB.id, match.leadA.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Keep Listing 2 (Merge Listing 1 into it)</span>
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleDismiss(pairKey)}
                  >
                    Not a Duplicate (Ignore Pair)
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
