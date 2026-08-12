import type { Ruta } from "../lib/graph";
import { RutaForm } from "./RutaForm";
import { RutaList } from "./RutaList";

interface RutasViewProps {
  accessToken: string;
  rutas: Ruta[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingRuta: Ruta | null;
  onEdit: (ruta: Ruta) => void;
  onCancelEdit: () => void;
}

export function RutasView({ accessToken, rutas, loading, error, onRefresh, editingRuta, onEdit, onCancelEdit }: RutasViewProps) {
  return (
    <div className="grid">
      <RutaForm accessToken={accessToken} onSaved={onRefresh} editingRuta={editingRuta} onCancelEdit={onCancelEdit} />
      <RutaList
        rutas={rutas}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingRuta={editingRuta}
      />
    </div>
  );
}
