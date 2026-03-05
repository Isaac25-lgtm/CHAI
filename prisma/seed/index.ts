// @ts-nocheck
/**
 * CHAI PMTCT System - Database Seed Script
 *
 * Seeds the database with realistic Uganda-specific data for development
 * and testing. Designed to be idempotent (safe to run multiple times).
 */

import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { hashSync } from 'bcryptjs';
import { ASSESSMENT_SECTION_DEFS } from '../../src/config/assessment-sections';

// Connect to PostgreSQL
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const pool = new pg.Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new (PrismaClient as any)({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hash(password: string): string {
  return hashSync(password, 10);
}

/** Generate a date N days ago from today */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a visit number like VIS-2026-000001 */
function visitNumber(index: number): string {
  return `VIS-2026-${String(index).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding CHAI PMTCT database...\n');

  // =========================================================================
  // A. REGIONS
  // =========================================================================
  console.log('  Creating regions...');

  const regionData = [
    { name: 'Central', code: 'CEN' },
    { name: 'Eastern', code: 'EST' },
    { name: 'Northern', code: 'NTH' },
    { name: 'Western', code: 'WST' },
  ];

  const regions: Record<string, string> = {};
  for (const r of regionData) {
    const region = await prisma.region.upsert({
      where: { name: r.name },
      update: {},
      create: { name: r.name, code: r.code },
    });
    regions[r.name] = region.id;
  }

  // =========================================================================
  // B. DISTRICTS
  // =========================================================================
  console.log('  Creating districts...');

  const districtData = [
    { name: 'Kampala', code: 'KLA', region: 'Central' },
    { name: 'Wakiso', code: 'WKS', region: 'Central' },
    { name: 'Mukono', code: 'MKN', region: 'Central' },
    { name: 'Jinja', code: 'JJA', region: 'Eastern' },
    { name: 'Mbale', code: 'MBL', region: 'Eastern' },
    { name: 'Soroti', code: 'SRT', region: 'Eastern' },
    { name: 'Gulu', code: 'GLU', region: 'Northern' },
    { name: 'Lira', code: 'LRA', region: 'Northern' },
    { name: 'Arua', code: 'ARU', region: 'Northern' },
    { name: 'Mbarara', code: 'MBR', region: 'Western' },
    { name: 'Kabarole', code: 'KBR', region: 'Western' },
    { name: 'Kabale', code: 'KBL', region: 'Western' },
  ];

  const districts: Record<string, string> = {};
  for (const d of districtData) {
    const district = await prisma.district.upsert({
      where: { name_regionId: { name: d.name, regionId: regions[d.region] } },
      update: {},
      create: { name: d.name, code: d.code, regionId: regions[d.region] },
    });
    districts[d.name] = district.id;
  }

  // =========================================================================
  // C. FACILITIES
  // =========================================================================
  console.log('  Creating facilities...');

  const facilityData: Array<{
    name: string;
    code: string;
    level: 'HC_II' | 'HC_III' | 'HC_IV' | 'GENERAL_HOSPITAL' | 'REGIONAL_REFERRAL' | 'NATIONAL_REFERRAL';
    ownership: 'GOVERNMENT' | 'PNFP' | 'PRIVATE';
    district: string;
    subcounty?: string;
    inChargeName: string;
    inChargePhone: string;
  }> = [
    // Kampala
    { name: 'Mulago National Referral Hospital', code: 'FAC-KLA-001', level: 'NATIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Kampala', subcounty: 'Kawempe Division', inChargeName: 'Dr. Sarah Nabukera', inChargePhone: '+256701234501' },
    { name: 'Kawempe HC IV', code: 'FAC-KLA-002', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Kampala', subcounty: 'Kawempe Division', inChargeName: 'Dr. James Okello', inChargePhone: '+256701234502' },
    { name: 'Kisenyi HC IV', code: 'FAC-KLA-003', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Kampala', subcounty: 'Central Division', inChargeName: 'Dr. Grace Namulondo', inChargePhone: '+256701234503' },
    { name: 'Nakasero HC III', code: 'FAC-KLA-004', level: 'HC_III', ownership: 'PRIVATE', district: 'Kampala', subcounty: 'Central Division', inChargeName: 'Sr. Agnes Birungi', inChargePhone: '+256701234504' },

    // Wakiso
    { name: 'Entebbe Regional Referral Hospital', code: 'FAC-WKS-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Wakiso', subcounty: 'Entebbe Municipality', inChargeName: 'Dr. Moses Ssentongo', inChargePhone: '+256701234505' },
    { name: 'Wakiso HC IV', code: 'FAC-WKS-002', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Wakiso', subcounty: 'Wakiso Town Council', inChargeName: 'Dr. Judith Namutebi', inChargePhone: '+256701234506' },
    { name: 'Nansana HC III', code: 'FAC-WKS-003', level: 'HC_III', ownership: 'GOVERNMENT', district: 'Wakiso', subcounty: 'Nansana Municipality', inChargeName: 'Mr. Peter Ssemakula', inChargePhone: '+256701234507' },

    // Mukono
    { name: 'Mukono General Hospital', code: 'FAC-MKN-001', level: 'GENERAL_HOSPITAL', ownership: 'GOVERNMENT', district: 'Mukono', subcounty: 'Mukono Municipality', inChargeName: 'Dr. Florence Nankya', inChargePhone: '+256701234508' },
    { name: 'Mukono HC III', code: 'FAC-MKN-002', level: 'HC_III', ownership: 'PNFP', district: 'Mukono', subcounty: 'Mukono Municipality', inChargeName: 'Sr. Robinah Babirye', inChargePhone: '+256701234509' },

    // Jinja
    { name: 'Jinja Regional Referral Hospital', code: 'FAC-JJA-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Jinja', subcounty: 'Jinja Central Division', inChargeName: 'Dr. Henry Wamala', inChargePhone: '+256701234510' },
    { name: 'Walukuba HC IV', code: 'FAC-JJA-002', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Jinja', subcounty: 'Walukuba Division', inChargeName: 'Mr. David Iganga', inChargePhone: '+256701234511' },
    { name: 'Bugembe HC III', code: 'FAC-JJA-003', level: 'HC_III', ownership: 'PNFP', district: 'Jinja', subcounty: 'Bugembe Town Council', inChargeName: 'Sr. Mary Namugwanya', inChargePhone: '+256701234512' },

    // Mbale
    { name: 'Mbale Regional Referral Hospital', code: 'FAC-MBL-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Mbale', subcounty: 'Industrial Division', inChargeName: 'Dr. Emmanuel Wekesa', inChargePhone: '+256701234513' },
    { name: 'Namatala HC III', code: 'FAC-MBL-002', level: 'HC_III', ownership: 'GOVERNMENT', district: 'Mbale', subcounty: 'Northern Division', inChargeName: 'Ms. Catherine Nafuna', inChargePhone: '+256701234514' },

    // Soroti
    { name: 'Soroti Regional Referral Hospital', code: 'FAC-SRT-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Soroti', subcounty: 'Soroti Municipality', inChargeName: 'Dr. Patrick Emukol', inChargePhone: '+256701234515' },
    { name: 'Arapai HC III', code: 'FAC-SRT-002', level: 'HC_III', ownership: 'GOVERNMENT', district: 'Soroti', subcounty: 'Soroti East', inChargeName: 'Mr. Joseph Opolot', inChargePhone: '+256701234516' },

    // Gulu
    { name: 'Gulu Regional Referral Hospital', code: 'FAC-GLU-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Gulu', subcounty: 'Gulu Municipality', inChargeName: 'Dr. Richard Odong', inChargePhone: '+256701234517' },
    { name: 'Lacor Hospital', code: 'FAC-GLU-002', level: 'GENERAL_HOSPITAL', ownership: 'PNFP', district: 'Gulu', subcounty: 'Gulu Municipality', inChargeName: 'Dr. Beatrice Lamwaka', inChargePhone: '+256701234518' },
    { name: 'Awach HC IV', code: 'FAC-GLU-003', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Gulu', subcounty: 'Awach', inChargeName: 'Mr. Santo Okot', inChargePhone: '+256701234519' },

    // Lira
    { name: 'Lira Regional Referral Hospital', code: 'FAC-LRA-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Lira', subcounty: 'Lira Municipality', inChargeName: 'Dr. Christine Amuge', inChargePhone: '+256701234520' },
    { name: 'Ogur HC IV', code: 'FAC-LRA-002', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Lira', subcounty: 'Ogur', inChargeName: 'Mr. Francis Odongo', inChargePhone: '+256701234521' },

    // Arua
    { name: 'Arua Regional Referral Hospital', code: 'FAC-ARU-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Arua', subcounty: 'Arua Municipality', inChargeName: 'Dr. Samuel Adriko', inChargePhone: '+256701234522' },
    { name: 'Kuluva Hospital', code: 'FAC-ARU-002', level: 'GENERAL_HOSPITAL', ownership: 'PNFP', district: 'Arua', subcounty: 'Arua Municipality', inChargeName: 'Dr. Janet Chandiru', inChargePhone: '+256701234523' },
    { name: 'Oli HC II', code: 'FAC-ARU-003', level: 'HC_II', ownership: 'GOVERNMENT', district: 'Arua', subcounty: 'Oli', inChargeName: 'Mr. Patrick Anguyo', inChargePhone: '+256701234524' },

    // Mbarara
    { name: 'Mbarara Regional Referral Hospital', code: 'FAC-MBR-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Mbarara', subcounty: 'Mbarara Municipality', inChargeName: 'Dr. Stellah Kyarisiima', inChargePhone: '+256701234525' },
    { name: 'Mbarara MC HC IV', code: 'FAC-MBR-002', level: 'HC_IV', ownership: 'GOVERNMENT', district: 'Mbarara', subcounty: 'Kakoba Division', inChargeName: 'Dr. Denis Turyamureeba', inChargePhone: '+256701234526' },
    { name: 'Ruharo Mission Hospital', code: 'FAC-MBR-003', level: 'GENERAL_HOSPITAL', ownership: 'PNFP', district: 'Mbarara', subcounty: 'Kamukuzi Division', inChargeName: 'Sr. Immaculate Atuhaire', inChargePhone: '+256701234527' },

    // Kabarole (Fort Portal)
    { name: 'Fort Portal Regional Referral Hospital', code: 'FAC-KBR-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Kabarole', subcounty: 'Fort Portal Municipality', inChargeName: 'Dr. Mable Kabahenda', inChargePhone: '+256701234528' },
    { name: 'Virika Hospital', code: 'FAC-KBR-002', level: 'GENERAL_HOSPITAL', ownership: 'PNFP', district: 'Kabarole', subcounty: 'Fort Portal Municipality', inChargeName: 'Dr. Charles Baluku', inChargePhone: '+256701234529' },

    // Kabale
    { name: 'Kabale Regional Referral Hospital', code: 'FAC-KBL-001', level: 'REGIONAL_REFERRAL', ownership: 'GOVERNMENT', district: 'Kabale', subcounty: 'Kabale Municipality', inChargeName: 'Dr. Patience Tumwebaze', inChargePhone: '+256701234530' },
    { name: 'Rugarama HC III', code: 'FAC-KBL-002', level: 'HC_III', ownership: 'GOVERNMENT', district: 'Kabale', subcounty: 'Kabale Municipality', inChargeName: 'Mr. Benon Twesigye', inChargePhone: '+256701234531' },
  ];

  const facilities: Record<string, string> = {};
  for (const f of facilityData) {
    const facility = await prisma.facility.upsert({
      where: { code: f.code },
      update: {},
      create: {
        name: f.name,
        code: f.code,
        level: f.level,
        ownership: f.ownership,
        districtId: districts[f.district],
        subcounty: f.subcounty,
        inChargeName: f.inChargeName,
        inChargePhone: f.inChargePhone,
        isActive: true,
      },
    });
    facilities[f.code] = facility.id;
  }

  // =========================================================================
  // D. USERS
  // =========================================================================
  console.log('  Creating users...');

  const defaultPassword = hash('ChaiUser2026!');
  const adminPassword = hash('ChaiAdmin2026!');

  const userData: Array<{
    email: string;
    name: string;
    passwordHash: string;
    role: 'SUPER_ADMIN' | 'FIELD_ASSESSOR';
    phone?: string;
    title?: string;
    organization?: string;
    districtName?: string;
    regionName?: string;
  }> = [
    // Super Admin — full system access
    { email: 'admin@chai.org', name: 'Dr. Robert Ssekitoleko', passwordHash: adminPassword, role: 'SUPER_ADMIN', phone: '+256700100001', title: 'System Administrator', organization: 'CHAI Uganda' },

    // Field Assessor — visits facilities, conducts assessments, enters mobile money details
    { email: 'assessor@chai.org', name: 'Ms. Dorothy Nakamya', passwordHash: defaultPassword, role: 'FIELD_ASSESSOR', phone: '+256700100008', title: 'PMTCT Mentor', organization: 'CHAI Uganda', districtName: 'Kampala', regionName: 'Central' },
  ];

  const users: Record<string, string> = {};
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        phone: u.phone,
        title: u.title,
        organization: u.organization,
        districtId: u.districtName ? districts[u.districtName] : undefined,
        regionId: u.regionName ? regions[u.regionName] : undefined,
        status: 'ACTIVE',
      },
    });
    users[u.email] = user.id;
  }

  // =========================================================================
  // E. ASSESSMENT SECTIONS & QUESTIONS
  // =========================================================================
  console.log('  Creating assessment sections & questions...');

  const sectionIds: Record<number, string> = {};
  const questionIds: Record<string, string> = {};

  for (const sectionDef of ASSESSMENT_SECTION_DEFS) {
    const section = await prisma.assessmentSection.upsert({
      where: { sectionNumber: sectionDef.number },
      update: {},
      create: {
        sectionNumber: sectionDef.number,
        title: sectionDef.title,
        description: sectionDef.description,
        scoringParadigm: sectionDef.scoringParadigm,
        isScored: sectionDef.isScored,
        sortOrder: sectionDef.number,
        isActive: true,
      },
    });
    sectionIds[sectionDef.number] = section.id;

    for (const q of sectionDef.questions) {
      const question = await prisma.assessmentQuestion.upsert({
        where: { questionCode: q.code },
        update: {},
        create: {
          sectionId: section.id,
          questionCode: q.code,
          questionText: q.text,
          helpText: q.helpText ?? null,
          responseType: q.responseType,
          isRequired: q.required,
          requiresEvidence: q.requiresEvidence,
          options: q.options ? JSON.stringify(q.options) : null,
          branchCondition: q.branchCondition ? JSON.stringify(q.branchCondition) : null,
          scoringWeight: q.scoringWeight ?? null,
          sortOrder: q.sortOrder,
          isActive: true,
        },
      });
      questionIds[q.code] = question.id;
    }
  }

  // =========================================================================
  // F. VISITS
  // =========================================================================
  console.log('  Creating visits...');

  const facilityCodes = Object.keys(facilities);
  const assessorEmails = userData.filter((u) => u.role === 'FIELD_ASSESSOR').map((u) => u.email);

  const visitData: Array<{
    visitNumber: string;
    facilityCode: string;
    status: 'DRAFT' | 'SUBMITTED';
    daysAgo: number;
    creatorEmail: string;
    activityName: string;
    participants: Array<{
      fullName: string;
      role: string;
      cadre: string;
      teamType: 'CENTRAL' | 'DISTRICT' | 'FACILITY' | 'PARTNER';
      organization: string;
      phone: string;
    }>;
  }> = [
    {
      visitNumber: visitNumber(1),
      facilityCode: 'FAC-KLA-001',
      status: 'SUBMITTED',
      daysAgo: 5,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 1',
      participants: [
        { fullName: 'Ms. Dorothy Nakamya', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100008' },
        { fullName: 'Dr. Sarah Nabukera', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Mulago NRH', phone: '+256701234501' },
        { fullName: 'Sr. Rose Achieng', role: 'ANC Nurse', cadre: 'Enrolled Nurse', teamType: 'FACILITY', organization: 'Mulago NRH', phone: '+256772123401' },
        { fullName: 'Ms. Scovia Nambooze', role: 'Lab Technician', cadre: 'Lab Tech', teamType: 'FACILITY', organization: 'Mulago NRH', phone: '+256772123402' },
        { fullName: 'Mr. Robert Mukasa', role: 'Data Officer', cadre: 'Records Officer', teamType: 'FACILITY', organization: 'Mulago NRH', phone: '+256772123403' },
      ],
    },
    {
      visitNumber: visitNumber(2),
      facilityCode: 'FAC-KLA-002',
      status: 'SUBMITTED',
      daysAgo: 12,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 1',
      participants: [
        { fullName: 'Ms. Dorothy Nakamya', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100008' },
        { fullName: 'Dr. James Okello', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Kawempe HC IV', phone: '+256701234502' },
        { fullName: 'Sr. Mariam Babirye', role: 'Midwife', cadre: 'Enrolled Midwife', teamType: 'FACILITY', organization: 'Kawempe HC IV', phone: '+256772123404' },
      ],
    },
    {
      visitNumber: visitNumber(3),
      facilityCode: 'FAC-JJA-001',
      status: 'SUBMITTED',
      daysAgo: 20,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 2',
      participants: [
        { fullName: 'Sr. Harriet Nabiryo', role: 'Lead Mentor', cadre: 'Midwife', teamType: 'CENTRAL', organization: 'IDI', phone: '+256700100010' },
        { fullName: 'Dr. Henry Wamala', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Jinja RRH', phone: '+256701234510' },
        { fullName: 'Mr. Wilson Wanyama', role: 'PMTCT Focal Person', cadre: 'Clinical Officer', teamType: 'FACILITY', organization: 'Jinja RRH', phone: '+256772123405' },
        { fullName: 'Ms. Gladys Nalubega', role: 'Expert Client', cadre: 'Community Worker', teamType: 'FACILITY', organization: 'Jinja RRH', phone: '+256772123406' },
        { fullName: 'Mr. Paul Walusimbi', role: 'Lab Technician', cadre: 'Lab Tech', teamType: 'FACILITY', organization: 'Jinja RRH', phone: '+256772123407' },
        { fullName: 'Ms. Grace Khainza', role: 'Records Officer', cadre: 'Records Officer', teamType: 'FACILITY', organization: 'Jinja RRH', phone: '+256772123408' },
      ],
    },
    {
      visitNumber: visitNumber(4),
      facilityCode: 'FAC-GLU-001',
      status: 'SUBMITTED',
      daysAgo: 30,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Supportive Supervision',
      participants: [
        { fullName: 'Ms. Irene Acen', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'TASO', phone: '+256700100012' },
        { fullName: 'Dr. Richard Odong', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Gulu RRH', phone: '+256701234517' },
        { fullName: 'Sr. Jennifer Lamunu', role: 'Maternity Nurse', cadre: 'Registered Nurse', teamType: 'FACILITY', organization: 'Gulu RRH', phone: '+256772123409' },
        { fullName: 'Mr. Denis Komakech', role: 'Pharmacist', cadre: 'Pharmacist', teamType: 'FACILITY', organization: 'Gulu RRH', phone: '+256772123410' },
      ],
    },
    {
      visitNumber: visitNumber(5),
      facilityCode: 'FAC-MBR-001',
      status: 'SUBMITTED',
      daysAgo: 40,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 1',
      participants: [
        { fullName: 'Ms. Justine Ainebyona', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100014' },
        { fullName: 'Dr. Stellah Kyarisiima', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Mbarara RRH', phone: '+256701234525' },
        { fullName: 'Sr. Beatrice Ainomugisha', role: 'ANC In-Charge', cadre: 'Enrolled Midwife', teamType: 'FACILITY', organization: 'Mbarara RRH', phone: '+256772123411' },
        { fullName: 'Mr. Jonathan Nuwagaba', role: 'Lab In-Charge', cadre: 'Lab Tech', teamType: 'FACILITY', organization: 'Mbarara RRH', phone: '+256772123412' },
        { fullName: 'Ms. Phionah Twesigomwe', role: 'PMTCT Focal Person', cadre: 'Clinical Officer', teamType: 'FACILITY', organization: 'Mbarara RRH', phone: '+256772123413' },
        { fullName: 'Mr. Alex Tumusiime', role: 'District PMTCT FP', cadre: 'Clinical Officer', teamType: 'DISTRICT', organization: 'Mbarara DLG', phone: '+256772123414' },
        { fullName: 'Ms. Winnie Karungi', role: 'Expert Client', cadre: 'Community Worker', teamType: 'FACILITY', organization: 'Mbarara RRH', phone: '+256772123415' },
        { fullName: 'Mr. Herbert Byamukama', role: 'Records Officer', cadre: 'Records Officer', teamType: 'FACILITY', organization: 'Mbarara RRH', phone: '+256772123416' },
      ],
    },
    {
      visitNumber: visitNumber(6),
      facilityCode: 'FAC-MBR-002',
      status: 'SUBMITTED',
      daysAgo: 45,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 1',
      participants: [
        { fullName: 'Ms. Justine Ainebyona', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100014' },
        { fullName: 'Dr. Denis Turyamureeba', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Mbarara MC HC IV', phone: '+256701234526' },
        { fullName: 'Sr. Esther Kemigisha', role: 'Midwife', cadre: 'Enrolled Midwife', teamType: 'FACILITY', organization: 'Mbarara MC HC IV', phone: '+256772123417' },
      ],
    },
    {
      visitNumber: visitNumber(7),
      facilityCode: 'FAC-LRA-001',
      status: 'DRAFT',
      daysAgo: 3,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 2',
      participants: [
        { fullName: 'Mr. George Otim', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100013' },
        { fullName: 'Dr. Christine Amuge', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Lira RRH', phone: '+256701234520' },
        { fullName: 'Sr. Florence Apio', role: 'ANC Nurse', cadre: 'Registered Nurse', teamType: 'FACILITY', organization: 'Lira RRH', phone: '+256772123418' },
        { fullName: 'Mr. Charles Omara', role: 'Lab Tech', cadre: 'Lab Tech', teamType: 'FACILITY', organization: 'Lira RRH', phone: '+256772123419' },
      ],
    },
    {
      visitNumber: visitNumber(8),
      facilityCode: 'FAC-KBL-001',
      status: 'DRAFT',
      daysAgo: 2,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Supportive Supervision',
      participants: [
        { fullName: 'Sr. Prossy Tumuhairwe', role: 'Lead Mentor', cadre: 'Midwife', teamType: 'CENTRAL', organization: 'Baylor Uganda', phone: '+256700100015' },
        { fullName: 'Dr. Patience Tumwebaze', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Kabale RRH', phone: '+256701234530' },
        { fullName: 'Mr. Amos Ahimbisibwe', role: 'PMTCT FP', cadre: 'Clinical Officer', teamType: 'FACILITY', organization: 'Kabale RRH', phone: '+256772123420' },
        { fullName: 'Sr. Olivia Nyamwiza', role: 'Maternity In-Charge', cadre: 'Registered Midwife', teamType: 'FACILITY', organization: 'Kabale RRH', phone: '+256772123421' },
        { fullName: 'Ms. Diana Tukamushaba', role: 'Expert Client', cadre: 'Community Worker', teamType: 'FACILITY', organization: 'Kabale RRH', phone: '+256772123422' },
      ],
    },
    {
      visitNumber: visitNumber(9),
      facilityCode: 'FAC-WKS-001',
      status: 'DRAFT',
      daysAgo: 1,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 3',
      participants: [
        { fullName: 'Mr. Simon Kiggundu', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100009' },
        { fullName: 'Dr. Moses Ssentongo', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Entebbe RRH', phone: '+256701234505' },
        { fullName: 'Sr. Naomi Nalubowa', role: 'ANC In-Charge', cadre: 'Enrolled Midwife', teamType: 'FACILITY', organization: 'Entebbe RRH', phone: '+256772123423' },
      ],
    },
    {
      visitNumber: visitNumber(10),
      facilityCode: 'FAC-MBL-001',
      status: 'DRAFT',
      daysAgo: 7,
      creatorEmail: 'assessor@chai.org',
      activityName: 'PMTCT Mentorship Cycle 2',
      participants: [
        { fullName: 'Mr. Tom Wambi', role: 'Lead Mentor', cadre: 'Clinical Officer', teamType: 'CENTRAL', organization: 'CHAI Uganda', phone: '+256700100011' },
        { fullName: 'Dr. Emmanuel Wekesa', role: 'Facility In-Charge', cadre: 'Medical Officer', teamType: 'FACILITY', organization: 'Mbale RRH', phone: '+256701234513' },
        { fullName: 'Sr. Agnes Wanyenze', role: 'PMTCT FP', cadre: 'Enrolled Midwife', teamType: 'FACILITY', organization: 'Mbale RRH', phone: '+256772123424' },
        { fullName: 'Mr. Isaac Wandera', role: 'Records Officer', cadre: 'Records Officer', teamType: 'FACILITY', organization: 'Mbale RRH', phone: '+256772123425' },
      ],
    },
  ];

  const visits: Record<string, string> = {};
  const visitParticipantIds: string[] = [];

  for (const v of visitData) {
    const visitDate = daysAgo(v.daysAgo);
    const visit = await prisma.visit.upsert({
      where: { visitNumber: v.visitNumber },
      update: {},
      create: {
        visitNumber: v.visitNumber,
        facilityId: facilities[v.facilityCode],
        status: v.status,
        visitDate,
        activityName: v.activityName,
        mentorshipCycle: v.activityName.includes('Cycle') ? v.activityName.split('Cycle ')[1] : undefined,
        reportingPeriod: '2026-Q1',
        createdById: users[v.creatorEmail],
        submittedAt: v.status === 'SUBMITTED' ? visitDate : undefined,
      },
    });
    visits[v.visitNumber] = visit.id;

    // Create participants
    for (const p of v.participants) {
      const participant = await prisma.visitParticipant.create({
        data: {
          visitId: visit.id,
          fullName: p.fullName,
          role: p.role,
          cadre: p.cadre,
          teamType: p.teamType,
          organization: p.organization,
          phone: p.phone,
          attendanceStatus: 'PRESENT',
        },
      });
      visitParticipantIds.push(participant.id);
    }
  }

  // =========================================================================
  // G. ASSESSMENTS (for submitted visits)
  // =========================================================================
  console.log('  Creating assessments...');

  const submittedVisitNumbers = visitData
    .filter((v) => v.status === 'SUBMITTED')
    .map((v) => v.visitNumber);

  // Get first few section numbers for creating responses
  const sectionNumbers = Object.keys(sectionIds).map(Number).sort((a, b) => a - b);
  const scoredSections = sectionNumbers.slice(0, 6);

  const colorStatuses: Array<'RED' | 'YELLOW' | 'LIGHT_GREEN' | 'DARK_GREEN'> = ['RED', 'YELLOW', 'LIGHT_GREEN', 'DARK_GREEN'];
  const assessmentIds: string[] = [];

  for (const vn of submittedVisitNumbers) {
    const visitId = visits[vn];
    const creatorEmail = visitData.find((v) => v.visitNumber === vn)!.creatorEmail;

    const assessment = await prisma.assessment.create({
      data: {
        visitId,
        status: 'SUBMITTED',
        submittedById: users[creatorEmail],
        startedAt: daysAgo(60),
        submittedAt: daysAgo(5),
        completionPct: 85 + Math.random() * 15,
        notes: 'Assessment completed during mentorship visit.',
      },
    });
    assessmentIds.push(assessment.id);

    // Create domain scores for each scored section
    let redCount = 0;
    let yellowCount = 0;
    let lightGreenCount = 0;
    let darkGreenCount = 0;
    const topRedDomains: string[] = [];

    for (const secNum of scoredSections) {
      const rawScore = Math.floor(Math.random() * 10) + 1;
      const maxScore = 10;
      const percentage = (rawScore / maxScore) * 100;
      let colorStatus: 'RED' | 'YELLOW' | 'LIGHT_GREEN' | 'DARK_GREEN';

      if (percentage < 25) {
        colorStatus = 'RED';
        redCount++;
        const sectionDef = ASSESSMENT_SECTION_DEFS.find((s) => s.number === secNum);
        if (sectionDef) topRedDomains.push(sectionDef.title);
      } else if (percentage < 50) {
        colorStatus = 'YELLOW';
        yellowCount++;
      } else if (percentage < 75) {
        colorStatus = 'LIGHT_GREEN';
        lightGreenCount++;
      } else {
        colorStatus = 'DARK_GREEN';
        darkGreenCount++;
      }

      await prisma.domainScore.create({
        data: {
          assessmentId: assessment.id,
          sectionId: sectionIds[secNum],
          rawScore,
          maxScore,
          percentage,
          colorStatus,
          computedAt: new Date(),
        },
      });
    }

    // Create a few sample assessment responses
    const sampleSectionNum = scoredSections[0];
    const sectionDef = ASSESSMENT_SECTION_DEFS.find((s) => s.number === sampleSectionNum);
    if (sectionDef) {
      for (const q of sectionDef.questions.slice(0, 5)) {
        if (questionIds[q.code]) {
          let value: string;
          let numericValue: number | undefined;

          if (q.responseType === 'YES_NO') {
            value = Math.random() > 0.3 ? 'YES' : 'NO';
          } else if (q.responseType === 'NUMERIC') {
            numericValue = Math.floor(Math.random() * 100);
            value = String(numericValue);
          } else {
            value = 'Sample response';
          }

          await prisma.assessmentResponse.create({
            data: {
              assessmentId: assessment.id,
              questionId: questionIds[q.code],
              value,
              numericValue,
              evidenceNotes: q.requiresEvidence ? 'Verified during facility walkthrough.' : null,
            },
          });
        }
      }
    }

    // Create visit summary
    const totalScored = redCount + yellowCount + lightGreenCount + darkGreenCount;
    let overallStatus: 'RED' | 'YELLOW' | 'LIGHT_GREEN' | 'DARK_GREEN' | 'NOT_SCORED';
    if (redCount > totalScored / 2) overallStatus = 'RED';
    else if (yellowCount > totalScored / 2) overallStatus = 'YELLOW';
    else if (darkGreenCount > totalScored / 2) overallStatus = 'DARK_GREEN';
    else overallStatus = 'LIGHT_GREEN';

    await prisma.visitSummary.upsert({
      where: { visitId },
      update: {},
      create: {
        visitId,
        overallStatus,
        redCount,
        yellowCount,
        lightGreenCount,
        darkGreenCount,
        totalScored,
        completionPct: assessment.completionPct ?? 0,
        criticalFlags: redCount > 0 ? JSON.stringify(['Critical gaps in PMTCT service delivery']) : null,
        topRedDomains: topRedDomains.length > 0 ? JSON.stringify(topRedDomains) : null,
        computedAt: new Date(),
      },
    });
  }

  // =========================================================================
  // H. ACTION PLANS
  // =========================================================================
  console.log('  Creating action plans...');

  const actionPlanData: Array<{
    visitNumber: string;
    sectionNumber: number;
    domainTitle: string;
    findingColor: 'RED' | 'YELLOW' | 'LIGHT_GREEN';
    findingSummary: string;
    actionItem: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    assignedToEmail: string;
    createdByEmail: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
    dueDaysFromNow: number;
  }> = [
    { visitNumber: visitNumber(1), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'RED', findingSummary: 'ANC register missing for last 2 months', actionItem: 'Procure new ANC register from district stores', priority: 'CRITICAL', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'IN_PROGRESS', dueDaysFromNow: 14 },
    { visitNumber: visitNumber(1), sectionNumber: 2, domainTitle: 'PMTCT Cascade', findingColor: 'YELLOW', findingSummary: 'HTS uptake below 90%', actionItem: 'Train 2 additional HTS providers by end of month', priority: 'HIGH', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 30 },
    { visitNumber: visitNumber(1), sectionNumber: 3, domainTitle: 'ART Initiation', findingColor: 'RED', findingSummary: 'Same-day ART initiation at 60%', actionItem: 'Implement test-and-treat model with clear SOPs', priority: 'CRITICAL', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 21 },
    { visitNumber: visitNumber(2), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'YELLOW', findingSummary: 'Maternity register incomplete (70% fill rate)', actionItem: 'On-the-job training for maternity staff on register completion', priority: 'MEDIUM', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'COMPLETED', dueDaysFromNow: -10 },
    { visitNumber: visitNumber(2), sectionNumber: 4, domainTitle: 'Viral Load Monitoring', findingColor: 'RED', findingSummary: 'No VL results received in 3 months', actionItem: 'Follow up with CPHL on pending VL results', priority: 'CRITICAL', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'OVERDUE', dueDaysFromNow: -5 },
    { visitNumber: visitNumber(3), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'LIGHT_GREEN', findingSummary: 'All registers present, minor gaps in PNC', actionItem: 'Conduct weekly register review meetings', priority: 'LOW', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'COMPLETED', dueDaysFromNow: -20 },
    { visitNumber: visitNumber(3), sectionNumber: 5, domainTitle: 'EID & Infant Follow-up', findingColor: 'RED', findingSummary: 'DBS sample collection below target', actionItem: 'Ensure DBS collection supplies available and train staff', priority: 'HIGH', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'IN_PROGRESS', dueDaysFromNow: 10 },
    { visitNumber: visitNumber(3), sectionNumber: 6, domainTitle: 'Infant Feeding', findingColor: 'YELLOW', findingSummary: 'Infant feeding counselling not documented', actionItem: 'Introduce infant feeding counselling checklist', priority: 'MEDIUM', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 15 },
    { visitNumber: visitNumber(4), sectionNumber: 2, domainTitle: 'PMTCT Cascade', findingColor: 'RED', findingSummary: 'Partner testing very low at 30%', actionItem: 'Implement partner notification strategy with CHWs', priority: 'CRITICAL', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'IN_PROGRESS', dueDaysFromNow: 25 },
    { visitNumber: visitNumber(4), sectionNumber: 3, domainTitle: 'ART Initiation', findingColor: 'YELLOW', findingSummary: 'ART adherence counselling not standardised', actionItem: 'Adopt MoH ART adherence counselling job aide', priority: 'MEDIUM', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 20 },
    { visitNumber: visitNumber(5), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'YELLOW', findingSummary: 'Maternity register not current version', actionItem: 'Request new version registers from DHO office', priority: 'MEDIUM', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'COMPLETED', dueDaysFromNow: -15 },
    { visitNumber: visitNumber(5), sectionNumber: 4, domainTitle: 'Viral Load Monitoring', findingColor: 'LIGHT_GREEN', findingSummary: 'VL coverage at 70%, target 90%', actionItem: 'Implement VL bleeding schedule and tracking tool', priority: 'HIGH', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'IN_PROGRESS', dueDaysFromNow: 30 },
    { visitNumber: visitNumber(5), sectionNumber: 5, domainTitle: 'EID & Infant Follow-up', findingColor: 'RED', findingSummary: 'HEI follow-up tracking missing', actionItem: 'Set up HEI tracking register and appoint focal person', priority: 'CRITICAL', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 14 },
    { visitNumber: visitNumber(6), sectionNumber: 2, domainTitle: 'PMTCT Cascade', findingColor: 'YELLOW', findingSummary: 'PMTCT data not regularly reviewed', actionItem: 'Establish monthly PMTCT data review meetings', priority: 'MEDIUM', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'COMPLETED', dueDaysFromNow: -8 },
    { visitNumber: visitNumber(7), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'RED', findingSummary: 'PNC register not available', actionItem: 'Urgently procure PNC register', priority: 'CRITICAL', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 7 },
    { visitNumber: visitNumber(8), sectionNumber: 3, domainTitle: 'ART Initiation', findingColor: 'YELLOW', findingSummary: 'ARV stock-outs reported last month', actionItem: 'Review ARV supply chain and order buffer stock', priority: 'HIGH', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 10 },
    { visitNumber: visitNumber(9), sectionNumber: 2, domainTitle: 'PMTCT Cascade', findingColor: 'LIGHT_GREEN', findingSummary: 'Good HTS coverage but documentation gaps', actionItem: 'Refresher on HTS documentation for all providers', priority: 'LOW', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 30 },
    { visitNumber: visitNumber(10), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'YELLOW', findingSummary: 'ANC register old version still in use', actionItem: 'Coordinate with DHO for new registers', priority: 'MEDIUM', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 21 },
    { visitNumber: visitNumber(10), sectionNumber: 6, domainTitle: 'Infant Feeding', findingColor: 'RED', findingSummary: 'No infant feeding counselling corner', actionItem: 'Designate and equip infant feeding counselling area', priority: 'HIGH', assignedToEmail: 'admin@chai.org', createdByEmail: 'assessor@chai.org', status: 'OPEN', dueDaysFromNow: 45 },
    { visitNumber: visitNumber(4), sectionNumber: 1, domainTitle: 'ANC / Maternity / PNC Registers', findingColor: 'YELLOW', findingSummary: 'ANC register completeness at 80%', actionItem: 'Weekly quality check of ANC register by in-charge', priority: 'MEDIUM', assignedToEmail: 'assessor@chai.org', createdByEmail: 'assessor@chai.org', status: 'OVERDUE', dueDaysFromNow: -3 },
  ];

  for (const ap of actionPlanData) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + ap.dueDaysFromNow);

    await prisma.actionPlan.create({
      data: {
        visitId: visits[ap.visitNumber],
        sectionNumber: ap.sectionNumber,
        domainTitle: ap.domainTitle,
        findingColor: ap.findingColor,
        findingSummary: ap.findingSummary,
        actionItem: ap.actionItem,
        priority: ap.priority,
        assignedToId: users[ap.assignedToEmail],
        createdById: users[ap.createdByEmail],
        status: ap.status,
        dueDate,
        completedAt: ap.status === 'COMPLETED' ? daysAgo(Math.abs(ap.dueDaysFromNow)) : undefined,
        progressNotes: ap.status === 'IN_PROGRESS' ? 'Work ongoing, expected to complete by due date.' : ap.status === 'COMPLETED' ? 'Action completed and verified.' : undefined,
      },
    });
  }

  // =========================================================================
  // I. NAMES REGISTRY
  // =========================================================================
  console.log('  Creating names registry entries...');

  // Collect all participants from visits for names entries
  const allParticipants = visitData.flatMap((v) =>
    v.participants.map((p) => ({
      ...p,
      visitNumber: v.visitNumber,
      facilityCode: v.facilityCode,
    }))
  );

  const namesEntryIds: string[] = [];
  const namesParticipantNames = new Set<string>();

  // Create 30 entries - first from visit participants, then some standalone
  const participantsForNames = allParticipants.slice(0, 20);
  const standaloneNames = [
    { fullName: 'Mr. Andrew Okwera', role: 'VHT', cadre: 'Community Worker', teamType: 'FACILITY' as const, organization: 'Gulu DLG', phone: '+256772200001', district: 'Gulu', facility: 'Gulu Regional Referral Hospital', visitNumber: visitNumber(4) },
    { fullName: 'Ms. Sylvia Nyangoma', role: 'Peer Educator', cadre: 'Community Worker', teamType: 'FACILITY' as const, organization: 'TASO', phone: '+256772200002', district: 'Gulu', facility: 'Lacor Hospital', visitNumber: visitNumber(4) },
    { fullName: 'Mr. Fred Mugabi', role: 'DHT Member', cadre: 'Clinical Officer', teamType: 'DISTRICT' as const, organization: 'Kampala DLG', phone: '+256772200003', district: 'Kampala', facility: 'Mulago National Referral Hospital', visitNumber: visitNumber(1) },
    { fullName: 'Sr. Monica Nanteza', role: 'EID Focal Person', cadre: 'Lab Tech', teamType: 'FACILITY' as const, organization: 'Jinja RRH', phone: '+256772200004', district: 'Jinja', facility: 'Jinja Regional Referral Hospital', visitNumber: visitNumber(3) },
    { fullName: 'Ms. Brenda Kyomuhendo', role: 'PMTCT Champion', cadre: 'Enrolled Midwife', teamType: 'FACILITY' as const, organization: 'Mbarara RRH', phone: '+256772200005', district: 'Mbarara', facility: 'Mbarara Regional Referral Hospital', visitNumber: visitNumber(5) },
    { fullName: 'Mr. Samuel Ochen', role: 'Driver', cadre: 'Support Staff', teamType: 'CENTRAL' as const, organization: 'CHAI Uganda', phone: '+256772200006', district: 'Lira', facility: 'Lira Regional Referral Hospital', visitNumber: visitNumber(7) },
    { fullName: 'Ms. Jane Akello', role: 'M&E Officer', cadre: 'Data Manager', teamType: 'DISTRICT' as const, organization: 'Lira DLG', phone: '+256772200007', district: 'Lira', facility: 'Lira Regional Referral Hospital', visitNumber: visitNumber(7) },
    { fullName: 'Dr. Timothy Muhwezi', role: 'Technical Advisor', cadre: 'Medical Officer', teamType: 'PARTNER' as const, organization: 'WHO Uganda', phone: '+256772200008', district: 'Kampala', facility: 'Mulago National Referral Hospital', visitNumber: visitNumber(1) },
    { fullName: 'Sr. Juliet Nakabugo', role: 'PNC Nurse', cadre: 'Registered Nurse', teamType: 'FACILITY' as const, organization: 'Kawempe HC IV', phone: '+256772200009', district: 'Kampala', facility: 'Kawempe HC IV', visitNumber: visitNumber(2) },
    { fullName: 'Mr. Hassan Sserunjogi', role: 'Stores Officer', cadre: 'Stores Assistant', teamType: 'FACILITY' as const, organization: 'Mbale RRH', phone: '+256772200010', district: 'Mbale', facility: 'Mbale Regional Referral Hospital', visitNumber: visitNumber(10) },
  ];

  const verificationStatuses: Array<'UNVERIFIED' | 'VERIFIED' | 'FLAGGED'> = ['UNVERIFIED', 'VERIFIED', 'FLAGGED'];
  const approvalStatuses: Array<'PENDING' | 'APPROVED' | 'REJECTED'> = ['PENDING', 'APPROVED', 'REJECTED'];
  const eligibilityStatuses: Array<'ELIGIBLE' | 'INELIGIBLE' | 'PENDING_REVIEW'> = ['ELIGIBLE', 'INELIGIBLE', 'PENDING_REVIEW'];
  const networks: Array<'MTN' | 'AIRTEL'> = ['MTN', 'AIRTEL'];

  let namesIdx = 0;

  // From visit participants
  for (const p of participantsForNames) {
    if (namesParticipantNames.has(p.fullName)) continue;
    namesParticipantNames.add(p.fullName);

    const verStatus = verificationStatuses[namesIdx % verificationStatuses.length];
    const apprStatus = verStatus === 'VERIFIED' ? approvalStatuses[namesIdx % approvalStatuses.length] : 'PENDING';
    const eligStatus = eligibilityStatuses[namesIdx % eligibilityStatuses.length];
    const facilityInfo = facilityData.find((f) => f.code === p.facilityCode);

    const entry = await prisma.namesRegistryEntry.create({
      data: {
        visitId: visits[p.visitNumber],
        fullName: p.fullName,
        role: p.role,
        cadre: p.cadre,
        teamType: p.teamType,
        organization: p.organization,
        districtName: facilityInfo ? districtData.find((d) => d.name === facilityInfo.district)?.name : undefined,
        facilityName: facilityInfo?.name,
        phone: p.phone,
        network: networks[namesIdx % networks.length],
        eligibility: eligStatus,
        verificationStatus: verStatus,
        verifiedById: verStatus === 'VERIFIED' ? users['admin@chai.org'] : undefined,
        verifiedAt: verStatus === 'VERIFIED' ? daysAgo(2) : undefined,
        approvalStatus: apprStatus,
        approvedById: apprStatus === 'APPROVED' ? users['admin@chai.org'] : undefined,
        approvedAt: apprStatus === 'APPROVED' ? daysAgo(1) : undefined,
        createdById: users['assessor@chai.org'],
      },
    });
    namesEntryIds.push(entry.id);
    namesIdx++;
  }

  // Standalone entries
  for (const s of standaloneNames) {
    if (namesParticipantNames.has(s.fullName)) continue;
    namesParticipantNames.add(s.fullName);

    const verStatus = verificationStatuses[namesIdx % verificationStatuses.length];
    const apprStatus = verStatus === 'VERIFIED' ? approvalStatuses[namesIdx % approvalStatuses.length] : 'PENDING';
    const eligStatus = eligibilityStatuses[namesIdx % eligibilityStatuses.length];

    const entry = await prisma.namesRegistryEntry.create({
      data: {
        visitId: visits[s.visitNumber],
        fullName: s.fullName,
        role: s.role,
        cadre: s.cadre,
        teamType: s.teamType,
        organization: s.organization,
        districtName: s.district,
        facilityName: s.facility,
        phone: s.phone,
        network: networks[namesIdx % networks.length],
        eligibility: eligStatus,
        verificationStatus: verStatus,
        verifiedById: verStatus === 'VERIFIED' ? users['admin@chai.org'] : undefined,
        verifiedAt: verStatus === 'VERIFIED' ? daysAgo(2) : undefined,
        approvalStatus: apprStatus,
        approvedById: apprStatus === 'APPROVED' ? users['admin@chai.org'] : undefined,
        approvedAt: apprStatus === 'APPROVED' ? daysAgo(1) : undefined,
        createdById: users['assessor@chai.org'],
      },
    });
    namesEntryIds.push(entry.id);
    namesIdx++;
  }

  // =========================================================================
  // J. PAYMENT RECORDS
  // =========================================================================
  console.log('  Creating payment records...');

  const paymentCategories: Array<'TRANSPORT' | 'PER_DIEM' | 'FACILITATION'> = ['TRANSPORT', 'PER_DIEM', 'FACILITATION'];
  const paymentStatuses: Array<'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'PAID'> = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'PAID'];

  // Use the first 15 names entry IDs for payments
  const payableEntries = namesEntryIds.slice(0, 15);

  for (let i = 0; i < payableEntries.length; i++) {
    const entryId = payableEntries[i];
    const category = paymentCategories[i % paymentCategories.length];
    const status = paymentStatuses[i % paymentStatuses.length];

    // Realistic UGX amounts
    let amount: number;
    if (category === 'TRANSPORT') amount = 50000 + Math.floor(Math.random() * 100000);
    else if (category === 'PER_DIEM') amount = 100000 + Math.floor(Math.random() * 100000);
    else amount = 80000 + Math.floor(Math.random() * 120000);

    await prisma.paymentRecord.create({
      data: {
        namesEntryId: entryId,
        paymentCategory: category,
        amount,
        currency: 'UGX',
        phone: '+25677' + String(2000001 + i),
        network: networks[i % networks.length],
        status,
        submittedAt: ['SUBMITTED', 'VERIFIED', 'APPROVED', 'PAID'].includes(status) ? daysAgo(10) : undefined,
        verifiedAt: ['VERIFIED', 'APPROVED', 'PAID'].includes(status) ? daysAgo(7) : undefined,
        approvedById: ['APPROVED', 'PAID'].includes(status) ? users['admin@chai.org'] : undefined,
        approvedAt: ['APPROVED', 'PAID'].includes(status) ? daysAgo(5) : undefined,
        paidById: status === 'PAID' ? users['admin@chai.org'] : undefined,
        paidAt: status === 'PAID' ? daysAgo(3) : undefined,
        transactionRef: status === 'PAID' ? `TXN-${String(100000 + i)}` : undefined,
      },
    });
  }

  // =========================================================================
  // K. DATA QUALITY FLAGS
  // =========================================================================
  console.log('  Creating data quality flags...');

  const dqFlags: Array<{
    visitNumber: string;
    entityType: 'VISIT' | 'ASSESSMENT' | 'RESPONSE' | 'NAMES_ENTRY';
    flagType: 'MISSING_VALUE' | 'IMPOSSIBLE_VALUE' | 'DUPLICATE_ENTRY' | 'INCOMPLETE_SECTION' | 'MISSING_EVIDENCE' | 'INVALID_FORMAT' | 'ANOMALY';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    fieldName?: string;
    currentValue?: string;
    suggestedFix?: string;
    isResolved: boolean;
  }> = [
    { visitNumber: visitNumber(1), entityType: 'VISIT', flagType: 'MISSING_VALUE', severity: 'HIGH', description: 'Visit notes are empty for a submitted visit', fieldName: 'notes', suggestedFix: 'Add visit summary notes before archiving', isResolved: false },
    { visitNumber: visitNumber(1), entityType: 'ASSESSMENT', flagType: 'INCOMPLETE_SECTION', severity: 'MEDIUM', description: 'Section 3 has only 2 of 8 questions answered', fieldName: 'section_3', suggestedFix: 'Complete remaining questions in Section 3', isResolved: false },
    { visitNumber: visitNumber(2), entityType: 'RESPONSE', flagType: 'IMPOSSIBLE_VALUE', severity: 'HIGH', description: 'Numeric response exceeds maximum allowed value', fieldName: 'S2_HTS_TOTAL', currentValue: '999', suggestedFix: 'Verify and correct the HTS total count', isResolved: false },
    { visitNumber: visitNumber(3), entityType: 'NAMES_ENTRY', flagType: 'DUPLICATE_ENTRY', severity: 'MEDIUM', description: 'Possible duplicate entry detected for participant', fieldName: 'fullName', currentValue: 'Mr. Wilson Wanyama', suggestedFix: 'Review and merge duplicate records', isResolved: true },
    { visitNumber: visitNumber(3), entityType: 'ASSESSMENT', flagType: 'MISSING_EVIDENCE', severity: 'LOW', description: 'Evidence photo not attached for register verification', fieldName: 'S1_ANC_AVAIL', suggestedFix: 'Upload evidence photo', isResolved: false },
    { visitNumber: visitNumber(4), entityType: 'VISIT', flagType: 'INVALID_FORMAT', severity: 'LOW', description: 'Phone number format inconsistent', fieldName: 'inChargePhone', currentValue: '0701234517', suggestedFix: 'Use international format +256...', isResolved: true },
    { visitNumber: visitNumber(5), entityType: 'ASSESSMENT', flagType: 'ANOMALY', severity: 'HIGH', description: 'All sections scored DARK_GREEN which is statistically unlikely', suggestedFix: 'Review assessment for data entry errors', isResolved: false },
    { visitNumber: visitNumber(5), entityType: 'NAMES_ENTRY', flagType: 'MISSING_VALUE', severity: 'MEDIUM', description: 'Mobile network not specified for payment-eligible participant', fieldName: 'network', suggestedFix: 'Confirm MTN or Airtel network', isResolved: false },
    { visitNumber: visitNumber(6), entityType: 'RESPONSE', flagType: 'MISSING_VALUE', severity: 'LOW', description: 'Optional comments field left blank for red-scored domain', fieldName: 'evidenceNotes', suggestedFix: 'Add explanatory notes for low-scoring domains', isResolved: true },
    { visitNumber: visitNumber(7), entityType: 'VISIT', flagType: 'INCOMPLETE_SECTION', severity: 'HIGH', description: 'Draft visit has been open for more than 7 days without submission', suggestedFix: 'Complete and submit or archive the visit', isResolved: false },
  ];

  for (const flag of dqFlags) {
    await prisma.dataQualityFlag.create({
      data: {
        visitId: visits[flag.visitNumber],
        entityType: flag.entityType,
        flagType: flag.flagType,
        severity: flag.severity,
        description: flag.description,
        fieldName: flag.fieldName,
        currentValue: flag.currentValue,
        suggestedFix: flag.suggestedFix,
        isResolved: flag.isResolved,
        resolvedAt: flag.isResolved ? daysAgo(2) : undefined,
      },
    });
  }

  // =========================================================================
  // L. DISTRICT AGGREGATES
  // =========================================================================
  console.log('  Creating district aggregates...');

  const period = '2026-Q1';

  for (const d of districtData) {
    const districtId = districts[d.name];

    // Count facilities in this district
    const facilitiesInDistrict = facilityData.filter((f) => f.district === d.name).length;

    // Count visits for facilities in this district
    const districtFacilityCodes = facilityData
      .filter((f) => f.district === d.name)
      .map((f) => f.code);
    const districtVisits = visitData.filter((v) => districtFacilityCodes.includes(v.facilityCode));
    const submittedCount = districtVisits.filter((v) => v.status === 'SUBMITTED').length;

    // Count actions for this district's visits
    const districtVisitNumbers = districtVisits.map((v) => v.visitNumber);
    const districtActions = actionPlanData.filter((ap) => districtVisitNumbers.includes(ap.visitNumber));
    const openActions = districtActions.filter((a) => a.status === 'OPEN').length;
    const overdueActions = districtActions.filter((a) => a.status === 'OVERDUE').length;
    const completedActions = districtActions.filter((a) => a.status === 'COMPLETED').length;

    // Count names entries and payments
    const districtNamesCount = [...participantsForNames, ...standaloneNames]
      .filter((p) => {
        const fc = 'facilityCode' in p ? p.facilityCode : undefined;
        if (fc) return districtFacilityCodes.includes(fc);
        return 'district' in p && p.district === d.name;
      }).length;

    await prisma.districtAggregate.upsert({
      where: { districtId_period: { districtId, period } },
      update: {},
      create: {
        districtId,
        period,
        facilitiesAssessed: Math.min(submittedCount, facilitiesInDistrict),
        totalVisits: districtVisits.length,
        avgCompletionPct: submittedCount > 0 ? 75 + Math.random() * 20 : 0,
        totalRedFindings: districtActions.filter((a) => a.findingColor === 'RED').length,
        totalYellowFindings: districtActions.filter((a) => a.findingColor === 'YELLOW').length,
        totalGreenFindings: districtActions.filter((a) => a.findingColor === 'LIGHT_GREEN').length,
        topRedDomains: JSON.stringify(
          [...new Set(districtActions.filter((a) => a.findingColor === 'RED').map((a) => a.domainTitle))]
        ),
        openActions,
        overdueActions,
        completedActions,
        namesEntered: districtNamesCount,
        paymentsPending: Math.floor(districtNamesCount * 0.3),
        paymentsApproved: Math.floor(districtNamesCount * 0.2),
        paymentsPaid: Math.floor(districtNamesCount * 0.1),
        computedAt: new Date(),
      },
    });
  }

  console.log('\nSeed completed successfully!');
  console.log(`  Regions:      ${regionData.length}`);
  console.log(`  Districts:    ${districtData.length}`);
  console.log(`  Facilities:   ${facilityData.length}`);
  console.log(`  Users:        ${userData.length}`);
  console.log(`  Sections:     ${ASSESSMENT_SECTION_DEFS.length}`);
  console.log(`  Visits:       ${visitData.length}`);
  console.log(`  Assessments:  ${submittedVisitNumbers.length}`);
  console.log(`  Action Plans: ${actionPlanData.length}`);
  console.log(`  Names Entries:${namesEntryIds.length}`);
  console.log(`  Payments:     ${payableEntries.length}`);
  console.log(`  DQ Flags:     ${dqFlags.length}`);
  console.log(`  Dist Aggreg:  ${districtData.length}`);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
