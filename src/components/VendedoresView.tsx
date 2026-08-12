import type { Vendedor } from "../lib/graph";
import { VendedorForm } from "./VendedorForm";
import { VendedorList } from "./VendedorList";

interface VendedoresViewProps {
  accessToken: string;
  vendedores: Vendedor[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingVendedor: Vendedor | null;
  onEdit: (vendedor: Vendedor) => void;
  onCancelEdit: () => void;
}

export function VendedoresView({ accessToken, vendedores, loading, error, onRefresh, editingVendedor, onEdit, onCancelEdit }: VendedoresViewProps) {
  return (
    <div className="grid">
      <VendedorForm accessToken={accessToken} onSaved={onRefresh} editingVendedor={editingVendedor} onCancelEdit={onCancelEdit} />
      <VendedorList
        vendedores={vendedores}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingVendedor={editingVendedor}
      />
    </div>
  );
}
