import React from "react";
import { Heading } from "@radix-ui/themes";
import "./DrawingTitle.styles.scss";

export function DrawingTitle() {
  return (
    <div
      className="Excalidraw__title"
      style={{
        position: "absolute",
        left: "100px",
      }}
    >
      <Heading size="1">Nombre del Drawing2222</Heading>
    </div>
  );
}
