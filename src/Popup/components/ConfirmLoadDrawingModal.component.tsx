import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { Button, Callout, Dialog, Flex, Text } from "@radix-ui/themes";
import React from "react";

const DialogDescription = Dialog.Description as any;
const CalloutText = Callout.Text as any;

type ConfirmLoadDrawingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmLoadDrawingModal({
  isOpen,
  ...props
}: ConfirmLoadDrawingModalProps) {
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(newIsOpen) => {
        if (isOpen && newIsOpen === false) {
          props.onClose();
        }
      }}
    >
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
              Your data will be lost. <br /> Are you sure you want to continue?
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
            <Button color="red" onClick={props.onConfirm}>
              Yes, continue
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
