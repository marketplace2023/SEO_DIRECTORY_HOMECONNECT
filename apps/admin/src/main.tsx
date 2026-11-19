import React from "react";
import ReactDOM from "react-dom/client";
import { AdminApp } from "./app/app";
import "@/index.css";
import "@/styles/ecosystem.css";
import "@/styles/yelp-theme.css";
import "@/styles/portals.css";
import "@/styles/discovery.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
