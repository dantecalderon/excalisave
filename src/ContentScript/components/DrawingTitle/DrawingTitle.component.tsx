import React, { useState } from "react";
import "./DrawingTitle.styles.scss";
import { XLogger } from "../../../lib/logger";

export function DrawingTitle() {
  const [title] = useState(() => {
    try {
      const drawingTitle = localStorage.getItem("__drawing_title");
      return drawingTitle || "";
    } catch (error) {
      XLogger.error("Error getting drawing title", error);
      return "";
    }
  });

  return (
    <>
      <h1
        style={{
          margin: "0",
          fontSize: "1.15rem",
        }}
      >
        {title}
      </h1>
    </>
  );
}
