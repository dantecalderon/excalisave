export const ItemLocation = {
  LOCAL: "Local",
  SERVER: "Server",
} as const;

export type TItemLocation = (typeof ItemLocation)[keyof typeof ItemLocation];
