import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import useAuthStore from '../store/authStore';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export default function useInactivityLogout(minutes = 30) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const logoutTimer = useRef(null);
  const warnTimer = useRef(null);
  const warnToastId = useRef(null);

  useEffect(() => {
    if (!accessToken) return;

    const totalMs = minutes * 60 * 1000;
    const warnMs = (minutes - 2) * 60 * 1000;

    const doLogout = () => {
      toast.dismiss(warnToastId.current);
      clearAuth();
      navigate('/login', { replace: true });
      toast.warning('Tu sesión se cerró por inactividad.');
    };

    const showWarning = () => {
      warnToastId.current = toast.warning(
        'Tu sesión expirará en 2 minutos por inactividad.',
        { duration: 120_000 }
      );
    };

    const reset = () => {
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
      toast.dismiss(warnToastId.current);
      warnTimer.current = setTimeout(showWarning, warnMs);
      logoutTimer.current = setTimeout(doLogout, totalMs);
    };

    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      clearTimeout(logoutTimer.current);
      clearTimeout(warnTimer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [accessToken, minutes, clearAuth, navigate]);
}
