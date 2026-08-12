import type { Presentacion } from "../lib/graph";
import { PresentacionForm } from "./PresentacionForm";
import { PresentacionList } from "./PresentacionList";

interface PresentacionesViewProps {
  accessToken: string;
  presentaciones: Presentacion[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingPresentacion: Presentacion | null;
  onEdit: (presentacion: Presentacion) => void;
  onCancelEdit: () => void;
}

export function PresentacionesView({ accessToken, presentaciones, loading, error, onRefresh, editingPresentacion, onEdit, onCancelEdit }: PresentacionesViewProps) {
  return (
    <div className="grid">
      <PresentacionForm accessToken={accessToken} onSaved={onRefresh} editingPresentacion={editingPresentacion} onCancelEdit={onCancelEdit} />
      <PresentacionList
        presentaciones={presentaciones}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingPresentacion={editingPresentacion}
      />
    </div>
  );
}
