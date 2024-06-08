import {
  BookmarkIcon,
  Cross1Icon,
  CrossCircledIcon,
  HeartFilledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Flex,
  IconButton,
  Select,
  Strong,
  Text,
  TextField,
  Theme,
} from "@radix-ui/themes";
import React, { useEffect, useRef, useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import {
  DrawingVirtualizedData,
  DrawingVirtualizedWrapper,
} from "../components/Drawing/DrawingVirualizedWrapper.component";
import { NavBar } from "../components/NavBar/Navbar.component";
import { Placeholder } from "../components/Placeholder/Placeholder.component";
import { Sidebar } from "../components/Sidebar/Sidebar.component";
import { IDrawing } from "../interfaces/drawing.interface";
import { Folder } from "../interfaces/folder.interface";
import { SORT_BY_OPTIONS, SortByEnum } from "../lib/constants";
import { DrawingStore } from "../lib/drawing-store";
import { XLogger } from "../lib/logger";
import { TabUtils } from "../lib/utils/tab.utils";
import "./Popup.styles.scss";
import { ConfirmLoadDrawingModal } from "./components/ConfirmLoadDrawingModal.component";
import { useCurrentDrawingId } from "./hooks/useCurrentDrawing.hook";
import { useDrawingLoading } from "./hooks/useDrawingLoading.hook";
import { useDrawings } from "./hooks/useDrawings.hook";
import { useFavorites } from "./hooks/useFavorites.hook";
import { useFolders } from "./hooks/useFolders.hook";
import { useRestorePoint } from "./hooks/useRestorePoint.hook";
import { checkCleanOutdatedFiles } from "./utils/chek-clean-outdated-files.util";

const Popup: React.FC = () => {
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
  const [sortBy, setSortBy] = useState<SortByEnum>(SortByEnum.LastModified);
  const [isConfirmSwitchDialogOpen, setIsConfirmSwitchDialogOpen] =
    useState<boolean>(false);
  const [drawingsFromRestore, setDrawingsFromRestore] = useState<IDrawing[]>(
    []
  );
  const {
    drawings,
    isLoadingDrawings,
    onRenameDrawing,
    onDeleteDrawing,
    currentDrawing,
    handleCreateNewDrawing,
    handleNewDrawing,
    handleSaveCurrentDrawing,
  } = useDrawings(
    currentDrawingId,
    setCurrentDrawingId,
    removeDrawingFromAllFolders
  );

  useEffect(() => {
    getRestorePoint()
      .then((restorePoint) => {
        if (Array.isArray(restorePoint?.drawings)) {
          setDrawingsFromRestore(restorePoint.drawings);
        }

        if (restorePoint?.searchTerm) {
          setSearchTerm(restorePoint.searchTerm);
        }

        if (
          restorePoint?.sortBy &&
          SORT_BY_OPTIONS[restorePoint.sortBy as SortByEnum]
        ) {
          setSortBy(restorePoint.sortBy as SortByEnum);
        }

        setSidebarSelected(restorePoint?.sidebarSelected || "All");
      })
      .catch(() => {
        setSidebarSelected("All");
      });

    checkCleanOutdatedFiles();
  }, []);

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
    }
  };

  const handleLoadItemWithConfirm = async (loadDrawingId: string) => {
    if (!inExcalidrawPage) return;

    if (!currentDrawing && (await DrawingStore.hasUnsavedChanges())) {
      drawingIdToSwitch.current = loadDrawingId;
      setIsConfirmSwitchDialogOpen(true);
    } else {
      handleLoadItem(loadDrawingId);
    }
  };

  const filterDrawings = (drawings: IDrawing[], folders: Folder[]) => {
    let filteredDrawings = drawings;

    if (sidebarSelected?.startsWith("folder:")) {
      const folder = folders.find((folder) => folder.id === sidebarSelected);

      if (!folder) {
        return [];
      }

      filteredDrawings = drawings.filter((drawing) => {
        return folder.drawingIds.includes(drawing.id);
      });
    } else {
      switch (sidebarSelected) {
        case "Favorites":
          filteredDrawings = drawings.filter((drawing) => {
            return favorites.includes(drawing.id);
          });
          break;
        case "Results":
          filteredDrawings = drawings.filter((drawing) => {
            return (
              drawing.name &&
              drawing.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
          });
          break;
        default:
          filteredDrawings = drawings;
          break;
      }
    }

    const result = filteredDrawings.sort((a, b) => {
      if (sortBy === SortByEnum.LastCreated) {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else if (sortBy === SortByEnum.Alphabetically) {
        return a.name.localeCompare(b.name);
      } else if (sortBy === SortByEnum.LastModified) {
        if (a.updatedAt && b.updatedAt) {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        } else if (a.updatedAt) {
          return -1;
        } else if (b.updatedAt) {
          return 1;
        }
        return 0;
      }

      return 0;
    });

    setRestorePoint({
      drawings: result.slice(0, 6),
      searchTerm,
      sidebarSelected: sidebarSelected || "All",
      sortBy,
    });

    return result;
  };

  const filteredDrawings = isLoadingDrawings
    ? drawingsFromRestore
    : filterDrawings(drawings, folders);

  const showDrawings = (
    drawingData: DrawingVirtualizedData,
    viewKey: string
  ) => {
    return (
      <Grid
        columnCount={2}
        rowCount={drawingData.drawings.length / 2}
        columnWidth={200}
        rowHeight={170}
        width={400}
        height={404}
        itemData={drawingData}
        itemKey={({ columnIndex, rowIndex }) => {
          const arrayIndex = rowIndex * 2 + columnIndex;
          if (arrayIndex < drawingData.drawings.length) {
            return viewKey + drawingData.drawings[arrayIndex].id;
          }
          return arrayIndex;
        }}
      >
        {DrawingVirtualizedWrapper}
      </Grid>
    );
  };

  const drawingData: DrawingVirtualizedData = {
    drawings: filteredDrawings,
    folders,
    favorites,
    sidebarSelected,
    currentDrawingId,
    inExcalidrawPage,
    onClick: handleLoadItemWithConfirm,
    onRenameDrawing: onRenameDrawing,
    onAddToFavorites: addToFavorites,
    onRemoveFromFavorites: removeFromFavorites,
    onDeleteDrawing: onDeleteDrawing,
    onAddToFolder: addDrawingToFolder,
    onRemoveFromFolder: removeDrawingFromFolder,
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
          isLiveCollaboration={isLiveCollaboration}
          onSaveDrawing={handleSaveCurrentDrawing}
          SearchComponent={
            <TextField.Root
              style={{
                width: "183px",
              }}
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
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
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
            <div style={{ textAlign: "right", padding: "6px 14px" }}>
              <Select.Root
                size={"1"}
                value={sortBy}
                onValueChange={(newValue: SortByEnum) => {
                  setSortBy(newValue);
                }}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value={SortByEnum.LastModified}>
                    Last Modified
                  </Select.Item>
                  <Select.Item value={SortByEnum.LastCreated}>
                    Last Created
                  </Select.Item>
                  <Select.Item value={SortByEnum.Alphabetically}>
                    Alphabetically
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
            {sidebarSelected === "Favorites" &&
              (filteredDrawings.length >= 1
                ? showDrawings(drawingData, sidebarSelected)
                : !isLoadingDrawings && (
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
              (searchTerm !== ""
                ? filteredDrawings.length >= 1
                  ? showDrawings(drawingData, "Results")
                  : !isLoadingDrawings && (
                      <Placeholder
                        icon={
                          <MagnifyingGlassIcon width={"30"} height={"30"} />
                        }
                        message={
                          <Text size={"2"}>
                            No items found for "{searchTerm}"
                          </Text>
                        }
                      />
                    )
                : !isLoadingDrawings && (
                    <Placeholder
                      icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                      message={<Text size={"2"}>Search for something</Text>}
                    />
                  ))}

            {(sidebarSelected === "All" || sidebarSelected === "") &&
              (filteredDrawings.length > 0
                ? showDrawings(drawingData, "All")
                : !isLoadingDrawings && (
                    <Placeholder
                      icon={<BookmarkIcon width={"30"} height={"30"} />}
                      message={
                        <Text size={"2"}>
                          You don't have saved drawings yet. <br />
                          Start saving one by clicking on the{" "}
                          <Strong>Save</Strong> button.
                        </Text>
                      }
                    />
                  ))}

            {sidebarSelected.startsWith("folder:") &&
              (filteredDrawings.length > 0
                ? showDrawings(drawingData, sidebarSelected)
                : !isLoadingDrawings && (
                    <Placeholder
                      icon={<Cross1Icon width={"30"} height={"30"} />}
                      message={<Text size={"2"}>Collection is empty.</Text>}
                    />
                  ))}
          </div>
        </Flex>
        <ConfirmLoadDrawingModal
          isOpen={isConfirmSwitchDialogOpen}
          onClose={() => setIsConfirmSwitchDialogOpen(false)}
          onConfirm={() => {
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
