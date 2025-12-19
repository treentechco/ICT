import React from "react";
import { createRoot } from "react-dom/client";
import ICTForexLandingPage from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ICTForexLandingPage />
  </React.StrictMode>
);
