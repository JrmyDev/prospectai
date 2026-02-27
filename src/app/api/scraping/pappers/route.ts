import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiKeys } from "@/lib/settings";

// Pappers API - French company data
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { codeNaf, codePostal, departement, trancheEffectif, query } = body;

  const keys = await getApiKeys();
  if (!keys.pappers) {
    return NextResponse.json({ error: "Pappers API key not configured" }, { status: 400 });
  }

  const job = await prisma.scrapingJob.create({
    data: {
      type: "pappers",
      params: JSON.stringify({ codeNaf, codePostal, departement, trancheEffectif, query }),
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    const params = new URLSearchParams({
      api_token: keys.pappers,
      par_page: "100",
    });

    if (query) params.set("q", query);
    if (codeNaf) params.set("code_naf", codeNaf);
    if (codePostal) params.set("code_postal", codePostal);
    if (departement) params.set("departement", departement);
    if (trancheEffectif) params.set("tranche_effectif", trancheEffectif);

    const url = `https://api.pappers.fr/v2/recherche?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    let created = 0;
    const results = data.resultats || [];

    for (const company of results) {
      // Find dirigeant name
      const dirigeant = company.representants?.[0];
      const firstName = dirigeant?.prenom || null;
      const lastName = dirigeant?.nom || null;

      // Check if already exists by SIRET
      const existing = company.siege?.siret
        ? await prisma.prospect.findFirst({ where: { siret: company.siege.siret } })
        : null;

      if (!existing) {
        // Also check by company name + postal code
        const existsByName = await prisma.prospect.findFirst({
          where: {
            company: company.nom_entreprise,
            postalCode: company.siege?.code_postal || undefined,
          },
        });

        if (!existsByName) {
          await prisma.prospect.create({
            data: {
              company: company.nom_entreprise || company.denomination || "Inconnu",
              firstName,
              lastName,
              siret: company.siege?.siret || null,
              address: company.siege?.adresse_ligne_1 || null,
              city: company.siege?.ville || null,
              postalCode: company.siege?.code_postal || null,
              source: "pappers",
              sector: company.libelle_code_naf || null,
              revenue: company.chiffre_affaires?.toString() || null,
              companyCreatedAt: company.date_creation || null,
              status: "new",
            },
          });
          created++;
        } else {
          // Enrich existing
          await prisma.prospect.update({
            where: { id: existsByName.id },
            data: {
              firstName: firstName || existsByName.firstName,
              lastName: lastName || existsByName.lastName,
              siret: company.siege?.siret || existsByName.siret,
              revenue: company.chiffre_affaires?.toString() || existsByName.revenue,
              companyCreatedAt: company.date_creation || existsByName.companyCreatedAt,
            },
          });
        }
      } else {
        // Enrich existing
        await prisma.prospect.update({
          where: { id: existing.id },
          data: {
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            revenue: company.chiffre_affaires?.toString() || existing.revenue,
          },
        });
      }
    }

    await prisma.scrapingJob.update({
      where: { id: job.id },
      data: { status: "completed", resultsCount: created, completedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      totalFound: results.length,
      newProspects: created,
    });
  } catch (error) {
    await prisma.scrapingJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "Pappers scraping failed" }, { status: 500 });
  }
}
