import { useQuery } from "@tanstack/react-query";

import { getCategory } from "../api/categories-api";

export const categoryDetailQueryKey = (sessionId: string | null, uuid: string | null) => [
  "categories",
  "detail",
  sessionId,
  uuid,
];

export const useCategory = (sessionId: string | null, uuid: string | null) =>
  useQuery({
    queryKey: categoryDetailQueryKey(sessionId, uuid),
    queryFn: ({ signal }) => {
      if (uuid === null) {
        throw new Error("A category UUID is required to fetch its details.");
      }

      return getCategory({ uuid }, signal);
    },
    enabled: sessionId !== null && uuid !== null,
  });
