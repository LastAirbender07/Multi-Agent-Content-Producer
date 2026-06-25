// Shared internal helpers for attaching metadata to Fabric objects.
// Used by all chart group builders and createChartFabricImage.

import * as fabric from "fabric";
import type { ChartObjectData } from "@/types/chart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricWithData = fabric.Group & { data?: any };

export function makeGroup(
  items: fabric.FabricObject[],
  opts: Partial<fabric.GroupProps>,
  data: ChartObjectData,
): fabric.Group {
  const g = new fabric.Group(items, opts) as FabricWithData;
  g.data = data;
  return g as fabric.Group;
}

export function makeFabricImage(img: fabric.FabricImage, data: ChartObjectData): fabric.FabricImage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (img as any).data = data;
  return img;
}
