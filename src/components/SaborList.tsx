import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Sabor } from "../lib/graph";
import { deleteSabor } from "../lib/graph";

interface SaborListProps {
  sabores: Sabor[];
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void | Promise<void>;
  onEdit: (sabor: Sabor) => void;
  editingSabor: Sabor | null;
}

export function SaborList({ sabores, loading, error, accessToken, onRefresh, onEdit, editingSabor }: SaborListProps) {
  const [deletingSabor, setDeletingSabor] = useState<Sabor | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  // Collapse the expanded row's buttons when tapping anything that isn't a row item
  useEffect(() => {
    if (expandedRowIndex === null) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-recent-row-item]")) {
        setExpandedRowIndex(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [expandedRowIndex]);

  const sortedSabores = [...sabores].sort((a, b) => a.sabor.localeCompare(b.sabor));

  const confirmDelete = async () => {
    if (!deletingSabor) return;

    try {
      await deleteSabor(accessToken, deletingSabor.rowIndex);
      setDeletingSabor(null);
      triggerFlash("Sabor eliminado");
      onRefresh();
    } catch (err) {
      alert("Error al eliminar: " + (err instanceof Error ? err.message : "Error desconocido"));
    }
  };

  return (
    <section className="card">
      <div className="section-heading" style={{ marginBottom: isCollapsed ? 0 : "1.5rem" }}>
        <div>
          <p className="eyebrow">Libro de trabajo</p>
          <h2>Sabores</h2>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            padding: "0.5rem",
            backgroundColor: "transparent",
            color: "#2196F3",
            border: "none",
            cursor: "pointer",
            fontSize: "1.5rem",
            lineHeight: 1,
            transition: "transform 0.3s ease",
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          ▼
        </button>
      </div>

      <div style={{
        overflow: "hidden",
        transition: "max-height 0.3s ease, opacity 0.3s ease",
        maxHeight: isCollapsed ? "0" : "10000px",
        opacity: isCollapsed ? 0 : 1
      }}>

      {loading && <p className="muted">Cargando sabores…</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && !error && sortedSabores.length === 0 && (
        <p className="muted">No hay sabores aún.</p>
      )}

      {sortedSabores.length > 0 && (
        <>
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Sabor</th>
                  <th style={{ width: "140px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedSabores.map((s) => {
                  const isEditing = editingSabor?.rowIndex === s.rowIndex;
                  return (
                    <tr
                      key={s.rowIndex}
                      style={{
                        backgroundColor: isEditing ? "#fff9e6" : "transparent",
                        border: isEditing ? "2px solid #f0ad4e" : "none"
                      }}
                    >
                      <td>{s.sabor}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => onEdit(s)}
                            style={{
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.9rem",
                              backgroundColor: "#2196F3",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              minWidth: "60px"
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingSabor(s)}
                            style={{
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.9rem",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              minWidth: "60px"
                            }}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-only">
            {sortedSabores.map((s) => {
              const isEditing = editingSabor?.rowIndex === s.rowIndex;
              const isExpanded = expandedRowIndex === s.rowIndex;
              return (
                <div
                  key={s.rowIndex}
                  data-recent-row-item
                  onClick={() => setExpandedRowIndex(isExpanded ? null : s.rowIndex)}
                  style={{
                    backgroundColor: isEditing ? "#fff9e6" : "#f9f9f9",
                    border: isEditing ? "2px solid #f0ad4e" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "0.75rem",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#333", marginBottom: isExpanded ? "0.75rem" : 0 }}>{s.sabor}</div>
                  {isExpanded && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          fontSize: "1rem",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingSabor(s); }}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          fontSize: "1rem",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      {deletingSabor && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "90%"
          }}>
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>¿Estás seguro?</h3>
            <p style={{ marginBottom: "1.5rem" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeletingSabor(null)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {flash &&
        createPortal(
          <div className="venta-toast-wrap">
            <div key={flash.key} className="venta-toast">
              {flash.text}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
