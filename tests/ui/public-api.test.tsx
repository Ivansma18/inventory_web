import {
  Badge,
  Button,
  DataTable,
  Dialog,
  Drawer,
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
  Drawer,
  Icon,
  Input,
  Select,
  Skeleton,
  Textarea,
  Tooltip,
  useToast,
];

describe("shared UI public API", () => {
  it("exports all twelve primitives through the shared barrel", () => {
    expect(publicPrimitives).toHaveLength(12);
    publicPrimitives.forEach((primitive) => {
      expect(primitive).toBeTypeOf("function");
    });
  });
});
