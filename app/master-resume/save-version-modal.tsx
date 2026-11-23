"use client";

import { useAppI18n } from "../components/app-i18n-provider";
import { Button, Modal, TextInput } from "../components/design-system/primitives";

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
  const { dictionary } = useAppI18n();
  const t = (text: string) => dictionary.editor.text[text] ?? text;

  return (
    <Modal
      open={isOpen}
      size="small"
      title={t("Save MasterCV")}
      closeLabel={t("Close save version dialog")}
      // Closing is refused while a save is in flight, as the old backdrop/Cancel were disabled.
      onClose={() => {
        if (!isSaving) onClose();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            {t("Cancel")}
          </Button>
          <Button variant="primary" onClick={onConfirm} busy={isSaving}>
            {isSaving ? t("Saving…") : t("Save MasterCV")}
          </Button>
        </>
      }
    >
      <p>{t("This creates a new entry in the revision history — a point you can roll back to later. Your draft is already kept in sync.")}</p>
      <TextInput
        label={t("Change note")}
        value={changeNote}
        onChange={(event) => onChangeNote(event.target.value)}
        placeholder={t("e.g. Added CDQ experience")}
        disabled={isSaving}
      />
    </Modal>
  );
}
