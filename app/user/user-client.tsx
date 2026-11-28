"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumeDocumentRow, ResumePresetRow, ResumeUserLocaleRow } from "../lib/resume-server";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { Button, Panel, StatePill, Textarea, buttonClassName } from "../components/design-system/primitives";
import { ResumePreviewFrame } from "../components/design-system/molecules/ResumePreviewFrame";
import type { SessionActor } from "../lib/auth-types";
import { useAppI18n } from "../components/app-i18n-provider";
import { formatAppMessage } from "../i18n/locale";

type Props = {
  actor: SessionActor;
  masterResume: ResumeDocumentRow | null;
  initialDocuments: ResumeDocumentRow[];
  languageOptions: ResumeUserLocaleRow[];
  initialPresets: ResumePresetRow[];
};

type JsYamlLoader = {
  load: (yamlContent: string) => unknown;
};

const AVATAR_IMAGE_SIZE = 256;
const AVATAR_IMAGE_QUALITY = 0.82;

function getProfileInitials(displayName: string, email: string) {
  const source = displayName.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getLatestResumeRole(resume: ReturnType<typeof parseResumeYaml>) {
  if (!resume) {
    return "";
  }

  for (let index = resume.experience.length - 1; index >= 0; index -= 1) {
    const role = resume.experience[index]?.role?.trim();
    if (role) {
      return role;
    }
  }

  const defaultSummary = resume.summary.find((item) => item.default);
  return defaultSummary?.position?.trim() || "";
}

async function resizeAvatarImage(
  file: File,
  imageLoadError: string,
  editorUnavailableError: string
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(imageLoadError));
      element.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_IMAGE_SIZE;
    canvas.height = AVATAR_IMAGE_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(editorUnavailableError);
    }

    const sourceSize = Math.min(image.width, image.height);
    const sourceX = Math.max(0, (image.width - sourceSize) / 2);
    const sourceY = Math.max(0, (image.height - sourceSize) / 2);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/jpeg", AVATAR_IMAGE_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getYamlLoader(): JsYamlLoader | null {
  return typeof window === "undefined" ? null : (window.jsyaml ?? null);
}

function parseResumeYaml(yamlContent: string) {
  const yamlLoader = getYamlLoader();
  if (!yamlContent || !yamlLoader) {
    return null;
  }

  try {
    return normalizeResumeDocument(yamlLoader.load(yamlContent), "");
  } catch {
    return null;
  }
}


