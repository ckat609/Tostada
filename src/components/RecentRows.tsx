import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { RecentRow, Ruta, Presentacion, Sabor, Producto, Categoria, Pago, Cliente } from "../lib/graph";
import { deleteRow, formatCurrency } from "../lib/graph";

interface RecentRowsProps {
  rows: RecentRow[];
  rutas: Ruta[];
  presentaciones: Presentacion[];
  sabores: Sabor[];
  productos: Producto[];
  categorias: Categoria[];
  pagos: Pago[];
  clientes: Cliente[];
  loading: boolean;
  error: string;
  accessToken: string;
  onRefresh: () => void;
  onEdit: (row: RecentRow) => void;
  editingRow: RecentRow | null;
  recentlyEditedRowIndex: number | null;
  recentlyEditedPreviousKey: string | null;
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

export function RecentRows({ rows, rutas, presentaciones, sabores, productos, categorias, pagos, clientes, loading, error, accessToken, onRefresh, onEdit, editingRow, recentlyEditedRowIndex, recentlyEditedPreviousKey }: RecentRowsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
  const [expandedRowIndex, setExpandedRowIndex] = useState<number | null>(null);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  function openDatePicker(ref: React.RefObject<HTMLInputElement | null>) {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.focus();
    }
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

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  // Formats a "YYYY-MM-DD" string as "DD/MM/YYYY", independent of browser locale
  function formatShortDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

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
      triggerFlash("Venta eliminada");
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
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => openDatePicker(startDateInputRef)}>
              <div style={{
                padding: "0.9rem 1.1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
                minWidth: "11rem",
                fontSize: "1.15rem",
                color: startDate ? "#333" : "#888"
              }}>
                {startDate ? formatShortDate(startDate) : "Fecha inicial"}
              </div>
              <input
                ref={startDateInputRef}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%"
                }}
              />
            </div>
            <span>a</span>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => openDatePicker(endDateInputRef)}>
              <div style={{
                padding: "0.9rem 1.1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
                minWidth: "11rem",
                fontSize: "1.15rem",
                color: endDate ? "#333" : "#888"
              }}>
                {endDate ? formatShortDate(endDate) : "Fecha final"}
              </div>
              <input
                ref={endDateInputRef}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer",
                  width: "100%",
                  height: "100%"
                }}
              />
            </div>
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
          {groupedByFecha.length > 1 && (() => {
            const allDates = filteredRows.map(row => row.fecha.split(' ')[0]).sort();
            const earliestDate = allDates[0];
            const latestDate = allDates[allDates.length - 1];

            return (
              <div style={{
                padding: "1rem 1.5rem",
                backgroundColor: "#2196F3",
                color: "white",
                borderRadius: "6px",
                marginBottom: "1.5rem",
                fontSize: "1.2rem",
                letterSpacing: "0.5px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem"
              }}>
                <div>
                  <div>Total</div>
                  <div style={{ fontSize: "0.6em" }}>({formatShortDate(earliestDate)} - {formatShortDate(latestDate)})</div>
                </div>
                <span style={{ fontWeight: 700 }}>
                  {formatCurrency(filteredRows.reduce((sum, row) => sum + (Number(row.precio_total) || 0), 0))}
                </span>
              </div>
            );
          })()}
          {groupedByFecha.map((fechaGroup, fechaIndex) => {
            const formatFecha = (dateStr: string) => {
              const date = new Date(dateStr + 'T00:00:00');
              const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${dayName} ${day}/${month}/${year}`;
            };

            const fechaTotal = fechaGroup.rutas.reduce(
              (sum, r) => sum + r.items.reduce((s, row) => s + (Number(row.precio_total) || 0), 0),
              0
            );

            return (
              <div key={`fecha-${fechaGroup.fecha}-${fechaIndex}`} style={{ marginBottom: "3rem" }}>
                <div style={{
                  padding: "1rem 1.5rem",
                  backgroundColor: "#333",
                  color: "white",
                  borderRadius: "6px",
                  marginBottom: "1.5rem",
                  fontSize: "1.2rem",
                  letterSpacing: "0.5px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem"
                }}>
                  <span style={{ textTransform: "capitalize" }}>{formatFecha(fechaGroup.fecha)}</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(fechaTotal)}</span>
                </div>
              {fechaGroup.rutas.map((rutaGroup, rutaIndex) => (
                <div key={`ruta-${rutaGroup.ruta}-${rutaIndex}`} className="ruta-group">
                  {rutaGroup.ruta && (
                    <div style={{
                      padding: "0.6rem 1rem",
                      backgroundColor: "#f5f5f5",
                      borderLeft: "12px solid #2196F3",
                      marginBottom: "0.75rem",
                      fontSize: "0.95rem",
                      color: "#333"
                    }}>
                      {rutas.find(r => r.correlativo === rutaGroup.ruta)?.ruta || rutaGroup.ruta}
                    </div>
                  )}
                  {(() => {
                    const clienteGroups: { cliente: string; codigo: string; items: RecentRow[] }[] = [];
                    rutaGroup.items.forEach((row) => {
                      let group = clienteGroups.find(g => g.cliente === row.cliente && g.codigo === row.codigo);
                      if (!group) {
                        group = { cliente: row.cliente, codigo: row.codigo, items: [] };
                        clienteGroups.push(group);
                      }
                      group.items.push(row);
                    });

                    return clienteGroups.map((clienteGroup, clienteIndex) => {
                      const total = clienteGroup.items.reduce((sum, row) => sum + (Number(row.precio_total) || 0), 0);
                      const auxiliar = clientes.find(c => c.cliente === clienteGroup.cliente)?.auxiliar;
                      const groupKey = `${clienteGroup.cliente}||${clienteGroup.codigo}`;
                      const containsRecentlyEditedRow = clienteGroup.items.some(row => row.rowIndex === recentlyEditedRowIndex);
                      const isSourceGroup = groupKey === recentlyEditedPreviousKey && !containsRecentlyEditedRow;
                      return (
                        <div
                          key={`cliente-${clienteGroup.cliente}-${clienteGroup.codigo}-${clienteIndex}`}
                          style={{
                            marginBottom: "1rem",
                            padding: "0.75rem",
                            borderRadius: "8px",
                            backgroundColor: isSourceGroup ? "#d4edda" : "#f5f5f5",
                            border: isSourceGroup ? "1px solid #28a745" : "1px solid #d5d5d5",
                          }}
                        >
                          <div style={{ borderBottom: "1px dotted #999", paddingBottom: "0.4rem", marginBottom: "0.4rem" }}>
                            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#333" }}>
                              {clienteGroup.cliente} ({clienteGroup.codigo || "N/A"})
                            </div>
                            {auxiliar && (
                              <div style={{ fontStyle: "italic", fontSize: "0.66em", color: "#666" }}>
                                ({auxiliar})
                              </div>
                            )}
                          </div>
                          {clienteGroup.items.map((row, itemIndex) => {
                            const presentacion = presentaciones.find(p => p.correlativo === row.presentacion);
                            const sabor = sabores.find(s => s.correlativo === row.sabor);
                            const producto = productos.find(p => p.correlativo === row.producto);
                            const pago = pagos.find(p => p.correlativo === row.pago);
                            const isEditing = editingRow?.rowIndex === row.rowIndex;
                            const descripcion = producto?.descripcion || row.producto;
                            const saborLabel = sabor?.sabor || row.sabor;
                            const presentacionLabel = presentacion?.presentacion || row.presentacion;
                            const detalle = [descripcion, saborLabel, presentacionLabel].filter(Boolean).join(" - ");
                            const pagoLabel = pago?.pago || row.pago;
                            const isExpanded = expandedRowIndex === row.rowIndex;
                            const isRecentlyEdited = row.rowIndex === recentlyEditedRowIndex;
                            return (
                              <div
                                key={`${row.producto}-${itemIndex}`}
                                data-recent-row-item
                                style={{
                                  borderRadius: "6px",
                                  backgroundColor: isEditing ? "#fff9e6" : isRecentlyEdited ? "#d4edda" : isExpanded ? "#f0f0f0" : "transparent",
                                  border: isEditing ? "3px solid #f0ad4e" : isRecentlyEdited ? "3px solid #28a745" : "3px solid transparent",
                                  marginBottom: "0.15rem",
                                }}
                              >
                                <div
                                  onClick={() => setExpandedRowIndex(isExpanded ? null : row.rowIndex)}
                                  style={{
                                    padding: "0.45rem 0.5rem",
                                    fontSize: "0.92rem",
                                    color: "#333",
                                    cursor: "pointer",
                                  }}
                                >
                                  <div style={{ display: "flex", gap: "0.3rem" }}>
                                    <span style={{ minWidth: "1.4rem" }}>{itemIndex + 1}.</span>
                                    <span>{detalle}</span>
                                  </div>
                                  <div style={{ fontStyle: "italic", display: "flex", justifyContent: "space-between", gap: "0.5rem", marginLeft: "1.7rem" }}>
                                    <span>{row.cantidad} unidades x {formatCurrency(row.precio_unitario)}</span>
                                    <span>{pagoLabel ? `(${pagoLabel}) ` : ""}{formatCurrency(row.precio_total)}</span>
                                  </div>
                                </div>
                                {isExpanded && (
                                  <div style={{ display: "flex", gap: "0.5rem", padding: "0 0.5rem 0.5rem" }}>
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
                                )}
                              </div>
                            );
                          })}
                          <div style={{ borderTop: "1px dotted #999", marginTop: "0.4rem", paddingTop: "0.4rem", textAlign: "right", fontWeight: 700, color: "#333" }}>
                            {formatCurrency(total)}
                          </div>
                        </div>
                      );
                    });
                  })()}
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

      {flash &&
        createPortal(
          <div className="venta-toast-wrap">
            <div key={flash.key} className="venta-toast">
              {flash.text}
            </div>
          </div>,
          document.body,
        )}
      </div>
    </section>
  );
}
