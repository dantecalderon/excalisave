import { Flex } from "@radix-ui/themes";
import React, { ReactElement } from "react";

type PlaceholderProps = {
  icon?: ReactElement;
  message: ReactElement;
};

export function Placeholder(props: PlaceholderProps) {
  return (
    <Flex
      align={"center"}
      justify={"center"}
      direction={"column"}
      gap={"4"}
      className="Placeholder"
      style={{
        borderRadius: "6px",
        color: "var(--gray-a10)",
        textAlign: "center",
        height: "300px",
      }}
    >
      {props.icon}
      {props.message}
    </Flex>
  );
}
