import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ColorAnalyzerOld from "./ColorAnalyzerOld.jsx";
import ColorAnalyzer from "./ColorAnalyzer.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ColorAnalyzer />
  </StrictMode>
);
