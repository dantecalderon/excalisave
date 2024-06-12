export interface Adapter {
  setData(data: IAccountData): void;
  getData(): IAccountData;
  getLabel(): string;
  acceptsBookmark(bookmark: Bookmark): boolean;
  onSyncStart(needLock?: boolean, forceLock?: boolean): Promise<void | boolean>;
  onSyncComplete(): Promise<void>;
  onSyncFail(): Promise<void>;
  cancel(): void;
}
