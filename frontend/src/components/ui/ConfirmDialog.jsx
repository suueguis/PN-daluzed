import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  description = 'Esta acción no se puede deshacer.',
  confirmWord,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  variant = 'danger',
}) {
  const [stage, setStage] = useState('warn');
  const [typed, setTyped] = useState('');

  const reset = () => {
    setStage('warn');
    setTyped('');
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const matches = !!confirmWord && typed === confirmWord;

  const handleContinue = () => {
    if (confirmWord) setStage('type');
    else {
      reset();
      onConfirm?.();
    }
  };

  const handleConfirm = () => {
    if (!loading && matches) {
      onConfirm?.();
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : handleClose}
      title={title}
      size="sm"
      footer={
        stage === 'warn' ? (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={variant} onClick={handleContinue} disabled={loading}>
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              onClick={handleConfirm}
              disabled={loading || !matches}
            >
              {loading ? 'Procesando…' : confirmLabel}
            </Button>
          </>
        )
      }
    >
      {stage === 'warn' ? (
        <p className="text-sm text-wine-900">{description}</p>
      ) : (
        <div className="space-y-3 text-sm text-wine-900">
          <p>
            Para confirmar, escribe{' '}
            <code className="rounded bg-peach-100 px-1 font-mono">{confirmWord}</code>{' '}
            en el campo de abajo.
          </p>
          <Input
            aria-label="Confirmación"
            placeholder={confirmWord}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
