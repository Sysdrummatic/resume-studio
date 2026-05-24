#!/usr/bin/env bash
# =============================================================================
# OpenCiVera — ROADMAP.md → GitHub Projects
# =============================================================================
# Parsuje ROADMAP.md i tworzy:
#   • Milestones    (jedna per faza)
#   • GitHub Issues (jeden per item z roadmapy)
#   • Przypisuje labele: phase:, type: feature/chore, status z ikony
#
# Wymaga: gh CLI (https://cli.github.com) + jq
# Użycie:  bash roadmap-to-github.sh [owner/repo] [ROADMAP.md]
# Przykład: bash roadmap-to-github.sh jankowalski/OpenCiVera ROADMAP.md
# =============================================================================

set -euo pipefail

# ── Argumenty ────────────────────────────────────────────────────────────────
REPO="${1:-}"
ROADMAP="${2:-ROADMAP.md}"

if [[ -z "$REPO" ]]; then
  REPO=$(git remote get-url origin 2>/dev/null \
    | sed -E 's#.*github\.com[:/]##;s#\.git$##') || true
fi

if [[ -z "$REPO" ]]; then
  echo "❌  Podaj repo: bash roadmap-to-github.sh owner/repo [ROADMAP.md]"
  exit 1
fi

if [[ ! -f "$ROADMAP" ]]; then
  echo "❌  Nie znaleziono pliku: $ROADMAP"
  exit 1
fi

# ── Sprawdź narzędzia ────────────────────────────────────────────────────────
for cmd in gh jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌  Brakuje: $cmd"
    [[ "$cmd" == "gh" ]]  && echo "    Instalacja: https://cli.github.com"
    [[ "$cmd" == "jq" ]]  && echo "    Instalacja: brew install jq / apt install jq"
    exit 1
  fi
done

if ! gh auth status &>/dev/null; then
  echo "❌  Nie jesteś zalogowany. Uruchom: gh auth login"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ROADMAP.md → GitHub Projects                  ║"
echo "║   Repo: https://github.com/$REPO"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📄  Plik: $ROADMAP"
echo ""

# ── Mapowania ─────────────────────────────────────────────────────────────────
# status → GitHub state dla issue
icon_to_state() {
  case "$1" in
    "✓") echo "closed" ;;   # shipped
    *)   echo "open"   ;;   # active / next / later / vision
  esac
}

# status fazyw → label
status_to_label() {
  case "$1" in
    shipped) echo "phase: E — MVP" ;;   # fallback; będzie nadpisane per-faza
    active)  echo "phase: E — MVP" ;;
    next)    echo "phase: F — community" ;;
    later)   echo "phase: G — AI" ;;
    vision)  echo "phase: H — vision" ;;
    *)       echo "" ;;
  esac
}

# ikona → label type
icon_to_type() {
  case "$1" in
    "✓") echo "type: chore" ;;
    "✦") echo "type: feature" ;;
    *)   echo "type: feature" ;;
  esac
}

# ── Parser ROADMAP.md ─────────────────────────────────────────────────────────
declare -a PHASES=()
declare -A PHASE_NAME PHASE_STATUS PHASE_ETA PHASE_DESC PHASE_ITEMS

current_phase=""
current_desc=""
reading_desc=false

