export const leadDisplayName = (lead: { firstName: string | null; lastName: string }) =>
  [lead.firstName, lead.lastName].filter((part) => part && part.trim()).join(" ");
