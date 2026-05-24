"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumeDocumentRow, ResumeLanguageRow, ResumePresetRow } from "../lib/resume-server";
import { buildPublishedResumeExportUrls } from "../lib/resume-export";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { Typography } from "../components/design-system/atoms/Typography";
import { Button } from "../components/design-system/atoms/Button";
import { UserAvatar } from "../components/design-system/atoms/UserAvatar";
import { ResumePreviewFrame } from "../components/design-system/molecules/ResumePreviewFrame";
import type { SessionActor } from "../lib/auth-types";

type Props = {
  actor: SessionActor;
  masterResume: ResumeDocumentRow | null;
  initialDocuments: ResumeDocumentRow[];
  languageOptions: ResumeLanguageRow[];
  initialPresets: ResumePresetRow[];
};

type JsYamlLoader = {
  load: (yamlContent: string) => unknown;
};

const MOBILE_DRAWER_BREAKPOINT_QUERY = "(min-width: 980px)";
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

async function resizeAvatarImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image could not be loaded."));
      element.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_IMAGE_SIZE;
    canvas.height = AVATAR_IMAGE_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image editor is unavailable.");
    }

    const sourceSize = Math.min(image.width, image.height);
    const sourceX = Math.max(0, (image.width - sourceSize) / 2);
    const sourceY = Math.max(0, (image.height - sourceSize) / 2);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", AVATAR_IMAGE_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function getYamlLoader(): JsYamlLoader | null {
  return typeof window === "undefined" ? null : window.jsyaml ?? null;
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

