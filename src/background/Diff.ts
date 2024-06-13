import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";

type TItem = ExcalidrawElement;

import Mappings, { MappingSnapshot } from "./Mappings";
import { XLogger as Logger } from "../lib/logger";
import {
  ItemLocation,
  TItemLocation,
} from "./interfaces/storage-type.interface";

export const ActionType = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  MOVE: "MOVE",
  REMOVE: "REMOVE",
} as const;

export type TActionType = (typeof ActionType)[keyof typeof ActionType];

export interface CreateAction {
  type: "CREATE";
  payload: TItem;
  oldItem?: TItem;
  index?: number;
  oldIndex?: number;
}

export interface UpdateAction {
  type: "UPDATE";
  payload: TItem;
  oldItem?: TItem;
}

export interface RemoveAction {
  type: "REMOVE";
  payload: TItem;
  oldItem?: TItem;
  index?: number;
  oldIndex?: number;
}

export interface MoveAction {
  type: "MOVE";
  payload: TItem;
  oldItem: TItem;
  index?: number;
  oldIndex?: number;
}

export type Action = CreateAction | UpdateAction | RemoveAction | MoveAction;

export default class Diff {
  private readonly actions: {
    [ActionType.CREATE]: CreateAction[];
    [ActionType.UPDATE]: UpdateAction[];
    [ActionType.MOVE]: MoveAction[];
    [ActionType.REMOVE]: RemoveAction[];
  };

  constructor() {
    this.actions = {
      [ActionType.CREATE]: [],
      [ActionType.UPDATE]: [],
      [ActionType.MOVE]: [],
      [ActionType.REMOVE]: [],
    };
  }

  clone() {
    const newDiff = new Diff();
    this.getActions().forEach((action: Action) => {
      newDiff.commit(action);
    });

    return newDiff;
  }

  commit(action: Action): void {
    switch (action.type) {
      case ActionType.CREATE:
        this.actions[action.type].push({ ...action });
        break;
      case ActionType.UPDATE:
        this.actions[action.type].push({ ...action });
        break;
      case ActionType.MOVE:
        this.actions[action.type].push({ ...action });
        break;
      case ActionType.REMOVE:
        this.actions[action.type].push({ ...action });
        break;
    }
  }

  retract(action: Action): void {
    switch (action.type) {
      case ActionType.CREATE:
        this.actions[action.type].splice(
          this.actions[action.type].indexOf(action),
          1
        );
        break;
      case ActionType.UPDATE:
        this.actions[action.type].splice(
          this.actions[action.type].indexOf(action),
          1
        );
        break;
      case ActionType.MOVE:
        this.actions[action.type].splice(
          this.actions[action.type].indexOf(action),
          1
        );
        break;
      case ActionType.REMOVE:
        this.actions[action.type].splice(
          this.actions[action.type].indexOf(action),
          1
        );
        break;
    }
  }

  getActions(type?: TActionType): Action[] {
    if (type) {
      return this.actions[type].slice();
    }
    return [].concat(
      this.actions[ActionType.UPDATE],
      this.actions[ActionType.CREATE],
      this.actions[ActionType.MOVE],
      this.actions[ActionType.REMOVE]
    );
  }

