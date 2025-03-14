import React from "react";
import { Callout, Dialog, Flex, Button, Text } from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";

const DialogDescription = Dialog.Description as any;
const CalloutText = Callout.Text as any;

type ConfirmSwitchDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  onSucess(): void;
};

export function ConfirmSwitchDialog({
  open,
  onOpenChange,
  onSucess,
}: ConfirmSwitchDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
        size="1"
      >
        <Dialog.Title size={"4"}>You have unsaved changes</Dialog.Title>

        <DialogDescription>
          <Callout.Root color="red">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <CalloutText>
              Data will be lost. Are you sure you want to continue?
            </CalloutText>
          </Callout.Root>
          <br />
          <Text
            color="gray"
            size="1"
            style={{
              marginLeft: "5px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <InfoCircledIcon
              width="12"
              height="12"
              style={{ paddingRight: "5px" }}
            />
            You can click "Cancel" and save your changes before.
          </Text>
          <br />
        </DialogDescription>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button
              color="red"
              onClick={() => {
                onOpenChange?.(false);
                onSucess();
              }}
            >
              Yes, continue
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
