import { PrismaClient, CheckoutCapability, CostStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const SEED_DATA = {
  user: {
    id: "usr_demo_buyer",
    email: "buyer@procurepilot.demo",
    name: "Demo Buyer",
  },
  merchants: [
    {
      id: "mer_demo_store",
      name: "ProcurePilot Demo Store (sandbox)",
      checkoutCapability: CheckoutCapability.DEMO_PAYPAL,
      enabled: true,
    },
    {
      id: "mer_brightline",
      name: "Brightline Electronics",
      checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
      enabled: true,
    },
    {
      id: "mer_northgate",
      name: "Northgate Direct",
      checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
      enabled: true,
    },
    {
      id: "mer_valuehub",
      name: "ValueHub",
      checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
      enabled: true,
    },
    {
      id: "mer_unverified",
      name: "Unverified Seller",
      checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
      enabled: false,
    },
  ],
  products: [
    {
      canonicalKey: "halden-vector-16",
      title: "Halden Vector 16",
      brand: "Halden",
      category: "Laptop",
      attributes: {
        ramGb: 32,
        ramSlots: 2,
        ramUpgradeable: true,
        storageGb: 1024,
        gpu: "NVIDIA GeForce RTX 4070 (CUDA)",
        gpuDedicated: true,
        cudaSupport: true,
        screenSizeInches: 16,
        thermalsScore: 92,
        batteryLifeHours: 8,
      },
      offers: [
        {
          providerId: "provider_a",
          providerOfferId: "ofr_vector16_brightline",
          merchantId: "mer_brightline",
          merchantName: "Brightline Electronics",
          url: "https://brightline.example/products/halden-vector-16",
          priceMinor: 164900,
          currency: "USD",
          shippingStatus: CostStatus.KNOWN,
          shippingMinor: 0,
          availability: "in_stock",
          checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
          isDemo: true,
          attributes: {
            warrantyMonths: 36,
            returnWindowDays: 30,
            sellerRating: 4.7,
            ratingCount: 1240,
            identityVerified: true,
          },
        },
        {
          providerId: "demo_catalog",
          providerOfferId: "ofr_vector16_demo_store",
          merchantId: "mer_demo_store",
          merchantName: "ProcurePilot Demo Store (sandbox)",
          url: "https://procurepilot.demo/store/halden-vector-16",
          priceMinor: 164900,
          currency: "USD",
          shippingStatus: CostStatus.KNOWN,
          shippingMinor: 0,
          availability: "in_stock",
          checkoutCapability: CheckoutCapability.DEMO_PAYPAL,
          isDemo: true,
          attributes: {
            warrantyMonths: 36,
            returnWindowDays: 30,
            sellerRating: 4.9,
            ratingCount: 50,
            identityVerified: true,
          },
        },
      ],
    },
    {
      canonicalKey: "kestrel-pro-16",
      title: "Kestrel Pro 16",
      brand: "Kestrel",
      category: "Laptop",
      attributes: {
        ramGb: 32,
        ramSlots: 2,
        ramUpgradeable: true,
        storageGb: 1024,
        gpu: "NVIDIA GeForce RTX 4060",
        gpuDedicated: true,
        cudaSupport: true,
        screenSizeInches: 16,
        thermalsScore: 84,
        batteryLifeHours: 9,
      },
      offers: [
        {
          providerId: "demo_catalog",
          providerOfferId: "ofr_kestrel16_northgate",
          merchantId: "mer_northgate",
          merchantName: "Northgate Direct",
          url: "https://northgate.example/kestrel-pro-16",
          priceMinor: 170000,
          currency: "USD",
          shippingStatus: CostStatus.KNOWN,
          shippingMinor: 4200,
          availability: "in_stock",
          checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
          isDemo: true,
          attributes: {
            warrantyMonths: 24,
            returnWindowDays: 30,
            sellerRating: 4.6,
            ratingCount: 890,
            identityVerified: true,
          },
        },
      ],
    },
    {
      canonicalKey: "orbis-atlas-15",
      title: "Orbis Atlas 15",
      brand: "Orbis",
      category: "Laptop",
      attributes: {
        ramGb: 16,
        ramSlots: 2,
        ramUpgradeable: true,
        storageGb: 512,
        gpu: "NVIDIA GeForce RTX 4050",
        gpuDedicated: true,
        cudaSupport: true,
        screenSizeInches: 15.6,
        thermalsScore: 78,
        batteryLifeHours: 7,
      },
      offers: [
        {
          providerId: "provider_a",
          providerOfferId: "ofr_atlas15_valuehub",
          merchantId: "mer_valuehub",
          merchantName: "ValueHub",
          url: "https://valuehub.example/orbis-atlas-15",
          priceMinor: 147900,
          currency: "USD",
          shippingStatus: CostStatus.UNKNOWN,
          shippingMinor: null,
          availability: "in_stock",
          checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
          isDemo: true,
          attributes: {
            warrantyMonths: null, // UNVERIFIED constraint
            returnWindowDays: 14,
            sellerRating: 4.1,
            ratingCount: 310,
            identityVerified: true,
          },
        },
      ],
    },
    {
      canonicalKey: "halden-vector-16-max",
      title: "Halden Vector 16 Max",
      brand: "Halden",
      category: "Laptop",
      attributes: {
        ramGb: 64,
        ramSlots: 2,
        ramUpgradeable: true,
        storageGb: 2048,
        gpu: "NVIDIA GeForce RTX 4080 (CUDA)",
        gpuDedicated: true,
        cudaSupport: true,
        screenSizeInches: 16,
        thermalsScore: 94,
      },
      offers: [
        {
          providerId: "demo_catalog",
          providerOfferId: "ofr_vector16max_brightline",
          merchantId: "mer_brightline",
          merchantName: "Brightline Electronics",
          url: "https://brightline.example/products/halden-vector-16-max",
          priceMinor: 214900, // OVER BUDGET (> $1,800)
          currency: "USD",
          shippingStatus: CostStatus.KNOWN,
          shippingMinor: 0,
          availability: "in_stock",
          checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
          isDemo: true,
          attributes: {
            warrantyMonths: 36,
            returnWindowDays: 30,
          },
        },
      ],
    },
    {
      canonicalKey: "lumen-aero-16",
      title: "Lumen Aero 16",
      brand: "Lumen",
      category: "Laptop",
      attributes: {
        ramGb: 32,
        storageGb: 1024,
        gpu: "NVIDIA GeForce RTX 4060",
      },
      offers: [
        {
          providerId: "provider_b",
          providerOfferId: "ofr_lumen16_anomaly",
          merchantId: "mer_unverified",
          merchantName: "Unknown Merchant 9482",
          url: "https://shady-bargains.example/lumen-aero-16",
          priceMinor: 89900, // 45% below comparable median (TR-02 anomaly)
          currency: "USD",
          shippingStatus: CostStatus.UNKNOWN,
          shippingMinor: null,
          availability: "in_stock",
          checkoutCapability: CheckoutCapability.HANDOFF_ONLY,
          isDemo: true,
          attributes: {
            identityVerified: false, // TR-01
            warrantyMonths: null,
            sellerRating: 2.1,
            ratingCount: 3,
          },
        },
      ],
    },
  ],
};

export async function seed() {
  console.log("Seeding ProcurePilot database...");

  // Seed demo user
  const user = await prisma.user.upsert({
    where: { id: SEED_DATA.user.id },
    update: {},
    create: SEED_DATA.user,
  });
  console.log(`✓ Seeded user: ${user.name} (${user.email})`);

  // Seed merchants
  for (const m of SEED_DATA.merchants) {
    await prisma.merchant.upsert({
      where: { id: m.id },
      update: m,
      create: m,
    });
  }
  console.log(`✓ Seeded ${SEED_DATA.merchants.length} merchants`);

  // Seed products & offers
  for (const p of SEED_DATA.products) {
    const product = await prisma.product.upsert({
      where: { canonicalKey: p.canonicalKey },
      update: {
        title: p.title,
        brand: p.brand,
        category: p.category,
        attributes: p.attributes,
      },
      create: {
        canonicalKey: p.canonicalKey,
        title: p.title,
        brand: p.brand,
        category: p.category,
        attributes: p.attributes,
      },
    });

    for (const off of p.offers) {
      const createdOffer = await prisma.offer.upsert({
        where: {
          providerId_providerOfferId: {
            providerId: off.providerId,
            providerOfferId: off.providerOfferId,
          },
        },
        update: {
          priceMinor: off.priceMinor,
          currency: off.currency,
          shippingStatus: off.shippingStatus,
          shippingMinor: off.shippingMinor,
          availability: off.availability,
          checkoutCapability: off.checkoutCapability,
          merchantName: off.merchantName,
          merchantId: off.merchantId,
          url: off.url,
          sourceObservedAt: new Date(),
        },
        create: {
          productId: product.id,
          providerId: off.providerId,
          providerOfferId: off.providerOfferId,
          merchantId: off.merchantId,
          merchantName: off.merchantName,
          url: off.url,
          priceMinor: off.priceMinor,
          currency: off.currency,
          shippingStatus: off.shippingStatus,
          shippingMinor: off.shippingMinor,
          availability: off.availability,
          checkoutCapability: off.checkoutCapability,
          sourceObservedAt: new Date(),
          isDemo: off.isDemo,
        },
      });

      // Seed 14 historical snapshots for Halden Vector 16 (matching Screenshot 2: LOW $1,629, NOW $1,649, HIGH $1,719)
      if (off.providerOfferId === "ofr_vector16_brightline") {
        const historicalPrices = [
          { dayOffset: 29, priceMinor: 171900 },
          { dayOffset: 27, priceMinor: 171000 },
          { dayOffset: 25, priceMinor: 169900 },
          { dayOffset: 22, priceMinor: 168900 },
          { dayOffset: 19, priceMinor: 167900 },
          { dayOffset: 16, priceMinor: 168500 },
          { dayOffset: 14, priceMinor: 167900 },
          { dayOffset: 12, priceMinor: 166900 },
          { dayOffset: 10, priceMinor: 165900 },
          { dayOffset: 8, priceMinor: 164900 },
          { dayOffset: 6, priceMinor: 163900 },
          { dayOffset: 4, priceMinor: 162900 }, // LOW: $1,629
          { dayOffset: 2, priceMinor: 163900 },
          { dayOffset: 0, priceMinor: 164900 }, // NOW: $1,649
        ];

        for (const snap of historicalPrices) {
          const obsTime = new Date(Date.now() - snap.dayOffset * 24 * 3600 * 1000);
          await prisma.priceSnapshot.create({
            data: {
              offerId: createdOffer.id,
              amountMinor: snap.priceMinor,
              currency: "USD",
              availability: "in_stock",
              sourceObservedAt: obsTime,
              source: "provider_a",
            },
          });
        }
      }
    }
  }

  console.log(`✓ Seeded products and offers matching UI specification`);
}

if (process.env.NODE_ENV !== "test") {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

