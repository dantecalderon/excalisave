import React from "react";
import { GridChildComponentProps } from "react-window";
import { IDrawing } from "../../interfaces/drawing.interface";
import { Drawing, DrawingProps } from "./Drawing.component";

export type DrawingVirtualizedData = {
  drawings: IDrawing[];
  favorites: string[];
  sidebarSelected: string;
  currentDrawingId: string;
} & Pick<
  DrawingProps,
  | "onClick"
  | "onRenameDrawing"
  | "onAddToFavorites"
  | "onDeleteDrawing"
  | "onAddToFolder"
  | "onRemoveFromFolder"
  | "onRemoveFromFavorites"
  | "inExcalidrawPage"
  | "folders"
>;

export function DrawingVirtualizedWrapper({
  columnIndex,
  rowIndex,
  style,
  data,
}: GridChildComponentProps<DrawingVirtualizedData>) {
  const drawing = data.drawings[rowIndex * 2 + columnIndex];

  if (!drawing) return null;

  return (
    <div style={style as React.CSSProperties}>
      <Drawing
        key={drawing.id}
        drawing={drawing}
        folders={data.folders}
        folderIdSelected={
          data.sidebarSelected.startsWith("folder:")
            ? data.sidebarSelected
            : undefined
        }
        inExcalidrawPage={data.inExcalidrawPage}
        favorite={data.favorites.includes(drawing.id)}
        isCurrent={data.currentDrawingId === drawing.id}
        onClick={data.onClick}
        onRenameDrawing={data.onRenameDrawing}
        onAddToFavorites={data.onAddToFavorites}
        onRemoveFromFavorites={data.onRemoveFromFavorites}
        onDeleteDrawing={data.onDeleteDrawing}
        onAddToFolder={data.onAddToFolder}
        onRemoveFromFolder={data.onRemoveFromFolder}
      />
    </div>
  );
}
