import React from "react";
import "./DrawingTitle.styles.scss";
import { useLocalStorageString } from "../../hooks/useLocalStorageString.hook";
import { DRAWING_TITLE_KEY_LS } from "../../../lib/constants";

export function DrawingTitle() {
  const title = useLocalStorageString(DRAWING_TITLE_KEY_LS, "");

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
