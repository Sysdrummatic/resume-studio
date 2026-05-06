type Props = {
  status: "public" | "draft";
  aiGenerated?: boolean;
  labels?: {
    public?: string;
    draft?: string;
    aiGenerated?: string;
  };
};

export default function ResumeBadges({ status, aiGenerated = false, labels = {} }: Props) {
  const statusLabel = status === "public" ? labels.public || "Public" : labels.draft || "Draft";

  return (
    <div className="resume-badges" aria-label="CV status">
      <span className={`resume-badge resume-badge--${status}`}>{statusLabel}</span>
      {aiGenerated ? <span className="resume-badge resume-badge--ai">{labels.aiGenerated || "AI generated"}</span> : null}
    </div>
  );
}