export default function UserClient({
  actor,
  masterResume,
  initialDocuments,
  languageOptions,
  initialPresets
}: Props) {
  const router = useRouter();
  const { dictionary } = useAppI18n();
  const userText = (text: string) => dictionary.user.text[text] ?? text;
  const { toast, showToast, closeToast } = useStatusToast();
  const [jsYamlReady, setJsYamlReady] = useState(false);
  const [hasYamlLoaderTimedOut, setHasYamlLoaderTimedOut] = useState(false);
  const [isBioEditing, setIsBioEditing] = useState(false);
  const [savedBioValue, setSavedBioValue] = useState(actor.bio || "");
  const [bioValue, setBioValue] = useState(actor.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(actor.avatarUrl);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!masterResume) {
      return;
    }

    let retries = 0;
    const timer = window.setInterval(() => {
      const yamlLoader = getYamlLoader();
      if (yamlLoader || retries > 50) {
        window.clearInterval(timer);
        if (yamlLoader) {
          setJsYamlReady(true);
        } else {
          setHasYamlLoaderTimedOut(true);
        }
      }
      retries += 1;
    }, 100);

    return () => window.clearInterval(timer);
  }, [masterResume]);

  async function handleBioSave() {
    setIsSavingBio(true);
    const response = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: bioValue })
    });

    if (response.ok) {
      setSavedBioValue(bioValue);
      showToast(userText("Bio updated successfully."));
      setIsBioEditing(false);
      router.refresh();
    } else {
      showToast(userText("Failed to update bio."), "error");
    }

    setIsSavingBio(false);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast(userText("Choose an image file."), "error");
      event.target.value = "";
      return;
    }

    setIsSavingAvatar(true);

    try {
      const nextAvatarUrl = await resizeAvatarImage(
        file,
        userText("Image could not be loaded."),
        userText("Image editor is unavailable.")
      );
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: nextAvatarUrl })
      });

      if (!response.ok) {
        throw new Error(userText("Avatar update failed."));
      }

      setAvatarUrl(nextAvatarUrl);
      showToast(userText("Profile photo updated."));
      router.refresh();
    } catch {
      showToast(userText("Failed to update profile photo."), "error");
    } finally {
      setIsSavingAvatar(false);
      event.target.value = "";
    }
  }

  const [activePreviewLocale, setActivePreviewLocale] = useState<string | null>(null);

  const allDocuments = useMemo(() => {
    const docs = masterResume ? [masterResume] : [];
    for (const doc of initialDocuments) {
      if (!docs.some((d) => d.locale === doc.locale)) docs.push(doc);
    }
    return docs;
  }, [masterResume, initialDocuments]);

  const effectiveLocale = activePreviewLocale || masterResume?.locale || "en";

  const resumeForPreview = useMemo(() => {
    if (!jsYamlReady) return null;
    const targetDoc = allDocuments.find((d) => d.locale === effectiveLocale) ?? masterResume;
    return targetDoc ? parseResumeYaml(targetDoc.yaml_content) : null;
  }, [allDocuments, effectiveLocale, jsYamlReady, masterResume]);

  const previewLanguages = useMemo(() => {
    return allDocuments.map((doc) => {
      const lang = languageOptions.find((lo) => lo.code === doc.locale);
      return {
        code: doc.locale,
        label: lang?.label ?? doc.locale.toUpperCase(),
        shortLabel: lang?.short_label
      };
    });
  }, [allDocuments, languageOptions]);

  const handlePreviewLocaleChange = useCallback((locale: string) => {
    setActivePreviewLocale(locale);
  }, []);

  const initials = getProfileInitials(actor.displayName || "", actor.email);
  const currentRole = useMemo(() => getLatestResumeRole(resumeForPreview), [resumeForPreview]);
  const isPreviewUnavailable =
    !masterResume || hasYamlLoaderTimedOut || (jsYamlReady && !resumeForPreview);
  const publishedPresetsCount = initialPresets.filter((preset) => preset.is_public).length;
  const avatarLabel = userText(avatarUrl ? "Change profile photo" : "Add profile photo");

  return (
    <div className="personal-hub ocv-page">
      <StatusToast toast={toast} onClose={closeToast} />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void handleAvatarChange(event)}
      />

      <header className="ocv-page-head">
        <p className="ocv-label">{userText("Profile")}</p>
        <h1 className="ocv-title">{userText("Personal hub")}</h1>
      </header>

      <div className="hub-grid">
        <Panel as="aside" className="hub-card" aria-labelledby="personal-hub-profile-title">
          <button
            type="button"
            className="hub-avatar"
            aria-label={avatarLabel}
            title={avatarLabel}
            disabled={isSavingAvatar}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUrl ? (
              <NextImage src={avatarUrl} alt={actor.displayName || userText("User")} fill sizes="88px" />
            ) : (
              <span aria-hidden="true">{initials}</span>
            )}
          </button>
          <div className="hub-card__name">
            <h2 id="personal-hub-profile-title" className="ocv-heading">
              {actor.displayName || userText("User")}
            </h2>
            <p className="ocv-meta">{currentRole || userText("Role unavailable")}</p>
          </div>

          <div className="hub-bio">
            <p className="hub-split">
              <b className="ocv-subheading">{userText("Short bio")}</b>
              {!isBioEditing ? (
                <button type="button" className="hub-link" onClick={() => setIsBioEditing(true)}>
                  {userText(bioValue ? "Edit short bio" : "Add short bio")}
                </button>
              ) : null}
            </p>
            {isBioEditing ? (
              <div className="hub-bio__form">
                <Textarea
                  label={<span className="ocv-sr-only">{userText("Short bio")}</span>}
                  value={bioValue}
                  onChange={(event) => setBioValue(event.target.value)}
                  placeholder={userText("Share a bit about yourself…")}
                />
                <div className="hub-row">
                  <Button variant="primary" size="small" busy={isSavingBio} onClick={() => void handleBioSave()}>
                    {userText("Save")}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setIsBioEditing(false);
                      setBioValue(savedBioValue);
                    }}
                  >
                    {userText("Cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className={bioValue ? "ocv-body" : "ocv-body hub-bio__empty"}>
                {bioValue || userText("No bio yet. Click the plus icon to add one.")}
              </p>
            )}
          </div>

          <div className="hub-actions">
            <Link href="/master-resume" className={buttonClassName("primary")}>
              {userText("Edit Master Resume")}
            </Link>
            <Link href="/dashboard" className={buttonClassName("secondary")}>
              {userText("Manage CV Versions")}
            </Link>
          </div>

          <div className="hub-policies">
            <p className="ocv-label">{userText("Policies")}</p>
            <Link href="/privacy">{userText("Privacy Policy")}</Link>
            <Link href="/terms">{userText("Terms of Service")}</Link>
          </div>
        </Panel>

        <section className="hub-preview" aria-label={userText("Resume preview")}>
          <p className="hub-split">
            <b className="ocv-subheading">{userText("Resume preview")}</b>
            <StatePill state="public">
              {formatAppMessage(userText("{count} published"), { count: publishedPresetsCount })}
            </StatePill>
          </p>

          {resumeForPreview ? (
            <ResumePreviewFrame
              resume={resumeForPreview}
              locale={(effectiveLocale as ResumeLocale) || "en"}
              languages={previewLanguages}
              activeLocale={effectiveLocale}
              onLanguageSelect={handlePreviewLocaleChange}
            />
          ) : isPreviewUnavailable ? (
            <Panel className="hub-preview__fallback">
              <h3 className="ocv-subheading">{userText("Preview unavailable")}</h3>
              <p className="ocv-body">
                {userText(
                  "The resume preview could not be rendered in this view. Reload the page to try again."
                )}
              </p>
            </Panel>
          ) : (
            <p className="ocv-body hub-preview__loading" role="status">
              {userText("Rendering your resume…")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
