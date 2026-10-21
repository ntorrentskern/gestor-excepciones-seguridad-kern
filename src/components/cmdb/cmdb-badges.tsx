import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { cmdbPath, type CmdbRef } from "@/types/cmdb";

export function HostBadge({
  item,
  href,
}: {
  item: CmdbRef;
  href?: string;
}) {
  const className = cn(
    "inline-flex max-w-[160px] truncate rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
  );
  if (href || item.id) {
    return (
      <Link
        href={href ?? cmdbPath(item)}
        className={cn(className, "hover:border-slate-400")}
      >
        {item.display_name}
      </Link>
    );
  }
  return <span className={className}>{item.display_name}</span>;
}

export function ServicioBadge({
  item,
  onClick,
  active,
}: {
  item: CmdbRef;
  onClick?: () => void;
  active?: boolean;
}) {
  const className = cn(
    "inline-flex max-w-[140px] truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
    active
      ? "border-sky-400 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-500/25 dark:text-sky-100"
      : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
    onClick && "cursor-pointer hover:border-sky-400"
  );
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {item.display_name}
      </button>
    );
  }
  return (
    <Link href={cmdbPath(item)} className={className}>
      {item.display_name}
    </Link>
  );
}

export function UsuarioBadge({ item }: { item: CmdbRef }) {
  const className =
    "inline-flex max-w-[180px] truncate rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (item.id) {
    return (
      <Link
        href={cmdbPath(item)}
        className={cn(className, "hover:border-emerald-400")}
      >
        {item.display_name}
      </Link>
    );
  }
  return <span className={className}>{item.display_name}</span>;
}

export function BadgeStack({
  children,
  empty = "—",
}: {
  children: ReactNode;
  empty?: string;
}) {
  const has = Array.isArray(children)
    ? children.filter(Boolean).length > 0
    : Boolean(children);
  if (!has) {
    return <span className="text-xs text-muted-foreground">{empty}</span>;
  }
  return <div className="flex flex-wrap gap-1">{children}</div>;
}
