import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  PhoneCall,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Building2,
  MapPin,
  User,
  Smartphone,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@real-estate-scrapper/ui/components/button";
import { Input } from "@real-estate-scrapper/ui/components/input";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/phone")({
  component: PhoneCompanionComponent,
});

const OUTCOME_OPTIONS = [
  { key: "interested", label: "Interested", bg: "bg-emerald-600 hover:bg-emerald-700 text-white", icon: CheckCircle2 },
  { key: "call_back", label: "Call Back", bg: "bg-amber-600 hover:bg-amber-700 text-white", icon: Clock },
  { key: "no_answer", label: "No Answer", bg: "bg-purple-600 hover:bg-purple-700 text-white", icon: Volume2 },
  { key: "busy", label: "Busy", bg: "bg-slate-600 hover:bg-slate-700 text-white", icon: Phone },
  { key: "wrong_number", label: "Wrong Number", bg: "bg-rose-600 hover:bg-rose-700 text-white", icon: HelpCircle },
  { key: "not_interested", label: "Not Interested", bg: "bg-slate-700 hover:bg-slate-800 text-white", icon: XCircle },
] as const;

function PhoneCompanionComponent() {
  const [notes, setNotes] = useState("");

  const pendingQuery = useQuery({
    ...trpc.calls.pendingForUser.queryOptions(),
    refetchInterval: 3000, // Poll every 3 seconds for call requests
  });

  const markDialedMutation = useMutation({
    mutationFn: trpc.calls.markDialed.mutationOptions().mutationFn,
  });

  const logOutcomeMutation = useMutation({
    mutationFn: trpc.calls.logOutcome.mutationOptions().mutationFn,
    onSuccess: () => {
      toast.success("Outcome logged successfully");
      setNotes("");
      pendingQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const activeCall = pendingQuery.data;

  const handleTapToCall = (phone: string, requestId: string) => {
    markDialedMutation.mutate({ id: requestId });
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Phone Companion</h1>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Connected to Laptop</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center py-6">
        {activeCall ? (
          <div className="space-y-6">
            {/* Lead Info Card */}
            <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 text-center shadow-lg animate-in fade-in zoom-in duration-300">
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-1">
                <Building2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {activeCall.lead?.name}
              </h2>
              {activeCall.lead?.contactPerson && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>{activeCall.lead.contactPerson}</span>
                </p>
              )}
              {activeCall.lead?.city && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{activeCall.lead.city}</span>
                </p>
              )}


              <div className="pt-2 font-mono text-2xl font-extrabold tracking-wider text-primary">
                {activeCall.phone}
              </div>
            </div>

            {/* Big Tap to Call Button */}
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg gap-2"
              onClick={() => handleTapToCall(activeCall.phone, activeCall.id)}
            >
              <PhoneCall className="h-6 w-6 animate-bounce" />
              <span>TAP TO CALL</span>
            </Button>

            {/* Outcome Logger */}
            <div className="space-y-3 pt-4 border-t border-border/40">
              <label className="text-xs font-semibold text-muted-foreground block text-center">
                Log Call Outcome
              </label>

              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={opt.key}
                      size="sm"
                      className={`h-10 text-xs font-semibold gap-1.5 ${opt.bg}`}
                      disabled={logOutcomeMutation.isPending}
                      onClick={() =>
                        logOutcomeMutation.mutate({
                          leadId: activeCall.leadId,
                          callRequestId: activeCall.id,
                          outcome: opt.key as any,
                          notes: notes.trim() || undefined,
                        })
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{opt.label}</span>
                    </Button>
                  );
                })}
              </div>

              <Input
                type="text"
                placeholder="Optional call note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs mt-2"
              />
            </div>
          </div>
        ) : (
          /* Waiting / Idle Screen */
          <div className="text-center space-y-4 py-12">
            <div className="inline-flex p-4 rounded-full bg-muted text-muted-foreground">
              <Phone className="h-10 w-10 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Waiting for Calls</h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                Keep this page open on your phone. When you click <strong>"Call"</strong> on your laptop dashboard, the builder details will appear here instantly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-[10px] text-muted-foreground border-t border-border/40 pt-3">
        LeadEngine Companion App • Dialing over SIM
      </div>
    </div>
  );
}
