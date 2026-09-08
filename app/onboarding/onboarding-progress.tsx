"use client";

import { useEffect, useRef } from "react";

type Props = {
  steps: readonly string[];
  step: number;
  finished: boolean;
  label: string;
  completeLabel: string;
};

export default function OnboardingProgress({ steps, step, finished, label, completeLabel }: Props) {
  const current = useRef<HTMLLIElement>(null);
  const percent = finished ? 100 : Math.round((step / steps.length) * 100);

  useEffect(() => {
    const showCurrentStep = () => current.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    showCurrentStep();
    window.addEventListener("resize", showCurrentStep);
    return () => window.removeEventListener("resize", showCurrentStep);
  }, [step, steps]);

  return (
    <div className="onboarding__progress">
      <div className="onboarding__progress-label">
        <span>{finished ? completeLabel : label}</span>
        <strong>{percent}%</strong>
      </div>
      <progress className="sr-only" value={percent} max={100} aria-label={label} />
      <ol className="onboarding__steps" aria-label={label}>
        {steps.map((title, index) => {
          const active = !finished && index === step;
          const state = finished || index < step ? "complete" : active ? "current" : "upcoming";
          return (
            <li key={title} data-state={state} aria-current={active ? "step" : undefined} ref={active ? current : undefined}>
              <span className="onboarding__step-number" aria-hidden="true">{index + 1}</span>
              <span className="onboarding__step-title">{title}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
