import type { UserRole } from "./statuses.js";

export type QuickLoginRole = Extract<UserRole, "super_admin" | "admin" | "instructor">;

export type QuickLoginAccount = {
  role: QuickLoginRole;
  label: string;
  email: string;
  password: string;
};

export type QuickLoginCredentialMap = Partial<Record<QuickLoginRole, {
  email?: string | null;
  password?: string | null;
}>>;

export const quickLoginRoles = ["super_admin", "admin", "instructor"] as const satisfies readonly QuickLoginRole[];

export const defaultQuickLoginCredentials = {
  super_admin: {
    email: "superadmin@pampangastateu.edu.ph",
    password: "demo123"
  },
  admin: {
    email: "custodian@pampangastateu.edu.ph",
    password: "demo123"
  },
  instructor: {
    email: "faculty@pampangastateu.edu.ph",
    password: "demo123"
  }
} as const satisfies Record<QuickLoginRole, { email: string; password: string }>;

const quickLoginLabels = {
  super_admin: "Super admin login",
  admin: "Custodian login",
  instructor: "Faculty login"
} as const satisfies Record<QuickLoginRole, string>;

export function buildQuickLoginAccounts(
  overrides: QuickLoginCredentialMap = {},
  options: { roles?: readonly QuickLoginRole[]; includeDefaults?: boolean } = {}
): QuickLoginAccount[] {
  const roles = options.roles ?? quickLoginRoles;
  const includeDefaults = options.includeDefaults ?? true;

  return roles.flatMap((role) => {
    const override = overrides[role];
    const hasOverride = Boolean(override?.email?.trim() || override?.password?.trim());
    const source = hasOverride ? override : includeDefaults ? defaultQuickLoginCredentials[role] : undefined;
    const email = source?.email?.trim();
    const password = source?.password?.trim();

    if (!email || !password) {
      return [];
    }

    return [{
      role,
      label: quickLoginLabels[role],
      email,
      password
    }];
  });
}
