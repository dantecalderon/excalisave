import Mappings from "../Mappings";
import { ISerializedSyncProcess } from "../strategies/default";

export type TAccountStrategy = "default" | "overwrite" | "slave";

export interface IAccountData {
  localRoot?: string;
  strategy?: TAccountStrategy;
  syncInterval?: number;
  nestedSync?: boolean;
  failsafe?: boolean;
  username?: string;
  password?: string;
  label?: string;
  errorCount?: number;
  clickCountEnabled?: boolean;
  [p: string]: any;
}

export default interface IAccountStorage {
  accountId: string;
  getAccountData(key: string): Promise<IAccountData>;
  setAccountData(data: IAccountData, key: string): Promise<void>;
  deleteAccountData(): Promise<void>;
  initCache(): Promise<void>;
  getCache(): Promise<any>;
  setCache(data: any): Promise<void>;
  deleteCache(): Promise<void>;
  initMappings(): Promise<void>;
  getMappings(): Promise<Mappings>;
  setMappings(data: Mappings): Promise<void>;
  deleteMappings(): Promise<void>;
  getCurrentContinuation(): Promise<ISerializedSyncProcess | null>;
  setCurrentContinuation(
    continuation: ISerializedSyncProcess | null
  ): Promise<void>;
}
