import { Theme } from "@radix-ui/themes";
import React from "react";
import { Settings } from "../components/Settings/Settings.component";
import "./Options.styles.scss";

export const Options: React.FC = () => {
  return (
    <Theme
      accentColor="iris"
      style={{
        height: "100%",
      }}
    >
      <Settings />
    </Theme>
  );
};
