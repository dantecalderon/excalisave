export const ItemType = {
  DRAW: "draw",
  ELEMENT: "element",
} as const;

export type TItemType = (typeof ItemType)[keyof typeof ItemType];
