export function Brand({
  onClick,
  full = false,
}: {
  onClick: () => void;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="HOME CONNECT — Inicio"
      className="brand"
    >
      <img
        src={full ? "/images/brand/full.png" : "/images/brand/header.png"}
        alt=""
        className={full ? "brand-full" : "brand-horizontal"}
      />
      <span className="sr-only">HOME CONNECT</span>
    </button>
  );
}
