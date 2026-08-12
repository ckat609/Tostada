import { useState } from "react";
import type { Presentacion } from "../lib/graph";
import { deletePresentacion } from "../lib/graph";

interface PresentacionListProps {
  presentaciones: Presentacion[];
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void | Promise<void>;
  onEdit: (presentacion: Presentacion) => void;
  editingPresentacion: Presentacion | null;
}

export function PresentacionList({ presentaciones, loading, error, accessToken, onRefresh, onEdit, editingPresentacion }: PresentacionListProps) {
  const [deletingPresentacion, setDeletingPresentacion] = useState<Presentacion | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sortedPresentaciones = [...presentaciones].sort((a, b) => a.presentacion.localeCompare(b.presentacion));

  const confirmDelete = async () => {
    if (!deletingPresentacion) return;

    try {
      await deletePresentacion(accessToken, deletingPresentacion.rowIndex);
      setDeletingPresentacion(null);
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
          <h2>Presentaciones</h2>
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

      {loading && <p className="muted">Cargando presentaciones…</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && !error && sortedPresentaciones.length === 0 && (
        <p className="muted">No hay presentaciones aún.</p>
      )}

      {sortedPresentaciones.length > 0 && (
        <>
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Presentación</th>
                  <th style={{ width: "140px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedPresentaciones.map((p) => {
                  const isEditing = editingPresentacion?.rowIndex === p.rowIndex;
                  return (
                    <tr
                      key={p.rowIndex}
                      style={{
                        backgroundColor: isEditing ? "#fff9e6" : "transparent",
                        border: isEditing ? "2px solid #f0ad4e" : "none"
                      }}
                    >
                      <td>{p.presentacion}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => onEdit(p)}
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
                            onClick={() => setDeletingPresentacion(p)}
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
            {sortedPresentaciones.map((p) => {
              const isEditing = editingPresentacion?.rowIndex === p.rowIndex;
              return (
                <div
                  key={p.rowIndex}
                  style={{
                    backgroundColor: isEditing ? "#fff9e6" : "#f9f9f9",
                    border: isEditing ? "2px solid #f0ad4e" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "0.75rem"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#333", marginBottom: "0.75rem" }}>{p.presentacion}</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => onEdit(p)}
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
                      onClick={() => setDeletingPresentacion(p)}
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
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      {deletingPresentacion && (
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
                onClick={() => setDeletingPresentacion(null)}
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
    </section>
  );
}
