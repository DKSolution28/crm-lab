import { expect, test, type APIRequestContext } from "@playwright/test";
import { E2E_PREFIX as BASE_PREFIX, cleanupE2eRecords } from "./helpers/db";
import { authCookie, ensureDemoUsers } from "./helpers/session";

const E2E_PREFIX = `${BASE_PREFIX}API `;
const stamp = Date.now();
let asAdmin: { cookie: string };
let asStandard: { cookie: string };

test.beforeAll(async () => {
  await ensureDemoUsers();
  asAdmin = { cookie: await authCookie("demoadm") };
  asStandard = { cookie: await authCookie("demostd") };
});

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await cleanupE2eRecords(E2E_PREFIX);
});

test.describe("Accounts API", () => {
  let accountId: string;

  test("GET /api/picklists exposes picklists, countries, operators and fields", async ({ request }) => {
    const response = await request.get("/api/picklists");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.picklists.type.map((o: { value: string }) => o.value)).toContain("Customer");
    expect(body.picklists.industry.some((o: { active: boolean }) => o.active === false)).toBe(true);
    expect(body.countries.find((c: { code: string }) => c.code === "US").states.length).toBeGreaterThan(0);
    expect(body.operators.map((o: { value: string }) => o.value)).toEqual(expect.arrayContaining(["equals", "contains", "starts_with"]));
    expect(body.fields.some((f: { key: string }) => f.key === "name")).toBe(true);
  });

  test("GET /api/users returns the demo users and the current one", async ({ request }) => {
    const response = await request.get("/api/users", { headers: asStandard });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.current.alias).toBe("demostd");
    expect(body.items.map((u: { alias: string }) => u.alias)).toEqual(expect.arrayContaining(["demoadm", "demostd"]));
  });

  test("POST /api/accounts validates the payload", async ({ request }) => {
    const empty = await request.post("/api/accounts", { data: { name: "" }, headers: asStandard });
    expect(empty.status()).toBe(400);
    expect((await empty.json()).fieldErrors.name).toBe("Complete this field.");

    const badPicklist = await request.post("/api/accounts", { data: { name: `${E2E_PREFIX}Bad`, type: "Supplier", billingCountryCode: "US", billingStateCode: "ZZ" }, headers: asStandard });
    expect(badPicklist.status()).toBe(400);
    const errors = (await badPicklist.json()).fieldErrors;
    expect(errors.type).toMatch(/not a valid Type value/);
    expect(errors.billingStateCode).toMatch(/not a state\/province/);

    const invalidJson = await request.post("/api/accounts", { data: "{not json", headers: { ...asStandard, "content-type": "application/json" } });
    expect(invalidJson.status()).toBe(400);
  });

  test("POST /api/accounts creates an account owned by the caller", async ({ request }) => {
    const response = await request.post("/api/accounts", {
      headers: asStandard,
      data: {
        name: `${E2E_PREFIX}API Harbor ${stamp}`,
        type: "Prospect",
        industry: "Shipping",
        phone: "+1 555 0199",
        website: "https://harbor.example",
        annualRevenue: 750000,
        numberOfEmployees: 35,
        billingCountryCode: "CA",
        billingStateCode: "BC",
        billingCity: "Vancouver",
      },
    });
    expect(response.status()).toBe(201);
    const account = await response.json();
    accountId = account.id;
    expect(account.owner.alias).toBe("demostd");
    expect(account.billingCountry).toBe("Canada");
    expect(account.billingState).toBe("British Columbia");
    expect(account.annualRevenue).toBe("750000");
  });

  test("GET /api/accounts lists, searches, sorts and paginates", async ({ request }) => {
    const all = await request.get(`/api/accounts?view=AllAccounts&q=${encodeURIComponent(`API Harbor ${stamp}`)}`, { headers: asStandard });
    expect(all.status()).toBe(200);
    const body = await all.json();
    expect(body.view.developerName).toBe("AllAccounts");
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe(accountId);
    expect(body.view.columns).toContain("name");

    const mineAsAdmin = await request.get(`/api/accounts?view=MyAccounts&q=${encodeURIComponent(`API Harbor ${stamp}`)}`, { headers: asAdmin });
    expect((await mineAsAdmin.json()).total).toBe(0);

    const asc = await (await request.get("/api/accounts?view=AllAccounts&sort=name&dir=asc&pageSize=200", { headers: asStandard })).json();
    const desc = await (await request.get("/api/accounts?view=AllAccounts&sort=name&dir=desc&pageSize=200", { headers: asStandard })).json();
    expect(asc.sortDirection).toBe("asc");
    expect(desc.sortDirection).toBe("desc");
    expect(asc.items.length).toBeGreaterThan(1);
    expect(desc.items.map((item: { id: string }) => item.id)).toEqual([...asc.items.map((item: { id: string }) => item.id)].reverse());

    const paged = await (await request.get("/api/accounts?view=AllAccounts&sort=name&dir=asc&pageSize=2&page=2", { headers: asStandard })).json();
    expect(paged.page).toBe(2);
    expect(paged.items.map((item: { id: string }) => item.id)).toEqual(asc.items.slice(2, 4).map((item: { id: string }) => item.id));

    const recent = await request.get("/api/accounts?view=Recent", { headers: asStandard });
    const recentBody = await recent.json();
    expect(recentBody.sortable).toBe(false);
    expect(recentBody.items.some((item: { id: string }) => item.id === accountId)).toBe(true);

    const missingView = await request.get("/api/accounts?view=DoesNotExist", { headers: asStandard });
    expect(missingView.status()).toBe(404);
  });

  test("GET /api/accounts/:id returns the record with relations and edit permission", async ({ request }) => {
    const owner = await request.get(`/api/accounts/${accountId}`, { headers: asStandard });
    expect(owner.status()).toBe(200);
    const body = await owner.json();
    expect(body.name).toBe(`${E2E_PREFIX}API Harbor ${stamp}`);
    expect(body.canEdit).toBe(true);
    expect(Array.isArray(body.contacts)).toBe(true);
    expect(Array.isArray(body.opportunities)).toBe(true);
    expect(Array.isArray(body.children)).toBe(true);

    const admin = await request.get(`/api/accounts/${accountId}`, { headers: asAdmin });
    expect((await admin.json()).canEdit).toBe(true);

    const missing = await request.get("/api/accounts/does-not-exist", { headers: asStandard });
    expect(missing.status()).toBe(404);
  });

  test("PATCH /api/accounts/:id merges partial updates and enforces ownership", async ({ request }) => {
    const patched = await request.patch(`/api/accounts/${accountId}`, { headers: asStandard, data: { rating: "Warm", shippingCountryCode: "FR" } });
    expect(patched.status()).toBe(200);
    const body = await patched.json();
    expect(body.rating).toBe("Warm");
    expect(body.shippingCountry).toBe("France");
    expect(body.type).toBe("Prospect");
    expect(body.billingCity).toBe("Vancouver");
    expect(body.lastModifiedBy.alias).toBe("demostd");

    const stealOwner = await request.patch(`/api/accounts/${accountId}`, { headers: asStandard, data: { ownerId: "someone-else" } });
    expect(stealOwner.status()).toBe(400);

    const adminAccount = await request.post("/api/accounts", { headers: asAdmin, data: { name: `${E2E_PREFIX}Admin Owned ${stamp}` } });
    const adminAccountId = (await adminAccount.json()).id;
    const forbidden = await request.patch(`/api/accounts/${adminAccountId}`, { headers: asStandard, data: { phone: "000" } });
    expect(forbidden.status()).toBe(403);

    const asAdminEdit = await request.patch(`/api/accounts/${accountId}`, { headers: asAdmin, data: { phone: "+1 555 0100" } });
    expect(asAdminEdit.status()).toBe(200);

    const selfParent = await request.patch(`/api/accounts/${accountId}`, { headers: asStandard, data: { parentId: accountId } });
    expect(selfParent.status()).toBe(400);
    expect((await selfParent.json()).fieldErrors.parentId).toMatch(/own parent/);

    const missing = await request.patch("/api/accounts/does-not-exist", { headers: asStandard, data: { phone: "1" } });
    expect(missing.status()).toBe(404);
  });

  test("GET /api/accounts/lookup suggests parent accounts", async ({ request }) => {
    const response = await request.get(`/api/accounts/lookup?q=${encodeURIComponent("API Harbor")}&exclude=${accountId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.every((item: { id: string }) => item.id !== accountId)).toBe(true);
    const unfiltered = await request.get(`/api/accounts/lookup?q=${encodeURIComponent("API Harbor")}`);
    expect((await unfiltered.json()).items.some((item: { id: string }) => item.id === accountId)).toBe(true);
  });
});

test.describe("List views API", () => {
  let viewId: string;

  const createView = async (request: APIRequestContext, label: string, headers = asStandard) => {
    const response = await request.post("/api/list-views", { headers, data: { label, visibility: "PRIVATE", scope: "ALL", columns: ["name", "type"] } });
    expect(response.status()).toBe(201);
    return response.json();
  };

  test("lists system views and the pinned view", async ({ request }) => {
    const response = await request.get("/api/list-views", { headers: asStandard });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items.map((v: { developerName: string | null }) => v.developerName)).toEqual(expect.arrayContaining(["Recent", "AllAccounts", "MyAccounts", "NewThisWeek"]));
    expect(body).toHaveProperty("pinnedId");
  });

  test("creates, renames, shares, reconfigures and clones a personal view", async ({ request }) => {
    const view = await createView(request, `${E2E_PREFIX}Partners ${stamp}`);
    viewId = view.id;
    expect(view.columns).toEqual(["name", "type"]);

    const renamed = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { label: `${E2E_PREFIX}Partners renamed ${stamp}` } });
    expect((await renamed.json()).label).toBe(`${E2E_PREFIX}Partners renamed ${stamp}`);

    const hiddenFromAdminScope = await request.get(`/api/list-views/${viewId}`, { headers: asAdmin });
    expect(hiddenFromAdminScope.status()).toBe(200);

    const shared = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { visibility: "EVERYONE" } });
    expect((await shared.json()).visibility).toBe("EVERYONE");

    const columns = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { columns: ["type", "billingCity"] } });
    expect((await columns.json()).columns).toEqual(["name", "type", "billingCity"]);

    const badColumn = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { label: "Should not persist", columns: ["nope"] } });
    expect(badColumn.status()).toBe(400);
    const afterRejectedPatch = await (await request.get(`/api/list-views/${viewId}`, { headers: asStandard })).json();
    expect(afterRejectedPatch.label).toBe(`${E2E_PREFIX}Partners renamed ${stamp}`);

    const sorted = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { sortField: "billingCity", sortDirection: "desc" } });
    const sortedBody = await sorted.json();
    expect(sortedBody.sortField).toBe("billingCity");
    expect(sortedBody.sortDirection).toBe("desc");

    const cloned = await request.post(`/api/list-views/${viewId}`, { headers: asAdmin, data: { action: "clone", label: `${E2E_PREFIX}Clone ${stamp}` } });
    expect(cloned.status()).toBe(201);
    const clonedBody = await cloned.json();
    expect(clonedBody.columns).toEqual(["name", "type", "billingCity"]);
    expect(clonedBody.visibility).toBe("PRIVATE");
  });

  test("saves filters with logic and applies them to the list", async ({ request }) => {
    await request.post("/api/accounts", { headers: asStandard, data: { name: `${E2E_PREFIX}Filtered Partner ${stamp}`, type: "Partner" } });
    await request.post("/api/accounts", { headers: asStandard, data: { name: `${E2E_PREFIX}Filtered Customer ${stamp}`, type: "Customer" } });
    await request.post("/api/accounts", { headers: asStandard, data: { name: `${E2E_PREFIX}Filtered Prospect ${stamp}`, type: "Prospect" } });

    const saved = await request.patch(`/api/list-views/${viewId}`, {
      headers: asStandard,
      data: {
        filters: [
          { field: "name", operator: "starts_with", value: E2E_PREFIX },
          { field: "type", operator: "equals", value: ["Partner"] },
          { field: "type", operator: "equals", value: ["Customer"] },
        ],
        filterLogic: "1 AND (2 OR 3)",
      },
    });
    expect(saved.status()).toBe(200);
    expect((await saved.json()).filterLogic).toBe("1 AND (2 OR 3)");

    const list = await request.get(`/api/accounts?view=${viewId}&q=${encodeURIComponent(`Filtered`)}`, { headers: asStandard });
    const body = await list.json();
    const names = body.items.map((item: { name: string }) => item.name);
    expect(names).toContain(`${E2E_PREFIX}Filtered Partner ${stamp}`);
    expect(names).toContain(`${E2E_PREFIX}Filtered Customer ${stamp}`);
    expect(names).not.toContain(`${E2E_PREFIX}Filtered Prospect ${stamp}`);

    const badLogic = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { filterLogic: "1 AND 9" } });
    expect(badLogic.status()).toBe(400);
    const badOperator = await request.patch(`/api/list-views/${viewId}`, { headers: asStandard, data: { filters: [{ field: "type", operator: "contains", value: "x" }], filterLogic: null } });
    expect(badOperator.status()).toBe(400);
  });

  test("pins a view and protects system views", async ({ request }) => {
    const pin = await request.post(`/api/list-views/${viewId}/pin`, { headers: asStandard });
    expect(pin.status()).toBe(200);
    const views = await request.get("/api/list-views", { headers: asStandard });
    expect((await views.json()).pinnedId).toBe(viewId);

    const all = await request.get("/api/list-views/AllAccounts", { headers: asStandard });
    const allId = (await all.json()).id;
    const forbidden = await request.patch(`/api/list-views/${allId}`, { headers: asStandard, data: { label: "Hacked" } });
    expect(forbidden.status()).toBe(403);
    const deleteSystem = await request.delete(`/api/list-views/${allId}`, { headers: asAdmin });
    expect(deleteSystem.status()).toBe(400);

    const restore = await request.post(`/api/list-views/${allId}/pin`, { headers: asStandard });
    expect(restore.status()).toBe(200);
  });

  test("deletes a personal view", async ({ request }) => {
    const other = await createView(request, `${E2E_PREFIX}Delete me ${stamp}`, asAdmin);
    const hidden = await request.delete(`/api/list-views/${other.id}`, { headers: asStandard });
    expect(hidden.status()).toBe(404);
    const deleted = await request.delete(`/api/list-views/${other.id}`, { headers: asAdmin });
    expect(deleted.status()).toBe(204);
    const gone = await request.get(`/api/list-views/${other.id}`, { headers: asAdmin });
    expect(gone.status()).toBe(404);
  });
});
