import { PiIntersectBold } from "react-icons/pi";

export function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="HOME CONNECT — Inicio"
      className="brand"
    >
      <span className="brand-symbol">
        <PiIntersectBold aria-hidden="true" />
      </span>
      <span className="brand-wordmark">
        HOME <span className="text-primary">CONNECT</span>
      </span>
    </button>
  );
}
