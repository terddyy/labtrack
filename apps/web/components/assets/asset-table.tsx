"use client";

import { assetStatuses } from "@labtrack/shared";
import { Package, Plus, QrCode, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, StatusBadge } from "@/components/admin/ui";
import { AssetThumb } from "@/components/assets/asset-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatLabel } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { AssetView } from "@/lib/admin/types";

const ALL = "all";

function countOptions(pairs: Array<[string, string]>) {
  const options = new Map<string, { value: string; label: string; count: number }>();
  pairs.forEach(([value, label]) => {
    const option = options.get(value) ?? { value, label, count: 0 };
    option.count += 1;
    options.set(value, option);
  });
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function AssetTable({
  assets,
  isLoading,
  onCreate,
  onSelect,
  selectedAssetId
}: {
  assets: AssetView[];
  isLoading: boolean;
  onCreate: () => void;
  onSelect: (assetId: string) => void;
  selectedAssetId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const locationOptions = useMemo(() => countOptions(assets.map((asset) => [asset.locationId, asset.locationName])), [assets]);
  const statusCounts = useMemo(() => new Map(countOptions(assets.map((asset) => [asset.status, asset.status])).map((option) => [option.value, option.count])), [assets]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assets.filter((asset) =>
      (locationFilter === ALL || asset.locationId === locationFilter)
      && (statusFilter === ALL || asset.status === statusFilter)
      && (!needle || [asset.name, asset.propertyNumber, asset.locationName, asset.categoryName].some((field) => field?.toLowerCase().includes(needle)))
    );
  }, [assets, locationFilter, query, statusFilter]);
  const hasFilters = Boolean(query) || locationFilter !== ALL || statusFilter !== ALL;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">Asset register</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular">{assets.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search assets"
              className="h-8 pl-8"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, property no., room…"
              value={query}
            />
          </div>
          <Button onClick={onCreate} size="sm" type="button">
            <Plus className="size-3.5" />
            New asset
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
        <Select onValueChange={setLocationFilter} value={locationFilter}>
          <SelectTrigger aria-label="Filter by location" className="h-8 w-full bg-background sm:w-56" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All locations ({assets.length})</SelectItem>
            {locationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} ({option.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger aria-label="Filter by status" className="h-8 w-full bg-background sm:w-48" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses ({assets.length})</SelectItem>
            {assetStatuses.map((status) => (
              <SelectItem className="capitalize" key={status} value={status}>
                {formatLabel(status)} ({statusCounts.get(status) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button
            onClick={() => {
              setQuery("");
              setLocationFilter(ALL);
              setStatusFilter(ALL);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear filters
          </Button>
        ) : null}
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular">
          {filtered.length} of {assets.length}
        </span>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Asset</TableHead>
              <TableHead className="hidden md:table-cell">Property no.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">QR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !assets.length
              ? Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-4" colSpan={4}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : filtered.map((asset) => {
                  const isSelected = asset.id === selectedAssetId;
                  return (
                    <TableRow
                      aria-selected={isSelected}
                      className={cn("cursor-pointer", isSelected && "bg-accent/60 hover:bg-accent/70")}
                      key={asset.id}
                      onClick={() => onSelect(asset.id)}
                    >
                      <TableCell className={cn("pl-4", isSelected && "shadow-[inset_2px_0_0_0_var(--primary)]")}>
                        <div className="flex items-center gap-3">
                          <AssetThumb asset={asset} />
                          <div className="max-w-[260px] min-w-0 2xl:max-w-[360px]">
                            <p className="truncate font-medium">{asset.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {asset.categoryName} · {asset.locationName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="block max-w-[200px] truncate font-mono text-xs text-muted-foreground" title={asset.propertyNumber}>
                          {asset.propertyNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs",
                            asset.activeQr ? "text-success" : "text-muted-foreground"
                          )}
                        >
                          <QrCode className="size-3.5" />
                          {asset.activeQr ? "Issued" : "None"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {!isLoading && !filtered.length ? (
        <div className="p-4">
          <EmptyState
            description={hasFilters ? "Try a different search term or filter." : "Register your first asset to issue a QR label."}
            icon={Package}
            label={hasFilters ? "No matching assets" : "No assets yet"}
          />
        </div>
      ) : null}
    </section>
  );
}
