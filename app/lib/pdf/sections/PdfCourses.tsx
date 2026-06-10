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

// Mirrors the web .course-list tiles: tinted rounded row with year column + name.
export function PdfCourses({ courses, title, theme }: PdfCoursesProps) {
  return (
    <PdfSectionCard title={title} theme={theme} wrap>
      {courses.map((course, index) => (
        <View
          key={index}
          wrap={false}
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.courseItemBg,
            borderRadius: theme.radii.md,
            padding: theme.spacing.sm,
            marginBottom: index === courses.length - 1 ? 0 : 6,
          }}
        >
          <Text
            style={{
              width: 44,
              fontSize: theme.typography.sizes.sm,
              fontWeight: 700,
              color: theme.colors.accentDark,
            }}
          >
            {course.year > 0 ? String(course.year) : ""}
          </Text>
          <Text style={{ flex: 1, fontSize: theme.typography.sizes.sm, color: theme.colors.text }}>{course.name}</Text>
        </View>
      ))}
    </PdfSectionCard>
  );
}
