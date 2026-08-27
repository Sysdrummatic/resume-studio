"use client";

type SaveVersionModalProps = {
  isOpen: boolean;
  changeNote: string;
  isSaving: boolean;
  onChangeNote: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

// Deliberate commit step: "Save unpublished" (in the Publish card) writes a
// draft directly, while this modal is the only path to a change note before
// creating a new revision — see the Phase 1 write-up for why the two stay separate.
export default function SaveVersionModal({ isOpen, changeNote, isSaving, onChangeNote, onConfirm, onClose }: SaveVersionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Save MasterCV version">
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label="Close save version dialog" disabled={isSaving}></button>
      <div className="dashboard-modal__body dashboard-modal__body--compact">
        <h2>Save MasterCV</h2>
        <p className="card-lead">
          This creates a new entry in the revision history — a point you can roll back to later. Your draft is already kept in sync.
        </p>
        <label>
          Change note
          <input
            value={changeNote}
            onChange={(event) => onChangeNote(event.target.value)}
            placeholder="e.g. Added CDQ experience"
            autoFocus
            disabled={isSaving}
          />
        </label>
        <div className="actions-row">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save MasterCV"}
          </button>
        </div>
      </div>
    </div>
  );
}
