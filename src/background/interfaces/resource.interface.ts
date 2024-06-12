export interface IResource {
  getBookmarksTree(loadAll?: boolean): Promise<any>;
  createBookmark(bookmark: any): Promise<string | number>;
  updateBookmark(bookmark: any): Promise<void>;
  removeBookmark(bookmark: any): Promise<void>;

  createFolder(folder: any): Promise<string | number>;
  updateFolder(folder: any): Promise<void>;
  removeFolder(folder: any): Promise<void>;
  isAvailable(): Promise<boolean>;
}

export interface BulkImportResource extends IResource {
  bulkImportFolder(id: number | string, folder: any): Promise<any>;
}