while IFS= read -r line; do

  # Nagłówek fazy: ## Phase X · Tytuł · status
  if [[ "$line" =~ ^##[[:space:]]+(.+)[[:space:]]·[[:space:]](.+)[[:space:]]·[[:space:]]([a-z]+)$ ]]; then
    current_phase="${BASH_REMATCH[1]// /-}"
    current_phase="${current_phase//·/-}"
    current_phase=$(echo "$current_phase" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')
    PHASES+=("$current_phase")
    PHASE_NAME["$current_phase"]="${BASH_REMATCH[1]} · ${BASH_REMATCH[2]}"
    PHASE_STATUS["$current_phase"]="${BASH_REMATCH[3]}"
    PHASE_ETA["$current_phase"]=""
    PHASE_DESC["$current_phase"]=""
    PHASE_ITEMS["$current_phase"]=""
    reading_desc=true
    current_desc=""
    continue
  fi

  [[ -z "$current_phase" ]] && continue

  # ETA
  if [[ "$line" =~ ^eta:[[:space:]]*(.+)$ ]]; then
    PHASE_ETA["$current_phase"]="${BASH_REMATCH[1]}"
    reading_desc=false
    continue
  fi

  # Opis (blockquote)
  if [[ "$line" =~ ^\>[[:space:]](.+)$ ]] && [[ "$reading_desc" == true ]]; then
    current_desc+="${BASH_REMATCH[1]} "
    PHASE_DESC["$current_phase"]="$current_desc"
    continue
  fi

  # Item: - ICON Tytuł · Opis
  if [[ "$line" =~ ^-[[:space:]](.)([[:space:]])(.+)[[:space:]]·[[:space:]](.+)$ ]]; then
    icon="${BASH_REMATCH[1]}"
    title="${BASH_REMATCH[3]}"
    desc="${BASH_REMATCH[4]}"
    # Dołącz do listy items fazyw jako JSON-like rekord
    PHASE_ITEMS["$current_phase"]+="${icon}|||${title}|||${desc}"$'\n'
    reading_desc=false
    continue
  fi

done < "$ROADMAP"

# ── ETA → data dla milestone ──────────────────────────────────────────────────
eta_to_date() {
  local eta="$1"
  case "$eta" in
    *"May 2026"*)       echo "2026-05-31T23:59:59Z" ;;
    *"Jun"*"Jul 2026"*) echo "2026-07-31T23:59:59Z" ;;
    *"Q3"*"2026"*)      echo "2026-09-30T23:59:59Z" ;;
    *"Q4"*"2026"*)      echo "2026-12-31T23:59:59Z" ;;
    *"2027"*)           echo "2027-12-31T23:59:59Z" ;;
    *)                  echo "" ;;
  esac
}

# ── Tworzenie Milestones ──────────────────────────────────────────────────────
echo "━━━  Tworzę Milestones  ━━━"
declare -A MILESTONE_IDS

for phase in "${PHASES[@]}"; do
  name="${PHASE_NAME[$phase]}"
  eta="${PHASE_ETA[$phase]}"
  desc="${PHASE_DESC[$phase]}"
  due=$(eta_to_date "$eta")
  status="${PHASE_STATUS[$phase]}"

  # Milestone state
  ms_state="open"
  [[ "$status" == "shipped" ]] && ms_state="closed"

  echo -n "  → Milestone: $name ($eta) ... "

  # Sprawdź czy milestone już istnieje
  existing_id=$(gh api "repos/$REPO/milestones?state=all&per_page=100" \
    --jq ".[] | select(.title == \"$name\") | .number" 2>/dev/null || echo "")

  if [[ -n "$existing_id" ]]; then
    echo "już istnieje (#$existing_id)"
    MILESTONE_IDS["$phase"]="$existing_id"
    continue
  fi

  # Utwórz milestone
  ms_payload=$(jq -n \
    --arg title "$name" \
    --arg desc "${desc:-}" \
    --arg state "$ms_state" \
    '{title: $title, description: $desc, state: $state}')

  if [[ -n "$due" ]]; then
    ms_payload=$(echo "$ms_payload" | jq --arg due "$due" '. + {due_on: $due}')
  fi

  result=$(gh api "repos/$REPO/milestones" \
    --method POST \
    --input <(echo "$ms_payload") \
    --jq '.number' 2>/dev/null || echo "")

  if [[ -n "$result" ]]; then
    echo "✓ (#$result)"
    MILESTONE_IDS["$phase"]="$result"
  else
    echo "⚠ błąd tworzenia"
    MILESTONE_IDS["$phase"]=""
  fi
done
echo ""

# ── Tworzenie Issues ──────────────────────────────────────────────────────────
echo "━━━  Tworzę Issues  ━━━"
total_created=0
total_skipped=0
total_closed=0

