import { IDrawing } from "./drawing.interface";

export interface RestorePoint {
  searchTerm: string;
  sidebarSelected: string;
  sortBy: string;
  drawings?: IDrawing[];
}
