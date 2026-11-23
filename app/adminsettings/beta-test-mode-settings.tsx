"use client";

import { useEffect, useState } from "react";
import { useAppI18n } from "../components/app-i18n-provider";
import { Button, Checkbox, Panel, Select } from "../components/design-system/primitives";

type RestrictionState = {
  restricted: boolean;
  reason: string;
};

/** Beta test mode (login/sign-up restriction for non-staff); moved here from the account-menu modal (#291). */
export default function BetaTestModeSettings() {
  const { dictionary } = useAppI18n();
  const text = dictionary.admin.text;
  const settingsText = (key: string) => dictionary.settings.text[key] ?? key;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
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
          setError(payload.error || text["Unable to load beta test settings."]);
          return;
        }
        setReasons(payload.reasons);
        setRestrictEnabled(payload.restriction.restricted);
        setSelectedReason(payload.restriction.reason || "");
      } catch {
        if (!isCancelled) {
          setError(text["Unable to load beta test settings."]);
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
  }, [text]);

  async function handleSave() {
    if (isSaving) {
      return;
    }
    setSaved(false);
    if (restrictEnabled && !selectedReason) {
      setError(text["Select a restriction reason first."]);
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
        setError(payload.error || text["Unable to save beta test settings."]);
        return;
      }
      setSaved(true);
    } catch {
      setError(text["Unable to save beta test settings."]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel as="section" id="beta-test-mode" className="admin-settings__section" aria-labelledby="beta-test-mode-title">
      <h2 id="beta-test-mode-title" className="ocv-heading">
        {text["Beta test mode"]}
      </h2>
      {isLoading ? (
        <p className="ocv-meta">{text["Loading..."]}</p>
      ) : (
        <>
          <Checkbox
            label={text["Restrict access (block sign-in and sign-up for non-staff users)"]}
            checked={restrictEnabled}
            onChange={(event) => {
              setSaved(false);
              setRestrictEnabled(event.target.checked);
            }}
          />
          {restrictEnabled ? (
            <Select
              label={text["Reason shown to users"]}
              value={selectedReason}
              onChange={(event) => {
                setSaved(false);
                setSelectedReason(event.target.value);
              }}
              required
            >
              <option value="" disabled>
                {text["Select a reason..."]}
              </option>
              {reasons.map((reasonOption) => (
                <option key={reasonOption} value={reasonOption}>
                  {reasonOption}
                </option>
              ))}
            </Select>
          ) : null}
          <div className="admin-settings__actions">
            <Button variant="primary" busy={isSaving} onClick={() => void handleSave()}>
              {isSaving ? text["Saving..."] : text.Save}
            </Button>
          </div>
        </>
      )}
      {saved ? <p role="status" className="ocv-meta">{settingsText("Settings saved.")}</p> : null}
      {error ? (
        <p role="alert" className="admin-settings__error">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
