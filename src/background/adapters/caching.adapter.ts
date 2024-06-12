import {
  MissingItemOrderError,
  UnknownBookmarkUpdateError,
  UnknownCreateTargetError,
  UnknownFolderItemOrderError,
  UnknownFolderOrderError,
  UnknownFolderUpdateError,
  UnknownMoveOriginError,
  UnknownMoveTargetError,
} from "../../lib/errors/errors";
import { XLogger } from "../../lib/logger";
import { Adapter } from "../interfaces/adapter.interface";
import { BulkImportResource } from "../interfaces/resource.interface";
import { ItemLocation } from "../interfaces/storage-type.interface";

export default class CachingAdapter implements Adapter, BulkImportResource {
  protected highestId: number;
  protected bookmarksCache: any;
  protected server: any;
  constructor(_server: any) {
    this.resetCache();
  }

  resetCache() {
    this.highestId = 0;
    this.bookmarksCache = {};

    // new Folder({
    //   id: 0,
    //   title: "root",
    //   location: ItemLocation.SERVER,
    // });
  }

  getLabel(): string {
    const data = this.getData();
    return data.label || data.username + "@" + new URL(data.url).hostname;
  }

  async getBookmarksTree(): Promise<any> {
    return this.bookmarksCache.clone();
  }

  acceptsBookmark(bm: any): boolean {
    if (bm.url === "data:") {
      return false;
    }
    try {
      return Boolean(
        [
          "https:",
          "http:",
          "ftp:",
          "data:",
          "javascript:",
          "chrome:",
          "file:",
        ].includes(new URL(bm.url).protocol)
      );
    } catch (e) {
      return false;
    }
  }

  async createBookmark(bm: any): Promise<string | number> {
    XLogger.log("CREATE", bm);
    bm.id = ++this.highestId;
    const foundFolder = this.bookmarksCache.findFolder(bm.parentId);
    if (!foundFolder) {
      throw new UnknownCreateTargetError();
    }
    foundFolder.children.push(bm);
    this.bookmarksCache.createIndex();
    return bm.id;
  }

  async updateBookmark(newBm: any): Promise<void> {
    XLogger.log("UPDATE", newBm);
    const foundBookmark = this.bookmarksCache.findBookmark(newBm.id);
    if (!foundBookmark) {
      throw new UnknownBookmarkUpdateError();
    }
    foundBookmark.url = newBm.url;
    foundBookmark.title = newBm.title;
    if (String(foundBookmark.parentId) === String(newBm.parentId)) {
      return;
    }
    const foundOldFolder = this.bookmarksCache.findFolder(
      foundBookmark.parentId
    );
    if (!foundOldFolder) {
      throw new UnknownMoveOriginError();
    }
    const foundNewFolder = this.bookmarksCache.findFolder(newBm.parentId);
    if (!foundNewFolder) {
      throw new UnknownMoveTargetError();
    }
    foundOldFolder.children.splice(
      foundOldFolder.children.indexOf(foundBookmark),
      1
    );
    foundNewFolder.children.push(foundBookmark);
    foundBookmark.parentId = newBm.parentId;
    this.bookmarksCache.createIndex();
  }

  async removeBookmark(bookmark: any): Promise<void> {
    XLogger.log("REMOVE", { bookmark });
    const id = bookmark.id;
    const foundBookmark = this.bookmarksCache.findBookmark(id);
    if (!foundBookmark) {
      return;
    }
    const foundOldFolder = this.bookmarksCache.findFolder(
      foundBookmark.parentId
    );
    if (!foundOldFolder) {
      return;
    }
    foundOldFolder.children.splice(
      foundOldFolder.children.indexOf(foundBookmark),
      1
    );
    this.bookmarksCache.createIndex();
  }

  async createFolder(folder: any): Promise<string | number> {
    XLogger.log("CREATEFOLDER", { folder });
    // const newFolder = new Tree.Folder({
    //   id: ++this.highestId,
    //   parentId: folder.parentId,
    //   title: folder.title,
    //   location: ItemLocation.SERVER,
    // });
    // const foundParentFolder = this.bookmarksCache.findFolder(
    //   newFolder.parentId
    // );
    // if (!foundParentFolder) {
    //   throw new UnknownCreateTargetError();
    // }
    // foundParentFolder.children.push(newFolder);
    // this.bookmarksCache.createIndex();
    // return newFolder.id;
    return undefined;
  }

  async updateFolder(folder: any): Promise<void> {
    XLogger.log("UPDATEFOLDER", { folder });
    const id = folder.id;
    const oldFolder = this.bookmarksCache.findFolder(id);
    if (!oldFolder) {
      throw new UnknownFolderUpdateError();
    }

    const foundOldParentFolder = this.bookmarksCache.findFolder(
      oldFolder.parentId
    );
    if (!foundOldParentFolder) {
      throw new UnknownMoveOriginError();
    }
    const foundNewParentFolder = this.bookmarksCache.findFolder(
      folder.parentId
    );
    if (!foundNewParentFolder) {
      throw new UnknownMoveTargetError();
    }
    if (oldFolder.findFolder(foundNewParentFolder.id)) {
      throw new Error(
        "Detected creation of folder loop: Moving " +
          id +
          " to " +
          folder.parentId +
          ", but it already contains the new parent node"
      );
    }
    foundOldParentFolder.children.splice(
      foundOldParentFolder.children.indexOf(oldFolder),
      1
    );
    foundNewParentFolder.children.push(oldFolder);
    oldFolder.title = folder.title;
    oldFolder.parentId = folder.parentId;
    this.bookmarksCache.createIndex();
  }

  async removeFolder(folder: any): Promise<void> {
    XLogger.log("REMOVEFOLDER", { folder });
    const id = folder.id;
    const oldFolder = this.bookmarksCache.findFolder(id);
    if (!oldFolder) {
      return;
    }
    // root folder doesn't have a parent, yo!
    const foundOldFolder = this.bookmarksCache.findFolder(oldFolder.parentId);
    if (!foundOldFolder) {
      return;
    }
    foundOldFolder.children.splice(
      foundOldFolder.children.indexOf(oldFolder),
      1
    );
    this.bookmarksCache.createIndex();
  }

  async bulkImportFolder(id: string | number, folder: any): Promise<any> {
    XLogger.log("BULKIMPORT", { id, folder });
    const foundFolder = this.bookmarksCache.findFolder(id);
    if (!foundFolder) {
      throw new UnknownCreateTargetError();
    }
    // clone and adjust ids
    const imported = folder.clone();
    imported.id = id;
    await imported.traverse(async (item: any, parentFolder: any) => {
      item.id = ++this.highestId;
      item.parentId = parentFolder.id;
    });
    // insert into tree
    foundFolder.children = imported.children;
    // good as new
    this.bookmarksCache.createIndex();
    return imported;
  }

  setData(data: any): void {
    this.server = { ...data };
  }

  getData(): any {
    return { ...this.server };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
  async onSyncStart(_needLock = true): Promise<void | boolean> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onSyncFail(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onSyncComplete(): Promise<void> {}

  cancel() {
    // noop
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
