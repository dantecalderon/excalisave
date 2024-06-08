import "./Popup.styles.scss";

import {
  BookmarkIcon,
  Cross1Icon,
  HeartFilledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Flex, Select, Strong, Tabs, Text, Theme } from "@radix-ui/themes";
import React, { useEffect, useRef, useState } from "react";
import { DrawingVirtualizedData } from "../components/Drawing/DrawingVirualizedWrapper.component";
import { NavBar } from "../components/NavBar/Navbar.component";
import { Placeholder } from "../components/Placeholder/Placeholder.component";
import { Sidebar } from "../components/Sidebar/Sidebar.component";
import { IDrawing } from "../interfaces/drawing.interface";
import { Folder } from "../interfaces/folder.interface";
import { SORT_BY_OPTIONS, SortByEnum } from "../lib/constants";
import { DrawingStore } from "../lib/drawing-store";
import { XLogger } from "../lib/logger";
import { TabUtils } from "../lib/utils/tab.utils";
import { ConfirmLoadDrawingModal } from "./components/ConfirmLoadDrawingModal.component";
import { SearchTextField } from "./components/SearchTextField.component";
import { TabGridContent } from "./components/TabGridContent.component";
import { useCurrentDrawingId } from "./hooks/useCurrentDrawing.hook";
import { useDrawingLoading } from "./hooks/useDrawingLoading.hook";
import { useDrawings } from "./hooks/useDrawings.hook";
import { useFavorites } from "./hooks/useFavorites.hook";
import { useFolders } from "./hooks/useFolders.hook";
import { useRestorePoint } from "./hooks/useRestorePoint.hook";
import { useSidebarSelected } from "./hooks/useSidebarSelected.hook";
import { checkCleanOutdatedFiles } from "./utils/chek-clean-outdated-files.util";
import { filterAndSortDrawings } from "./utils/filter-and-sort-drawings.util";

const Popup: React.FC = () => {
  const { getRestorePoint, setRestorePoint } = useRestorePoint();
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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const {
    currentDrawingId,
    inExcalidrawPage,
    setCurrentDrawingId,
    isLiveCollaboration,
    setIsLiveCollaboration,
  } = useCurrentDrawingId();
  const drawingIdToSwitch = useRef<string | undefined>(undefined);
  const { sidebarSelected, setSidebarSelected, selectedTab } =
    useSidebarSelected();
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

  const filterDrawings = (
    drawings: IDrawing[],
    folders: Folder[],
    favorites: string[],
    searchTerm: string,
    sortBy: SortByEnum,
    sidebarSelected: string
  ) => {
    const result = filterAndSortDrawings(
      drawings,
      folders,
      favorites,
      searchTerm,
      sortBy,
      sidebarSelected
    );

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
    : filterDrawings(
        drawings,
        folders,
        favorites,
        searchTerm,
        sortBy,
        sidebarSelected
      );

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
          searchComponent={
            <SearchTextField
              value={searchTerm}
              onChangeValue={(newValue) => {
                if (sidebarSelected !== "Results") {
                  setSidebarSelected("Results");
                }
                setSearchTerm(newValue);
              }}
            />
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
            <Tabs.Root value={selectedTab}>
              <TabGridContent
                value="All"
                selectedTab={selectedTab}
                drawingData={drawingData}
                isLoadingDrawings={isLoadingDrawings}
                emptyPlaceholder={
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
                }
              />
              <TabGridContent
                value="Favorites"
                selectedTab={selectedTab}
                drawingData={drawingData}
                isLoadingDrawings={isLoadingDrawings}
                emptyPlaceholder={
                  <Placeholder
                    icon={<HeartFilledIcon width={"30"} height={"30"} />}
                    message={
                      <Text size={"2"}>
                        Your favorite drawings will appear here
                      </Text>
                    }
                  />
                }
              />
              <TabGridContent
                value="Results"
                selectedTab={selectedTab}
                drawingData={drawingData}
                isLoadingDrawings={isLoadingDrawings}
                showGridWhen={searchTerm !== ""}
                emptyPlaceholder={
                  searchTerm === "" ? (
                    <Placeholder
                      icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                      message={<Text size={"2"}>Search for something</Text>}
                    />
                  ) : (
                    <Placeholder
                      icon={<MagnifyingGlassIcon width={"30"} height={"30"} />}
                      message={
                        <Text size={"2"}>
                          No items found for "{searchTerm}"
                        </Text>
                      }
                    />
                  )
                }
              />
              <TabGridContent
                value="Folder"
                selectedTab={selectedTab}
                drawingData={drawingData}
                isLoadingDrawings={isLoadingDrawings}
                emptyPlaceholder={
                  <Placeholder
                    icon={<Cross1Icon width={"30"} height={"30"} />}
                    message={<Text size={"2"}>Collection is empty.</Text>}
                  />
                }
              />
            </Tabs.Root>
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
