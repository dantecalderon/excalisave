import React from "react";
import { Tabs } from "@radix-ui/themes";
import {
  DrawingVirtualizedData,
  DrawingVirtualizedWrapper,
} from "../../components/Drawing/DrawingVirualizedWrapper.component";
import { FixedSizeGrid } from "react-window";

type TabGridContentProps = {
  value: string;
  selectedTab: string;
  drawingData: DrawingVirtualizedData;
  isLoadingDrawings: boolean;
  emptyPlaceholder: React.ReactNode;
  showGridWhen?: boolean;
};

export function TabGridContent({
  value,
  selectedTab,
  drawingData,
  emptyPlaceholder,
  isLoadingDrawings,
  showGridWhen = true,
}: TabGridContentProps) {
  const isCurrentTabSelected = value === selectedTab;

  const showGrid =
    isCurrentTabSelected && drawingData.drawings.length > 0 && showGridWhen;

  return (
    <Tabs.Content value={value}>
      {showGrid ? (
        <FixedSizeGrid
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
              return drawingData.drawings[arrayIndex].id;
            }
            return arrayIndex;
          }}
        >
          {DrawingVirtualizedWrapper}
        </FixedSizeGrid>
      ) : (
        !isLoadingDrawings && emptyPlaceholder
      )}
    </Tabs.Content>
  );
}
