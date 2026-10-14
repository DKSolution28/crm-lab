// Conversion atomique d'un lead. Le claim, le compte, le contact et
// l'opportunité facultative partagent un seul client de transaction.
import type { Lead, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { CurrentUser } from "../auth/current-user";
import { AuthorizationError, canEditRecord } from "../auth/policies";
import { NotFoundError } from "../accounts/service";
import { createAccount } from "../accounts/service";
import { createContact } from "../contacts/service";
import { createOpportunity } from "../opportunities/service";
import { CLOSE_DATE_MESSAGE, parseAmount } from "../opportunities/validation";
import { ConflictError, type LeadConversionConflict } from "../errors";
import { REQUIRED_MESSAGE, ValidationError, isRecord, type FieldErrors } from "./validation";

export const QUALIFY_BEFORE_CONVERT = "Qualify the lead before converting it.";
export const ALREADY_CONVERTED = "This lead is already converted.";

const OPEN_STAGES = ["Qualification", "Proposal", "Negotiation"] as const;
const CLOSED_STAGES = ["ClosedWon", "ClosedLost"] as const;
const CLOSE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ACCOUNT_NAME_MAX = 255;
const OPPORTUNITY_NAME_MAX = 120;

export type PlannedOpportunity = {
  name: string;
  amount: string | null;
  closeDate: string;
  stage: string;
};

export type ConvertInput = {
  createOpportunity: boolean;
  accountName: string;
  opportunity: PlannedOpportunity | null;
};

export type LeadConversionResult = {
  leadId: string;
  accountId: string;
  contactId: string;
  opportunityId: string | null;
  convertedAt: string;
};

const throwIfInvalid = (errors: FieldErrors) => {
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
};

/** Étape d'opportunité acceptée à la conversion. ClosedWon et ClosedLost sont refusées. */
export const opportunityStageError = (stage: string): string | undefined => {
  if ((CLOSED_STAGES as readonly string[]).includes(stage)) return `"${stage}" is not allowed when converting a lead.`;
  if (!(OPEN_STAGES as readonly string[]).includes(stage)) return `"${stage}" is not a valid Stage value.`;
  return undefined;
};

const closeDateError = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return REQUIRED_MESSAGE;
  if (typeof value !== "string" || !CLOSE_DATE_PATTERN.test(value.trim())) return CLOSE_DATE_MESSAGE;
  const match = CLOSE_DATE_PATTERN.exec(value.trim());
  if (!match) return CLOSE_DATE_MESSAGE;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return CLOSE_DATE_MESSAGE;
  return undefined;
};

const snapshot = (lead: Pick<Lead, "convertedAccountId" | "convertedContactId" | "convertedOpportunityId" | "convertedAt">): LeadConversionConflict => ({
  accountId: lead.convertedAccountId,
  contactId: lead.convertedContactId,
  opportunityId: lead.convertedOpportunityId,
  convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : new Date(0).toISOString(),
});

const canConvertStatus = (status: string) => status === "New" || status === "Working";

/**
 * Lit le corps de conversion. Le stade fermé ou inconnu est conservé pour être
 * refusé après le claim, dans la même transaction que les créations.
 */
export const readConvertInput = (body: unknown, company: string): ConvertInput => {
  const errors: FieldErrors = {};
  const record = isRecord(body) ? body : {};
  let createOpportunity = false;
  if (Object.prototype.hasOwnProperty.call(record, "createOpportunity")) {
    if (typeof record.createOpportunity !== "boolean") errors.createOpportunity = "createOpportunity must be true or false.";
    else createOpportunity = record.createOpportunity;
  }

  let accountName = company.trim();
  if (Object.prototype.hasOwnProperty.call(record, "accountName")) {
    if (typeof record.accountName !== "string") errors.accountName = REQUIRED_MESSAGE;
    else accountName = record.accountName.trim();
  }
  if (!errors.accountName && !accountName) errors.accountName = REQUIRED_MESSAGE;
  if (!errors.accountName && accountName.length > ACCOUNT_NAME_MAX) errors.accountName = `Maximum length is ${ACCOUNT_NAME_MAX} characters.`;

  let opportunity: PlannedOpportunity | null = null;
  if (createOpportunity && !errors.createOpportunity) {
    if (!isRecord(record.opportunity)) {
      errors.opportunity = REQUIRED_MESSAGE;
    } else {
      const source = record.opportunity;
      let name = `${company.trim()} — Opportunity`;
      if (Object.prototype.hasOwnProperty.call(source, "name")) {
        if (typeof source.name !== "string" || !source.name.trim()) errors["opportunity.name"] = REQUIRED_MESSAGE;
        else name = source.name.trim();
      }
      if (!errors["opportunity.name"] && name.length > OPPORTUNITY_NAME_MAX) {
        errors["opportunity.name"] = `Maximum length is ${OPPORTUNITY_NAME_MAX} characters.`;
      }

      let amount: string | null = null;
      if (Object.prototype.hasOwnProperty.call(source, "amount")) {
        const parsed = parseAmount(source.amount);
        if (!parsed.ok) errors["opportunity.amount"] = parsed.message;
        else amount = parsed.amount;
      }

      const dateError = closeDateError(source.closeDate);
      if (dateError) errors["opportunity.closeDate"] = dateError;

      let stage = "Qualification";
      if (Object.prototype.hasOwnProperty.call(source, "stage") && source.stage !== undefined && source.stage !== null && source.stage !== "") {
        if (typeof source.stage !== "string") errors["opportunity.stage"] = `"${String(source.stage)}" is not a valid Stage value.`;
        else stage = source.stage.trim() || "Qualification";
      }

      opportunity = {
        name,
        amount,
        closeDate: typeof source.closeDate === "string" ? source.closeDate.trim() : "",
        stage,
      };
    }
  }

  throwIfInvalid(errors);
  return { createOpportunity, accountName, opportunity };
};

