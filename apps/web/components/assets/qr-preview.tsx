"use client";

import { createQrPayload } from "@labtrack/shared";
import { Check, Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { StatusBadge } from "@/components/admin/ui";
import { AssetThumb } from "@/components/assets/asset-thumb";
import { Button } from "@/components/ui/button";
import type { AssetView } from "@/lib/admin/types";

export function QrPreview({ asset }: { asset: AssetView | null }) {
  const activeCode = asset?.activeQr?.code ?? "";
  const payload = activeCode ? createQrPayload(activeCode) : "";
  const mobileDeepLink = payload ? `labtrack://asset/${encodeURIComponent(payload)}` : "";

  return (
    <div className="flex flex-col">
      <div className="bg-blueprint flex items-center justify-center border-b bg-muted/40 px-6 py-8">
        <div className="relative w-full max-w-[220px] rounded-lg bg-white p-4 text-neutral-900 shadow-[0_1px_2px_oklch(0_0_0/0.08),0_12px_32px_-12px_oklch(0_0_0/0.25)]">
          <CornerMarks />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold tracking-[0.2em]">LABTRACK</span>
            <span className="truncate font-mono text-[10px] text-neutral-500">{asset?.propertyNumber ?? "—"}</span>
          </div>
          <div className="qr-frame mt-3 flex aspect-square items-center justify-center">
            {payload ? (
              <QRCodeSVG className="size-full" level="M" size={180} value={payload} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <QrCode className="size-10" strokeWidth={1.25} />
                <span className="text-xs">No active code</span>
              </div>
            )}
          </div>
          <p className="mt-3 truncate text-center text-xs font-semibold">{asset?.name ?? "Select an asset"}</p>
          <p className="truncate text-center text-[10px] text-neutral-500">{asset?.locationName ?? ""}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <AssetThumb asset={asset} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{asset?.name ?? "No asset selected"}</p>
            <p className="truncate text-xs text-muted-foreground">{asset ? asset.categoryName : "Pick a row in the register"}</p>
          </div>
          {asset ? <StatusBadge status={asset.status} /> : null}
        </div>
        <CopyField label="QR payload" value={payload} />
        <CopyField label="Mobile deep link" value={mobileDeepLink} />
      </div>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{value || "—"}</code>
        <Button aria-label={`Copy ${label}`} className="size-7" disabled={!value} onClick={() => void copy()} size="icon" type="button" variant="ghost">
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function CornerMarks() {
  const mark = "absolute size-2.5 border-neutral-300";
  return (
    <>
      <span aria-hidden className={`${mark} -top-2 -left-2 border-t border-l`} />
      <span aria-hidden className={`${mark} -top-2 -right-2 border-t border-r`} />
      <span aria-hidden className={`${mark} -bottom-2 -left-2 border-b border-l`} />
      <span aria-hidden className={`${mark} -right-2 -bottom-2 border-r border-b`} />
    </>
  );
}
