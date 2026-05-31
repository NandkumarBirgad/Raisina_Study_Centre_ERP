import mongoose from 'mongoose';
import 'dotenv/config';

const { MongoClient } = mongoose.mongo;

// Connection Strings
const LOCAL_URI = 'mongodb://127.0.0.1:27017/studycenter_erp';
const ATLAS_URI = 'mongodb+srv://nandkumarbirgad5_db_user:mdM2Sei3HjMabInL@cluster0.ygmv6oc.mongodb.net/studycenter_erp?appName=Cluster0';

async function migrate() {
  console.log('🚀 Starting Database Migration to MongoDB Atlas...');
  console.log(`Local DB: ${LOCAL_URI}`);
  console.log(`Atlas DB: ${ATLAS_URI}`);

  const localClient = new MongoClient(LOCAL_URI);
  const atlasClient = new MongoClient(ATLAS_URI);

  try {
    // Connect to both clients
    await localClient.connect();
    console.log('✅ Connected to Local MongoDB');

    await atlasClient.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const localDb = localClient.db('studycenter_erp');
    const atlasDb = atlasClient.db('studycenter_erp');

    // List all collections from the local database
    const collections = await localDb.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections locally.`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      
      // Skip system collections
      if (colName.startsWith('system.')) {
        console.log(`⏭️ Skipping system collection: ${colName}`);
        continue;
      }

      console.log(`\n📦 Migrating collection: "${colName}"`);

      const localCol = localDb.collection(colName);
      const atlasCol = atlasDb.collection(colName);

      // Fetch all documents from local collection
      const documents = await localCol.find({}).toArray();
      console.log(`   - Found ${documents.length} documents locally.`);

      if (documents.length === 0) {
        console.log(`   - Collection is empty, skipping transfer.`);
        continue;
      }

      // Clear existing data in Atlas collection to ensure fresh migrate
      console.log(`   - Clearing any existing data in Atlas collection "${colName}"...`);
      await atlasCol.deleteMany({});

      // Insert all documents into Atlas
      console.log(`   - Inserting ${documents.length} documents into Atlas...`);
      const insertResult = await atlasCol.insertMany(documents);
      console.log(`   - Successfully migrated ${insertResult.insertedCount} documents!`);
    }

    console.log('\n🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
  } finally {
    await localClient.close();
    await atlasClient.close();
    console.log('\n🔌 Database connections closed.');
  }
}

migrate();
