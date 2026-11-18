import { Component, type ReactNode } from "react";
import type { Language } from "@/domain/types";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  language: Language;
  scope?: "map" | "page";
};
export class LoadBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const es = this.props.language === "es";
    return (
      <div className="eco-panel" role="alert">
        <h2 className="eco-subheading">
          {this.props.scope === "map"
            ? es
              ? "No pudimos cargar el mapa."
              : "We could not load the map."
            : es
              ? "No pudimos cargar esta sección."
              : "We could not load this section."}
        </h2>
        <p className="eco-body">
          {es
            ? "Recarga la página para volver a intentarlo. Los datos guardados de tu demostración se conservarán."
            : "Reload the page to try again. Your saved demo data will be preserved."}
        </p>
        <Button onClick={() => window.location.reload()}>
          {es ? "Recargar página" : "Reload page"}
        </Button>
      </div>
    );
  }
}
