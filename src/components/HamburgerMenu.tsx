import { useState } from "react";

export type ViewKey = "ventas" | "rutas" | "clientes" | "vendedores" | "categorias" | "presentaciones" | "sabores" | "productos";

export const VIEW_TITLES: Record<ViewKey, string> = {
  ventas: "Registro de Ventas",
  rutas: "Rutas",
  clientes: "Clientes",
  vendedores: "Vendedores",
  categorias: "Categorías",
  presentaciones: "Presentaciones",
  sabores: "Sabores",
  productos: "Productos",
};

const MENU_ITEMS: ViewKey[] = ["ventas", "rutas", "clientes", "vendedores", "categorias", "presentaciones", "sabores", "productos"];

export function HamburgerMenu({ activeView, onSelect }: { activeView: ViewKey; onSelect: (view: ViewKey) => void }) {
  const [open, setOpen] = useState(false);

  function handleSelect(view: ViewKey) {
    onSelect(view);
    setOpen(false);
  }

  return (
    <div className="hamburger-wrap">
      <button
        type="button"
        className={`hamburger ${open ? "open" : ""}`}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`hamburger-menu ${open ? "open" : ""}`}>
        {MENU_ITEMS.map((key) => (
          <button
            key={key}
            type="button"
            className={`hamburger-menu-item ${activeView === key ? "active" : ""}`}
            onClick={() => handleSelect(key)}
          >
            {VIEW_TITLES[key]}
          </button>
        ))}
      </nav>

      {open && <div className="hamburger-backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}
