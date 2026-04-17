import { useEffect, useState } from 'react';

const AlertBox = ({ message, variant = 'error' }) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [message]);

  useEffect(() => {
    if (!message || (variant !== 'success' && variant !== 'warning')) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setDismissed(true);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [message, variant]);

  if (!message || dismissed) {
    return null;
  }

  return (
      <div
        className={`alert-box alert-${variant}`}
        role={variant === 'error' ? 'alert' : 'status'}
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
      >
      <div className="alert-content">
        <p>{message}</p>
        <button
          type="button"
          className="alert-close"
          aria-label="Close alert"
          onClick={() => setDismissed(true)}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AlertBox;
