"use client";

import {
  CalendarDays,
  ClipboardList,
  FileBarChart,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Package,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Wrench,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";
import type { Profile } from "@labtrack/shared";
import { getRoleDisplayLabel } from "@labtrack/shared";

import { Initials } from "@/components/admin/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@/components/ui/sidebar";

export type AdminSection = "dashboard" | "assets" | "bookings" | "monitor" | "defects" | "tickets" | "reports" | "access" | "catalog";

type NavItem = { key: AdminSection; label: string; icon: LucideIcon };

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }]
  },
  {
    label: "Requests & Operations",
    items: [
      { key: "bookings", label: "Borrowing", icon: ClipboardList },
      { key: "defects", label: "Defects", icon: Wrench },
      { key: "tickets", label: "Tickets", icon: MessagesSquare },
      { key: "monitor", label: "Calendar", icon: CalendarDays }
    ]
  },
  {
    label: "Asset Management",
    items: [
      { key: "assets", label: "Assets & QR", icon: Package },
      { key: "catalog", label: "Catalog", icon: FolderTree }
    ]
  },
  {
    label: "Administration",
    items: [
      { key: "reports", label: "Reports", icon: FileBarChart },
      { key: "access", label: "Access", icon: ShieldCheck }
    ]
  }
];

export const navigation: NavItem[] = navGroups.flatMap((group) => group.items);

export function AppShell({
  activeSection,
  children,
  isLoadingData,
  navBadges,
  onGenerateQr,
  onSectionChange,
  onSignOut,
  onSync,
  profile,
  sectionDescription,
  sectionTitle,
  showGenerateQr,
  qrDisabled
}: {
  activeSection: AdminSection;
  children: ReactNode;
  isLoadingData: boolean;
  navBadges: Partial<Record<AdminSection, number>>;
  onGenerateQr: () => void;
  onSectionChange: (section: AdminSection) => void;
  onSignOut: () => void;
  onSync: () => void;
  profile: Profile;
  sectionDescription: string;
  sectionTitle: string;
  showGenerateQr: boolean;
  qrDisabled: boolean;
}) {
  const activeLabel = navigation.find((item) => item.key === activeSection)?.label ?? sectionTitle;

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0" collapsible="icon">
        <SidebarHeader className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <BrandMark />
            <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">LABTRACK</span>
              <span className="truncate text-[11px] text-sidebar-foreground/60">Pampanga State University</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 pt-2">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/45">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const badge = navBadges[item.key];
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          className="h-9 gap-2.5 text-[13.5px] text-sidebar-foreground/80 transition-colors data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_2px_0_0_0_var(--sidebar-primary)]"
                          isActive={activeSection === item.key}
                          onClick={() => onSectionChange(item.key)}
                          tooltip={item.label}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {badge ? (
                          <SidebarMenuBadge className="top-2! rounded-full bg-sidebar-primary/20 px-1.5 font-mono text-[10.5px] text-sidebar-primary">
                            {badge}
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <Initials className="bg-sidebar-primary/20 text-sidebar-primary group-data-[collapsible=icon]:hidden" name={profile.fullName} />
            <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[13px] font-medium text-sidebar-accent-foreground">{profile.fullName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{getRoleDisplayLabel(profile.role)}</p>
            </div>
            <Button
              aria-label="Sign out"
              className="size-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={onSignOut}
              size="icon"
              title="Sign out"
              type="button"
              variant="ghost"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-5">
          <SidebarTrigger className="text-muted-foreground" />
          <Separator className="mx-1 h-5!" orientation="vertical" />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Console</span>
            <span aria-hidden className="hidden text-muted-foreground/50 sm:inline">/</span>
            <span className="truncate font-medium">{activeLabel}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Button disabled={isLoadingData} onClick={onSync} size="sm" type="button" variant="ghost">
              <RefreshCw className={isLoadingData ? "size-3.5 animate-spin" : "size-3.5"} />
              <span className="hidden sm:inline">{isLoadingData ? "Syncing…" : "Sync"}</span>
            </Button>
            {showGenerateQr ? (
              <Button disabled={qrDisabled} onClick={onGenerateQr} size="sm" type="button">
                <QrCode className="size-3.5" />
                <span className="hidden sm:inline">Generate QR</span>
              </Button>
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        <main className="relative flex flex-1 flex-col">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-blueprint [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 pt-7 pb-10 sm:px-8">
            <div className="animate-rise space-y-1.5" key={activeSection}>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{sectionTitle}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">{sectionDescription}</p>
            </div>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.25)] ${className ?? ""}`}
    >
      <svg className="size-4.5" fill="none" viewBox="0 0 20 20">
        <path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <rect fill="currentColor" height="6" rx="1.2" width="6" x="7" y="7" />
      </svg>
    </span>
  );
}
