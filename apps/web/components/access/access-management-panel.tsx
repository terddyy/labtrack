"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { getRoleDisplayLabel, type Profile, type UserRole } from "@labtrack/shared";
import { Globe, Lock, Search, Users } from "lucide-react";

import { FilterTabs } from "@/components/admin/filter-tabs";
import { EmptyState, Initials, Notice } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { EmailDomainRule, ProfileRow, RegistrationPolicy } from "@/lib/admin/types";

// Legacy roles (admin, instructor) are grouped under their display labels.
const roleTabs = ["Super Admin", "Custodian", "Faculty", "Student"] as const;

export function AccessManagementPanel({
  currentProfile,
  disabled,
  domainForm,
  onCreateDomain,
  onDomainFormChange,
  onDomainUpdate,
  onRegistrationPolicyUpdate,
  onUpdate,
  profiles,
  registrationPolicy
}: {
  currentProfile: Profile;
  disabled: boolean;
  domainForm: { domain: string; notes: string };
  onCreateDomain: (event: FormEvent<HTMLFormElement>) => void;
  onDomainFormChange: (form: { domain: string; notes: string }) => void;
  onDomainUpdate: (domainRule: EmailDomainRule, updates: Partial<Pick<EmailDomainRule, "domain" | "is_allowed" | "notes">>) => void;
  onRegistrationPolicyUpdate: (enabled: boolean) => void;
  onUpdate: (profile: ProfileRow, updates: Partial<Pick<ProfileRow, "role" | "is_active">>) => void;
  profiles: ProfileRow[];
  registrationPolicy: RegistrationPolicy;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  if (currentProfile.role !== "super_admin") {
    return <Notice tone="warning">Only Super Admin accounts can manage account access.</Notice>;
  }

  const needle = query.trim().toLowerCase();
  const roleCounts = roleTabs.map((label): [string, number] => [
    label,
    profiles.filter((profile) => getRoleDisplayLabel(profile.role) === label).length
  ]);
  const visibleProfiles = profiles.filter((profile) =>
    (roleFilter === "all" || getRoleDisplayLabel(profile.role) === roleFilter)
    && (!needle || `${profile.full_name} ${profile.email} ${profile.department ?? ""}`.toLowerCase().includes(needle))
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="order-2 overflow-hidden rounded-xl border bg-card xl:sticky xl:top-20">
        <header className="flex items-start gap-3 border-b px-5 py-4">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Lock className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Registration policy</h2>
            <p className="text-[13px] text-muted-foreground">Control who can create a mobile account.</p>
          </div>
        </header>

        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <Label className="text-sm font-medium" htmlFor="restrict-domains">
              Restrict to school domains
            </Label>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {registrationPolicy.restrictSignupToAllowedDomains ? "Only emails from enabled domains can register." : "Any valid email can register."}
            </p>
          </div>
          <Switch
            checked={registrationPolicy.restrictSignupToAllowedDomains}
            disabled={disabled}
            id="restrict-domains"
            onCheckedChange={onRegistrationPolicyUpdate}
          />
        </div>

        <form className="space-y-2 border-b bg-muted/30 px-5 py-4" onSubmit={onCreateDomain}>
          <Label className="text-xs text-muted-foreground" htmlFor="allowed-domain">
            Add allowed domain
          </Label>
          <Input
            className="bg-background font-mono text-[13px]"
            id="allowed-domain"
            onChange={(event) => onDomainFormChange({ ...domainForm, domain: event.target.value })}
            placeholder="pampangastateu.edu.ph"
            value={domainForm.domain}
          />
          <div className="flex gap-2">
            <Input
              aria-label="Domain notes"
              className="bg-background"
              onChange={(event) => onDomainFormChange({ ...domainForm, notes: event.target.value })}
              placeholder="Notes (optional)"
              value={domainForm.notes}
            />
            <Button disabled={disabled || !domainForm.domain.trim()} type="submit">
              Add
            </Button>
          </div>
        </form>

        {registrationPolicy.allowedDomains.length ? (
          <ul className="divide-y">
            {registrationPolicy.allowedDomains.map((domainRule) => (
              <li className="flex items-center gap-3 px-5 py-3" key={domainRule.id}>
                <Globe className={cn("size-4 shrink-0", domainRule.is_allowed ? "text-success" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-mono text-[13px]", !domainRule.is_allowed && "text-muted-foreground line-through")}>
                    {domainRule.domain}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{domainRule.notes || "No notes"}</p>
                </div>
                <Switch
                  aria-label={`${domainRule.is_allowed ? "Disable" : "Enable"} ${domainRule.domain}`}
                  checked={domainRule.is_allowed}
                  disabled={disabled}
                  onCheckedChange={(checked) => onDomainUpdate(domainRule, { is_allowed: checked })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyState icon={Globe} label="No allowed domains" />
          </div>
        )}
      </section>

      <section className="order-1 overflow-hidden rounded-xl border bg-card">
        <header className="flex flex-col gap-3 border-b px-5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold tracking-tight">Accounts</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular">
              {visibleProfiles.length} / {profiles.length}
            </span>
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search accounts" className="h-8 pl-8" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, department…" value={query} />
          </div>
        </header>
        <div className="border-b px-4 pt-3">
          <FilterTabs counts={roleCounts} onChange={setRoleFilter} total={profiles.length} value={roleFilter} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-5">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="pr-5 text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProfiles.map((profile) => (
                <TableRow className={cn(!profile.is_active && "opacity-60")} key={profile.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3">
                      <Initials name={profile.full_name} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{profile.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {profile.email}
                          {profile.department ? ` · ${profile.department}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select disabled={disabled} onValueChange={(value) => onUpdate(profile, { role: value as UserRole })} value={profile.role}>
                      <SelectTrigger className="h-8 w-36" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="custodian">Custodian</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="instructor">Faculty</SelectItem>
                        <SelectItem value="admin">Custodian</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Switch
                      aria-label={`${profile.is_active ? "Deactivate" : "Activate"} ${profile.full_name}`}
                      checked={profile.is_active}
                      disabled={disabled}
                      onCheckedChange={(checked) => onUpdate(profile, { is_active: checked })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!visibleProfiles.length ? (
          <div className="p-5">
            <EmptyState icon={Users} label="No matching accounts" />
          </div>
        ) : null}
      </section>
    </div>
  );
}
