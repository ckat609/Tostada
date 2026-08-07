import { useState } from "react";
import type { RecentRow, Ruta } from "../lib/graph";
import { deleteRow } from "../lib/graph";

interface RecentRowsProps {
  rows: RecentRow[];
  rutas: Ruta[];
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void;
  onEdit: (row: RecentRow) => void;
}

type DateFilter = "today" | "week" | "month" | "range";

export function RecentRows({ rows, rutas, loading, error, accessToken, onRefresh, onEdit }: RecentRowsProps) {
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

      switch (dateFilter) {
        case "today":
          return row.fecha === todayStr;

        case "week":
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          const weekAgoStr = weekAgo.toISOString().slice(0, 10);
          return row.fecha >= weekAgoStr;

        case "month":
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          const monthAgoStr = monthAgo.toISOString().slice(0, 10);
          return row.fecha >= monthAgoStr;

        case "range":
          if (!startDate && !endDate) return true;
          const start = startDate || "0000-01-01";
          const end = endDate || "9999-12-31";
          return row.fecha >= start && row.fecha <= end;

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

    const headers = ["Fecha", "Ruta", "Cliente", "Descripcion", "Presentacion", "Cantidad"];
    const csvRows = [
      headers.join(","),
      ...filteredRows.map(row => [
        row.fecha,
        row.ruta,
        `"${row.cliente}"`,
        `"${row.descripcion}"`,
        `"${row.presentacion}"`,
        row.cantidad
      ].join(","))
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

  // Group rows by fecha, then by ruta
  const groupedByFecha: { fecha: string; rutas: { ruta: string; items: RecentRow[] }[] }[] = [];

  filteredRows.forEach((row) => {
    let fechaGroup = groupedByFecha.find(g => g.fecha === row.fecha);
    if (!fechaGroup) {
      fechaGroup = { fecha: row.fecha, rutas: [] };
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
            fontWeight: dateFilter === "today" ? "600" : "normal",
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
            fontWeight: dateFilter === "week" ? "600" : "normal",
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
            fontWeight: dateFilter === "month" ? "600" : "normal",
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
            fontWeight: dateFilter === "range" ? "600" : "normal",
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
                fontWeight: "600",
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
              fontWeight: "600",
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
                  fontWeight: "700",
                  fontSize: "1.2rem",
                  textTransform: "capitalize",
                  letterSpacing: "0.5px"
                }}>
                  {formatFecha(fechaGroup.fecha)}
                </div>
              {fechaGroup.rutas.map((rutaGroup, rutaIndex) => (
                <div key={`ruta-${rutaGroup.ruta}-${rutaIndex}`} style={{ marginBottom: "2rem", marginLeft: "2rem" }}>
                  {rutaGroup.ruta && (
                    <div style={{
                      padding: "0.6rem 1rem",
                      backgroundColor: "#f5f5f5",
                      borderLeft: "4px solid #666",
                      marginBottom: "0.75rem",
                      fontWeight: "600",
                      fontSize: "0.95rem",
                      color: "#333"
                    }}>
                      {rutas.find(r => r.codigo === rutaGroup.ruta)?.ruta || rutaGroup.ruta}
                    </div>
                  )}
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Descripcion</th>
                          <th>Presentacion</th>
                          <th>Cantidad</th>
                          <th style={{ width: "140px" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rutaGroup.items.map((row, index) => (
                          <tr key={`${row.descripcion}-${index}`}>
                            <td>{row.cliente}</td>
                            <td>{row.descripcion}</td>
                            <td>{row.presentacion}</td>
                            <td>{row.cantidad}</td>
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
                                    fontWeight: "600",
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
                                    fontWeight: "600",
                                    minWidth: "60px"
                                  }}
                                >
                                  Borrar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  fontWeight: "600"
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
