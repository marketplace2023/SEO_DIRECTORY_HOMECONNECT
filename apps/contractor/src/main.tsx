import React from "react";
import ReactDOM from "react-dom/client";
import { ContractorApp } from "./app/app";
import { startCatalogSync } from "@/lib/catalog-sync";
import "@/index.css";
import "@/styles/ecosystem.css";
import "@/styles/yelp-theme.css";
import "@/styles/portals.css";
import "@/styles/discovery.css";
const root = ReactDOM.createRoot(document.getElementById("root")!);
startCatalogSync(() =>
  root.render(
    <React.StrictMode>
      <ContractorApp />
    </React.StrictMode>,
  ),
);
