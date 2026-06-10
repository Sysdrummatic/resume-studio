import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { ResumeCourse } from "../../resume-schema";
import type { PdfTheme } from "../theme";
import { PdfSectionCard } from "../primitives";

type PdfCoursesProps = {
  courses: ResumeCourse[];
  title: string;
  theme: PdfTheme;
};

export function PdfCourses({ courses, title, theme }: PdfCoursesProps) {
  return (
    <PdfSectionCard title={title} theme={theme} wrap minTitlePresenceAhead={32}>
      {courses.map((course, index) => (
        <View
          key={index}
          wrap={false}
          style={{ flexDirection: "row", marginBottom: index === courses.length - 1 ? 0 : theme.spacing.xs }}
        >
          {course.year ? (
            <Text style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.muted, width: 36 }}>
              {course.year}
            </Text>
          ) : null}
          <Text
            style={{
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text,
              flex: 1,
              lineHeight: theme.typography.lineHeight,
            }}
          >
            {course.name}
          </Text>
        </View>
      ))}
    </PdfSectionCard>
  );
}
