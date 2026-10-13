import { useSession } from "@/features/auth";

import { formatPublicIdentity } from "@/app/utils/format-public-identity";

export const usePublicIdentity = (): string | null => {
  const session = useSession();

  if (session.verification.status !== "success" || session.status !== "authenticated") {
    return null;
  }

  return formatPublicIdentity(null, session.user.email);
};
