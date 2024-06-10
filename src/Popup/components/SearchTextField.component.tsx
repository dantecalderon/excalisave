import { CrossCircledIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { IconButton, TextField } from "@radix-ui/themes";
import React from "react";

type SearchTextFieldProps = {
  value: string;
  onChangeValue: (newValue: string) => void;
};

export function SearchTextField(props: SearchTextFieldProps) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <TextField.Root
      style={{
        width: "183px",
      }}
      autoFocus
      ref={searchInputRef}
      value={props.value}
      onChange={(event) => {
        props.onChangeValue(event.target.value);
      }}
      placeholder="Search Drawing"
    >
      <TextField.Slot>
        <MagnifyingGlassIcon height="16" width="16" />
      </TextField.Slot>
      <TextField.Slot>
        {props.value && (
          <IconButton
            onClick={() => {
              props.onChangeValue("");
              searchInputRef.current && searchInputRef.current?.focus();
            }}
            title="Cancel search"
            size="1"
            variant="ghost"
          >
            <CrossCircledIcon height="14" width="14" />
          </IconButton>
        )}
      </TextField.Slot>
    </TextField.Root>
  );
}