  static findChain(
    mappingsSnapshot: MappingSnapshot,
    actions: Action[],
    itemTree: Folder,
    currentItem: TItem,
    targetAction: Action,
    chain: Action[] = []
  ): boolean {
    const targetItemInTree = itemTree.findFolder(
      Mappings.mapId(mappingsSnapshot, targetAction.payload, itemTree.location)
    );
    if (
      targetAction.payload.findItem(
        ItemType.FOLDER,
        Mappings.mapParentId(
          mappingsSnapshot,
          currentItem,
          targetAction.payload.location
        )
      ) ||
      (targetItemInTree &&
        targetItemInTree.findFolder(
          Mappings.mapParentId(mappingsSnapshot, currentItem, itemTree.location)
        ))
    ) {
      return true;
    }
    const newCurrentActions = actions.filter(
      (targetAction) =>
        !chain.includes(targetAction) &&
        (targetAction.payload.findItem(
          ItemType.FOLDER,
          Mappings.mapParentId(
            mappingsSnapshot,
            currentItem,
            targetAction.payload.location
          )
        ) ||
          (itemTree.findFolder(
            Mappings.mapId(
              mappingsSnapshot,
              targetAction.payload,
              itemTree.location
            )
          ) &&
            itemTree
              .findFolder(
                Mappings.mapId(
                  mappingsSnapshot,
                  targetAction.payload,
                  itemTree.location
                )
              )
              .findFolder(
                Mappings.mapParentId(
                  mappingsSnapshot,
                  currentItem,
                  itemTree.location
                )
              )))
    );
    if (newCurrentActions.length) {
      for (const newCurrentAction of newCurrentActions) {
        if (
          Diff.findChain(
            mappingsSnapshot,
            actions,
            itemTree,
            newCurrentAction.payload,
            targetAction,
            [...chain, newCurrentAction]
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * on ServerToLocal: don't map removals
   * on LocalToServer:
   * @param mappingsSnapshot
   * @param targetLocation
   * @param filter
   * @param skipErroneousActions
   */
  map(
    mappingsSnapshot: MappingSnapshot,
    targetLocation: TItemLocation,
    filter: (Action: any) => boolean = () => true,
    skipErroneousActions = false
  ): Diff {
    const newDiff = new Diff();

    // Map payloads
    this.getActions()
      .map((a) => a as Action)
      .forEach((action) => {
        let newAction;

        if (!filter(action)) {
          newDiff.commit(action);
          return;
        }

        // needed because we set oldItem in the first section, so we wouldn't know anymore if it was set before
        const oldItem = action.oldItem;

        // We have two sections here, because we want to be able to take IDs from oldItem even for moves
        // but not parentIds (which do change during moves, obviously)

        if (oldItem && targetLocation !== ItemLocation.SERVER) {
          const oldId = action.oldItem.id;
          const newId = action.payload.id;
          newAction = {
            ...action,
            payload: action.payload.clone(false, targetLocation),
            oldItem: action.oldItem.clone(false, action.payload.location),
          };
          newAction.payload.id = oldId;
          newAction.oldItem.id = newId;
        } else {
          newAction = {
            ...action,
            payload: action.payload.clone(false, targetLocation),
            oldItem: action.payload.clone(false),
          };
          newAction.payload.id = Mappings.mapId(
            mappingsSnapshot,
            action.payload,
            targetLocation
          );
        }

        if (
          oldItem &&
          targetLocation !== ItemLocation.SERVER &&
          action.type !== ActionType.MOVE &&
          action.type !== ActionType.UPDATE
        ) {
          newAction.payload.parentId = action.oldItem.parentId;
          newAction.oldItem.parentId = action.payload.parentId;
        } else {
          newAction.oldItem.parentId = action.payload.parentId;
          newAction.payload.parentId = Mappings.mapParentId(
            mappingsSnapshot,
            action.payload,
            targetLocation
          );
          if (
            typeof newAction.payload.parentId === "undefined" &&
            typeof action.payload.parentId !== "undefined"
          ) {
            if (skipErroneousActions) {
              // simply ignore this action as it appears to be no longer valid
              Logger.log("Failed to map parentId: " + action.payload.parentId);
              Logger.log("Removing MOVE action from plan:", action);
              return;
            } else {
              Logger.log("Failed to map parentId of action " + action);
              throw new Error(
                "Failed to map parentId: " + action.payload.parentId
              );
            }
          }
        }

        newDiff.commit(newAction);
      });
    return newDiff;
  }

  toJSON() {
    return this.getActions().map((action: Action) => {
      return {
        ...action,
        payload: action.payload.clone(false),
        oldItem: action.oldItem && action.oldItem.clone(false),
      };
    });
  }

  inspect(depth = 0): string {
    return (
      "Diff\n" +
      this.getActions()
        .map((action: Action) => {
          return `\nAction: ${
            action.type
          }\nPayload: ${action.payload.inspect()}${
            "index" in action ? `Index: ${action.index}\n` : ""
          }${
            "order" in action
              ? `Order: ${JSON.stringify(action.order, null, "\t")}`
              : ""
          }`;
        })
        .join("\n")
    );
  }

  static fromJSON(json: any) {
    const diff = new Diff();
    json.forEach((action: Action): void => {
      action.payload = structuredClone(action.payload);
      action.oldItem = action.oldItem && structuredClone(action.oldItem);
      diff.commit(action);
    });

    return diff;
  }
}
