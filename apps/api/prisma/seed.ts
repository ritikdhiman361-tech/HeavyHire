// Fills the database with starter data. Safe to run many times.
//   pnpm db:seed
// Always: machine categories, settings, and the admin user (ADMIN_PHONE).
// Development only: a demo vendor with sample machines around Bengaluru.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { slug: "jcb", nameEn: "JCB / Backhoe", nameHi: "जेसीबी", sortOrder: 1 },
  { slug: "excavator", nameEn: "Excavator", nameHi: "एक्सकेवेटर (पोकलेन)", sortOrder: 2 },
  { slug: "tipper", nameEn: "Tipper", nameHi: "टिपर", sortOrder: 3 },
  { slug: "crane", nameEn: "Crane", nameHi: "क्रेन", sortOrder: 4 },
  { slug: "road-roller", nameEn: "Road Roller", nameHi: "रोड रोलर", sortOrder: 5 },
];

// [category, brand, model, year, capacity, area, lat, lng, ₹/hour, ₹/day]
const demoMachines: [string, string, string, number, string, string, number, number, number | null, number | null][] = [
  ["jcb", "JCB", "3DX Super", 2022, "0.26 m³ bucket", "Whitefield", 12.9698, 77.75, 1100, 8000],
  ["jcb", "JCB", "3DX Xtra", 2020, "0.30 m³ bucket", "Electronic City", 12.8452, 77.6602, 1000, 7500],
  ["jcb", "Mahindra", "EarthMaster SX", 2021, "0.26 m³ bucket", "Yelahanka", 13.1007, 77.5963, 950, null],
  ["excavator", "Tata Hitachi", "EX 200", 2019, "20 ton", "Hebbal", 13.0358, 77.597, 1800, 14000],
  ["excavator", "Komatsu", "PC 210", 2021, "21 ton", "Sarjapur Road", 12.901, 77.687, 2000, 15000],
  ["tipper", "Tata", "Signa 2823.K", 2022, "16 m³ / 25 ton", "Peenya", 13.0285, 77.5197, null, 6500],
  ["tipper", "Ashok Leyland", "2825 Tipper", 2020, "14 m³ / 25 ton", "Hosur Road", 12.9081, 77.6476, null, 6000],
  ["crane", "ACE", "NX 360", 2021, "14 ton pick & carry", "Bommasandra", 12.8166, 77.6936, 2200, 16000],
  ["road-roller", "Case", "1107 EX", 2019, "11 ton vibratory", "Kengeri", 12.9081, 77.4851, 1200, 9000],
];

const rupees = (r: number | null) => (r == null ? null : r * 100);

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameHi: c.nameHi, sortOrder: c.sortOrder },
      create: { ...c, iconUrl: `/categories/${c.slug}.svg` },
    });
  }
  console.log(`✔ ${categories.length} categories`);

  const adminDigits = process.env.ADMIN_PHONE?.replace(/\D/g, "").slice(-10);
  if (adminDigits?.length === 10) {
    const phone = `+91${adminDigits}`;
    await prisma.user.upsert({ where: { phone }, update: { role: "ADMIN" }, create: { phone, name: "Admin", role: "ADMIN" } });
    console.log(`✔ admin user ${phone}`);
  } else {
    console.log("! ADMIN_PHONE not set, no admin user created");
  }

  if (process.env.NODE_ENV === "production") return;

  // ---- Demo data (development only) ----
  const vendorUser = await prisma.user.upsert({
    where: { phone: "+918888888888" },
    update: {},
    create: { phone: "+918888888888", name: "Raju Earthmovers" },
  });
  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Raju Earthmovers",
      address: "Whitefield, Bengaluru",
      idDocType: "PAN",
      idDocKey: "local:demo-id.pdf",
      upiId: "raju@okaxis",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const existing = await prisma.machine.count({ where: { vendorId: vendor.id } });
  if (existing === 0) {
    const cats = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
    for (const [slug, brand, model, year, capacity, area, lat, lng, hour, day] of demoMachines) {
      await prisma.machine.create({
        data: {
          vendorId: vendor.id,
          categoryId: cats[slug]!,
          brand,
          model,
          year,
          capacity,
          area,
          lat,
          lng,
          serviceRadiusKm: 40,
          pricePerHour: rupees(hour),
          pricePerDay: rupees(day),
          minHours: 4,
          transportCharge: slug === "crane" || slug === "excavator" ? 300000 : 0,
          description: `Well-maintained ${brand} ${model} with an experienced operator. Diesel included.`,
          rcDocKey: "local:demo-rc.pdf",
          status: "APPROVED",
          photos: { create: [{ url: `/categories/${slug}.svg`, publicId: `demo:${slug}`, sortOrder: 0 }] },
        },
      });
    }
    console.log(`✔ demo vendor (login 8888888888) with ${demoMachines.length} machines`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
