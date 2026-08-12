import { useState } from "react";
import type { Cliente, Ruta } from "../lib/graph";
import { ClienteForm } from "./ClienteForm";
import { ClienteList } from "./ClienteList";

interface ClientesViewProps {
  accessToken: string;
  clientes: Cliente[];
  rutas: Ruta[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingCliente: Cliente | null;
  onEdit: (cliente: Cliente) => void;
  onCancelEdit: () => void;
}

export function ClientesView({ accessToken, clientes, rutas, loading, error, onRefresh, editingCliente, onEdit, onCancelEdit }: ClientesViewProps) {
  const [selectedRuta, setSelectedRuta] = useState("");

  return (
    <div className="grid">
      <ClienteForm
        accessToken={accessToken}
        rutas={rutas}
        onSaved={onRefresh}
        editingCliente={editingCliente}
        onCancelEdit={onCancelEdit}
        rutaCorrelativo={selectedRuta}
        onRutaChange={setSelectedRuta}
      />
      <ClienteList
        clientes={clientes}
        rutaFilter={selectedRuta}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingCliente={editingCliente}
      />
    </div>
  );
}
