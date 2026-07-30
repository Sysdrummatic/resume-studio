import React from "react";
import { Page, View } from "@react-pdf/renderer";
import type { ResumeDocument } from "../../resume-schema";
import { getDefaultSummary } from "../../resume-schema";
import type { ResumeRendererLabels } from "../../../components/resume-renderer/build-resume-render-model";
import type { PdfTheme } from "../theme";
import { PdfHeader } from "../sections/PdfHeader";
import { PdfSummary } from "../sections/PdfSummary";
import { PdfExperience } from "../sections/PdfExperience";
import { PdfEducation } from "../sections/PdfEducation";
import { PdfCourses } from "../sections/PdfCourses";
import { PdfPersonalInfo } from "../sections/PdfPersonalInfo";
import { PdfSkills } from "../sections/PdfSkills";
import { PdfTechStack } from "../sections/PdfTechStack";
import { PdfLanguages } from "../sections/PdfLanguages";
import { PdfInterests } from "../sections/PdfInterests";

type TwoColumnTemplateProps = {
  resume: ResumeDocument;
  labels: ResumeRendererLabels;
  heroRole: string;
  theme: PdfTheme;
};

export function TwoColumnTemplate({ resume, labels, heroRole, theme }: TwoColumnTemplateProps) {
  const defaultSummary = getDefaultSummary(resume.summary);

  return (
    <Page
      size="A4"
      style={{
        flexDirection: "column",
        backgroundColor: theme.colors.pageBg,
        padding: theme.layout.pageMargin,
        fontFamily: theme.typography.fontFamily,
        // .resume-view-page's inherited base. lineHeight is deliberately not
        // set here: react-pdf ignores an inherited one when measuring a Text's
        // box, which silently overlaps stacked text. Each Text sets its own.
        fontSize: theme.typography.sizes.base,
        fontWeight: theme.typography.weights.regular,
        color: theme.colors.text,
      }}
    >
      <PdfHeader resume={resume} heroRole={heroRole} theme={theme} />

      <View style={{ flexDirection: "row", gap: theme.layout.columnGap }}>
        <View style={{ flex: theme.layout.mainColumnFlex, flexDirection: "column", gap: theme.layout.sectionGap }}>
          {defaultSummary?.description ? (
            <PdfSummary summary={defaultSummary} title={labels.summary} theme={theme} />
          ) : null}
          {resume.experience.length > 0 ? (
            <PdfExperience experience={resume.experience} title={labels.experience} theme={theme} />
          ) : null}
          {resume.education.length > 0 ? (
            <PdfEducation education={resume.education} title={labels.education} theme={theme} />
          ) : null}
          {resume.courses.length > 0 ? (
            <PdfCourses courses={resume.courses} title={labels.courses} theme={theme} />
          ) : null}
        </View>

        <View style={{ flex: theme.layout.sideColumnFlex, flexDirection: "column", gap: theme.layout.sectionGap }}>
          {resume.contact.length > 0 ? (
            <PdfPersonalInfo contact={resume.contact} title={labels.personalInfo} theme={theme} />
          ) : null}
          {resume.skills.length > 0 ? (
            <PdfSkills skills={resume.skills} title={labels.skills} theme={theme} />
          ) : null}
          {resume.tech_stack.length > 0 ? (
            <PdfTechStack techStack={resume.tech_stack} title={labels.techStack} theme={theme} />
          ) : null}
          {resume.languages.length > 0 ? (
            <PdfLanguages languages={resume.languages} title={labels.languages} theme={theme} />
          ) : null}
          {resume.interests.length > 0 ? (
            <PdfInterests interests={resume.interests} title={labels.interests} theme={theme} />
          ) : null}
        </View>
      </View>
    </Page>
  );
}
