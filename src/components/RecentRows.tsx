import { useState } from "react";
import type { RecentRow, Ruta, Presentacion, Sabor, Producto, Categoria } from "../lib/graph";
import { deleteRow } from "../lib/graph";

interface RecentRowsProps {
  rows: RecentRow[];
  rutas: Ruta[];
  presentaciones: Presentacion[];
  sabores: Sabor[];
  productos: Producto[];
  categorias: Categoria[];
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void;
  onEdit: (row: RecentRow) => void;
  editingRow: RecentRow | null;
}

type DateFilter = "today" | "week" | "month" | "range";

// Convert a "YYYY-MM-DD H:MM:SS" UTC timestamp to Mexico Central Time (UTC-6).
// Hour/minute/second may be 1 or 2 digits, since Google Sheets drops the
// leading zero when formatting a datetime cell that was typed in manually.
// Returns null if the timestamp doesn't match at all (e.g. a locale-specific
// date format from a manual edit, like "8/8/2026").
const FECHA_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/;

function toMexicoTime(fecha: string): Date | null {
  const match = fecha.match(FECHA_PATTERN);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(utcMs - 6 * 60 * 60 * 1000);
}

export function RecentRows({ rows, rutas, presentaciones, sabores, productos, categorias, loading, error, accessToken, onRefresh, onEdit, editingRow }: RecentRowsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter rows by date
  const getFilteredRows = () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return rows.filter(row => {
      if (!row.fecha) return false;

      // Extract date part from timestamp (YYYY-MM-DD)
      const rowDateOnly = row.fecha.split(' ')[0];

      switch (dateFilter) {
        case "today":
          return rowDateOnly === todayStr;

        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          const weekAgoStr = weekAgo.toISOString().slice(0, 10);
          return rowDateOnly >= weekAgoStr;

        case "month":
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          const monthAgoStr = monthAgo.toISOString().slice(0, 10);
          return rowDateOnly >= monthAgoStr;

        case "range":
          if (!startDate && !endDate) return true;
          const start = startDate || "0000-01-01";
          const end = endDate || "9999-12-31";
          return rowDateOnly >= start && rowDateOnly <= end;

        default:
          return true;
      }
    });
  };

  const filteredRows = getFilteredRows();

  const handleDelete = async (row: RecentRow) => {
    setDeletingRowIndex(row.rowIndex);
  };

  const confirmDelete = async () => {
    if (deletingRowIndex === null) return;

    try {
      await deleteRow(accessToken, deletingRowIndex);
      setDeletingRowIndex(null);
      onRefresh();
    } catch (err) {
      alert("Error al eliminar: " + (err instanceof Error ? err.message : "Error desconocido"));
    }
  };

  const cancelDelete = () => {
    setDeletingRowIndex(null);
  };

  const generateCSV = () => {
    if (filteredRows.length === 0) return null;

    const headers = ["Fecha", "Hora", "Ruta", "Cliente", "Categoria", "Descripcion", "Presentacion", "Sabor", "Cantidad", "Precio Unitario", "Precio Total"];
    const csvRows = [
      headers.join(","),
      ...filteredRows.map(row => {
        // Convert UTC timestamp to Mexico Central Time (UTC-6) for CSV
        let dateOnly = '';
        let timeOnly = '';
        const mexicoTime = toMexicoTime(row.fecha);
        if (mexicoTime) {
          const mexicoTimestamp = mexicoTime.toISOString();
          dateOnly = mexicoTimestamp.substring(0, 10); // YYYY-MM-DD
          timeOnly = mexicoTimestamp.substring(11, 19); // HH:MM:SS
        } else {
          dateOnly = row.fecha;
        }

        // Look up human-readable values
        const rutaData = rutas.find(r => r.correlativo === row.ruta);
        const productoData = productos.find(p => p.correlativo === row.producto);
        const categoriaData = productoData ? categorias.find(c => c.correlativo === productoData.categoria) : null;
        const presentacion = presentaciones.find(p => p.correlativo === row.presentacion);
        const sabor = sabores.find(s => s.correlativo === row.sabor);

        return [
          dateOnly,
          timeOnly,
          `"${rutaData?.ruta || row.ruta}"`,
          `"${row.cliente}"`,
          `"${categoriaData?.categoria || ""}"`,
          `"${productoData?.descripcion || row.producto}"`,
          `"${presentacion?.presentacion || row.presentacion}"`,
          `"${sabor?.sabor || row.sabor || "—"}"`,
          row.cantidad,
          row.precio_unitario,
          row.precio_total
        ].join(",");
      })
    ];

    const csvString = csvRows.join("\n");
    const fileName = `ventas_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    return { blob, fileName };
  };

  const shareCSV = async () => {
    const csv = generateCSV();
    if (!csv) return;

    const file = new File([csv.blob], csv.fileName, { type: "text/csv" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Ventas",
          text: `Ventas - ${new Date().toLocaleDateString('es-ES')}`
        });
      } catch (err) {
        // User cancelled, do nothing
      }
    } else {
      // No share API, download instead
      downloadCSV();
    }
  };

  const downloadCSV = () => {
    const csv = generateCSV();
    if (!csv) return;

    const link = document.createElement("a");
    const url = URL.createObjectURL(csv.blob);
    link.setAttribute("href", url);
    link.setAttribute("download", csv.fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Group rows by fecha (date only, without time), then by ruta
  const groupedByFecha: { fecha: string; rutas: { ruta: string; items: RecentRow[] }[] }[] = [];

  filteredRows.forEach((row) => {
    // Extract just the date part (YYYY-MM-DD) from timestamp
    const dateOnly = row.fecha.split(' ')[0];

    let fechaGroup = groupedByFecha.find(g => g.fecha === dateOnly);
    if (!fechaGroup) {
      fechaGroup = { fecha: dateOnly, rutas: [] };
      groupedByFecha.push(fechaGroup);
    }

    let rutaGroup = fechaGroup.rutas.find(r => r.ruta === row.ruta);
    if (!rutaGroup) {
      rutaGroup = { ruta: row.ruta, items: [] };
      fechaGroup.rutas.push(rutaGroup);
    }

    rutaGroup.items.push(row);
  });

  return (
    <section className="card">
      <div className="section-heading" style={{ marginBottom: isCollapsed ? 0 : "1.5rem" }}>
        <div>
          <p className="eyebrow">Libro de trabajo</p>
          <h2>Ventas</h2>
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
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => setDateFilter("today")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: dateFilter === "today" ? "#333" : "#f0f0f0",
            color: dateFilter === "today" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Hoy
        </button>
        <button
          onClick={() => setDateFilter("week")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: dateFilter === "week" ? "#333" : "#f0f0f0",
            color: dateFilter === "week" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Semana
        </button>
        <button
          onClick={() => setDateFilter("month")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: dateFilter === "month" ? "#333" : "#f0f0f0",
            color: dateFilter === "month" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Mes
        </button>
        <button
          onClick={() => setDateFilter("range")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: dateFilter === "range" ? "#333" : "#f0f0f0",
            color: dateFilter === "range" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Rango
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          {'share' in navigator && (
            <button
              onClick={shareCSV}
              disabled={filteredRows.length === 0}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: filteredRows.length > 0 ? "pointer" : "not-allowed",
                opacity: filteredRows.length > 0 ? 1 : 0.5
              }}
            >
              Compartir
            </button>
          )}
          <button
            onClick={downloadCSV}
            disabled={filteredRows.length === 0}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: filteredRows.length > 0 ? "pointer" : "not-allowed",
              opacity: filteredRows.length > 0 ? 1 : 0.5
            }}
          >
            Descargar
          </button>
        </div>

        {dateFilter === "range" && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}
              placeholder="Fecha inicial"
            />
            <span>a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}
              placeholder="Fecha final"
            />
          </>
        )}
      </div>

      {loading && <p className="muted">Cargando ventas…</p>}
      {error && <p className="status error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">No hay ventas aún.</p>
      )}
      {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
        <p className="muted">No hay ventas en el rango de fechas seleccionado.</p>
      )}

      {filteredRows.length > 0 && (
        <div>
          {groupedByFecha.map((fechaGroup, fechaIndex) => {
            const formatFecha = (dateStr: string) => {
              const date = new Date(dateStr + 'T00:00:00');
              const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${dayName} ${day}/${month}/${year}`;
            };

            return (
              <div key={`fecha-${fechaGroup.fecha}-${fechaIndex}`} style={{ marginBottom: "3rem" }}>
                <div style={{
                  padding: "1rem 1.5rem",
                  backgroundColor: "#333",
                  color: "white",
                  borderRadius: "6px",
                  marginBottom: "1.5rem",
                  fontSize: "1.2rem",
                  textTransform: "capitalize",
                  letterSpacing: "0.5px"
                }}>
                  {formatFecha(fechaGroup.fecha)}
                </div>
              {fechaGroup.rutas.map((rutaGroup, rutaIndex) => (
                <div key={`ruta-${rutaGroup.ruta}-${rutaIndex}`} className="ruta-group">
                  {rutaGroup.ruta && (
                    <div style={{
                      padding: "0.6rem 1rem",
                      backgroundColor: "#f5f5f5",
                      borderLeft: "4px solid #666",
                      marginBottom: "0.75rem",
                      fontSize: "0.95rem",
                      color: "#333"
                    }}>
                      {rutas.find(r => r.correlativo === rutaGroup.ruta)?.ruta || rutaGroup.ruta}
                    </div>
                  )}
                  {/* Desktop: Table view */}
                  <div className="table-wrap desktop-only">
                    <table>
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Descripcion</th>
                          <th>Presentacion</th>
                          <th>Sabor</th>
                          <th>Cantidad</th>
                          <th>Unitario</th>
                          <th>Total</th>
                          <th style={{ width: "140px" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rutaGroup.items.map((row, index) => {
                          const presentacion = presentaciones.find(p => p.correlativo === row.presentacion);
                          const sabor = sabores.find(s => s.correlativo === row.sabor);
                          const producto = productos.find(p => p.correlativo === row.producto);
                          const isEditing = editingRow?.rowIndex === row.rowIndex;
                          // Convert UTC timestamp to Mexico Central Time (UTC-6)
                          const mexicoTime = toMexicoTime(row.fecha);
                          const timeOnly = mexicoTime ? mexicoTime.toISOString().substring(11, 16) : '';
                          return (
                          <tr key={`${row.producto}-${index}`} style={{
                            backgroundColor: isEditing ? "#fff9e6" : "transparent",
                            border: isEditing ? "2px solid #f0ad4e" : "none"
                          }}>
                            <td>{timeOnly}</td>
                            <td>{row.cliente}</td>
                            <td>{producto?.descripcion || row.producto}</td>
                            <td>{presentacion?.presentacion || row.presentacion}</td>
                            <td>{sabor?.sabor || row.sabor || "—"}</td>
                            <td>{row.cantidad}</td>
                            <td>Q{row.precio_unitario || "—"}</td>
                            <td>Q{row.precio_total || "—"}</td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  onClick={() => onEdit(row)}
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
                                  onClick={() => handleDelete(row)}
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

                  {/* Mobile: Card view */}
                  <div className="mobile-only">
                    {rutaGroup.items.map((row, index) => {
                      const presentacion = presentaciones.find(p => p.correlativo === row.presentacion);
                      const sabor = sabores.find(s => s.correlativo === row.sabor);
                      const producto = productos.find(p => p.correlativo === row.producto);
                      const isEditing = editingRow?.rowIndex === row.rowIndex;
                      // Convert UTC timestamp to Mexico Central Time (UTC-6)
                      const mexicoTime = toMexicoTime(row.fecha);
                      const timeOnly = mexicoTime ? mexicoTime.toISOString().substring(11, 16) : '';
                      return (
                        <div
                          key={`${row.producto}-${index}`}
                          style={{
                            backgroundColor: isEditing ? "#fff9e6" : "#f9f9f9",
                            border: isEditing ? "2px solid #f0ad4e" : "1px solid #e0e0e0",
                            borderRadius: "8px",
                            padding: "1rem",
                            marginBottom: "0.75rem"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <div style={{ fontSize: "1.1rem", color: "#333" }}>
                              {row.cliente}
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "#666" }}>
                              {timeOnly}
                            </div>
                          </div>
                          <div style={{ display: "grid", gap: "0.25rem", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
                            <div><span style={{ color: "#666" }}>Descripcion:</span> {producto?.descripcion || row.producto}</div>
                            <div><span style={{ color: "#666" }}>Presentacion:</span> {presentacion?.presentacion || row.presentacion}</div>
                            <div><span style={{ color: "#666" }}>Sabor:</span> {sabor?.sabor || row.sabor || "—"}</div>
                            <div><span style={{ color: "#666" }}>Cantidad:</span> {row.cantidad}</div>
                            <div><span style={{ color: "#666" }}>Unitario:</span> Q{row.precio_unitario || "—"}</div>
                            <div><span style={{ color: "#666" }}>Total:</span> Q{row.precio_total || "—"}</div>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => onEdit(row)}
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
                              onClick={() => handleDelete(row)}
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
                </div>
              ))}
            </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRowIndex !== null && (
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
                onClick={cancelDelete}
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
      </div>
    </section>
  );
}