export const convertInputFromFormData = (formData: FormData): Record<string, unknown> => {
  const accountName = formData.get("accountName");
  const createOpportunity = formData.get("createOpportunity") === "true";
  const body: Record<string, unknown> = {
    createOpportunity,
    accountName: typeof accountName === "string" ? accountName : "",
  };
  if (!createOpportunity) return body;
  const opportunityName = String(formData.get("opportunityName") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const opportunity: Record<string, unknown> = {
    closeDate: String(formData.get("closeDate") ?? ""),
    stage: String(formData.get("stage") ?? ""),
  };
  if (opportunityName) opportunity.name = opportunityName;
  if (amount) opportunity.amount = amount;
  body.opportunity = opportunity;
  return body;
};

const remapOpportunityErrors = (fieldErrors: FieldErrors): FieldErrors => {
  const mapped: FieldErrors = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    const next =
      key === "stageName"
        ? "opportunity.stage"
        : key === "amount"
          ? "opportunity.amount"
          : key === "closeDate"
            ? "opportunity.closeDate"
            : key === "name"
              ? "opportunity.name"
              : key === "accountId"
                ? "opportunity.accountId"
                : key === "primaryContactId"
                  ? "opportunity.primaryContactId"
                  : key === "ownerId"
                    ? "opportunity.ownerId"
                    : key;
    mapped[next] = message;
  }
  return mapped;
};

const rejectClaim = async (tx: Prisma.TransactionClient, id: string): Promise<never> => {
  const current = await tx.lead.findUnique({ where: { id } });
  if (!current) throw new NotFoundError("Lead not found");
  if (current.convertedAt) throw new ConflictError(ALREADY_CONVERTED, snapshot(current));
  throw new ValidationError({ qualified: QUALIFY_BEFORE_CONVERT });
};

export const convertLead = async (id: string, input: unknown, user: CurrentUser): Promise<LeadConversionResult> => {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Lead not found");
  if (existing.convertedAt) throw new ConflictError(ALREADY_CONVERTED, snapshot(existing));
  if (!canEditRecord(user, existing)) throw new AuthorizationError("You can only edit leads you own.");
  if (!existing.qualified || !canConvertStatus(existing.status)) throw new ValidationError({ qualified: QUALIFY_BEFORE_CONVERT });

  const planned = readConvertInput(input, existing.company);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.$executeRaw`
      UPDATE "Lead"
      SET "status" = 'Converted'::"LeadStatus",
          "convertedAt" = NOW(),
          "lastModifiedById" = ${user.id}
      WHERE "id" = ${id}
        AND "convertedAt" IS NULL
        AND "qualified" = TRUE
        AND "status" IN ('New'::"LeadStatus", 'Working'::"LeadStatus")
    `;
    if (Number(claimed) !== 1) return rejectClaim(tx, id);

    const account = await createAccount({ name: planned.accountName, ownerId: existing.ownerId }, user, tx);
    const contact = await createContact(
      {
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        phone: existing.phone,
        title: existing.title,
        description: existing.description,
        accountId: account.id,
        ownerId: existing.ownerId,
      },
      user,
      tx,
    );

    let opportunityId: string | null = null;
    if (planned.opportunity) {
      const stageError = opportunityStageError(planned.opportunity.stage);
      if (stageError) throw new ValidationError({ "opportunity.stage": stageError });
      try {
        const opportunity = await createOpportunity(
          {
            name: planned.opportunity.name,
            stageName: planned.opportunity.stage,
            amount: planned.opportunity.amount,
            closeDate: planned.opportunity.closeDate,
            accountId: account.id,
            primaryContactId: contact.id,
            ownerId: existing.ownerId,
          },
          user,
          tx,
        );
        opportunityId = opportunity.id;
      } catch (error) {
        if (error instanceof ValidationError) throw new ValidationError(remapOpportunityErrors(error.fieldErrors));
        throw error;
      }
    }

    const updated = await tx.lead.update({
      where: { id },
      data: {
        convertedAccountId: account.id,
        convertedContactId: contact.id,
        convertedOpportunityId: opportunityId,
      },
      select: { convertedAt: true },
    });
    if (!updated.convertedAt) throw new Error("Conversion did not record convertedAt.");

    return {
      leadId: id,
      accountId: account.id,
      contactId: contact.id,
      opportunityId,
      convertedAt: updated.convertedAt.toISOString(),
    };
  });
};
