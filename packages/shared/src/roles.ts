export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  AGENCY_ADMIN: 'agency_admin',
  SUB_ACCOUNT_ADMIN: 'sub_account_admin',
  AGENT: 'agent',
  CLIENT_VIEWER: 'client_viewer',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const AGENCY_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN];
export const SUB_ACCOUNT_ROLES: Role[] = [
  ROLES.SUB_ACCOUNT_ADMIN,
  ROLES.AGENT,
  ROLES.CLIENT_VIEWER,
];

export function canManageSubAccounts(role: Role): boolean {
  return AGENCY_ROLES.includes(role);
}

export function canHandleCalls(role: Role): boolean {
  return role === ROLES.AGENT || role === ROLES.SUB_ACCOUNT_ADMIN;
}
