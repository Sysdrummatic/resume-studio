import React from "react";
import { Text } from "@react-pdf/renderer";
import type { ResumeCourse } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard, PdfTimelineItem } from "../primitives";
import { planTimelineSection } from "../pagination";

type PdfCoursesProps = {
  courses: ResumeCourse[];
  title: string;
  theme: PdfTheme;
};

// Mirrors .timeline--courses: the same timeline as experience and education,
// with the year as the period and a regular-weight course name.
// (This previously copied .course-list, a stylesheet rule the renderer stopped
// using — hence the tinted tiles that appeared in the PDF but never on the page.)
export function PdfCourses({ courses, title, theme }: PdfCoursesProps) {
  const pagination = planTimelineSection(
    theme,
    courses.map((course) => [course.name]),
  );

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
          <Text
            style={{
              fontSize: theme.typography.sizes.md,
              lineHeight: theme.typography.lineHeight,
              fontWeight: theme.typography.weights.regular,
              color: theme.colors.text,
            }}
          >
            {course.name}
          </Text>
        </PdfTimelineItem>
      ))}
    </PdfSectionCard>
  );
}
