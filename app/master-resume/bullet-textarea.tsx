"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { continueBulletList, parseBulletLines } from "../lib/bullet-text";

/**
 * Enter on a "- item" line starts the next "- " line (Enter on an empty one
 * ends the list). Shared by every free-text field that renders bullets.
 */
export function continueBulletsOnEnter(
  event: KeyboardEvent<HTMLTextAreaElement>,
  apply: (value: string) => void,
): void {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

  const field = event.currentTarget;
  const next = continueBulletList(field.value, field.selectionStart, field.selectionEnd);
  if (!next) return;

  event.preventDefault();
  apply(next.value);
  // A controlled textarea resets the caret to the end when its value is
  // replaced; put it back once React has committed the new value.
  requestAnimationFrame(() => field.setSelectionRange(next.caret, next.caret));
}

const toText = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

type Props = {
  items: string[];
  onChange: (text: string) => void;
  rows: number;
  ariaLabel: string;
  placeholder: string;
};

/**
 * One item per line, shown with a "- " prefix that is never stored: the render
 * draws the bullets, so a dash typed by hand must not double up with them.
 * Keeps its own text because a fresh "- " line is empty and would otherwise be
 * dropped from `items` (and vanish) the moment it is typed.
 */
export function BulletListTextarea({ items, onChange, rows, ariaLabel, placeholder }: Props) {
  const [text, setText] = useState(() => toText(items));

  useEffect(() => {
    const current = parseBulletLines(text);
    if (current.length !== items.length || current.some((item, index) => item !== items[index])) {
      setText(toText(items));
    }
    // Only an outside change to `items` (import, rollback) resets the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function update(value: string) {
    setText(value);
    onChange(value);
  }

  return (
    <textarea
      rows={rows}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        if (!text.trim()) setText("- ");
      }}
      onBlur={() => setText(toText(parseBulletLines(text)))}
      onKeyDown={(event) => continueBulletsOnEnter(event, update)}
      onChange={(event) => update(event.target.value)}
    />
  );
}