export default function UserClient({ actor, masterResume, initialDocuments, languageOptions, initialPresets }: Props) {
  const router = useRouter();
  const { toast, showToast, closeToast } = useStatusToast();
  const [isHydrated, setIsHydrated] = useState(false);
  const [jsYamlReady, setJsYamlReady] = useState(false);
  const [hasYamlLoaderTimedOut, setHasYamlLoaderTimedOut] = useState(false);
  const [isBioEditing, setIsBioEditing] = useState(false);
  const [savedBioValue, setSavedBioValue] = useState(actor.bio || "");
  const [bioValue, setBioValue] = useState(actor.bio || "");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(actor.avatarUrl);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const previousBodyOverflowRef = useRef<string>("");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsHydrated(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_DRAWER_BREAKPOINT_QUERY);
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setIsSidebarDrawerOpen(false);
      }
    };

    handleChange(mediaQuery);

    const listener = (event: MediaQueryListEvent) => handleChange(event);
    mediaQuery.addEventListener("change", listener);

    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    if (isSidebarDrawerOpen) {
      contentElement.setAttribute("inert", "");
      contentElement.setAttribute("aria-hidden", "true");
    } else {
      contentElement.removeAttribute("inert");
      contentElement.removeAttribute("aria-hidden");
    }

    return () => {
      contentElement.removeAttribute("inert");
      contentElement.removeAttribute("aria-hidden");
    };
  }, [isSidebarDrawerOpen]);

  useEffect(() => {
    if (!isSidebarDrawerOpen) {
      return;
    }

    const drawerElement = drawerRef.current;
    const drawerTriggerElement = drawerTriggerRef.current;
    if (!drawerElement) {
      return;
    }

    previousBodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = getFocusableElements(drawerElement);
    const initialFocusTarget = focusableElements[0] || drawerElement;
    window.requestAnimationFrame(() => {
      initialFocusTarget.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      if (!drawerRef.current) {
        return;
      }

      const activeFocusableElements = getFocusableElements(drawerRef.current);
      if (activeFocusableElements.length === 0) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }

      const firstFocusable = activeFocusableElements[0];
      const lastFocusable = activeFocusableElements[activeFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflowRef.current;
      window.removeEventListener("keydown", handleKeyDown);

      if (!window.matchMedia(MOBILE_DRAWER_BREAKPOINT_QUERY).matches) {
        drawerTriggerElement?.focus();
      }
    };
  }, [isSidebarDrawerOpen]);

  async function handleBioSave() {
    setIsSavingBio(true);
    const response = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: bioValue }),
    });

    if (response.ok) {
      setSavedBioValue(bioValue);
      showToast("Bio updated successfully.");
      setIsBioEditing(false);
      router.refresh();
    } else {
      showToast("Failed to update bio.", "error");
    }

    setIsSavingBio(false);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file.", "error");
      event.target.value = "";
      return;
    }

    setIsSavingAvatar(true);

    try {
      const nextAvatarUrl = await resizeAvatarImage(file);
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: nextAvatarUrl }),
      });

      if (!response.ok) {
        throw new Error("Avatar update failed.");
      }

      setAvatarUrl(nextAvatarUrl);
      showToast("Profile photo updated.");
      router.refresh();
    } catch {
      showToast("Failed to update profile photo.", "error");
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
        shortLabel: lang?.short_label,
      };
    });
  }, [allDocuments, languageOptions]);

  const handlePreviewLocaleChange = useCallback((locale: string) => {
    setActivePreviewLocale(locale);
  }, []);

  const initials = getProfileInitials(actor.displayName || "", actor.email);
  const currentRole = useMemo(() => getLatestResumeRole(resumeForPreview), [resumeForPreview]);
  const isPreviewUnavailable = !masterResume || hasYamlLoaderTimedOut || (jsYamlReady && !resumeForPreview);
  const publishedPresetsCount = initialPresets.filter((preset) => preset.is_public).length;
  const primaryExportUrls = initialPresets[0]
    ? buildPublishedResumeExportUrls(initialPresets[0].canonical_public_path, initialPresets[0].default_locale)
    : null;

  return (
    <div className={`personal-hub py-4 md:py-8 ${isHydrated ? "is-hydrated" : ""}`}>
      <StatusToast toast={toast} onClose={closeToast} />

      <button
        ref={drawerTriggerRef}
        type="button"
        className={`personal-hub__drawer-handle ${isSidebarDrawerOpen ? "is-open" : ""} ${isHydrated ? "is-ready" : ""}`}
        aria-controls="personal-hub-sidebar-column"
        aria-expanded={isSidebarDrawerOpen}
        aria-label={isSidebarDrawerOpen ? "Hide personal hub panel" : "Show personal hub panel"}
        onClick={() => setIsSidebarDrawerOpen((current) => !current)}
      >
        <span className="personal-hub__drawer-handle-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <button
        type="button"
        className={`personal-hub__drawer-overlay ${isSidebarDrawerOpen ? "is-open" : ""} ${isHydrated ? "is-ready" : ""}`}
        aria-label="Close personal hub panel"
        onClick={() => setIsSidebarDrawerOpen(false)}
      />

      <div className="personal-hub__layout max-w-[1400px] mx-auto">
        <div
          id="personal-hub-sidebar-column"
          ref={drawerRef}
          className={`personal-hub__sidebar-column ${isSidebarDrawerOpen ? "is-open" : ""} ${isHydrated ? "is-hydrated" : ""}`}
          role="dialog"
          aria-modal={isSidebarDrawerOpen ? "true" : undefined}
          aria-labelledby="personal-hub-profile-title"
          aria-hidden={isSidebarDrawerOpen ? undefined : "true"}
          tabIndex={-1}
        >
          <div className="personal-hub__sidebar space-y-6">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void handleAvatarChange(event)}
            />
            <div className="personal-hub__drawer-toolbar">
              <button
                type="button"
                className="personal-hub__drawer-close"
                aria-label="Close personal hub panel"
                onClick={() => setIsSidebarDrawerOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <section
              className="personal-hub__profile-panel p-8 flex flex-col items-center text-center rounded-bento"
              aria-labelledby="personal-hub-profile-title"
            >
              <div className="personal-hub__profile-summary w-full flex flex-col items-center text-center">
                <div className="personal-hub__avatar-wrap">
                  <UserAvatar initials={initials} src={avatarUrl || undefined} size="xl" className="personal-hub__avatar" />
                  <button
                    type="button"
                    className="personal-hub__add-badge personal-hub__add-badge--avatar"
                    aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}
                    title={avatarUrl ? "Change profile photo" : "Add profile photo"}
                    disabled={isSavingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    +
                  </button>
                </div>

                <div className="personal-hub__profile-intro mb-8">
                  <Typography variant="caption" muted className="personal-hub__eyebrow">
                    Profile
                  </Typography>
                  <Typography id="personal-hub-profile-title" variant="h2" className="mb-1 personal-hub__profile-name">
                    {actor.displayName || "User"}
                  </Typography>
                  <Typography variant="body" muted className="font-medium personal-hub__profile-role">
                    {currentRole || "Role unavailable"}
                  </Typography>
                </div>

                <div className="personal-hub__bio-shell">
                  <div className="personal-hub__bio-block w-full text-left space-y-3">
                    <div className="flex justify-center items-center">
                      <Typography variant="caption" muted className="font-bold tracking-widest text-[10px]">
                      Short Bio
                      </Typography>
                    </div>

                    {isBioEditing ? (
                      <>
                        <textarea
                          value={bioValue}
                          onChange={(event) => setBioValue(event.target.value)}
                          className="personal-hub__bio-input w-full rounded-xl p-4 text-sm min-h-[120px] leading-relaxed"
                          placeholder="Share a bit about yourself..."
                        />
                        <div className="personal-hub__bio-actions flex gap-2">
                        <button
                          onClick={handleBioSave}
                          disabled={isSavingBio}
                          className="personal-hub__text-action personal-hub__text-action--success bg-transparent border-0 cursor-pointer"
                        >
                          <Typography variant="small" className="font-bold">
                            Save
                          </Typography>
                        </button>
                        <button
                          onClick={() => {
                            setIsBioEditing(false);
                            setBioValue(savedBioValue);
                          }}
                          className="personal-hub__text-action personal-hub__text-action--danger bg-transparent border-0 cursor-pointer"
                        >
                          <Typography variant="small" className="font-bold">
                            Cancel
                          </Typography>
                        </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Typography variant="body" className="personal-hub__bio-copy leading-relaxed min-h-[60px]">
                          {bioValue || <span className="personal-hub__bio-empty">No bio yet. Click the plus icon to add one.</span>}
                        </Typography>
                        <button
                          type="button"
                          className="personal-hub__add-badge personal-hub__add-badge--bio"
                          aria-label={bioValue ? "Edit short bio" : "Add short bio"}
                          title={bioValue ? "Edit short bio" : "Add short bio"}
                          onClick={() => setIsBioEditing(true)}
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                  <div className="personal-hub__profile-actions w-full space-y-3">
                    <Link href="/master-resume" className="w-full block">
                      <Button variant="primary" className="personal-hub__primary-action w-full justify-center">
                        Edit Master Resume
                      </Button>
                    </Link>
                    <Link href="/dashboard" className="w-full block">
                      <Button variant="ghost" className="personal-hub__secondary-action w-full justify-center">
                        Manage CV Versions
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="personal-hub__insights-panel p-6 rounded-bento">
              <Typography variant="caption" muted className="mb-4 block font-bold tracking-widest text-[10px]">
                Insights
              </Typography>
              <div className="personal-hub__insights-grid grid grid-cols-2 gap-4">
                <div className="personal-hub__insight-card p-4 rounded-2xl flex flex-col items-center">
                  <Typography variant="h2" className="personal-hub__insight-value">
                    {initialPresets.length}
                  </Typography>
                  <Typography variant="caption" muted className="text-[10px]">
                    Variants
                  </Typography>
                </div>
                <div className="personal-hub__insight-card p-4 rounded-2xl flex flex-col items-center">
                  <Typography variant="h2" className="personal-hub__insight-value">
                    {publishedPresetsCount}
                  </Typography>
                  <Typography variant="caption" muted className="text-[10px]">
                    Public
                  </Typography>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div ref={contentRef} className="personal-hub__content">
          <section
            className="personal-hub__resume-panel h-full flex flex-col overflow-hidden relative"
            aria-label="Resume preview"
            data-has-export={primaryExportUrls ? "true" : "false"}
          >
            <div className="personal-hub__resume-preview flex-1 flex items-start justify-center overflow-hidden min-h-[500px]">
              {resumeForPreview ? (
                <div className="w-full max-w-[720px]">
                  <ResumePreviewFrame
                    resume={resumeForPreview}
                    locale={(effectiveLocale as ResumeLocale) || "en"}
                    languages={previewLanguages}
                    activeLocale={effectiveLocale}
                    onLanguageSelect={handlePreviewLocaleChange}
                  />
                </div>
              ) : isPreviewUnavailable ? (
                <div className="personal-hub__preview-fallback">
                  <Typography variant="h3">Preview unavailable</Typography>
                  <Typography variant="body" muted>
                    The resume preview could not be rendered in this view. Use export actions or reopen the page.
                  </Typography>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <Typography variant="body" muted className="animate-pulse">
                    Rendering your resume...
                  </Typography>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
