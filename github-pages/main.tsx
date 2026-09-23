import React from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { TaskApp } from "../components/task-app";

window.__JARVIS_STATIC__ = true;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TaskApp />
  </React.StrictMode>,
);
