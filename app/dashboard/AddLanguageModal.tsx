"use client";

import { useState } from "react";
import type { ResumeLanguageRow } from "../lib/resume-server";

interface AddLanguageModalProps {
  existingLanguageCodes: string[];
  onClose: () => void;
  onSuccess: (language: ResumeLanguageRow) => void;
}

interface ApiResponse {
  ok?: boolean;
  error?: string;
  language?: ResumeLanguageRow;
}

export function AddLanguageModal({ existingLanguageCodes, onClose, onSuccess }: AddLanguageModalProps) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function normalizeCode(input: string): string {
    return input.toLowerCase().trim().slice(0, 2);
  }

  function validateForm(): boolean {
    setError("");

    const normalized = normalizeCode(code);
    if (!normalized || normalized.length !== 2) {
      setError("Language code must be two letters (e.g., en, pl, de).");
      return false;
    }

    if (!/^[a-z]{2}$/.test(normalized)) {
      setError("Language code must contain only letters.");
      return false;
    }

    if (existingLanguageCodes.includes(normalized)) {
      setError("This language already exists.");
      return false;
    }

    if (!label.trim()) {
      setError("Language name is required.");
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const normalized = normalizeCode(code);

    try {
      const response = await fetch("/api/resume/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalized,
          label: label.trim(),
          shortLabel: shortLabel.trim() || undefined,
          createDocument: true,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || result.error || !result.language) {
        setError(result.error || "Failed to add language.");
        return;
      }

      onSuccess(result.language);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Add language version">
      <button
        type="button"
        className="dashboard-modal__backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="dashboard-modal__body" style={{ maxWidth: "420px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>Add Language Version</h2>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Language Code</span>
            <input
              type="text"
              placeholder="e.g., en, pl, de"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              maxLength={2}
              style={{
                padding: "8px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--surface)",
                color: "var(--text)",
                font: "inherit",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Language Name</span>
            <input
              type="text"
              placeholder="e.g., English, Polish"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isLoading}
              style={{
                padding: "8px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--surface)",
                color: "var(--text)",
                font: "inherit",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Short Label (Optional)</span>
            <input
              type="text"
              placeholder="e.g., En, Pl"
              value={shortLabel}
              onChange={(e) => setShortLabel(e.target.value)}
              disabled={isLoading}
              maxLength={4}
              style={{
                padding: "8px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--surface)",
                color: "var(--text)",
                font: "inherit",
              }}
            />
          </label>

          {error && (
            <div style={{ padding: "8px", borderRadius: "6px", background: "#fee2e2", color: "#7f1d1d", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="button button--ghost"
              style={{ minWidth: "80px" }}
            >
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="button button--primary" style={{ minWidth: "80px" }}>
              {isLoading ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
