"use client";

import React from "react";
import { EditorProvider } from "../../context/EditorContext";
import { EditorLayout } from "../../components/Editor/EditorLayout";

const EditorPage: React.FC = () => {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
};

export default EditorPage;
