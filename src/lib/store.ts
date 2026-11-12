"use client";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { BRAND_DEFAULTS } from "@/config/brand";
import { EMPLOYEES } from "./demo/catalog";
import type { Campaign, CampaignStatus, Client, MarketplaceFilter } from "./demo/types";
import type { CreativeProject } from "./studio/types";

export type Role = "admin" | "manager" | "analyst" | "viewer";
export const ROLE_LABEL: Record<Role, string> = { admin: "Agency Admin", manager: "Account Manager", analyst: "Analyst", viewer: "Client Viewer" };
export const PERMISSIONS = [
  ["campaigns.edit", "Create, edit, pause and resume campaigns"],
  ["creatives.edit", "Create and edit creatives"],
  ["reports.export", "Generate and export reports"],
  ["ai.generate", "Generate AI insights"],
  ["clients.manage", "Add and edit clients"],
  ["settings.manage", "Manage users, roles and workspace settings"],
] as const;
export type Permission = (typeof PERMISSIONS)[number][0];
const allow = (...p: Permission[]) => Object.fromEntries(PERMISSIONS.map(([k]) => [k, p.includes(k)])) as Record<Permission, boolean>;
const DEFAULT_PERMS: Record<Role, Record<Permission, boolean>> = {
  admin: allow("campaigns.edit", "creatives.edit", "reports.export", "ai.generate", "clients.manage", "settings.manage"),
  manager: allow("campaigns.edit", "creatives.edit", "reports.export", "ai.generate", "clients.manage"),
  analyst: allow("reports.export", "ai.generate"),
  viewer: allow(),
};

export type RangePreset = "7d" | "14d" | "30d" | "90d" | "mtd" | "custom";
export interface Session { name: string; email: string; role: Role }
export interface AppUser { id: string; name: string; email: string; role: Role; status: "active" | "invited" | "deactivated" }
export interface AuditEntry { id: string; ts: number; actor: string; action: string; target: string }
export interface ReportRecord { id: string; ts: number; type: string; title: string; client: string; range: string; format: "CSV" | "PDF"; rows: number; by: string }
export interface Upload { id: string; name: string; src: string; w: number; h: number }
/** An enquiry or sign-up sent from the public website in this browser (the server copy goes to the alert webhook). */
export interface SiteLead { id: string; ts: number; kind: "demo" | "signup" | "enquiry"; reference: string; name: string; agency: string; email: string; phone: string; sellers: string; marketplaces: string[]; alert: "sent" | "pending_configuration" | "failed" | "not_sent" }
export interface AgencyWorkspace { agency: string; owner: string; email: string; sellersPlanned: number; marketplaces: string[]; createdAt: number }

const uid = () => Math.random().toString(36).slice(2, 10);

const initial = () => ({
  session: null as Session | null,
  theme: "light" as "dark" | "light",
  sidebarCollapsed: false,
  clientId: "aarvi",
  marketplace: "all" as MarketplaceFilter,
  range: { preset: "30d" as RangePreset, from: "", to: "" },
  brand: { productName: BRAND_DEFAULTS.productName, tagline: BRAND_DEFAULTS.tagline, company: BRAND_DEFAULTS.company, accent: BRAND_DEFAULTS.accent },
  campaignEdits: {} as Record<string, Partial<Pick<Campaign, "status" | "dailyBudget" | "name" | "objective">>>,
  customCampaigns: [] as Campaign[],
  reviewed: [] as string[],
  projects: [] as CreativeProject[],
  uploads: [] as Upload[],
  reports: [] as ReportRecord[],
  audit: [] as AuditEntry[],
  readNotifs: [] as string[],
  users: EMPLOYEES.map((e, i) => ({ id: e.id, name: e.name, email: e.email, role: (["admin", "manager", "manager", "analyst", "analyst", "analyst"] as Role[])[i], status: "active" as const })) as AppUser[],
  permissions: DEFAULT_PERMS,
  customClients: [] as Client[],
  clientTeams: {} as Record<string, string[]>,
  siteLeads: [] as SiteLead[],
  workspace: null as AgencyWorkspace | null,
  settings: {
    workspaceName: "ENTRAIOT Agency Workspace",
    timezone: "Asia/Kolkata",
    weekStart: "Monday",
    ai: { roasFloor: 1.5, minSpendShare: 0.03, categories: { campaigns: true, products: true, inventory: true, budget: true, growth: true } },
    notif: { lowStock: true, roasDrop: true, weeklyDigest: true, reportReady: false },
  },
});
type Data = ReturnType<typeof initial>;

