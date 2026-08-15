import type { Pago } from "../lib/graph";
import { PagoForm } from "./PagoForm";
import { PagoList } from "./PagoList";

interface PagosViewProps {
  accessToken: string;
  pagos: Pago[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingPago: Pago | null;
  onEdit: (pago: Pago) => void;
  onCancelEdit: () => void;
}

export function PagosView({ accessToken, pagos, loading, error, onRefresh, editingPago, onEdit, onCancelEdit }: PagosViewProps) {
  return (
    <div className="grid">
      <PagoForm accessToken={accessToken} onSaved={onRefresh} editingPago={editingPago} onCancelEdit={onCancelEdit} />
      <PagoList
        pagos={pagos}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingPago={editingPago}
      />
    </div>
  );
}
