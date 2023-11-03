import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { useState } from "react";
import "./Drawing.styles.scss";

const DialogDescription = Dialog.Description as any;

type DrawingProps = {
  id: string;
  name: string;
  img?: string;
  index: number;
  isCurrent: boolean;
  onClick: (id: string) => void;
  onRenameDrawing?: (id: string, newName: string) => void;
  onDeleteDrawing?: (id: string) => void;
};

export function Drawing(props: DrawingProps) {
  const [newName, setNewName] = useState(props.name);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleRenameDrawing = () => {
    setEditModalOpen(false);
    props?.onRenameDrawing(props.id, newName);
  };

  const handleDeleteDrawing = () => {
    setDeleteModalOpen(false);
    props?.onDeleteDrawing(props.id);
  };

  return (
    <Box className="Drawing">
      <Flex direction="column" gap="2">
        <img
          className="Drawing__image"
          onClick={() => props.onClick(props.id)}
          loading={props.index < 4 ? "eager" : "lazy"}
          style={{
            boxShadow: props.isCurrent ? "0px 0px 0px 2px #30a46c" : undefined,
          }}
          src={
            props.img
              ? props.img
              : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
          }
        />

        <Flex justify="between" align="center" pr="1" pl="1">
          <Text
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "140px",
            }}
            title={props.name}
            color="gray"
            as="p"
            size="1"
            weight="medium"
          >
            {props.name}
          </Text>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="1" variant="ghost">
                <DotsHorizontalIcon width="18" height="18" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1">
              <DropdownMenu.Item
                // shortcut="⌘ E"
                onClick={() => setEditModalOpen(true)}
              >
                Rename
              </DropdownMenu.Item>
              {/* <DropdownMenu.Separator />
              <DropdownMenu.Item>Add to favorites</DropdownMenu.Item> */}
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                // shortcut="⌘ ⌫"
                color="red"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          {/* -------- DELETE DIALOG ---------  */}
          <Dialog.Root
            open={deleteModalOpen}
            onOpenChange={(e) => setDeleteModalOpen(e)}
          >
            <Dialog.Content
              style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
              size="1"
            >
              <Dialog.Title size={"4"}>Delete Drawing</Dialog.Title>

              <DialogDescription size="2">
                Are you sure you want to delete <b>{props.name}</b> drawing?
              </DialogDescription>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button onClick={handleDeleteDrawing} color="red">
                    Yes, Delete
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>

          {/* -------- EDIT DIALOG ---------  */}
          <Dialog.Root
            open={editModalOpen}
            onOpenChange={(isOpen) => setEditModalOpen(isOpen)}
          >
            <Dialog.Content
              style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
              size="1"
            >
              <Dialog.Title size={"4"}>Rename Drawing</Dialog.Title>

              <DialogDescription size="2">
                Edit <b>{props.name}</b> drawing:
              </DialogDescription>

              <Flex direction="column" mt="3">
                <TextField.Input
                  onChange={(event) => {
                    setNewName(event.target.value);
                  }}
                  onKeyUp={(event) => {
                    if (event.key === "Enter") {
                      handleRenameDrawing();
                    }
                  }}
                  value={newName}
                  placeholder="Rename drawing"
                />
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Dialog.Close>
                  <Button
                    disabled={newName === ""}
                    onClick={handleRenameDrawing}
                  >
                    Rename
                  </Button>
                </Dialog.Close>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </Flex>
    </Box>
  );
}