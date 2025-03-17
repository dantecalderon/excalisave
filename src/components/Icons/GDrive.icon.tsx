import React from "react";
import IconProps from "./icon-props.types";

export const GoogleDriveIcon = ({ size = 16, color = "#fff" }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <path
        d="M7.71 3.52L1.15 15l3.42 5.99 6.56-11.47-3.42-6zM13.35 15H9.73L6.3 21h8.24c-.96-1.06-1.54-2.46-1.54-4 0-.7.13-1.37.35-2zM20 16v-3h-2v3h-3v2h3v3h2v-3h3v-2h-3zm.71-4.75L15.42 2H8.58v.01l6.15 10.77C15.82 11.68 17.33 11 19 11c.59 0 1.17.09 1.71.25z"
        fill={color}
      />
    </svg>
  );
};
