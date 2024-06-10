import { IDrawing } from "../../interfaces/drawing.interface";
import { Folder } from "../../interfaces/folder.interface";
import { SortByEnum } from "../../lib/constants";

export function filterAndSortDrawings(
  drawings: IDrawing[],
  folders: Folder[],
  favorites: string[],
  searchTerm: string,
  sortBy: SortByEnum,
  sidebarSelected: string
): IDrawing[] {
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
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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

  return result;
}
