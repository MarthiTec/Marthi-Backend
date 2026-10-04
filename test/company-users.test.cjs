const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the real source in memory; no database connection or emitted files.
function load(relative, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
    experimentalDecorators: true, emitDecoratorMetadata: false,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(
    (name) => name in mocks ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}
const { summarizeCompanyUsers: summarize } = load('modules/admin/company-user-summary.ts');
const stores = [{ id: 'A', tradeName: 'Alpha' }, { id: 'B', tradeName: 'Beta' }, { id: 'C', tradeName: 'Empty' }];
const emp = (storeId, email, active = true, extra = {}) => ({ storeId, userEmail: email, email: '', active, isSystemUser: true, ...extra });

test('active/inactive, non-system employee excluded, empty company included', () => {
  const rows = summarize(stores, [emp('A', 'one'), emp('A', 'two', false), emp('A', 'hr', true, { isSystemUser: false })], []);
  assert.deepEqual(rows.map((r) => [r.activeUsers, r.inactiveUsers, r.totalUsers]), [[1, 1, 2], [0, 0, 0], [0, 0, 0]]);
});
test('same email in different tenants remains separate; account must belong to same tenant', () => {
  const rows = summarize(stores, [emp('A', 'same'), emp('B', 'same', false)], [{ storeId: 'A', email: 'same' }]);
  assert.equal(rows[0].activeUsers, 1); assert.equal(rows[0].withoutAccount, 0);
  assert.equal(rows[1].inactiveUsers, 1); assert.equal(rows[1].withoutAccount, 1);
});
test('case/whitespace normalization, email fallback, duplicate/conflict diagnostics', () => {
  const [row] = summarize(stores, [emp('A', ' ONE@X '), emp('A', 'one@x', false), emp('A', ' ', false, { email: 'two@x' }), emp('A', '')], [{ storeId: 'A', email: 'one@x' }]);
  assert.equal(row.activeUsers, 1); assert.equal(row.inactiveUsers, 1);
  assert.equal(row.duplicateLogins, 1); assert.equal(row.conflictingStatuses, 1);
  assert.equal(row.missingEmail, 1); assert.equal(row.withoutAccount, 1);
});
test('creation, status update, soft deletion, reactivation and physical removal recalculate totals', () => {
  let employees = [];
  const count = () => summarize(stores, employees, [])[0];
  assert.equal(count().totalUsers, 0);
  employees.push(emp('A', 'one')); assert.equal(count().activeUsers, 1);
  employees[0].active = false; assert.equal(count().inactiveUsers, 1);
  employees[0].active = true; assert.equal(count().inactiveUsers, 0);
  employees[0].isSystemUser = false; assert.equal(count().totalUsers, 0);
  employees = []; assert.equal(count().totalUsers, 0);
});

const { AdminService } = load('modules/admin/admin.service.ts', {
  '../../prisma/prisma.service': {}, '../auth/types/auth.types': {},
  '@prisma/client': { Prisma: { TransactionIsolationLevel: { RepeatableRead: 'RepeatableRead' } } },
  './company-user-summary': { summarizeCompanyUsers: summarize },
});
test('staff authorization fails closed before database query, including tenant admin', async () => {
  let queried = false;
  const prisma = { $transaction() { queried = true; } };
  for (const configured of [undefined, '', 'staff@x']) {
    const service = new AdminService(prisma, { get: () => configured });
    await assert.rejects(service.companyUsers({ email: 'operator@x', storeId: 'A' }), (err) => err.getStatus() === 403);
  }
  assert.equal(queried, false);
});
test('authorized request uses snapshot, minimal fields and system-user predicate', async () => {
  let options;
  const prisma = {
    store: { findMany(input) { assert.deepEqual(input.select, { id: true, tradeName: true }); return stores; } },
    employee: { findMany(input) { assert.deepEqual(input.where, { isSystemUser: true }); return [emp('A', 'one')]; } },
    user: { findMany(input) { assert.deepEqual(input.select, { storeId: true, email: true }); return []; } },
    async $transaction(queries, opts) { options = opts; return queries; },
  };
  const service = new AdminService(prisma, { get: () => ' STAFF@X ' });
  const rows = await service.companyUsers({ email: 'staff@x' });
  assert.equal(rows.length, 3); assert.equal(rows[0].activeUsers, 1);
  assert.deepEqual(options, { isolationLevel: 'RepeatableRead' });
});
test('database errors propagate without invented zero totals', async () => {
  const prisma = {
    store: { findMany() {} }, employee: { findMany() {} }, user: { findMany() {} },
    async $transaction() { throw new Error('database unavailable'); },
  };
  await assert.rejects(new AdminService(prisma, { get: () => 'staff@x' }).companyUsers({ email: 'staff@x' }), /database unavailable/);
});

