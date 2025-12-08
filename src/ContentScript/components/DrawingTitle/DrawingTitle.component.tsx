import React from "react";
import { Heading } from "@radix-ui/themes";

export function DrawingTitle() {
  return (
    <div
      style={{
        position: "absolute",
        left: "100px",
      }}
    >
      <Heading size="1">Nombre del Drawing</Heading>
    </div>
  );
}
