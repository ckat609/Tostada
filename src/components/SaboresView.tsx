import type { Sabor } from "../lib/graph";
import { SaborForm } from "./SaborForm";
import { SaborList } from "./SaborList";

interface SaboresViewProps {
  accessToken: string;
  sabores: Sabor[];
  loading: boolean;
  error: string;
  onRefresh: () => void | Promise<void>;
  editingSabor: Sabor | null;
  onEdit: (sabor: Sabor) => void;
  onCancelEdit: () => void;
}

export function SaboresView({ accessToken, sabores, loading, error, onRefresh, editingSabor, onEdit, onCancelEdit }: SaboresViewProps) {
  return (
    <div className="grid">
      <SaborForm accessToken={accessToken} onSaved={onRefresh} editingSabor={editingSabor} onCancelEdit={onCancelEdit} />
      <SaborList
        sabores={sabores}
        loading={loading}
        error={error}
        accessToken={accessToken}
        onRefresh={onRefresh}
        onEdit={onEdit}
        editingSabor={editingSabor}
      />
    </div>
  );
}
