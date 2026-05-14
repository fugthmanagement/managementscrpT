"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BusinessOSShell } from "../../components/business-os-shell";
import { auth } from "../../lib/firebase";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const authenticated = Boolean(user);
      setIsAuthenticated(authenticated);
      setAuthReady(true);

      if (!authenticated) {
        window.location.href = "/login";
      }
    });

    return () => unsubscribe();
  }, []);

  return <BusinessOSShell locked={!isAuthenticated} authReady={authReady} />;
}
