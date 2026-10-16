import { expect, test, type Page } from "@playwright/test";
import { E2E_PREFIX as BASE_PREFIX, cleanupE2eRecords } from "./helpers/db";
import { login } from "./helpers/session";

const E2E_PREFIX = `${BASE_PREFIX}UI `;
const stamp = Date.now();
const accountName = `${E2E_PREFIX}Blue Harbor Robotics ${stamp}`;

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await cleanupE2eRecords(E2E_PREFIX);
});

const openAccountsList = async (page: Page) => {
  // Un seul chargement : relancer goto pendant la compilation dev relance la page en boucle.
  await page.goto("/");
  const accounts = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Accounts" });
  await expect(accounts).toBeVisible({ timeout: 30_000 });
  await accounts.click();
  await expect(page.getByRole("button", { name: "Select a List View: Accounts" })).toBeVisible({ timeout: 30_000 });
};

/** Clique un bouton d'ouverture jusqu'à ce que son menu apparaisse (la page peut ne pas être hydratée au premier clic en dev). */
const openMenu = async (page: Page, buttonName: string, menu: ReturnType<Page["getByRole"]>) => {
  await expect(async () => {
    await page.getByRole("button", { name: buttonName }).click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
};

test.describe("Accounts module", () => {
  let accountUrl: string;

  test("NAV-1: the Accounts tab opens the default list view with its toolbar", async ({ page }) => {
    test.setTimeout(90_000);
    await openAccountsList(page);
    await expect(page.getByRole("button", { name: "Select a List View: Accounts" })).toContainText("All Accounts");
    await expect(page.getByRole("status").filter({ hasText: "Sorted by Account Name" })).toContainText("Filtered by All accounts");
    await expect(page.getByRole("table", { name: "Accounts" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Select All" })).toBeVisible();
    await expect(page.getByPlaceholder("Search this list...")).toBeVisible();
    await expect(page.getByRole("button", { name: "List View Controls" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select list display" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New" })).toBeVisible();

    const listbox = page.getByRole("listbox", { name: "List Views" });
    await openMenu(page, "Select a List View: Accounts", listbox);
    await expect(listbox.getByRole("option", { name: /Recently Viewed/ })).toBeVisible();
    await expect(listbox.getByRole("option", { name: /My Accounts/ })).toBeVisible();
    await expect(listbox.getByRole("option", { name: /New This Week/ })).toBeVisible();
    await page.getByRole("combobox", { name: "Search lists..." }).fill("Recently");
    await expect(listbox.getByRole("option")).toHaveCount(1);
    await listbox.getByRole("option", { name: /Recently Viewed/ }).click();
    await expect(page).toHaveURL(/view=Recent/);
    await expect(page.getByRole("button", { name: "Select a List View: Accounts" })).toContainText("Recently Viewed");
  });

  test("FRM-1 / FRM-3: New Account validates the name at blur and saves with dependent country/state", async ({ page }) => {
    await page.goto("/accounts");
    await page.getByRole("link", { name: "New" }).click();
    await expect(page.getByRole("dialog", { name: "New Account" })).toBeVisible();
    await expect(page.getByText("* = Required Information")).toBeVisible();
    await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Get in Touch" })).toBeVisible();
    const owner = page.getByLabel("Account Owner", { exact: true });
    await expect(owner).toBeVisible();
    await expect(owner.locator("option:checked")).toHaveText("Demo Admin (demoadm)");

    const name = page.locator("#field-name");
    await name.focus();
    await page.getByLabel("Website", { exact: true }).focus();
    await expect(page.getByText("Complete this field.")).toBeVisible();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "New Account" })).toBeVisible();
    await expect(name).toBeFocused();

    await page.getByLabel("Website", { exact: true }).fill("https://blueharbor.example");
    await expect(page.getByRole("button", { name: "Undo Website" })).toBeVisible();
    await page.getByRole("button", { name: "Undo Website" }).click();
    await expect(page.getByLabel("Website", { exact: true })).toHaveValue("");
    await page.getByLabel("Website", { exact: true }).fill("https://blueharbor.example");

    await name.fill(accountName);
    await expect(page.getByText("Complete this field.")).toHaveCount(0);
    await page.getByLabel("Type", { exact: true }).selectOption("Customer");
    await page.getByLabel("Phone", { exact: true }).fill("+1 555 0142");

    const billingState = page.getByLabel("Billing State/Province", { exact: true });
    await expect(billingState).toBeDisabled();
    await page.getByLabel("Billing Country", { exact: true }).selectOption("US");
    await expect(billingState).toBeEnabled();
    await billingState.selectOption("WA");
    await page.getByLabel("Billing City", { exact: true }).fill("Seattle");
    await page.getByLabel("Billing Country", { exact: true }).selectOption("FR");
    await expect(billingState).toBeDisabled();
    await expect(page.getByText("No state/province values for this country.")).toBeVisible();
    await page.getByLabel("Billing Country", { exact: true }).selectOption("US");
    await billingState.selectOption("WA");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/accounts\/[a-z0-9]+/);
    await expect(page.getByRole("status").filter({ hasText: "was created." })).toBeVisible();
    await expect(page.getByTestId("account-name")).toHaveText(accountName);
    await expect(page.getByText("Billing Address")).toBeVisible();
    await expect(page.getByText("Seattle, Washington")).toBeVisible();
    accountUrl = page.url().split("?")[0];
  });

  test("Save & New keeps the form open for another account", async ({ page }) => {
    await page.goto("/accounts/new");
    await page.locator("#field-name").fill(`${E2E_PREFIX}Save and New ${stamp}`);
    await page.getByRole("button", { name: "Save & New" }).click();
    await expect(page).toHaveURL(/\/accounts\/new/);
    await expect(page.getByRole("status").filter({ hasText: "was created." })).toBeVisible();
    await expect(page.locator("#field-name")).toHaveValue("");
  });

  test("LST-7 / NAV-3: the account is found through the list search and the global search", async ({ page }) => {
    await page.goto("/accounts");
    await page.getByPlaceholder("Search this list...").fill(`Blue Harbor Robotics ${stamp}`);
    await page.getByPlaceholder("Search this list...").press("Enter");
    await expect(page).toHaveURL(/q=Blue/);
    await expect(page.getByRole("status").filter({ hasText: "1 item" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Accounts" }).getByRole("link", { name: accountName, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page).not.toHaveURL(/q=/);

    await page.getByPlaceholder("Search this list...").fill("zzzz-nothing-matches");
    await page.getByPlaceholder("Search this list...").press("Enter");
    await expect(page.getByRole("heading", { name: "No items to display." })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search Accounts and more" }).fill(`Blue Harbor Robotics ${stamp}`);
    await page.getByRole("searchbox", { name: "Search Accounts and more" }).press("Enter");
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(page.getByRole("heading", { name: /Accounts \(1\)/ })).toBeVisible();
    await page.getByRole("link", { name: accountName, exact: true }).click();
    await expect(page.getByTestId("account-name")).toHaveText(accountName);

    await page.goto("/search?q=zzzz-nothing-matches");
    await expect(page.getByText(/didn't find any matches for "zzzz-nothing-matches"/)).toBeVisible();
  });

  test("Record page: Details and Related tabs, then Edit with Undo and Save", async ({ page }) => {
    await page.goto(accountUrl);
    await expect(page.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Created By")).toBeVisible();
    await page.getByRole("tab", { name: "Related" }).click();
    await expect(page.getByRole("heading", { name: /Contacts \(0\)/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Opportunities \(0\)/ })).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("dialog", { name: `Edit ${accountName}` })).toBeVisible();
    await expect(page.locator("#field-name")).toHaveValue(accountName);
    await expect(page.getByLabel("Billing State/Province", { exact: true })).toHaveValue("WA");

    await page.getByLabel("Phone", { exact: true }).fill("+1 555 0199");
    await expect(page.getByRole("button", { name: "Undo Phone" })).toBeVisible();
    await page.getByRole("button", { name: "Undo Phone" }).click();
    await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("+1 555 0142");
    await page.getByLabel("Phone", { exact: true }).fill("+1 555 0199");
    await page.locator("#field-name").fill("");
    await page.getByLabel("Phone", { exact: true }).focus();
    await expect(page.getByText("Complete this field.")).toBeVisible();
    await page.locator("#field-name").fill(accountName);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`${accountUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    await expect(page.getByRole("status").filter({ hasText: "was saved." })).toBeVisible();
    await expect(page.getByRole("definition").filter({ hasText: "+1 555 0199" }).first()).toBeVisible();
  });

  test("FLT-1 / FLT-3: filters are saved on a personal view and applied with filter logic", async ({ page }) => {
    const viewLabel = `${E2E_PREFIX}Customers & partners ${stamp}`;
    await page.goto("/accounts");
    await openMenu(page, "List View Controls", page.getByRole("menu", { name: "List View Controls" }));
    await page.getByRole("menuitem", { name: "New" }).click();
    await page.getByRole("dialog", { name: "New List View" }).getByLabel("List Name").fill(viewLabel);
    await page.getByRole("dialog", { name: "New List View" }).getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: `List view "${viewLabel}" was created.` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select a List View: Accounts" })).toContainText(viewLabel);

    await page.getByRole("link", { name: "Filters" }).click();
    const panel = page.getByRole("complementary", { name: "Filters" });
    await expect(panel.getByRole("heading", { name: "Filters" })).toBeVisible();
    await expect(panel.getByText("No additional filters.")).toBeVisible();

    await panel.getByRole("button", { name: "Add Filter" }).click();
    await panel.getByLabel("Field 1").selectOption("type");
    await expect(panel.getByLabel("Operator 1")).toHaveValue("equals");
    await panel.getByLabel("Value 1").selectOption(["Customer"]);
    await panel.getByRole("button", { name: "Add Filter" }).click();
    await panel.getByLabel("Field 2").selectOption("type");
    await panel.getByLabel("Value 2").selectOption(["Partner"]);
    await panel.getByRole("button", { name: "Add Filter Logic" }).click();
    await panel.getByLabel("Filter Logic").fill("1 OR 2");
    await panel.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Filtered by All accounts + 2 filters" })).toBeVisible();
    const typeCells = page.getByRole("table", { name: "Accounts" }).locator("tbody tr");
    await expect(typeCells.first()).toBeVisible();
    await expect(page.getByRole("table", { name: "Accounts" }).getByRole("link", { name: accountName, exact: true })).toBeVisible();

    await panel.getByLabel("Filter Logic").fill("1 AND 2");
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "No items to display." })).toBeVisible();

    await panel.getByRole("button", { name: "Remove All" }).click();
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Filtered by All accounts" })).not.toContainText("+ 2 filters");

    await openMenu(page, "List View Controls", page.getByRole("menu", { name: "List View Controls" }));
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByRole("dialog", { name: "Rename List View" }).getByLabel("List Name").fill(`${viewLabel} renamed`);
    await page.getByRole("dialog", { name: "Rename List View" }).getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Select a List View: Accounts" })).toContainText(`${viewLabel} renamed`);

    await openMenu(page, "List View Controls", page.getByRole("menu", { name: "List View Controls" }));
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete List View" }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("button", { name: "Select a List View: Accounts" })).toContainText("All Accounts");
  });

  test("LST-3 / LST-5 / LST-6: Table, Kanban and Split View display modes", async ({ page }) => {
    await page.goto("/accounts");
    await openMenu(page, "Select list display", page.getByRole("menu", { name: "Select list display" }));
    await page.getByRole("menuitemradio", { name: "Kanban" }).click();
    const settings = page.getByRole("dialog", { name: "Kanban Settings" });
    await expect(settings).toBeVisible();
    await settings.getByRole("button", { name: "Save" }).click();
    await expect(settings.getByText("Complete this field.")).toBeVisible();
    await settings.getByLabel("Group By").selectOption("type");
    await settings.getByLabel("Summarize By").selectOption("annualRevenue");
    await settings.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/display=kanban/);
    const board = page.getByLabel("Kanban grouped by Type");
    await expect(board).toBeVisible();
    await expect(board.getByRole("region", { name: "Customer" })).toBeVisible();
    await expect(board.getByRole("link", { name: accountName, exact: true })).toBeVisible();

    await openMenu(page, "Select list display", page.getByRole("menu", { name: "Select list display" }));
    await page.getByRole("menuitemradio", { name: "Split View" }).click();
    await expect(page).toHaveURL(/display=split/);
    await expect(page.getByRole("heading", { name: "No record selected" })).toBeVisible();
    await page.getByRole("navigation", { name: "Select an item from this list to open it." }).getByRole("link", { name: accountName }).click();
    await expect(page.getByRole("heading", { name: accountName })).toBeVisible();
    await expect(page.getByText("Get in Touch")).toBeVisible();

    await openMenu(page, "Select list display", page.getByRole("menu", { name: "Select list display" }));
    await page.getByRole("menuitemradio", { name: "Table" }).click();
    await expect(page).not.toHaveURL(/display=/);
    await expect(page.getByRole("table", { name: "Accounts" })).toBeVisible();

    await page.getByRole("button", { name: "Sort Account Name" }).click();
    await expect(page).toHaveURL(/sort=name&dir=desc|dir=desc/);
    await page.getByRole("checkbox", { name: "Select All" }).check();
    await expect(page.getByRole("status").filter({ hasText: "items selected" })).toBeVisible();
  });

  test("Authorization (designed): a standard user cannot edit an account owned by the administrator", async ({ page }) => {
    await page.goto(accountUrl);
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
    await login(page, "demostd");
    await page.goto(accountUrl);
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByText("Edit", { exact: true })).toHaveAttribute("aria-disabled", "true");
    await page.goto(`${accountUrl}/edit`);
    await expect(page.getByRole("heading", { name: "You can only edit accounts you own." })).toBeVisible();
    await login(page, "demoadm");
    await page.goto(`${accountUrl}/edit`);
    await expect(page.getByRole("dialog", { name: `Edit ${accountName}` })).toBeVisible();
    await page.goto(accountUrl);
    await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  });

  test("Unknown accounts show the not-found state", async ({ page }) => {
    await page.goto("/accounts/does-not-exist");
    await expect(page.getByText("This account does not exist or was deleted.")).toBeVisible();
    await page.getByRole("link", { name: "Back to Accounts" }).click();
    await expect(page.getByRole("table", { name: "Accounts" })).toBeVisible();
  });
});
