import "./skeleton.css";

import { Skeleton as PrimeSkeleton } from "primereact/skeleton";
import type { ReactElement } from "react";

export type SkeletonShape = "rectangle" | "circle";

export interface SkeletonProps {
  shape?: SkeletonShape;
  width?: string;
  height?: string;
  count?: number;
  loadingText?: string;
}

const defaultLoadingText = "Cargando contenido";
const defaultCircleSize = "1rem";

export const Skeleton = ({
  shape = "rectangle",
  width,
  height,
  count = 1,
  loadingText,
}: SkeletonProps) => {
  const announcement = loadingText?.trim() || defaultLoadingText;
  const shapeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const shapeWidth = width ?? (shape === "circle" ? (height ?? defaultCircleSize) : "100%");
  const shapeHeight = height ?? (shape === "circle" ? shapeWidth : "1rem");
  const shapeClassName = `ui-skeleton__shape ui-skeleton__shape--${shape}`;
  const shapes: ReactElement[] = Array.from({ length: shapeCount }, (_, index) => (
    <PrimeSkeleton
      aria-hidden="true"
      animation="wave"
      className={shapeClassName}
      height={shapeHeight}
      key={`shape-${index}`}
      shape={shape}
      width={shapeWidth}
    />
  ));

  return (
    <div className="ui-skeleton" role="status">
      <span className="ui-skeleton__announcement">{announcement}</span>
      {shapes}
    </div>
  );
};
