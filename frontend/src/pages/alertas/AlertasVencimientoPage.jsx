import { useState } from 'react';

import { useAlertasVencimiento } from '../../hooks/alertas/useAlertas';
import Input from '../../components/ui/Input';
import AlertasTable from './AlertasTable';

export default function AlertasVencimientoPage() {
  const [dias, setDias] = useState(7);
  const { isLoading, data = [] } = useAlertasVencimiento(dias);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <div className="w-32">
          <Input
            label="Días umbral"
            type="number"
            min={1}
            placeholder="ej. 7"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value) || 7)}
          />
        </div>
      </div>
      <AlertasTable data={data} loading={isLoading} />
    </div>
  );
}