interface Actions {
  hydrated: boolean;
  set: (p: Partial<Data>) => void;
  signIn: (s: Session) => void;
  signOut: () => void;
  log: (action: string, target: string) => void;
  setCampaignStatus: (c: Campaign, status: CampaignStatus) => void;
  saveCampaign: (c: Campaign, isNew: boolean) => void;
  toggleReviewed: (id: string) => void;
  saveProject: (p: CreativeProject) => void;
  deleteProject: (id: string) => void;
  addReport: (r: Omit<ReportRecord, "id" | "ts" | "by">) => void;
  updateSettings: (fn: (s: Data["settings"]) => Data["settings"]) => void;
  resetDemo: () => void;
  addSiteLead: (l: Omit<SiteLead, "id" | "ts">) => void;
  createWorkspace: (w: Omit<AgencyWorkspace, "createdAt">) => void;
}

export const toastBus: { push: (msg: string, tone?: "ok" | "error") => void } = { push: () => {} };

// localStorage wrapper: a full quota must never break the demo.
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { toastBus.push("Browser storage is full — recent changes were not saved. Delete unused creatives or uploads.", "error"); } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),
      hydrated: false,
      set: (p) => set(p),
      signIn: (session) => { set({ session }); get().log("Signed in to demo workspace", ROLE_LABEL[session.role]); },
      signOut: () => set({ session: null }),
      log: (action, target) => set((s) => ({ audit: [{ id: uid(), ts: Date.now(), actor: s.session?.name ?? "System", action, target }, ...s.audit].slice(0, 200) })),
      setCampaignStatus: (c, status) => {
        if (c.custom) set((s) => ({ customCampaigns: s.customCampaigns.map((x) => (x.id === c.id ? { ...x, status } : x)) }));
        else set((s) => ({ campaignEdits: { ...s.campaignEdits, [c.id]: { ...s.campaignEdits[c.id], status } } }));
        get().log(status === "paused" ? "Paused campaign (demo state)" : "Resumed campaign (demo state)", c.name);
      },
      saveCampaign: (c, isNew) => {
        if (isNew) set((s) => ({ customCampaigns: [c, ...s.customCampaigns] }));
        else if (c.custom) set((s) => ({ customCampaigns: s.customCampaigns.map((x) => (x.id === c.id ? c : x)) }));
        else set((s) => ({ campaignEdits: { ...s.campaignEdits, [c.id]: { ...s.campaignEdits[c.id], name: c.name, dailyBudget: c.dailyBudget, objective: c.objective, status: c.status } } }));
        get().log(isNew ? "Created campaign (demo state)" : "Edited campaign (demo state)", c.name);
      },
      toggleReviewed: (id) => set((s) => ({ reviewed: s.reviewed.includes(id) ? s.reviewed.filter((x) => x !== id) : [...s.reviewed, id] })),
      saveProject: (p) => set((s) => ({ projects: [p, ...s.projects.filter((x) => x.id !== p.id)] })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((x) => x.id !== id) })),
      addReport: (r) => { set((s) => ({ reports: [{ ...r, id: uid(), ts: Date.now(), by: s.session?.name ?? "Demo user" }, ...s.reports].slice(0, 50) })); get().log(`Exported ${r.format} report`, r.title); },
      updateSettings: (fn) => set((s) => ({ settings: fn(s.settings) })),
      resetDemo: () => { const { session, theme, siteLeads, workspace } = get(); set({ ...initial(), session, theme, siteLeads, workspace, settings: { ...initial().settings, workspaceName: workspace ? `${workspace.agency} workspace` : initial().settings.workspaceName } }); get().log("Reset demo data", "Workspace"); },
      addSiteLead: (l) => set((s) => ({ siteLeads: [{ ...l, id: uid(), ts: Date.now() }, ...s.siteLeads].slice(0, 100) })),
      createWorkspace: (w) => {
        const workspace = { ...w, createdAt: Date.now() };
        set((s) => ({
          workspace,
          settings: { ...s.settings, workspaceName: `${w.agency} workspace` },
          users: [{ id: uid(), name: w.owner, email: w.email, role: "admin" as Role, status: "active" as const }, ...s.users.filter((u) => u.email !== w.email)],
          session: { name: w.owner, email: w.email, role: "admin" },
        }));
        get().log("Created agency workspace from website sign-up (demo state)", w.agency);
      },
    }),
    {
      name: "entraiq-demo-v1",
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k, v]) => k !== "hydrated" && typeof v !== "function")),
    },
  ),
);

export const newId = uid;
export const now = () => Date.now();
export function useCan(p: Permission) {
  return useStore((s) => (s.session ? s.permissions[s.session.role][p] : false));
}
