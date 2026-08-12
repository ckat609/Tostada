import { useEffect, useState } from "react";
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

  const sortedRutas = [...rutas].sort((a, b) => a.ruta.localeCompare(b.ruta));

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
        setStatus("Actualizado exitosamente.");
        onCancelEdit();
      } else {
        await addCliente(accessToken, { auxiliar: auxiliar.trim(), codigo: codigo.trim(), ruta: rutaCorrelativo, cliente: cliente.trim() });
        setStatus("Guardado exitosamente.");
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

      <label>
        Ruta
        <select value={rutaCorrelativo} onChange={(event) => onRutaChange(event.target.value)}>
          <option value="">Selecciona ruta</option>
          {sortedRutas.map((r) => (
            <option key={r.correlativo} value={r.correlativo}>{r.ruta}</option>
          ))}
        </select>
      </label>

      <label>
        Cliente
        <input
          type="text"
          value={cliente}
          onChange={(event) => setCliente(event.target.value)}
          placeholder="Nombre del cliente"
        />
      </label>

      <label>
        Código
        <input
          type="text"
          value={codigo}
          onChange={(event) => setCodigo(event.target.value)}
          placeholder="Código del cliente"
        />
      </label>

      <label>
        Auxiliar
        <input
          type="text"
          value={auxiliar}
          onChange={(event) => setAuxiliar(event.target.value)}
          placeholder="Auxiliar del cliente"
        />
      </label>

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
  );
}
