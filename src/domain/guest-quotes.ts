export const isGuestOwner = (ownerId?: string) =>
  ownerId?.startsWith("guest-") ?? false;
