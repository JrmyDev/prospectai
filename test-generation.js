import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function testBedAndBreakfastGeneration() {
  try {
    // Create a test bed and breakfast prospect
    const prospect = await prisma.prospect.create({
      data: {
        company: "Chambres d'Hôtes Les Roses",
        sector: "chambre d'hôte",
        address: "15 Rue des Fleurs",
        city: "Provence",
        phone: "04 90 12 34 56",
        status: "analyzed",
        analysis: {
          create: {
            googleRating: 4.8,
            googleReviewsCount: 45,
            description: "Magnifiques chambres d'hôtes dans un mas provençal restauré, avec piscine et petit-déjeuner bio.",
            services: ["Petit-déjeuner inclus", "Piscine", "Parking gratuit", "Wi-Fi"],
            photos: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
          }
        }
      },
      include: { analysis: true }
    });

    console.log('Created test prospect:', prospect.id);

    // Test the website generation
    const response = await fetch('http://localhost:3000/api/generate/website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospectId: prospect.id })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Website generation successful:', result);

      // Get the generated HTML
      const htmlResponse = await fetch(`http://localhost:3000/api/generate/website?prospectId=${prospect.id}`);
      const html = await htmlResponse.text();
      console.log('Generated HTML length:', html.length);
      console.log('HTML preview:', html.substring(0, 500) + '...');
    } else {
      console.error('Website generation failed:', await response.text());
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBedAndBreakfastGeneration();