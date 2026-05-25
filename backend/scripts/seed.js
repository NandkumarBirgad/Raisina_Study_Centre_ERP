/**
 * Seed script for Study Center ERP
 * Run: node backend/seed.js
 *
 * Creates:
 *  - 4 Centers
 *  - 1 SUPER_ADMIN user
 *  - 1 CENTER_ADMIN per center
 *  - 2 Hostels per center (Boys + Girls)
 *  - 1 Mess per center
 *  - 1 MeritList per center (10 entries, cutoff at rank 5)
 *  - 8 Students per center (4 SCHOLARSHIP, 4 NON_SCHOLARSHIP)
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// Models
import Center from '../models/Center.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Hostel from '../models/Hostel.js';
import Mess from '../models/Mess.js';
import MeritList from '../models/MeritList.js';
import ExamRegistration from '../models/ExamRegistration.js';
import Transaction from '../models/Transaction.js';
import LogBook from '../models/LogBook.js';
import LibraryBook from '../models/LibraryBook.js';
import LibraryIssue from '../models/LibraryIssue.js';
import { DEFAULT_CENTERS } from '../constants/defaultCenters.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studycenter_erp';

const centerData = DEFAULT_CENTERS;

const sampleNames = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Desai', 'Anjali Kulkarni',
  'Vikram Joshi', 'Meera Nair', 'Arjun Mehta', 'Sneha Iyer',
  'Rahul Bansode', 'Kavya Reddy', 'Nikhil Chavan', 'Divya Rao',
];

function makeMeritEntries(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    name: `Merit Candidate ${i + 1}`,
    score: 100 - i * 3.5,
  }));
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  await Promise.all([
    Center.deleteMany({}),
    User.deleteMany({}),
    Student.deleteMany({}),
    Hostel.deleteMany({}),
    Mess.deleteMany({}),
    MeritList.deleteMany({}),
    ExamRegistration.deleteMany({}),
    Transaction.deleteMany({}),
    LogBook.deleteMany({}),
    LibraryBook.deleteMany({}),
    LibraryIssue.deleteMany({}),
  ]);
  console.log('🗑  Cleared existing seed collections');

  const centers = await Center.insertMany(centerData);
  console.log(`🏫 Created ${centers.length} centers`);

  const superAdmin = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@studycenter.org',
    password: 'Admin@1234',
    role: 'SUPER_ADMIN',
    center: null,
  });
  console.log(`👤 Super admin: ${superAdmin.email} / Admin@1234`);

  let nameIndex = 0;

  for (const center of centers) {
    const centerAdmin = await User.create({
      firstName: `${center.centerCode}`,
      lastName: 'Admin',
      email: `admin.${center.centerCode.toLowerCase()}@studycenter.org`,
      password: 'Center@1234',
      role: 'CENTER_ADMIN',
      center: center._id,
    });
    console.log(`👤 Center admin [${center.centerCode}]: ${centerAdmin.email} / Center@1234`);

    const boysHostel = await Hostel.create({
      name: `${center.centerCode} Boys Hostel`,
      center: center._id,
      type: 'Boys',
      address: `Block A, ${center.city}`,
      totalRooms: 20,
      bedsPerRoom: 3,
      capacity: 60,
      occupancy: 0,
    });

    const girlsHostel = await Hostel.create({
      name: `${center.centerCode} Girls Hostel`,
      center: center._id,
      type: 'Girls',
      address: `Block B, ${center.city}`,
      totalRooms: 15,
      bedsPerRoom: 3,
      capacity: 45,
      occupancy: 0,
    });

    console.log(`Hostels created for ${center.centerCode}`);

    const mess = await Mess.create({
      messName: `${center.centerCode} Main Mess`,
      center: center._id,
      hostel: boysHostel._id,
      address: `Ground Floor, ${center.city}`,
      capacity: 120,
      monthlyFee: 2500,
      status: 'ACTIVE',
    });
    console.log(`Mess created for ${center.centerCode}`);

    const meritList = await MeritList.create({
      center: center._id,
      uploadedBy: superAdmin._id,
      year: new Date().getFullYear(),
      entries: makeMeritEntries(10),
      scholarshipCutoffRank: 5,
    });
    console.log(`Merit list created for ${center.centerCode} (cutoff: rank 5)`);

    const studentTypes = [
      'SCHOLARSHIP', 'SCHOLARSHIP', 'SCHOLARSHIP', 'SCHOLARSHIP',
      'NON_SCHOLARSHIP', 'NON_SCHOLARSHIP', 'NON_SCHOLARSHIP', 'NON_SCHOLARSHIP',
    ];

    for (let i = 0; i < 8; i++) {
      const type = studentTypes[i];
      const rank = type === 'SCHOLARSHIP' ? i + 1 : i + 5;
      const name = sampleNames[nameIndex % sampleNames.length];
      nameIndex++;

      const rscNumber = `RSC-${center.centerCode}-${String(i + 1).padStart(4, '0')}`;
      const prn = `PRN-${center.centerCode}-${Date.now()}-${i}`;

      const hostelRef = name.includes('a') || i % 2 === 0 ? boysHostel._id : girlsHostel._id;

      const student = await Student.create({
        rscNumber,
        prn,
        center: center._id,
        studentName: name,
        mobileNumber: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
        dob: new Date(2000 + (i % 5), i % 12, (i % 28) + 1),
        aadharNumber: String(Math.floor(Math.random() * 1e12)).padStart(12, '0'),
        addresses: [{ addressType: 'HOME', addressLine: `${i + 1} Main St, ${center.city}` }],
        studentType: type,
        meritRank: rank,
        admissionDate: new Date(),
        libraryAccess: type === 'SCHOLARSHIP',
        hostel: type === 'SCHOLARSHIP' ? hostelRef : null,
        mess: type === 'SCHOLARSHIP' ? mess._id : null,
      });

      if (type === 'SCHOLARSHIP') {
        const assignedHostel = student.hostel.toString() === boysHostel._id.toString()
          ? boysHostel
          : girlsHostel;

        assignedHostel.occupancy += 1;
        await assignedHostel.save();
      }

      if (type === 'SCHOLARSHIP') {
        const entry = meritList.entries.find((e) => e.rank === rank);
        if (entry) entry.studentId = student._id;
      }
    }

    await meritList.save();
    console.log(`8 students created for ${center.centerCode}`);
  }

  console.log('\nSeeding complete!\n');
  console.log('─────────────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Super Admin : superadmin@studycenter.org / Admin@1234');
  centers.forEach((c) => {
    console.log(`  ${c.centerCode} Admin : admin.${c.centerCode.toLowerCase()}@studycenter.org / Center@1234`);
  });
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
}); 