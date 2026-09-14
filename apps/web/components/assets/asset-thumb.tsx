"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { getAssetInitials } from "@/lib/admin/format";
import type { AssetView } from "@/lib/admin/types";

export function AssetThumb({ asset, large = false }: { asset: AssetView | null; large?: boolean }) {
  const [didImageFail, setDidImageFail] = useState(false);
  const imageUrl = asset?.primaryImageUrl ?? null;
  const showImage = Boolean(imageUrl && !didImageFail);

  useEffect(() => {
    setDidImageFail(false);
  }, [imageUrl]);

  return (
    <div
      aria-hidden={!asset}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground",
        large ? "size-20 text-base" : "size-10"
      )}
    >
      {showImage && imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`${asset?.name ?? "LABTRACK asset"} image`}
          className="size-full object-cover"
          onError={() => setDidImageFail(true)}
          src={imageUrl}
        />
      ) : (
        <span>{asset ? getAssetInitials(asset.name) : "LT"}</span>
      )}
    </div>
  );
}
