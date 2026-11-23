import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@aioutreachpro.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Outreach2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Admin user created: ${admin.email}`);

  // 2. Default System Settings
  const defaultSettings = [
    { key: 'DRY_RUN', value: 'true' },
    { key: 'AUTO_APPROVE', value: 'false' },
    { key: 'AUTO_SEND', value: 'false' },
    { key: 'WHATSAPP_SEND_ENABLED', value: 'false' },
    { key: 'PAID_SERVICES_ENABLED', value: 'false' },
    { key: 'DAILY_EMAIL_LIMIT', value: '10' },
    { key: 'DAILY_WHATSAPP_LIMIT', value: '10' },
    { key: 'AI_PROVIDER', value: 'OPENROUTER' },
    { key: 'OPENROUTER_MODEL', value: 'openrouter/free' },
    { key: 'OLLAMA_MODEL', value: 'llama3:latest' },
    { key: 'OLLAMA_BASE_URL', value: 'http://localhost:11434' },
    { key: 'TIMEZONE', value: 'Asia/Kolkata' },
    { key: 'BUSINESS_HOURS_START', value: '09:00' },
    { key: 'BUSINESS_HOURS_END', value: '18:00' },
    { key: 'FOLLOWUP_DAY_STEP_1', value: '4' },
    { key: 'FOLLOWUP_DAY_STEP_2', value: '9' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('System settings seeded.');

  // 3. Seed Sample Leads with realistic business scenarios for Web & Android services
  const sampleLeads = [
    {
      leadId: 'LEAD-1001',
      companyName: 'Apex Dental Care',
      contactName: 'Dr. Michael Chen',
      businessType: 'Healthcare / Dental Clinic',
      email: 'contact@apexdentaldemo.com',
      phone: '+14155552671',
      website: 'http://apexdentalclinic.demo',
      location: 'San Francisco, CA',
      existingWebsiteStatus: 'Outdated & Not Mobile Friendly',
      serviceInterest: 'Website development',
      emailPermission: true,
      whatsappOptIn: false,
      consentSource: 'Inquiry Form 2026',
      consentTimestamp: new Date('2026-10-15T10:00:00Z'),
      notes: 'Requested consultation on mobile responsiveness for appointment bookings.',
      status: 'NEW',
    },
    {
      leadId: 'LEAD-1002',
      companyName: 'Veloce Logistics & Fleet',
      contactName: 'Sarah Jenkins',
      businessType: 'Transportation & Logistics',
      email: 'sjenkins@velocelogisticsdemo.com',
      phone: '+13125559812',
      website: 'https://velocelogisticsdemo.com',
      location: 'Chicago, IL',
      existingWebsiteStatus: 'Modern Web, No Mobile App',
      serviceInterest: 'Android application development',
      emailPermission: true,
      whatsappOptIn: true,
      consentSource: 'Partner Referral Form',
      consentTimestamp: new Date('2026-10-20T14:30:00Z'),
      notes: 'Interested in dedicated Android driver tablet dispatch application.',
      status: 'NEW',
    },
    {
      leadId: 'LEAD-1003',
      companyName: 'Artisan Bloom Botanicals',
      contactName: 'Elena Rostova',
      businessType: 'Retail & Floristry',
      email: 'elena@artisanbloomdemo.com',
      phone: '+12125554321',
      website: 'http://artisanbloom.demo',
      location: 'New York, NY',
      existingWebsiteStatus: 'Broken Checkout / Slow',
      serviceInterest: 'E-commerce website development',
      emailPermission: true,
      whatsappOptIn: false,
      consentSource: 'E-Commerce Survey Opt-in',
      consentTimestamp: new Date('2026-11-01T09:15:00Z'),
      notes: 'Current WooCommerce site is suffering 8s load times and cart abandonment.',
      status: 'NEW',
    },
    {
      leadId: 'LEAD-1004',
      companyName: 'Metro Fitness Hub',
      contactName: 'Marcus Brody',
      businessType: 'Health & Fitness',
      email: 'marcus@metrofitnessdemo.com',
      phone: '+15125557766',
      website: null,
      location: 'Austin, TX',
      existingWebsiteStatus: 'No Existing Website',
      serviceInterest: 'Website development',
      emailPermission: false, // Strict test: no consent
      whatsappOptIn: false,
      consentSource: null,
      consentTimestamp: null,
      notes: 'New branch opening, requires initial web presence. Awaiting explicit opt-in.',
      status: 'NEW',
    },
    {
      leadId: 'LEAD-1005',
      companyName: 'Horizon Legal Advisory',
      contactName: 'Clara Vance',
      businessType: 'Legal Services',
      email: 'clara@horizonlegaladvisorydemo.com',
      phone: '+12065553189',
      website: 'https://horizonlegal.demo',
      location: 'Seattle, WA',
      existingWebsiteStatus: 'Outdated 2018 Design',
      serviceInterest: 'Business website redesign',
      emailPermission: true,
      whatsappOptIn: true,
      consentSource: 'Webinar Attendee Agreement',
      consentTimestamp: new Date('2026-11-05T16:00:00Z'),
      notes: 'Needs client portal integration and professional modern re-branding.',
      status: 'NEW',
    },
  ];

  for (const lead of sampleLeads) {
    const createdLead = await prisma.lead.upsert({
      where: { email: lead.email },
      update: {},
      create: lead,
    });

    if (lead.emailPermission) {
      await prisma.consentRecord.create({
        data: {
          leadId: createdLead.id,
          channel: 'EMAIL',
          consentGiven: true,
          consentSource: lead.consentSource,
          timestamp: lead.consentTimestamp || new Date(),
        },
      });
    }

    if (lead.whatsappOptIn) {
      await prisma.consentRecord.create({
        data: {
          leadId: createdLead.id,
          channel: 'WHATSAPP',
          consentGiven: true,
          consentSource: lead.consentSource,
          timestamp: lead.consentTimestamp || new Date(),
        },
      });
    }
  }
  console.log(`Seeded ${sampleLeads.length} sample leads with consent records.`);

  // 4. Sample Campaign
  const sampleCampaign = await prisma.campaign.upsert({
    where: { id: 'camp-q4-web-refresh' },
    update: {},
    create: {
      id: 'camp-q4-web-refresh',
      name: 'Q4 High-Conversion Agency Outreach',
      targetAudience: 'Local Professional Services & E-Commerce Businesses',
      serviceOffered: 'Business website redesign',
      communicationChannel: 'EMAIL',
      status: 'ACTIVE',
      dailySendingCap: 10,
      approvalMode: 'MANUAL',
      followUpPolicy: JSON.stringify({
        steps: [
          { step: 1, delayDays: 4, name: 'First Value Follow-up' },
          { step: 2, delayDays: 9, name: 'Final Courtesy Check-in' },
        ],
      }),
    },
  });
  console.log(`Sample campaign created: ${sampleCampaign.name}`);

  console.log('Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
