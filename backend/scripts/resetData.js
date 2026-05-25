import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error("MongoDB connection string not found in .env");
  process.exit(1);
}

const collectionsToClear = [
  "centers",
  "students",
  "transactions",
  "hostels",
  "messes",
  "meritlists",
  "examregistrations",
  "libraryissues",
  "books",
  "librarybooks",
];

async function clearCollectionIfExists(db, collectionName) {
  const exists = await db
    .listCollections({ name: collectionName })
    .hasNext();

  if (!exists) {
    console.log(`Skipped: ${collectionName} collection not found`);
    return;
  }

  const result = await db.collection(collectionName).deleteMany({});
  console.log(`Cleared ${collectionName}: ${result.deletedCount} documents`);
}

async function resetData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    for (const collectionName of collectionsToClear) {
      await clearCollectionIfExists(db, collectionName);
    }

    const usersExists = await db.listCollections({ name: "users" }).hasNext();

    if (usersExists) {
      const result = await db.collection("users").deleteMany({
        role: "CENTER_ADMIN",
      });

      console.log(`Cleared center admins: ${result.deletedCount} users`);
      console.log("SUPER_ADMIN users were kept safely.");
    }

    console.log("Clean slate reset completed successfully.");
  } catch (error) {
    console.error("Clean slate reset failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

resetData();