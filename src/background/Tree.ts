import type { ExcalidrawElement as IExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { Crypto } from "./Crypto";
import { TItemLocation } from "./interfaces/storage-type.interface";
import { TResource } from "./interfaces/resource.interface";
import { ItemType } from "./background.constants";

export class ExcalidrawElement {
  public type = ItemType.ELEMENT;
  public hashValue: string;

  constructor(
    public readonly data: IExcalidrawElement,
    public readonly location: TItemLocation
  ) {}

  getId(): string {
    return this.data.id;
  }

  canMergeWith(otherItem: ExcalidrawElement): boolean {
    if (otherItem instanceof ExcalidrawElement) {
      return this.data.id === otherItem.data.id;
    }

    return false;
  }

  async hash(_preserveOrder: boolean): Promise<string> {
    if (!this.hashValue) {
      this.hashValue = await Crypto.sha256(JSON.stringify(this.data));
    }

    return this.hashValue;
  }

  clone(_withHash?: boolean, location?: TItemLocation): ExcalidrawElement {
    return new ExcalidrawElement(
      structuredClone(this.data),
      location ?? this.location
    );
  }

  withLocation<T extends TItemLocation>(location: T): ExcalidrawElement {
    return new ExcalidrawElement(this.data, location);
  }

  findItem(id: string | number): ExcalidrawElement {
    if (id === this.data.id) {
      return this;
    }

    return undefined;
  }

  findItemFilter(fn: (item: ExcalidrawElement) => boolean): ExcalidrawElement {
    if (fn(this)) {
      return this;
    }

    return undefined;
  }

  inspect(depth = 0): string {
    return (
      Array(depth < 0 ? 0 : depth)
        .fill("  ")
        .join("") + `- #${this.data.id}[${this.data.type}]`
    );
  }

  visitCreate(resource: TResource): Promise<number | string> {
    return resource.createBookmark(this);
  }

  visitUpdate(resource: TResource): Promise<void> {
    return resource.updateBookmark(this);
  }

  visitRemove(resource: TResource): Promise<void> {
    return resource.removeBookmark(this);
  }

  static hydrate(obj: ExcalidrawElement): ExcalidrawElement {
    return new ExcalidrawElement(structuredClone(obj.data), obj.location);
  }
}

export class ExcalidrawDraw {
  public type = ItemType.DRAW;
  public id: string;
  public children: ExcalidrawElement[] = [];
  public hashValue: Record<string, string>;
  public location: TItemLocation;
  public loaded?;

  constructor(
    children: ExcalidrawElement[],
    location: TItemLocation,
    loaded = true
  ) {
    this.children = children;
    this.location = location;
    this.loaded = loaded;
  }

  getId(): string {
    return this.id;
  }

  findDraw(drawingId: string): ExcalidrawDraw {
    if (this.id === drawingId) {
      return this;
    }
    return undefined;
  }

  findElement(elementId: string): ExcalidrawElement {
    return this.children.find((child) => child.findItem(elementId));
  }

  async hash(_preserveOrder: boolean): Promise<string> {
    const preserveOrder = "true";
    if (this.hashValue && this.hashValue[preserveOrder]) {
      return this.hashValue[preserveOrder];
    }

    if (!this.loaded) {
      throw new Error("Trying to calculate hash of a draw that isn't loaded");
    }

    if (!this.hashValue) this.hashValue = {};

    this.hashValue[preserveOrder] = await Crypto.sha256(
      JSON.stringify({
        id: this.id,
        children: this.children.map((child) =>
          child.hash(preserveOrder === "true")
        ),
      })
    );

    return this.hashValue[preserveOrder];
  }

  visitCreate(resource: TResource): Promise<number | string> {
    return resource.createDraw(this);
  }

  visitUpdate(resource: TResource): Promise<void> {
    return resource.updateDraw(this);
  }

  visitRemove(resource: TResource): Promise<void> {
    return resource.removeDraw(this);
  }
}

export type TItem = ExcalidrawElement | ExcalidrawDraw;
