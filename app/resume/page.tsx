import ResumeViewClient from "./resume-view-client";

export const metadata = {
  title: "Sample Resume | OpenCVHub",
  description: "View a sample resume powered by YAML and Next.js.",
};

export default function SampleResumePage() {
  return (
    <main className="container py-8">
      <ResumeViewClient />
    </main>
  );
}
