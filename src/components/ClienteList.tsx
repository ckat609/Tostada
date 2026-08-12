import { useState } from "react";
import type { Cliente, Vendedor } from "../lib/graph";
import { deleteCliente } from "../lib/graph";

interface ClienteListProps {
  clientes: Cliente[];
  vendedores: Vendedor[];
  rutaFilter: string;
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void | Promise<void>;
  onEdit: (cliente: Cliente) => void;
  editingCliente: Cliente | null;
}

export function ClienteList({ clientes, vendedores, rutaFilter, loading, error, accessToken, onRefresh, onEdit, editingCliente }: ClienteListProps) {
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const vendedorName = (correlativo: string) => vendedores.find(v => v.correlativo === correlativo)?.vendedor || correlativo;

  const filteredClientes = rutaFilter
    ? clientes.filter(c => c.ruta === rutaFilter).sort((a, b) => a.cliente.localeCompare(b.cliente))
    : [];

  const confirmDelete = async () => {
    if (!deletingCliente) return;

    try {
      await deleteCliente(accessToken, deletingCliente.rowIndex);
      setDeletingCliente(null);
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
          <h2>Clientes</h2>
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

      {loading && <p className="muted">Cargando clientes…</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && !error && !rutaFilter && (
        <p className="muted">Selecciona una ruta para ver sus clientes.</p>
      )}
      {!loading && !error && rutaFilter && filteredClientes.length === 0 && (
        <p className="muted">No hay clientes en esta ruta.</p>
      )}

      {filteredClientes.length > 0 && (
        <>
          <div className="table-wrap desktop-only">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Auxiliar</th>
                  <th>Código</th>
                  <th>Vendedor</th>
                  <th>Agregado</th>
                  <th>Editado</th>
                  <th style={{ width: "140px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((c) => {
                  const isEditing = editingCliente?.rowIndex === c.rowIndex;
                  return (
                    <tr
                      key={c.rowIndex}
                      style={{
                        backgroundColor: isEditing ? "#fff9e6" : "transparent",
                        border: isEditing ? "2px solid #f0ad4e" : "none"
                      }}
                    >
                      <td>{c.cliente}</td>
                      <td>{c.auxiliar}</td>
                      <td>{c.codigo}</td>
                      <td>{vendedorName(c.vendedor)}</td>
                      <td>{c.agregado}</td>
                      <td>{c.editado}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => onEdit(c)}
                            style={{
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.9rem",
                              backgroundColor: "#2196F3",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "600",
                              minWidth: "60px"
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingCliente(c)}
                            style={{
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.9rem",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "600",
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
            {filteredClientes.map((c) => {
              const isEditing = editingCliente?.rowIndex === c.rowIndex;
              return (
                <div
                  key={c.rowIndex}
                  style={{
                    backgroundColor: isEditing ? "#fff9e6" : "#f9f9f9",
                    border: isEditing ? "2px solid #f0ad4e" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "0.75rem"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#333", marginBottom: "0.25rem" }}>{c.cliente}</div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.25rem" }}>Auxiliar: {c.auxiliar}</div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.25rem" }}>Código: {c.codigo}</div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.25rem" }}>Vendedor: {vendedorName(c.vendedor)}</div>
                  <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.25rem" }}>Agregado: {c.agregado || "—"}</div>
                  <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.75rem" }}>Editado: {c.editado || "—"}</div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => onEdit(c)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        fontSize: "1rem",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletingCliente(c)}
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        fontSize: "1rem",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600"
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

      {deletingCliente && (
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
                onClick={() => setDeletingCliente(null)}
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
                  fontWeight: "600"
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
