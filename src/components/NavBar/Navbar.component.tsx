import {
  CaretDownIcon,
  ClipboardIcon,
  EnterIcon,
  ExclamationTriangleIcon,
  FilePlusIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  Avatar,
  Box,
  Button,
  Callout,
  Dialog,
  DropdownMenu,
  Em,
  Flex,
  HoverCard,
  IconButton,
  Spinner,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { ReactElement, useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../../constants/message.types";
import { IDrawing } from "../../interfaces/drawing.interface";
import { GoogleUserMe } from "../../interfaces/google.interface";
import { DrawingStore } from "../../lib/drawing-store";
import { GoogleDriveApi } from "../../lib/google-drive-api";
import { CloudDownloadIcon, CloudUploadIcon } from "../Icons/Cloud.icons";
import "./Navbar.styles.scss";

const DialogDescription = Dialog.Description as any;
const CalloutText = Callout.Text as any;

type NavBarProps = {
  SearchComponent: ReactElement;
  onCreateNewDrawing: (name: string) => void;
  onNewDrawing: () => void;
  onSaveDrawing: () => void;
  onLogout: () => void;
  currentDrawing?: IDrawing;
  isLoading: boolean;
  inExcalidrawPage: boolean;
  isLiveCollaboration: boolean;
  userInfo?: GoogleUserMe;
};

export function NavBar({ SearchComponent, ...props }: NavBarProps) {
  const [name, setName] = useState("");
  const [duplicateName, setDuplicateName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    if (props.currentDrawing) {
      setDuplicateName(props.currentDrawing.name + " 2");
    }
  }, [props.currentDrawing]);

  const handleRenameDrawing = () => {
    setIsCreateDialogOpen(false);
    props?.onCreateNewDrawing(name);
  };

  const handleDuplicateDrawing = () => {
    setIsDuplicateDialogOpen(false);
    props?.onCreateNewDrawing(duplicateName);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!props.currentDrawing || !props.userInfo) return false;

    if (!props.currentDrawing.lastModified) return true;
    return props.currentDrawing.lastModified !== props.currentDrawing.lastSync;
  };

  const unsavedChanges = hasUnsavedChanges();

  return (
    <Flex
      width="100%"
      top="0"
      p="3"
      gap="2"
      justify="between"
      align="center"
      style={{
        height: "60px",
        borderBottom: "1px solid #e1e1e1",
        background: "#6965db12",
      }}
    >
      {SearchComponent}
      {props.currentDrawing && (
        <Flex
          style={{
            padding: "2px 10px",
            background: "#d7d9fc",
            color: "white",
            width: "180px",
            borderRadius: "5px",
          }}
          flexGrow={"1"}
          align={"center"}
          justify={"center"}
          direction={"column"}
        >
          <Text
            size={"1"}
            style={{ fontSize: "10px", lineHeight: 1, color: "black" }}
          >
            {props.isLoading ? "Loading... " : "Working on:"}
          </Text>
          <Text
            weight={"bold"}
            style={{
              width: "100%",
              lineHeight: "1.4",
              textOverflow: "ellipsis",
              overflow: "hidden",
              color: "#6364cf",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
            size={"1"}
          >
            {props.currentDrawing?.name}
          </Text>
        </Flex>
      )}

      {/* -------- OPTIONS MENU ---------  */}
      <DropdownMenu.Root>
        <Flex>
          <Flex className="Navbar__ActionButton">
            {props.userInfo && props.currentDrawing && (
              <>
                <IconButton
                  onClick={() => props.onSaveDrawing()}
                  disabled={
                    !props.inExcalidrawPage ||
                    props.isLoading ||
                    props.isLiveCollaboration ||
                    !unsavedChanges
                  }
                  color="green"
                  radius="full"
                >
                  <CloudUploadIcon size={18} />
                </IconButton>
                <IconButton color="orange" radius="full">
                  <CloudDownloadIcon size={18} />
                </IconButton>
              </>
            )}
            {!props.currentDrawing && (
              <Button
                className="Navbar__ActionButton__SaveButton"
                disabled={
                  !props.inExcalidrawPage ||
                  props.isLoading ||
                  props.isLiveCollaboration
                }
                onClick={() => {
                  setIsCreateDialogOpen(true);
                }}
              >
                Save As...
              </Button>
            )}
            <DropdownMenu.Trigger
              disabled={
                !props.inExcalidrawPage ||
                props.isLoading ||
                props.isLiveCollaboration
              }
            >
              <IconButton color="gray" variant="outline">
                <CaretDownIcon width="18" height="18" />
              </IconButton>
            </DropdownMenu.Trigger>
          </Flex>

          <DropdownMenu.Root>
            <Flex gap="2" pl="1">
              {props.userInfo ? (
                <DropdownMenu.Trigger
                  disabled={
                    !props.inExcalidrawPage ||
                    props.isLoading ||
                    props.isLiveCollaboration
                  }
                >
                  <Avatar
                    style={{ cursor: "pointer" }}
                    radius="full"
                    src={props.userInfo?.picture}
                    fallback="A"
                    size={"2"}
                  />
                </DropdownMenu.Trigger>
              ) : (
                <HoverCard.Root
                  open={props.inExcalidrawPage && !isLogin ? undefined : false}
                >
                  <HoverCard.Trigger>
                    <Button
                      disabled={isLogin || !props.inExcalidrawPage}
                      onClick={async () => {
                        setIsLogin(true);
                        const result = await GoogleDriveApi.login();
                        await browser.runtime.sendMessage({
                          type: MessageType.LOGIN_RESULT,
                          payload: result,
                        });

                        setIsLogin(false);
                        window.close();
                      }}
                      radius="full"
                      color="blue"
                      variant="solid"
                    >
                      <Spinner loading={isLogin}>
                        <EnterIcon />
                      </Spinner>
                      Log In
                    </Button>
                  </HoverCard.Trigger>
                  <HoverCard.Content maxWidth="300px">
                    <Flex gap="4">
                      <Box>
                        <Box
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: "12px",
                          }}
                        >
                          <img
                            width={"50px"}
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/269px-Google_Drive_icon_%282020%29.svg.png"
                          />
                        </Box>
                        <Text as="div" size="2" align="center">
                          <Em>
                            Log in to save your drawings to <br />
                            Google Drive.
                          </Em>
                        </Text>
                      </Box>
                    </Flex>
                  </HoverCard.Content>
                </HoverCard.Root>
              )}
            </Flex>
            <DropdownMenu.Content>
              <DropdownMenu.Label className="DropdownMenuLabel">
                Logged in as
              </DropdownMenu.Label>
              <DropdownMenu.Item
                disabled
                style={{
                  color: "var(--gray-12)",
                }}
              >
                <b>{props.userInfo?.name}</b>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled
                style={{
                  color: "var(--gray-12)",
                }}
              >
                {props.userInfo?.email}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onClick={props.onLogout}>
                Log Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

        <DropdownMenu.Content size="2">
          <DropdownMenu.Item
            style={{
              alignItems: "center",
              justifyContent: "flex-start",
            }}
            onClick={async () => {
              if (
                !props.currentDrawing &&
                (await DrawingStore.hasUnsavedChanges())
              ) {
                setIsConfirmDialogOpen(true);
              } else {
                props.onNewDrawing();
              }
            }}
          >
            <FilePlusIcon
              width="16"
              height="16"
              style={{ paddingRight: "5px" }}
            />
            New Drawing
          </DropdownMenu.Item>

          {props.currentDrawing && (
            <DropdownMenu.Item
              style={{
                alignItems: "center",
                justifyContent: "flex-start",
              }}
              onClick={() => setIsDuplicateDialogOpen(true)}
            >
              <ClipboardIcon
                width="16"
                height="16"
                style={{ paddingRight: "5px" }}
              />
              Duplicate
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* -------- EDIT DIALOG ---------  */}
      <Dialog.Root
        open={isCreateDialogOpen}
        onOpenChange={(isOpen) => setIsCreateDialogOpen(isOpen)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"4"}>Save new Drawing</Dialog.Title>

          <Flex direction="column" mt="3">
            <TextField.Root
              onChange={(event) => {
                setName(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter") {
                  handleRenameDrawing();
                }
              }}
              value={name}
              placeholder="Name for the new drawing"
            />
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button disabled={name === ""} onClick={handleRenameDrawing}>
                Save
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* -------- DUPLICATE DIALOG ---------  */}
      <Dialog.Root
        open={isDuplicateDialogOpen}
        onOpenChange={(isOpen) => setIsDuplicateDialogOpen(isOpen)}
      >
        <Dialog.Content
          style={{ maxWidth: 450, paddingTop: 22, paddingBottom: 20 }}
          size="1"
        >
          <Dialog.Title size={"4"}>Duplicate Drawing</Dialog.Title>

          <Flex direction="column" mt="3">
            <TextField.Root
              onChange={(event) => {
                setDuplicateName(event.target.value);
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter") {
                  handleDuplicateDrawing();
                }
              }}
              defaultValue={name + " 2"}
              value={duplicateName}
              placeholder="Name for the new drawing"
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
                disabled={duplicateName === ""}
                onClick={handleDuplicateDrawing}
              >
                Save
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* -------- CONFIRM DIALOG ---------  */}
      <Dialog.Root
        open={isConfirmDialogOpen}
        onOpenChange={(isOpen) => setIsConfirmDialogOpen(isOpen)}
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
                  setIsConfirmDialogOpen(false);
                  props.onNewDrawing();
                }}
              >
                Yes, continue
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
