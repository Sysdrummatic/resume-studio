import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDocument } from "./resume-schema";

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#F3F4F6", // Light gray background
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
    backgroundColor: "#009c8a", // Accent green
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
    borderRadius: 16, // Bento style rounded corners
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

export const CvPdfTemplate = ({ resume, title }: { resume: ResumeDocument; title?: string }) => {
  const renderSummary = () => {
    if (!resume.summary) return null;
    let text = "";
    if (typeof resume.summary === "string") {
      text = resume.summary;
    } else if (Array.isArray(resume.summary)) {
      const def = resume.summary.find((s) => s.default === true);
      text = def ? def.description : "";
    }
    
    if (!text) return null;

    return (
      <View style={styles.card} wrap={false}>
        <View style={styles.sectionTitleBox}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Summary</Text>
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
    );
  };

  const getRole = () => {
    if (typeof resume.summary !== "string" && Array.isArray(resume.summary) && resume.summary[0]) {
      const pos = resume.summary[0].position;
      if (pos && pos.toLowerCase() !== "default") {
        return pos;
      }
    }
    return "";
  };

  const roleText = getRole();

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
          {/* Left Column */}
          <View style={styles.leftColumn}>
            {renderSummary()}

            {resume.experience && resume.experience.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Experience</Text>
                </View>
                {resume.experience.map((exp, idx) => (
                  <View key={idx} style={styles.itemBlock} wrap={false}>
                    <Text style={styles.itemPeriod}>{exp.period}</Text>
                    <Text style={styles.itemTitle}>{exp.company}</Text>
                    <Text style={styles.itemSubtitle}>{exp.role}</Text>
                    {exp.highlights && exp.highlights.map((hl, i) => (
                      <Text key={i} style={styles.highlight}>• {hl}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {resume.education && resume.education.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Education</Text>
                </View>
                {resume.education.map((edu, idx) => (
                  <View key={idx} style={styles.itemBlock} wrap={false}>
                    <Text style={styles.itemPeriod}>{edu.period}</Text>
                    <Text style={styles.itemTitle}>{edu.school}</Text>
                    {edu.detail && <Text style={styles.text}>{edu.detail}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {resume.contact && resume.contact.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Personal Info</Text>
                </View>
                {resume.contact.map((c, idx) => (
                  <View key={idx} style={styles.contactItem}>
                    <Text style={styles.contactLabel}>{c.label}</Text>
                    <Text style={styles.contactValue}>{c.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {resume.skills && resume.skills.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Skills</Text>
                </View>
                {resume.skills.map((s, idx) => (
                  <View key={idx} style={styles.skillItem}>
                    <Text style={styles.skillName}>{s.name}</Text>
                    <View style={styles.meterBox}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View key={level} style={[styles.meterDot, (s.level || 0) >= level ? styles.meterDotActive : {}]} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {resume.tech_stack && resume.tech_stack.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Tech stack</Text>
                </View>
                <View style={styles.pillList}>
                  {resume.tech_stack.map((t, idx) => (
                    <View key={idx} style={styles.pill}>
                      <Text style={styles.pillText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {resume.languages && resume.languages.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleBox}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>Languages</Text>
                </View>
                {resume.languages.map((l, idx) => (
                  <View key={idx} style={styles.skillItem}>
                    <Text style={styles.skillName}>{l.name}</Text>
                    <View style={styles.meterBox}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View key={level} style={[styles.meterDot, (l.level || 0) >= level ? styles.meterDotActive : {}]} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
