---
title: Limity zapisu i publikacji
description: Dowiedz się, dlaczego zapis lub publikacja CV mogą być chwilowo zablokowane.
updatedAt: 2026-09-20
author: Łukasz Michta
category: tutorials
order: 2
---

# Limity zapisu i publikacji

OpenCiVera stosuje kilka limitów, aby chronić wspólną bazę danych i hosting
przed przypadkowym błędem, usterką albo masowym skryptem wysyłającym więcej
żądań, niż zwykle wykonuje osoba edytująca CV.

## Co jest ograniczone

| Akcja | Limit |
| --- | --- |
| Zapis Bazy doświadczeń | 30 zapisów na minutę na konto |
| Publikacja CV | 20 publikacji na minutę na konto |
| Zapis wersji CV | 20 zapisów na minutę na konto |
| Publikacja wersji CV | 20 publikacji na minutę na konto |
| Rozmiar dokumentu | 100 KB na wersję językową |

Limity resetują się automatycznie po krótkim czasie, zwykle po około minucie.
Nie trzeba kontaktować się z pomocą, aby odblokować konto.

## Dlaczego rozmiar dokumentu jest ograniczony

Dokument CV ma zwykle kilka kilobajtów tekstu. Nawet sekcja z kodem QR zawiera
tylko krótkie adresy URL, a nie osadzone obrazy. Limit chroni bazę przed
nienaturalnie dużymi rekordami.

## Jeśli limit pojawi się podczas normalnej pracy

- Odczekaj około minuty i spróbuj zapisać lub opublikować ponownie.
- Jeśli automatyzujesz importy albo edycję, zmniejsz częstotliwość żądań — limit
  dotyczy konta, a nie pojedynczej karty przeglądarki.
- Jeśli przy ręcznej edycji limit pojawia się regularnie, zgłoś to, aby można
  było sprawdzić problem.
