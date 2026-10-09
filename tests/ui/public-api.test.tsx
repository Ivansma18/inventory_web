import {
  Badge,
  Button,
  DataTable,
  Dialog,
  Icon,
  Input,
  Select,
  Skeleton,
  Textarea,
  Tooltip,
  useToast,
} from "@/shared/ui";
import { describe, expect, it } from "vitest";

const publicPrimitives = [
  Badge,
  Button,
  DataTable,
  Dialog,
  Icon,
  Input,
  Select,
  Skeleton,
  Textarea,
  Tooltip,
  useToast,
];

describe("shared UI public API", () => {
  it("exports all eleven primitives through the shared barrel", () => {
    expect(publicPrimitives).toHaveLength(11);
    publicPrimitives.forEach((primitive) => {
      expect(primitive).toBeTypeOf("function");
    });
  });
});
