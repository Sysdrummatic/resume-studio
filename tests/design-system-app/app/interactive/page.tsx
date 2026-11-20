"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  Checkbox,
  Modal,
  Panel,
  TextInput,
  Toast,
} from "../../../../app/components/design-system/primitives";

const LONG_PL =
  "Cofnięcie publikacji wyłączy publiczny link LiveCV. Osoby, które mają ten adres, zobaczą stronę błędu, a wyszukiwarki usuną go z wyników. Zapisana wersja i Baza doświadczeń pozostaną bez zmian; możesz opublikować ją ponownie w dowolnym momencie.";

export default function InteractivePage() {
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [accept, setAccept] = useState(true);
  const [closeCalls, setCloseCalls] = useState(0);
  const [returnValue, setReturnValue] = useState("-");
  const [busy, setBusy] = useState(true);
  const [clicks, setClicks] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [toast, setToast] = useState<{ id: number; text: string; danger: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [validated, setValidated] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const [innerCloseCalls, setInnerCloseCalls] = useState(0);
  const [modalToast, setModalToast] = useState(0);
  const [openToast, setOpenToast] = useState(0);
  const [explicit, setExplicit] = useState(true);
  const [lateAccept, setLateAccept] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // The page behind a modal is inert, so tests reopen during the exit animation from script.
    Object.assign(window, { __reopen: () => setOpen(true), __setAccept: (value: boolean) => setAccept(value), __close: () => setOpen(false), __setExplicit: setExplicit, __setLateAccept: setLateAccept });
  }, []);

  const error = validated && !email.includes("@") ? "Podaj pełny adres e-mail" : undefined;

  return (
    <main>
      <output id="state" data-hydrated={hydrated} data-close-calls={closeCalls} data-return-value={returnValue} data-clicks={clicks} data-submits={submits} data-inner-close-calls={innerCloseCalls} />

      <Button id="opener" onClick={() => setOpen(true)}>Otwórz</Button>
      <Button
        id="open-with-toast"
        onClick={() => {
          setOpen(true);
          setOpenToast((n) => n + 1);
        }}
      >
        Otwórz z komunikatem
      </Button>
      <Button id="accept" onClick={() => setAccept((value) => !value)}>{accept ? "accept" : "reject"}</Button>
      <Modal
        open={open}
        explicitAccept={explicit}
        onClose={(value, acceptClose) => {
          setCloseCalls((count) => count + 1);
          setReturnValue(value ?? "");
          if (value === "saved") {
            if (!explicit) {
              // A pre-existing handler: closes synchronously and never calls accept().
              setOpen(false);
              return;
            }
            if (lateAccept) {
              // Accepts long after the page has closed (and reopened) the modal on its own.
              window.setTimeout(acceptClose, 400);
              return;
            }
            // Accepted after an asynchronous operation (e.g. a save request).
            window.setTimeout(() => {
              acceptClose();
              setOpen(false);
            }, 200);
            return;
          }
          if (accept) {
            acceptClose();
            setOpen(false);
          }
        }}
        title="Cofnąć publikację tej wersji LiveCV i wyłączyć jej publiczny link?"
        description={LONG_PL}
        closeLabel="Zamknij"
        footer={
          <form method="dialog">
            <Button id="cancel" type="submit" value="cancel">Anuluj</Button>
            <Button id="delete" type="submit" value="delete">Usuń</Button>
            <Button id="save" type="submit" value="saved">Zapisz</Button>
            <Button id="confirm" type="submit" value="confirm" variant="danger">Cofnij publikację</Button>
          </form>
        }
      >
        <p className="ocv-body">{LONG_PL}</p>
        <Button id="inner-opener" onClick={() => setInnerOpen(true)}>Szczegóły</Button>
        <Button id="modal-toast" onClick={() => setModalToast((n) => n + 1)}>toast w modalu</Button>
        {modalToast ? <Toast key={modalToast}>Skopiowano link</Toast> : null}
        {openToast ? <Toast key={`open-${openToast}`}>Otwarto okno</Toast> : null}
        <Modal
          open={innerOpen}
          onClose={() => {
            setInnerCloseCalls((count) => count + 1);
            setInnerOpen(false);
          }}
          title="Szczegóły publikacji"
          closeLabel="Zamknij szczegóły"
          footer={
            <form method="dialog">
              <Button id="inner-ok" type="submit" value="ok">OK</Button>
            </form>
          }
        >
          <p className="ocv-body">Link pozostaje aktywny do cofnięcia publikacji.</p>
        </Modal>
      </Modal>

      <form
        id="busy-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setSubmits((count) => count + 1);
        }}
      >
        <input id="busy-input" name="q" aria-label="Pole" />
        <Button id="busy" type="submit" busy={busy} aria-disabled={false} onClick={() => setClicks((count) => count + 1)}>
          Zapisz
        </Button>
      </form>
      <Button id="toggle-busy" onClick={() => setBusy((value) => !value)}>busy</Button>

      <Button id="toast" onClick={() => setToast((t) => ({ id: (t?.id ?? 0) + 1, text: "Zapisano", danger: false }))}>toast</Button>
      <Button id="toast-danger" onClick={() => setToast((t) => ({ id: (t?.id ?? 0) + 1, text: "Nie zapisano", danger: true }))}>error</Button>
      {toast ? <Toast key={toast.id} tone={toast.danger ? "danger" : "default"}>{toast.text}</Toast> : null}

      <TextInput
        id="email"
        label="Email"
        value={email}
        error={error}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setValidated(true)}
      />

      <Checkbox id="terms" label="Akceptuję regulamin" />

      <div id="nested" data-app-theme="light">
        <Panel id="nested-panel">Jasny podpanel</Panel>
      </div>
      <Panel id="traced" traced="public">Opublikowano</Panel>
    </main>
  );
}
