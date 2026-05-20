import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDocument } from "./resume-schema";
import { getDefaultSummary } from "./resume-schema";
import { buildResumeRendererLabels, getResumeHeroRole } from "../components/resume-renderer/build-resume-render-model";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#F3F4F6",
    padding: 24,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#009c8a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerIdentity: {
    flexDirection: "column",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  role: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
  mainLayout: {
    flexDirection: "row",
    gap: 16,
  },
  leftColumn: {
    flex: 6.5,
    flexDirection: "column",
    gap: 16,
  },
  rightColumn: {
    flex: 3.5,
    flexDirection: "column",
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  sectionTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#009c8a",
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  text: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.5,
  },
  itemBlock: {
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  itemSubtitle: {
    fontSize: 10,
    color: "#009c8a",
    marginBottom: 4,
  },
  itemPeriod: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 2,
  },
  highlight: {
    fontSize: 10,
    color: "#374151",
    marginLeft: 8,
    lineHeight: 1.4,
  },
  contactItem: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  contactLabel: {
    fontSize: 9,
    color: "#6B7280",
    width: 50,
  },
  contactValue: {
    fontSize: 9,
    color: "#009c8a",
    flex: 1,
  },
  skillItem: {
    marginBottom: 8,
  },
  skillName: {
    fontSize: 10,
    color: "#111827",
    marginBottom: 2,
  },
  meterBox: {
    flexDirection: "row",
    gap: 2,
  },
  meterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
  },
  meterDotActive: {
    backgroundColor: "#009c8a",
  },
  pillList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  pill: {
    backgroundColor: "#E6F4F1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 9,
    color: "#009c8a",
  },
});

export const CvPdfTemplate = ({
  resume,
  title,
  locale = "en",
}: {
  resume: ResumeDocument;
  title?: string;
  locale?: string;
}) => {
  const labels = buildResumeRendererLabels(locale);
  const defaultSummary = getDefaultSummary(resume.summary);
  const roleText = getResumeHeroRole(resume);

  return (
    <Document title={title || resume.name || "Resume"}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>{resume.brand_initials || "CV"}</Text>
          </View>
          <View style={styles.headerIdentity}>
            <Text style={styles.name}>{resume.name}</Text>
            {roleText ? <Text style={styles.role}>{roleText}</Text> : null}
          </View>
        </View>

        <View style={styles.mainLayout}>
          <View style={styles.leftColumn}>
            {defaultSummary?.description ? (
              <View style={styles.card} wrap={false}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.summary}</Text>
                </View>
                <Text style={styles.text}>{defaultSummary.description}</Text>
              </View>
            ) : null}

            {resume.experience.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.experience}</Text>
                </View>
                {resume.experience.map((exp, idx) => (
                  <View key={idx} style={styles.itemBlock} wrap={false}>
                    <Text style={styles.itemPeriod}>{exp.period}</Text>
                    <Text style={styles.itemTitle}>{exp.company}</Text>
                    <Text style={styles.itemSubtitle}>{exp.role}</Text>
                    {exp.highlights.map((highlight, highlightIndex) => (
                      <Text key={highlightIndex} style={styles.highlight}>• {highlight}</Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}

            {resume.education.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.education}</Text>
                </View>
                {resume.education.map((education, idx) => (
                  <View key={idx} style={styles.itemBlock} wrap={false}>
                    <Text style={styles.itemPeriod}>{education.period}</Text>
                    <Text style={styles.itemTitle}>{education.school}</Text>
                    {education.detail ? <Text style={styles.text}>{education.detail}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.rightColumn}>
            {resume.contact.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.personalInfo}</Text>
                </View>
                {resume.contact.map((item, idx) => (
                  <View key={idx} style={styles.contactItem}>
                    <Text style={styles.contactLabel}>{item.label}</Text>
                    <Text style={styles.contactValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {resume.skills.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.skills}</Text>
                </View>
                {resume.skills.map((skill, idx) => (
                  <View key={idx} style={styles.skillItem}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    <View style={styles.meterBox}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View key={level} style={[styles.meterDot, skill.level >= level ? styles.meterDotActive : {}]} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {resume.tech_stack.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.techStack}</Text>
                </View>
                <View style={styles.pillList}>
                  {resume.tech_stack.map((item, idx) => (
                    <View key={idx} style={styles.pill}>
                      <Text style={styles.pillText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {resume.languages.length > 0 ? (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{labels.languages}</Text>
                </View>
                {resume.languages.map((language, idx) => (
                  <View key={idx} style={styles.skillItem}>
                    <Text style={styles.skillName}>{language.name}</Text>
                    <View style={styles.meterBox}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View key={level} style={[styles.meterDot, language.level >= level ? styles.meterDotActive : {}]} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
};
