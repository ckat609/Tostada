import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addCliente, updateCliente, type Cliente, type Ruta } from "../lib/graph";

interface ClienteFormProps {
  accessToken: string;
  rutas: Ruta[];
  onSaved: () => void | Promise<void>;
  editingCliente: Cliente | null;
  onCancelEdit: () => void;
  rutaCorrelativo: string;
  onRutaChange: (rutaCorrelativo: string) => void;
}

export function ClienteForm({ accessToken, rutas, onSaved, editingCliente, onCancelEdit, rutaCorrelativo, onRutaChange }: ClienteFormProps) {
  const [auxiliar, setAuxiliar] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [rutaModalOpen, setRutaModalOpen] = useState(false);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);

  function triggerFlash(text: string) {
    setFlash({ text, key: Date.now() });
    setTimeout(() => setFlash(null), 2000);
  }

  const sortedRutas = [...rutas].sort((a, b) => a.ruta.localeCompare(b.ruta));
  const selectedRuta = sortedRutas.find((r) => r.correlativo === rutaCorrelativo);

  useEffect(() => {
    if (rutaModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyPosition = document.body.style.position;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.width = "";
      };
    }
  }, [rutaModalOpen]);

  useEffect(() => {
    if (editingCliente) {
      onRutaChange(editingCliente.ruta);
      setAuxiliar(editingCliente.auxiliar);
      setCodigo(editingCliente.codigo);
      setCliente(editingCliente.cliente);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCliente]);

  function handleCancel() {
    onCancelEdit();
    setAuxiliar("");
    setCodigo("");
    setCliente("");
    setStatus("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setStatus("Inicia sesión antes de guardar.");
      return;
    }

    if (!rutaCorrelativo || !auxiliar.trim() || !codigo.trim() || !cliente.trim()) {
      setStatus("Por favor completa todos los campos requeridos.");
      return;
    }

    setSaving(true);
    setStatus("");

    try {
      if (editingCliente) {
        await updateCliente(accessToken, editingCliente.rowIndex, { auxiliar: auxiliar.trim(), codigo: codigo.trim(), ruta: rutaCorrelativo, cliente: cliente.trim() });
        triggerFlash("Cliente actualizado");
        onCancelEdit();
      } else {
        await addCliente(accessToken, { auxiliar: auxiliar.trim(), codigo: codigo.trim(), ruta: rutaCorrelativo, cliente: cliente.trim() });
        triggerFlash("Cliente registrado");
      }
      // Keep the selected ruta so the list below stays on the same route and the new/updated entry is visible.
      setAuxiliar("");
      setCodigo("");
      setCliente("");
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form
        className="card form"
        onSubmit={handleSubmit}
        style={{ backgroundColor: editingCliente ? "#fff9e6" : "white", border: editingCliente ? "3px solid #f0ad4e" : undefined }}
      >
        <div>
          <p className="eyebrow" style={{ color: editingCliente ? "#f0ad4e" : undefined }}>
            {editingCliente ? "Editando cliente" : "Nueva entrada"}
          </p>
          <h2>{editingCliente ? "Editar cliente" : "Agregar cliente"}</h2>
        </div>

        <button
          type="button"
          onClick={() => setRutaModalOpen(true)}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "0.88rem",
            minHeight: "72px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: rutaCorrelativo ? "#2196F3" : "#888",
            cursor: "pointer",
            textAlign: "left",
            color: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedRuta?.ruta || "Selecciona ruta"}
        </button>

        <input
          type="text"
          value={cliente}
          onChange={(event) => setCliente(event.target.value)}
          placeholder="Nombre del cliente"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "0.88rem",
            minHeight: "72px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: cliente ? "#2196F3" : "#888",
            color: "white",
            WebkitTextFillColor: "white",
            textAlign: "left",
          }}
        />

        <input
          type="text"
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          placeholder="Código del cliente"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "0.88rem",
            minHeight: "72px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: codigo ? "#2196F3" : "#888",
            color: "white",
            WebkitTextFillColor: "white",
            textAlign: "left",
          }}
        />

        <input
          type="text"
          value={auxiliar}
          onChange={(event) => setAuxiliar(event.target.value)}
          placeholder="Auxiliar del cliente"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "0.88rem",
            minHeight: "72px",
            borderRadius: "8px",
            border: "2px solid #ddd",
            backgroundColor: auxiliar ? "#2196F3" : "#888",
            color: "white",
            WebkitTextFillColor: "white",
            textAlign: "left",
          }}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {editingCliente && (
            <button type="button" className="secondary" style={{ flex: 1 }} onClick={handleCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" style={{ flex: 1 }} disabled={saving || !rutaCorrelativo || !auxiliar.trim() || !codigo.trim() || !cliente.trim()}>
            {saving ? (editingCliente ? "Actualizando…" : "Guardando…") : (editingCliente ? "Actualizar" : "Guardar")}
          </button>
        </div>

        {status && <p className="status" role="status">{status}</p>}
      </form>

      {rutaModalOpen &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              zIndex: 1000,
              overflow: "auto",
            }}
            onClick={() => setRutaModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e0e0e0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.3rem" }}>Selecciona Ruta</h3>
                <button
                  onClick={() => setRutaModalOpen(false)}
                  style={{
                    border: "none",
                    background: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    padding: "0.5rem",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  padding: "1rem",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {sortedRutas.map((r) => (
                  <button
                    key={r.correlativo}
                    onClick={() => {
                      onRutaChange(r.correlativo);
                      setRutaModalOpen(false);
                    }}
                    style={{
                      padding: "1.25rem",
                      fontSize: "1.1rem",
                      border: "2px solid #ddd",
                      backgroundColor: rutaCorrelativo === r.correlativo ? "#e3f2fd" : "white",
                      borderColor: rutaCorrelativo === r.correlativo ? "#2196F3" : "#ddd",
                      borderRadius: "8px",
                      cursor: "pointer",
                      minHeight: "70px",
                      transition: "all 0.2s",
                      color: "#000",
                    }}
                  >
                    {r.ruta}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
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
    </>
  );
}
