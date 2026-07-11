"use client";

import { useEffect, useState } from "react";

type RestrictionState = {
  restricted: boolean;
  reason: string;
};

type Props = {
  onClose: () => void;
};

export default function BetaTestModeModal({ onClose }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [restrictEnabled, setRestrictEnabled] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadRestriction() {
      try {
        const response = await fetch("/api/admin/access-restriction", { method: "GET" });
        const payload = (await response.json()) as {
          error?: string;
          restriction?: RestrictionState;
          reasons?: string[];
        };
        if (isCancelled) {
          return;
        }
        if (!response.ok || payload.error || !payload.restriction || !payload.reasons) {
          setError(payload.error || "Unable to load beta test settings.");
          return;
        }
        setReasons(payload.reasons);
        setRestrictEnabled(payload.restriction.restricted);
        setSelectedReason(payload.restriction.reason || "");
      } catch {
        if (!isCancelled) {
          setError("Unable to load beta test settings.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRestriction();
    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSave() {
    if (isSaving) {
      return;
    }
    if (restrictEnabled && !selectedReason) {
      setError("Select a restriction reason first.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/access-restriction", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: restrictEnabled,
          reason: restrictEnabled ? selectedReason : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok || payload.error) {
        setError(payload.error || "Unable to save beta test settings.");
        return;
      }
      onClose();
    } catch {
      setError("Unable to save beta test settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-test-mode-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-modal__content">
          <div className="profile-modal__header">
            <h2 id="beta-test-mode-modal-title">Beta test mode</h2>
            <button type="button" className="button button--ghost button--small" onClick={onClose}>
              Close
            </button>
          </div>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="stack">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={restrictEnabled}
                  onChange={(event) => setRestrictEnabled(event.target.checked)}
                />
                <span>Restrict access (block sign-in and sign-up for non-staff users)</span>
              </label>
              {restrictEnabled ? (
                <label className="profile-modal__field">
                  <span>Reason shown to users</span>
                  <select value={selectedReason} onChange={(event) => setSelectedReason(event.target.value)} required>
                    <option value="" disabled>
                      Select a reason...
                    </option>
                    {reasons.map((reasonOption) => (
                      <option key={reasonOption} value={reasonOption}>
                        {reasonOption}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {error ? <p className="profile-modal__error">{error}</p> : null}
              <div className="profile-modal__actions">
                <button type="button" className="button button--ghost button--small" onClick={onClose} disabled={isSaving}>
                  Cancel
                </button>
                <button type="button" className="button button--primary button--small" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
