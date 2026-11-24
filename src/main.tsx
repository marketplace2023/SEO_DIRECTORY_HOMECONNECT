import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startCatalogSync } from "@/lib/catalog-sync";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);
startCatalogSync(() =>
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  ),
);
