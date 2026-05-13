import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResumeDocument, ResumeLocale } from "./resume-schema";
import { getDefaultSummary, getPreviewLabels } from "./resume-schema";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#14213d",
    lineHeight: 1.45,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d8dee9",
  },
  initials: {
    width: 38,
    height: 38,
    marginBottom: 10,
    borderRadius: 19,
    backgroundColor: "#14213d",
    color: "#ffffff",
    textAlign: "center",
    paddingTop: 11,
    fontSize: 12,
    fontWeight: 700,
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 4,
  },
  role: {
    fontSize: 12,
    color: "#52607a",
  },
  contactRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contactItem: {
    marginRight: 10,
    color: "#334155",
  },
  content: {
    flexDirection: "row",
    gap: 18,
  },
  mainColumn: {
    width: "64%",
    paddingRight: 6,
  },
  sideColumn: {
    width: "36%",
    paddingLeft: 6,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    marginBottom: 7,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#0f172a",
    letterSpacing: 0.4,
  },
  paragraph: {
    marginBottom: 6,
    color: "#334155",
  },
  timelineItem: {
    marginBottom: 9,
  },
  metaLine: {
    marginBottom: 2,
    fontSize: 9,
    color: "#64748b",
  },
  itemTitle: {
    marginBottom: 2,
    fontSize: 10.5,
    fontWeight: 700,
    color: "#0f172a",
  },
  itemSubtitle: {
    marginBottom: 4,
    color: "#334155",
  },
  bulletItem: {
    marginBottom: 2,
    paddingLeft: 8,
    color: "#334155",
  },
  card: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  skillRow: {
    marginBottom: 5,
  },
  note: {
    color: "#64748b",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  pill: {
    marginRight: 4,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    color: "#334155",
    fontSize: 8.5,
  },
});

function renderMeter(level: number) {
  return "●".repeat(Math.max(1, Math.min(5, level || 0))) + "○".repeat(Math.max(0, 5 - Math.max(1, Math.min(5, level || 0))));
}

type ResumePdfDocumentProps = {
  locale: ResumeLocale;
  resume: ResumeDocument;
  title?: string;
};

export function ResumePdfDocument({ locale, resume, title }: ResumePdfDocumentProps) {
  const labels = getPreviewLabels(locale);
  const defaultSummary = getDefaultSummary(resume.summary);
  const documentTitle = title || resume.name || "Resume";

  return (
    <Document title={documentTitle} author={resume.name || "OpenCVHub"} subject="Published CV snapshot export">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.initials}>{resume.brand_initials || "CV"}</Text>
          <Text style={styles.name}>{resume.name || "Your Name"}</Text>
          {defaultSummary?.position ? <Text style={styles.role}>{defaultSummary.position}</Text> : null}

          {resume.contact.length > 0 ? (
            <View style={styles.contactRow}>
              {resume.contact.map((item, index) => (
                <Text key={`${item.label}-${index}`} style={styles.contactItem}>
                  {item.label}: {item.value}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.mainColumn}>
            {defaultSummary ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{labels.summary}</Text>
                <Text style={styles.paragraph}>{defaultSummary.description}</Text>
              </View>
            ) : null}

            {resume.experience.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{labels.experience}</Text>
                {resume.experience.map((item, index) => (
                  <View key={`${item.company}-${index}`} style={styles.timelineItem} wrap={false}>
                    {item.period ? <Text style={styles.metaLine}>{item.period}</Text> : null}
                    <Text style={styles.itemTitle}>{item.company || "Company"}</Text>
                    {item.role ? <Text style={styles.itemSubtitle}>{item.role}</Text> : null}
                    {item.highlights.map((highlight, highlightIndex) => (
                      <Text key={`${highlight}-${highlightIndex}`} style={styles.bulletItem}>
                        • {highlight}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {resume.education.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{labels.education}</Text>
                {resume.education.map((item, index) => (
                  <View key={`${item.school}-${index}`} style={styles.timelineItem} wrap={false}>
                    {item.period ? <Text style={styles.metaLine}>{item.period}</Text> : null}
                    <Text style={styles.itemTitle}>{item.school || "School"}</Text>
                    {item.detail ? <Text style={styles.paragraph}>{item.detail}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            {resume.courses.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{labels.courses}</Text>
                {resume.courses.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.timelineItem} wrap={false}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    {item.year > 0 ? <Text style={styles.metaLine}>{item.year}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.sideColumn}>
            {resume.skills.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{labels.skills}</Text>
                {resume.skills.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.skillRow}>
                    <Text>{item.name}</Text>
                    <Text style={styles.note}>{renderMeter(item.level)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {resume.tech_stack.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{labels.techStack}</Text>
                <View style={styles.pillRow}>
                  {resume.tech_stack.map((item, index) => (
                    <Text key={`${item}-${index}`} style={styles.pill}>
                      {item}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            {resume.languages.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{labels.languages}</Text>
                {resume.languages.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.skillRow}>
                    <Text>{item.name}</Text>
                    {item.level_text ? <Text style={styles.note}>{item.level_text}</Text> : null}
                    <Text style={styles.note}>{renderMeter(item.level)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {resume.interests.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{labels.interests}</Text>
                <Text style={styles.paragraph}>{resume.interests.join(", ")}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
