export const formatPublicIdentity = (name?: string | null, email?: string | null): string => {
  const publicName = name?.trim();
  if (publicName) {
    return publicName;
  }

  const publicEmail = email?.trim();
  if (publicEmail) {
    return publicEmail;
  }

  return "Usuario";
};