for phase in "${PHASES[@]}"; do
  phase_name="${PHASE_NAME[$phase]}"
  phase_status="${PHASE_STATUS[$phase]}"
  milestone_id="${MILESTONE_IDS[$phase]:-}"
  phase_label=$(status_to_label "$phase_status")

  echo ""
  echo "  📌  $phase_name"

  items="${PHASE_ITEMS[$phase]}"
  [[ -z "$items" ]] && echo "     (brak itemów)" && continue

  while IFS= read -r item_line; do
    [[ -z "$item_line" ]] && continue

    IFS='|||' read -r icon title desc <<< "$item_line"
    title=$(echo "$title" | xargs)  # trim
    desc=$(echo "$desc" | xargs)

    issue_state=$(icon_to_state "$icon")
    type_label=$(icon_to_type "$icon")

    # Sprawdź czy issue już istnieje (po tytule)
    existing=$(gh issue list \
      --repo "$REPO" \
      --state all \
      --search "\"$title\" in:title" \
      --json number,title \
      --jq ".[] | select(.title == \"$title\") | .number" 2>/dev/null | head -1 || echo "")

    if [[ -n "$existing" ]]; then
      echo "     ↷ #$existing już istnieje: $title"
      ((total_skipped++)) || true
      continue
    fi

    # Body issue
    body="## $title

$desc

---
**Phase:** $phase_name
**Roadmap status:** $phase_status
**ETA:** ${PHASE_ETA[$phase]:-TBD}

> _Wygenerowano automatycznie z ROADMAP.md_"

    # Labele
    labels=()
    [[ -n "$phase_label" ]] && labels+=("$phase_label")
    [[ -n "$type_label" ]]  && labels+=("$type_label")

    # Buduj payload
    issue_payload=$(jq -n \
      --arg title "$title" \
      --arg body "$body" \
      --argjson labels "$(printf '%s\n' "${labels[@]}" | jq -R . | jq -s .)" \
      '{title: $title, body: $body, labels: $labels}')

    # Dodaj milestone jeśli istnieje
    if [[ -n "$milestone_id" ]]; then
      issue_payload=$(echo "$issue_payload" | jq --argjson ms "$milestone_id" '. + {milestone: $ms}')
    fi

    # Utwórz issue
    new_number=$(gh api "repos/$REPO/issues" \
      --method POST \
      --input <(echo "$issue_payload") \
      --jq '.number' 2>/dev/null || echo "")

    if [[ -n "$new_number" ]]; then
      echo "     ✓ #$new_number: $title"
      ((total_created++)) || true

      # Zamknij jeśli shipped
      if [[ "$issue_state" == "closed" ]]; then
        gh issue close "$new_number" \
          --repo "$REPO" \
          --comment "Automatically closed — shipped per ROADMAP.md" \
          2>/dev/null && echo "       ↳ zamknięto (shipped)" || true
        ((total_closed++)) || true
      fi
    else
      echo "     ⚠ błąd: $title"
    fi

    # Rate limit protection
    sleep 0.5

  done <<< "$items"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Gotowe!"
echo "  📊  Utworzono issues:   $total_created"
echo "  🔒  Zamknięto (shipped): $total_closed"
echo "  ↷   Pominięto (duplikaty): $total_skipped"
echo "  🔗  https://github.com/$REPO/issues"
echo "  🔗  https://github.com/$REPO/milestones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Następny krok — dodaj issues do GitHub Project:"
echo ""
echo "  PROJECT_ID=\$(gh project list --owner ${REPO%%/*} --format json | \\"
echo "    jq -r '.projects[] | select(.title==\"OpenCiVera\") | .id')"
echo ""
echo "  gh issue list --repo $REPO --state all --json id \\"
echo "    --jq '.[].id' | while read id; do"
echo "    gh project item-add \$PROJECT_ID --owner ${REPO%%/*} --url \\"
echo "      \"https://github.com/$REPO/issues/\$id\""
echo "  done"
echo ""