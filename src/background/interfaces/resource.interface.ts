export interface IResource {
  getBookmarksTree(loadAll?: boolean): Promise<any>;

  createBookmark(bookmark: any): Promise<string | number>;
  updateBookmark(bookmark: any): Promise<void>;
  removeBookmark(bookmark: any): Promise<void>;

  createDraw(folder: any): Promise<string | number>;
  updateDraw(folder: any): Promise<void>;
  removeDraw(folder: any): Promise<void>;

  isAvailable(): Promise<boolean>;
}

export interface BulkImportResource extends IResource {
  bulkImportFolder(id: number | string, folder: any): Promise<any>;
}

export type TResource = IResource | BulkImportResource;
