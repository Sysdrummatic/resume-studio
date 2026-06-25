'use client';
import { useEffect } from 'react';

export default function RecoveryRedirect() {
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      window.location.replace('/login' + window.location.hash);
    }
  }, []);
  return null;
}
