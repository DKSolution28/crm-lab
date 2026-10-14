import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXACTLY_ONE_PARENT_MESSAGE,
  PARENT_NOT_FOUND_MESSAGE,
  PARENT_REQUIRED_MESSAGE,
  ParentRequiredError,
  REQUIRED_MESSAGE,
  ValidationError,
  applyParentExistence,
  assertSingleParentColumns,
  collectParentRefs,
  parentColumnCount,
  parentColumns,
  taskInputFromFormData,
  validateTaskFields,
} from "../../src/lib/activities/validation";

describe("validateTaskFields", () => {
  it("requires a subject, defaults status and priority, and caps the subject at 255", () => {
    const missing = validateTaskFields({ subject: "   " }, { applyDefaults: true });
    assert.equal(missing.errors.subject, REQUIRED_MESSAGE);
    assert.equal(missing.errors.subject, "Complete this field.");

    const defaults = validateTaskFields({ subject: " Call the buyer " }, { applyDefaults: true });
    assert.deepEqual(defaults.errors, {});
    assert.equal(defaults.data.subject, "Call the buyer");
    assert.equal(defaults.data.status, "NotStarted");
    assert.equal(defaults.data.priority, "Normal");
    assert.equal(defaults.data.dueDate, null);
    assert.equal(defaults.data.assigneeId, null);
    assert.equal(defaults.data.description, null);

    const tooLong = validateTaskFields({ subject: "S".repeat(256), description: "D".repeat(32001) }, { applyDefaults: true });
    assert.equal(tooLong.errors.subject, "Maximum length is 255 characters.");
    assert.equal(tooLong.errors.description, "Maximum length is 32000 characters.");
  });

  it("accepts the designed status and priority values and a calendar due date", () => {
    const result = validateTaskFields(
      { subject: "Call", status: "InProgress", priority: "High", dueDate: "2026-10-20" },
      { applyDefaults: true },
    );
    assert.deepEqual(result.errors, {});
    assert.equal(result.data.status, "InProgress");
    assert.equal(result.data.priority, "High");
    assert.equal(result.data.dueDate?.toISOString(), "2026-10-20T00:00:00.000Z");

    const bad = validateTaskFields({ subject: "Call", status: "Deferred", priority: "Urgent", dueDate: "2026-02-31" }, { applyDefaults: true });
    assert.equal(bad.errors.status, `"Deferred" is not a valid Status value.`);
    assert.equal(bad.errors.priority, `"Urgent" is not a valid Priority value.`);
    assert.equal(bad.errors.dueDate, "Enter a due date as YYYY-MM-DD.");
  });

  it("records the unknown-parent field error without accepting two parents", () => {
    const errors: Record<string, string> = {};
    applyParentExistence(errors, false);
    assert.equal(errors.parent, PARENT_NOT_FOUND_MESSAGE);
    assert.equal(errors.parent, "The related record was not found.");
    applyParentExistence(errors, true);
    assert.equal(errors.parent, PARENT_NOT_FOUND_MESSAGE);

    const single = collectParentRefs({ parent: { type: "Account", id: "acc" }, accountId: "acc" });
    assert.equal(single.incoherent, false);
    assert.deepEqual(single.refs, [{ type: "Account", id: "acc" }]);
    assert.equal(parentColumnCount(parentColumns(single.refs[0])), 1);

    const two = collectParentRefs({
      parent: { type: "Account", id: "acc" },
      contactId: "con",
    });
    assert.equal(two.refs.length, 2);
    assert.throws(
      () => assertSingleParentColumns({ accountId: "acc", contactId: "con", leadId: null, opportunityId: null }),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.fieldErrors.parent, EXACTLY_ONE_PARENT_MESSAGE);
        assert.equal(error.fieldErrors.parent, "A task has exactly one parent.");
        return true;
      },
    );

    const missing = collectParentRefs({ subject: "Call" });
    assert.equal(missing.refs.length, 0);
    const required = new ParentRequiredError();
    assert.equal(required.message, PARENT_REQUIRED_MESSAGE);
    assert.equal(required.message, "A parent record is required.");
  });

  it("reads the parent discriminant from the form", () => {
    const form = new FormData();
    form.set("subject", "Call");
    form.set("parentType", "Contact");
    form.set("parentId", "con");
    form.set("priority", "Low");
    const input = taskInputFromFormData(form);
    assert.equal(input.subject, "Call");
    assert.deepEqual(input.parent, { type: "Contact", id: "con" });
    assert.equal("accountId" in input, false);
    const collected = collectParentRefs(input);
    assert.deepEqual(collected.refs, [{ type: "Contact", id: "con" }]);
  });
});
