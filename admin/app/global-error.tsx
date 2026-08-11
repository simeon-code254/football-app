'use client';

import { useEffect } from 'react';

// Only fires if the root layout itself throws -- must render its own
// <html>/<body> since it replaces the layout entirely when active. Kept
// deliberately dependency-free (no shadcn components) since a failure this
// deep means we can't trust anything above this file to still work.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>{error.message || 'Please try again.'}</p>
        <button
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            background: '#111',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
