import { IDrawing } from "../interfaces/drawing.interface";

type TItem = IDrawing & { type: string; location: string; parentId: string };
type ItemType = string; // TODO: Change with type
type TItemLocation = string;

type InternalItemTypeMapping = {
  LocalToServer: Record<string, string>;
  ServerToLocal: Record<string, string>;
};

export type Mapping = Record<ItemType, Record<string, string>>;

export type MappingSnapshotType = "ServerToLocal" | "LocalToServer";

export type MappingSnapshot = {
  ServerToLocal: Mapping;
  LocalToServer: Mapping;
};

export default class Mappings {
  private folders: InternalItemTypeMapping;
  private bookmarks: InternalItemTypeMapping;
  private storage: any;

  constructor(storageAdapter: any, mappingsData: any) {
    this.storage = storageAdapter;
    this.folders = mappingsData.folders;
    this.bookmarks = mappingsData.bookmarks;
  }

  getSnapshot(): MappingSnapshot {
    return {
      ServerToLocal: {
        bookmark: { ...this.bookmarks.ServerToLocal },
        folder: { ...this.folders.ServerToLocal },
      },
      LocalToServer: {
        bookmark: { ...this.bookmarks.LocalToServer },
        folder: { ...this.folders.LocalToServer },
      },
    };
  }

  async addFolder({
    localId,
    remoteId,
  }: {
    localId?: string;
    remoteId?: string;
  }): Promise<void> {
    Mappings.add(this.folders, { localId, remoteId });
  }

  async removeFolder({
    localId,
    remoteId,
  }: {
    localId?: string | number;
    remoteId?: string | number;
  }): Promise<void> {
    Mappings.remove(this.folders, { localId, remoteId });
  }

  async addBookmark({
    localId,
    remoteId,
  }: {
    localId?: string;
    remoteId?: string;
  }): Promise<void> {
    Mappings.add(this.bookmarks, { localId, remoteId });
  }

  async removeBookmark({
    localId,
    remoteId,
  }: {
    localId?: string | number;
    remoteId?: string | number;
  }): Promise<void> {
    Mappings.remove(this.bookmarks, { localId, remoteId });
  }

  async persist(): Promise<void> {
    await this.storage.setMappings({
      folders: this.folders,
      bookmarks: this.bookmarks,
    });
  }

  private static add(
    mappings: Mapping,
    { localId, remoteId }: { localId?: string; remoteId?: string }
  ) {
    if (typeof localId === "undefined" || typeof remoteId === "undefined") {
      throw new Error("Cannot add empty mapping");
    }
    mappings.LocalToServer[localId] = remoteId;
    mappings.ServerToLocal[remoteId] = localId;
  }

  private static remove(
    mappings: Mapping,
    {
      localId,
      remoteId,
    }: { localId?: string | number; remoteId?: string | number }
  ): InternalItemTypeMapping {
    if (localId && remoteId && mappings.LocalToServer[localId] !== remoteId) {
      mappings = this.remove(mappings, { localId });
      return this.remove(mappings, { remoteId });
    }

    if (typeof localId !== "undefined") {
      delete mappings.ServerToLocal[mappings.LocalToServer[localId]];
      delete mappings.LocalToServer[localId];
    } else {
      delete mappings.LocalToServer[mappings.ServerToLocal[remoteId]];
      delete mappings.ServerToLocal[remoteId];
    }
  }

  static mapId(
    mappingsSnapshot: MappingSnapshot,
    item: TItem,
    target: TItemLocation
  ): string {
    if (item.location === target) {
      return item.id;
    }

    const mappingTarget = (item.location +
      "To" +
      target) as MappingSnapshotType;

    return mappingsSnapshot[mappingTarget][item.type][item.id];
  }

  static mapParentId(
    mappingsSnapshot: MappingSnapshot,
    item: TItem,
    target: TItemLocation
  ): string | number {
    if (item.location === target) {
      return item.parentId;
    }

    const mappingTarget = (item.location +
      "To" +
      target) as MappingSnapshotType;

    return mappingsSnapshot[mappingTarget].folder[item.parentId];
  }

  static mappable(
    mappingsSnapshot: MappingSnapshot,
    item1: TItem,
    item2: TItem
  ): boolean {
    if (Mappings.mapId(mappingsSnapshot, item1, item2.location) === item2.id) {
      return true;
    }
    if (Mappings.mapId(mappingsSnapshot, item2, item1.location) === item1.id) {
      return true;
    }
    return false;
  }
}
