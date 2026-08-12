import { useState } from "react";
import type { Ruta } from "../lib/graph";
import { deleteRuta } from "../lib/graph";

interface RutaListProps {
  rutas: Ruta[];
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void | Promise<void>;
  onEdit: (ruta: Ruta) => void;
  editingRuta: Ruta | null;
}

export function RutaList({ rutas, loading, error, accessToken, onRefresh, onEdit, editingRuta }: RutaListProps) {
  const [deletingRuta, setDeletingRuta] = useState<Ruta | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sortedRutas = [...rutas].sort((a, b) => a.ruta.localeCompare(b.ruta));

  const confirmDelete = async () => {
    if (!deletingRuta) return;

    try {
      await deleteRuta(accessToken, deletingRuta.rowIndex);
      setDeletingRuta(null);
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
          <h2>Rutas</h2>
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

      {loading && <p className="muted">Cargando rutas…</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && !error && sortedRutas.length === 0 && (
        <p className="muted">No hay rutas aún.</p>
      )}

      {sortedRutas.length > 0 && (
        <>
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th style={{ width: "140px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRutas.map((r) => {
                  const isEditing = editingRuta?.rowIndex === r.rowIndex;
                  return (
                    <tr
                      key={r.rowIndex}
                      style={{
                        backgroundColor: isEditing ? "#fff9e6" : "transparent",
                        border: isEditing ? "2px solid #f0ad4e" : "none"
                      }}
                    >
                      <td>{r.ruta}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => onEdit(r)}
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
                            onClick={() => setDeletingRuta(r)}
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
            {sortedRutas.map((r) => {
              const isEditing = editingRuta?.rowIndex === r.rowIndex;
              return (
                <div
                  key={r.rowIndex}
                  style={{
                    backgroundColor: isEditing ? "#fff9e6" : "#f9f9f9",
                    border: isEditing ? "2px solid #f0ad4e" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "0.75rem"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#333", marginBottom: "0.75rem" }}>{r.ruta}</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => onEdit(r)}
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
                      onClick={() => setDeletingRuta(r)}
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

      {deletingRuta && (
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
                onClick={() => setDeletingRuta(null)}
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
