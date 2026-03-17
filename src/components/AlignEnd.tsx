import React from "react";

export const AlignEnd: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <div className="w-full flex justify-end mt-6">{children}</div>;
};
