import { useState } from "react";

function getSelectedTab(sidebarSelected: string): string {
  if (sidebarSelected === "Favorites") {
    return "Favorites";
  } else if (sidebarSelected === "Results") {
    return "Results";
  } else if (sidebarSelected.startsWith("folder:")) {
    return "Folder";
  }

  // sidebarSelected === "" || sidebarSelected === "All"
  return "All";
}

export function useSidebarSelected() {
  const [sidebarSelected, setSidebarSelected] = useState("");

  return {
    sidebarSelected,
    setSidebarSelected,
    selectedTab: getSelectedTab(sidebarSelected),
  };
}
