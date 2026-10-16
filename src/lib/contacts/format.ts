export const contactName = (contact: { firstName?: string | null; lastName: string }) =>
  [contact.firstName, contact.lastName].filter((part) => !!part && part.trim()).join(" ");
