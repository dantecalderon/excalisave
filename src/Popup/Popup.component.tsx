import {
  BookmarkIcon,
  Cross1Icon,
  CrossCircledIcon,
  HeartFilledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Flex,
  Grid,
  IconButton,
  Strong,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import React, { useEffect, useRef, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { Drawing } from "../components/Drawing/Drawing.component";
import { NavBar } from "../components/NavBar/Navbar.component";
import { Placeholder } from "../components/Placeholder/Placeholder.component";
import { Sidebar } from "../components/Sidebar/Sidebar.component";
import { IDrawing } from "../interfaces/drawing.interface";
import { DrawingStore } from "../lib/drawing-store";
import { XLogger } from "../lib/logger";
import { checkAndPerformUnusedFilesCleanup } from "../lib/utils/cleanup-unused-files.util";
import { TabUtils } from "../lib/utils/tab.utils";
import { ConfirmSwitchDialog } from "./components/ConfirmSwithDialog.comonent";
import { useCurrentDrawingId } from "./hooks/useCurrentDrawing.hook";
import { useDrawingLoading } from "./hooks/useDrawingLoading.hook";
import { useFavorites } from "./hooks/useFavorites.hook";
import { useFolders } from "./hooks/useFolders.hook";
import { useRestorePoint } from "./hooks/useRestorePoint.hook";
import "./Popup.styles.scss";
import { GoogleDriveApi } from "../lib/google-drive-api";
import { GoogleUserMe } from "../interfaces/google.interface";

const Popup: React.FC = () => {
  const [drawings, setDrawings] = React.useState<IDrawing[]>([]);
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const {
    folders,
    createFolder,
    renameFolder,
    removeFolder,
    addDrawingToFolder,
    removeDrawingFromFolder,
    removeDrawingFromAllFolders,
  } = useFolders();
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const {
    currentDrawingId,
    inExcalidrawPage,
    setCurrentDrawingId,
    isLiveCollaboration,
    setIsLiveCollaboration,
  } = useCurrentDrawingId();
  const drawingIdToSwitch = useRef<string | undefined>(undefined);
  const [sidebarSelected, setSidebarSelected] = useState("");
  const { getRestorePoint, setRestorePoint } = useRestorePoint();
  const { loading, startLoading } = useDrawingLoading();
  const [isConfirmSwitchDialogOpen, setIsConfirmSwitchDialogOpen] =
    useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<GoogleUserMe | null>(null);

  useEffect(() => {
    getRestorePoint()
      .then((restorePoint) => {
        if (restorePoint?.searchTerm) {
          setSearchTerm(restorePoint.searchTerm);
        }

        setSidebarSelected(restorePoint?.sidebarSelected || "All");

        if (!userInfo?.email) {
          setUserInfo(
            restorePoint?.profileUrl
              ? {
                  picture: restorePoint.profileUrl,
                  id: "",
                  email: "",
                  family_name: "",
                  given_name: "",
                  name: "",
                  verified_email: false,
                }
              : null
          );
        }
      })
      .catch(() => {
        setSidebarSelected("All");
        setUserInfo(null);
      });

    const loadDrawings = async () => {
      const result: Record<string, IDrawing> =
        await browser.storage.local.get();

      const newDrawings: IDrawing[] = Object.values(result).filter(
        (drawing: IDrawing) => drawing?.id?.startsWith?.("drawing:")
      );

      setDrawings(newDrawings);
    };

    const getUserInfo = async () => {
      try {
        const userInfo = await GoogleDriveApi.getAuthenticatedUser();
        setUserInfo(userInfo);
      } catch (error) {
        XLogger.error("Error loading user");
        setUserInfo(null);
      }
    };

    Promise.allSettled([getUserInfo(), loadDrawings()]);

    // This allows updating the screenshot preview and other UI components,
    // if it was udpated after the first retrieval.
    const onDrawingChanged = async (
      changes: Record<string, any>,
      areaName: string
    ) => {
      if (areaName !== "local") return;

      setDrawings((prevDrawings) => {
        return prevDrawings.map((drawing) => {
          if (changes[drawing.id]) {
            return {
              ...drawing,
              ...changes[drawing.id].newValue,
            };
          }
          return drawing;
        });
      });
    };

    browser.storage.onChanged.addListener(onDrawingChanged);

    checkAndPerformUnusedFilesCleanup();

    return () => {
      browser.storage.onChanged.removeListener(onDrawingChanged);
    };
  }, []);

  useEffect(() => {
    setRestorePoint({
      searchTerm,
      sidebarSelected: sidebarSelected || "All",
      profileUrl: userInfo?.picture,
    });
  }, [searchTerm, sidebarSelected, userInfo]);

  const onRenameDrawing = async (id: string, newName: string) => {
    try {
      const newDrawing = drawings.map((drawing) => {
        if (drawing.id === id) {
          return {
            ...drawing,
            name: newName,
          };
        }

        return drawing;
      });

      setDrawings(newDrawing);

      await DrawingStore.renameDrawing(id, newName);
    } catch (error) {
      XLogger.error("Error renaming drawing", error);
    }
  };

  const onDeleteDrawing = async (id: string) => {
    try {
      const newDrawing = drawings.filter((drawing) => drawing.id !== id);

      setDrawings(newDrawing);

      if (currentDrawingId === id) {
        setCurrentDrawingId(undefined);
      }

      await Promise.allSettled([
        removeDrawingFromAllFolders(id),
        DrawingStore.deleteDrawing(id),
      ]);
    } catch (error) {
      XLogger.error("Error deleting drawing", error);
    }
  };

  const handleLoadItem = async (loadDrawingId: string) => {
    const isSameDrawing = loadDrawingId === currentDrawing?.id;
    if (!loading && (isLiveCollaboration || !isSameDrawing)) {
      startLoading();
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        XLogger.error("Error loading drawing: No active tab or drawing found", {
          activeTab,
        });

        return;
      }

      await DrawingStore.loadDrawing(loadDrawingId);

      setCurrentDrawingId(loadDrawingId);
      setIsLiveCollaboration(false);
      // TODO: Activate this to avoid fast switching errors(or block switching for a few milis)
      // window.close();
    }
  };

  const handleCreateNewDrawing = async (name: string) => {
    await DrawingStore.saveNewDrawing({ name });
    window.close();
  };

  const handleSaveCurrentDrawing = async () => {
    await DrawingStore.saveCurrentDrawing();
    window.close();
  };

  const handleNewDrawing = async () => {
    await DrawingStore.newDrawing();
    setCurrentDrawingId(undefined);
    window.close();
  };

  const handleAddToFavorites = async (drawingId: string) => {
    await addToFavorites(drawingId);
  };

  const handleRemoveFromFavorites = async (drawingId: string) => {
    await removeFromFavorites(drawingId);
  };

  const currentDrawing = drawings.find(
    (drawing) => drawing.id === currentDrawingId
  );

  const handleLoadItemWithConfirm = async (loadDrawingId: string) => {
    if (!inExcalidrawPage) return;

    if (!currentDrawing && (await DrawingStore.hasUnsavedChanges())) {
      drawingIdToSwitch.current = loadDrawingId;
      setIsConfirmSwitchDialogOpen(true);
    } else {
      handleLoadItem(loadDrawingId);
    }
  };

  const filterDrawings = () => {
    if (sidebarSelected?.startsWith("folder:")) {
      const folder = folders.find((folder) => folder.id === sidebarSelected);

      if (!folder) {
        return [];
      }

      return drawings.filter((drawing) => {
        return folder.drawingIds.includes(drawing.id);
      });
    }

    switch (sidebarSelected) {
      case "Favorites":
        return drawings.filter((drawing) => {
          return favorites.includes(drawing.id);
        });
      case "Results":
        return drawings.filter((drawing) => {
          // TODO: Fix this, this is not enecssary
          return (
            drawing.name &&
            drawing.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
      default:
        return drawings;
    }
  };

  const filteredDrawings = filterDrawings();

  const showDrawings = () => {
    return (
      <Grid columns="2" gapX="3" gapY="5" width="auto" pb="3" pt="3">
        {filteredDrawings.map((drawing, index) => (
          <Drawing
            key={drawing.id}
            index={index}
            drawing={drawing}
            folders={folders}
            folderIdSelected={
              sidebarSelected.startsWith("folder:")
                ? sidebarSelected
                : undefined
            }
            inExcalidrawPage={inExcalidrawPage}
            favorite={favorites.includes(drawing.id)}
            onClick={handleLoadItemWithConfirm}
            isCurrent={currentDrawingId === drawing.id}
            onRenameDrawing={onRenameDrawing}
            onAddToFavorites={handleAddToFavorites}
            onRemoveFromFavorites={handleRemoveFromFavorites}
            onDeleteDrawing={onDeleteDrawing}
            onAddToFolder={addDrawingToFolder}
            onRemoveFromFolder={removeDrawingFromFolder}
          />
        ))}
      </Grid>
    );
  };

  return (
    <Theme
      accentColor="iris"
      style={{
        height: "100%",
      }}
    >
      <section className="Popup">
        <NavBar
          onCreateNewDrawing={handleCreateNewDrawing}
          onNewDrawing={handleNewDrawing}
          isLoading={loading}
          inExcalidrawPage={inExcalidrawPage}
          currentDrawing={currentDrawing}
          userInfo={userInfo}
          onLogout={() => {
            setRestorePoint({
              searchTerm,
              sidebarSelected: sidebarSelected || "All",
              profileUrl: null,
            });
          }}
          isLiveCollaboration={isLiveCollaboration}
          onSaveDrawing={handleSaveCurrentDrawing}
          SearchComponent={
            <TextField.Root
              style={{
                width: "177px",
              }}
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
              <TextField.Input
                autoFocus
                ref={searchInputRef}
                value={searchTerm}
                onChange={(event) => {
                  if (sidebarSelected !== "Results") {
                    setSidebarSelected("Results");
                  }
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search Drawing"
              />

              <TextField.Slot>
                {searchTerm && (
                  <IconButton
                    onClick={() => {
                      setSearchTerm("");
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
          }
        />
        <Flex
          style={{
            height: "calc(100% - 60px)",
            width: "100%",
          }}
        >
          <Sidebar
            folders={folders}
            onCreateFolder={createFolder}
            onRemoveFolder={removeFolder}
            selected={sidebarSelected}
            onRenameFolder={renameFolder}
            onChangeSelected={(selected) => setSidebarSelected(selected)}
          />
          <div className="Popup__content">
            {sidebarSelected === "Favorites" &&
              (filteredDrawings.length >= 1 ? (
                showDrawings()
              ) : (
                <Placeholder
                  icon={<HeartFilledIcon width={"30"} height={"30"} />}
                  message={
                    <Text size={"2"}>
                      Your favorite drawings will appear here
                    </Text>
                  }
                />
              ))}

            {sidebarSelected === "Results" &&
              (searchTerm !== "" ? (
                filteredDrawings.length >= 1 ? (
                  showDrawings()
                ) : (
                  <Placeholder
                    icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                    message={
                      <Text size={"2"}>No items found for "{searchTerm}"</Text>
                    }
                  />
                )
              ) : (
                <Placeholder
                  icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                  message={<Text size={"2"}>Search for something</Text>}
                />
              ))}

            {(sidebarSelected === "All" || sidebarSelected === "") &&
              (filteredDrawings.length > 0 ? (
                showDrawings()
              ) : (
                <Placeholder
                  icon={<BookmarkIcon width={"30"} height={"30"} />}
                  message={
                    <Text size={"2"}>
                      You don't have saved drawings yet. <br />
                      Start saving one by clicking on the <Strong>
                        Save
                      </Strong>{" "}
                      button.
                    </Text>
                  }
                />
              ))}

            {sidebarSelected.startsWith("folder:") &&
              (filteredDrawings.length > 0 ? (
                showDrawings()
              ) : (
                <Placeholder
                  icon={<Cross1Icon width={"30"} height={"30"} />}
                  message={<Text size={"2"}>Collection is empty.</Text>}
                />
              ))}
          </div>
        </Flex>
        <ConfirmSwitchDialog
          open={isConfirmSwitchDialogOpen}
          onOpenChange={setIsConfirmSwitchDialogOpen}
          onSucess={() => {
            if (drawingIdToSwitch.current) {
              handleLoadItem(drawingIdToSwitch.current);
              drawingIdToSwitch.current = undefined;
            }
          }}
        />
      </section>
    </Theme>
  );
};

export default Popup;
