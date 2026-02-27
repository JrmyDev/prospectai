"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PresentationEditor from "@/components/presentations/PresentationEditor";
import { buildTheme } from "@/lib/presentations/theme";
import { generateSlideFromLayout, updatePageNumbers } from "@/lib/presentations/layouts";
import type { PresentationSlide, PresentationTheme, SlideFormat, ThemePreset } from "@/lib/presentations/types";

interface ProposalData {
  id: string;
  title: string;
  prompt: string;
  htmlContent: string;
  slidesJson?: string | null;
  pdfPath: string | null;
  status: string;
  createdAt: string;
  modelUsed: string | null;
  brandProfile: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    fontGoogle: string | null;
  };
  prospect: { id: string; company: string; sector?: string | null; city?: string | null } | null;
}

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proposals/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setProposal)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Chargement de la présentation...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return <div className="text-gray-400 p-6">Proposition non trouvée</div>;
  }

  // Build theme from brand profile
  const theme: PresentationTheme = buildTheme(
    {
      primaryColor: proposal.brandProfile.primaryColor,
      secondaryColor: proposal.brandProfile.secondaryColor,
      accentColor: proposal.brandProfile.accentColor,
      logoUrl: proposal.brandProfile.logoUrl,
      companyName: proposal.brandProfile.name,
    },
    "techvisor",
  );

  // Parse slides
  let slides: PresentationSlide[];
  const format: SlideFormat = "16:9"; // default

  if (proposal.slidesJson) {
    try {
      slides = JSON.parse(proposal.slidesJson);
      if (!Array.isArray(slides) || slides.length === 0) throw new Error();
    } catch {
      slides = [generateSlideFromLayout("cover", theme, format)];
    }
  } else {
    // No structured slides yet — create a default cover
    slides = [generateSlideFromLayout("cover", theme, format)];
  }

  return (
    <div className="h-[calc(100vh-64px)] -m-6 -mt-4">
      <PresentationEditor
        proposalId={proposal.id}
        initialSlides={slides}
        initialTheme={theme}
        format={format}
        brandProfile={proposal.brandProfile}
      />
    </div>
  );
}
