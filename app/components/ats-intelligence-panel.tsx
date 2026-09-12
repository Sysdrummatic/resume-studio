import type {
  ATSIntelligenceIssue,
  ATSResumeAnalysis,
  MasterResumeATSInsights,
} from "../lib/ats-intelligence";
import { getATSScoreBand } from "../lib/ats-intelligence";

type MasterProps = {
  mode: "master";
  analysis: MasterResumeATSInsights;
  onIssueSelect?: (issue: ATSIntelligenceIssue) => void;
};

type SavedVersionProps = {
  mode: "saved-version";
  analysis: ATSResumeAnalysis;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
};

type Props = MasterProps | SavedVersionProps;

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="ats-intelligence__score" data-band={getATSScoreBand(score)}>
      <svg viewBox="0 0 44 44" role="img" aria-label={`ATS score ${score} out of 100`}>
        <circle className="ats-intelligence__score-track" cx="22" cy="22" r="18" pathLength="100" />
        <circle
          className="ats-intelligence__score-value"
          cx="22"
          cy="22"
          r="18"
          pathLength="100"
          strokeDasharray={`${score} 100`}
        />
      </svg>
      <strong>{score}</strong>
      <span>/100</span>
    </div>
  );
}

function IssueList({
  issues,
  onIssueSelect,
}: {
  issues: ATSIntelligenceIssue[];
  onIssueSelect?: (issue: ATSIntelligenceIssue) => void;
}) {
  const visibleIssues = issues.filter((issue) => issue.severity !== "info").slice(0, 6);
  if (visibleIssues.length === 0) {
    return <p className="ats-intelligence__empty">No important ATS readiness issues detected.</p>;
  }

  return (
    <ul className="ats-intelligence__issues">
      {visibleIssues.map((issue) => (
        <li key={issue.ruleId} data-severity={issue.severity}>
          <span aria-hidden="true" />
          {onIssueSelect ? (
            <button type="button" onClick={() => onIssueSelect(issue)}>
              {issue.message}
            </button>
          ) : (
            <p>{issue.message}</p>
          )}
          <code>{issue.field}</code>
        </li>
      ))}
    </ul>
  );
}

export function ATSIntelligencePanel(props: Props) {
  const score = props.mode === "master" ? props.analysis.readinessScore : props.analysis.score;

  return (
    <section className="ats-intelligence" aria-label={props.mode === "master" ? "Master CV readiness" : "ATS readiness"}>
      <header className="ats-intelligence__header">
        <ScoreRing score={score} />
        <div>
          <p className="ats-intelligence__eyebrow">ATS Intelligence</p>
          <h2>{props.mode === "master" ? "Master CV readiness" : "Selected CV readiness"}</h2>
          <p>
            {props.mode === "master"
              ? "Quality of your private content library. Every CV Version receives its own score after selection."
              : "Calculated from the content selected for this CV Version. It is guidance, not a guarantee from any ATS vendor."}
          </p>
        </div>
      </header>

      {props.mode === "master" ? (
        <dl className="ats-intelligence__metrics">
          <div>
            <dt>Roles</dt>
            <dd>{props.analysis.metrics.roleCount}</dd>
          </div>
          <div>
            <dt>Measured impact</dt>
            <dd>
              {props.analysis.metrics.rolesWithMeasuredImpact}/{props.analysis.metrics.roleCount}
            </dd>
          </div>
          <div>
            <dt>Skills & tools</dt>
            <dd>{props.analysis.metrics.skillCount}</dd>
          </div>
          <div>
            <dt>Contact channels</dt>
            <dd>{props.analysis.metrics.contactChannelCount}/3</dd>
          </div>
          <div>
            <dt>Summary variants</dt>
            <dd>{props.analysis.metrics.summaryCount}</dd>
          </div>
        </dl>
      ) : null}

      <div className="ats-intelligence__categories" aria-label="ATS score categories">
        {props.analysis.categories.map((category) => (
          <div key={category.id}>
            <span>{category.label}</span>
            <progress max="100" value={category.score} aria-label={`${category.label}: ${category.score} out of 100`} />
            <b>{category.score}</b>
          </div>
        ))}
      </div>

      {props.mode === "saved-version" ? (
        <div className="ats-intelligence__targeting">
          <label htmlFor="ats-job-description">Target job description</label>
          <textarea
            id="ats-job-description"
            value={props.jobDescription}
            onChange={(event) => props.onJobDescriptionChange(event.target.value)}
            placeholder="Paste the role requirements to check unique keyword coverage..."
            rows={5}
          />
          <small>Processed only in this browser. The text is not saved or sent to an external provider.</small>
          {props.analysis.keywordCoverage ? (
            <div className="ats-intelligence__keywords">
              <div>
                <strong>{props.analysis.keywordCoverage.score}%</strong>
                <span>unique keyword coverage</span>
              </div>
              {props.analysis.keywordCoverage.matched.length > 0 ? (
                <p>
                  <b>Matched:</b> {props.analysis.keywordCoverage.matched.slice(0, 8).join(", ")}
                </p>
              ) : null}
              {props.analysis.keywordCoverage.missing.length > 0 ? (
                <p>
                  <b>Review:</b> {props.analysis.keywordCoverage.missing.slice(0, 8).join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="ats-intelligence__empty">Add at least two meaningful terms to include role-specific coverage.</p>
          )}
        </div>
      ) : null}

      <div className="ats-intelligence__guidance">
        <h3>Recommended improvements</h3>
        <IssueList
          issues={props.analysis.issues}
          onIssueSelect={props.mode === "master" ? props.onIssueSelect : undefined}
        />
      </div>
    </section>
  );
}
