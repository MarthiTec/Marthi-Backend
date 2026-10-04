type Store = { id: string; tradeName: string };
type Employee = {
  storeId: string; userEmail: string; email: string;
  active: boolean; isSystemUser: boolean;
};
type Account = { storeId: string; email: string };

const normalize = (email: string) => email.trim().toLowerCase();

/** Count distinct registered system logins, never employees or online sessions. */
export function summarizeCompanyUsers(stores: Store[], employees: Employee[], accounts: Account[]) {
  const byStore = new Map<string, Map<string, boolean[]>>();
  const missingEmail = new Map<string, number>();
  const accountEmails = new Map<string, Set<string>>();
  for (const account of accounts) {
    if (!accountEmails.has(account.storeId)) accountEmails.set(account.storeId, new Set());
    accountEmails.get(account.storeId)!.add(normalize(account.email));
  }
  for (const employee of employees) {
    if (!employee.isSystemUser) continue;
    const email = normalize(employee.userEmail) || normalize(employee.email);
    if (!email) {
      missingEmail.set(employee.storeId, (missingEmail.get(employee.storeId) ?? 0) + 1);
      continue;
    }
    if (!byStore.has(employee.storeId)) byStore.set(employee.storeId, new Map());
    const logins = byStore.get(employee.storeId)!;
    if (!logins.has(email)) logins.set(email, []);
    logins.get(email)!.push(employee.active);
  }
  return stores.map((store) => {
    const logins = byStore.get(store.id) ?? new Map<string, boolean[]>();
    let activeUsers = 0;
    let duplicateLogins = 0;
    let conflictingStatuses = 0;
    let withoutAccount = 0;
    for (const [email, statuses] of logins) {
      // Existing ACL searches active registrations first; any active match wins.
      if (statuses.some(Boolean)) activeUsers++;
      if (statuses.length > 1) duplicateLogins++;
      if (statuses.some(Boolean) && statuses.some((active) => !active)) conflictingStatuses++;
      if (!accountEmails.get(store.id)?.has(email)) withoutAccount++;
    }
    return {
      storeId: store.id, tradeName: store.tradeName,
      activeUsers, inactiveUsers: logins.size - activeUsers, totalUsers: logins.size,
      missingEmail: missingEmail.get(store.id) ?? 0,
      duplicateLogins, conflictingStatuses, withoutAccount,
    };
  });
}

