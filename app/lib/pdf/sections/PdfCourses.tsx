import React from "react";
import type { ResumeCourse } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineBlocks, PdfTimelineItem } from "../primitives";
import { planTimelineSection, type PdfTimelineBlock } from "../pagination";

type PdfCoursesProps = {
  courses: ResumeCourse[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .timeline--courses: the same timeline as experience and education,
// with the year as the period and a regular-weight course name.
// (This previously copied .course-list, a stylesheet rule the renderer stopped
// using — hence the tinted tiles that appeared in the PDF but never on the page.)
function courseBlocks(course: ResumeCourse, theme: PdfTheme): PdfTimelineBlock[] {
  return [
    {
      text: course.name,
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.regular,
    },
  ];
}

export function PdfCourses({ courses, title, theme }: PdfCoursesProps) {
  const entries = courses.map((course) => courseBlocks(course, theme));
  const pagination = planTimelineSection(theme, entries);

  return (
    <PdfSectionCard
      title={title}
      theme={theme}
      wrap
      keepTitleWithFirstChild={pagination.keepTitleWithFirstEntry}
    >
      {courses.map((course, index) => (
        <PdfTimelineItem
          key={index}
          period={course.year > 0 ? String(course.year) : ""}
          isLast={index === courses.length - 1}
          theme={theme}
          allowSplit={pagination.allowSplit[index]}
        >
          <PdfTimelineBlocks blocks={entries[index]} theme={theme} />
        </PdfTimelineItem>
      ))}
    </PdfSectionCard>
  );
}
