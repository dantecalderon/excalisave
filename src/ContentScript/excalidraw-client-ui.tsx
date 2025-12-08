import React from "react";
import ReactDOM from "react-dom";
import { DrawingTitle } from "./components/DrawingTitle/DrawingTitle.component";

type MountOptions = {
  useShadow?: boolean;
  appendChild?: boolean;
};

export function mountReactComponent(
  Component: React.ReactElement,
  target: HTMLElement,
  options: MountOptions = {}
) {
  const { useShadow = true, appendChild = false } = options;

  let mountPoint: HTMLElement;

  if (useShadow) {
    const shadow = target.attachShadow({ mode: "open" });
    mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);
  } else if (appendChild) {
    // Create a wrapper element and append it as a child
    mountPoint = document.createElement("div");
    target.appendChild(mountPoint);
  } else {
    mountPoint = target;
  }

  // Render using React 17 API
  ReactDOM.render(Component, mountPoint);

  return {
    unmount: () => ReactDOM.unmountComponentAtNode(mountPoint),
    mountPoint,
  };
}

export function initExcalidrawClientUI() {
  const appMenuTopLeft = document.getElementsByClassName("App-menu_top__left");
  console.log("AppEMenuTopleito223", appMenuTopLeft);
  if (appMenuTopLeft.length !== 1) return;

  mountReactComponent(<DrawingTitle />, appMenuTopLeft[0] as HTMLElement, {
    useShadow: false,
    appendChild: true,
  });
}
