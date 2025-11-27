import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Define deity patterns and mappings
interface DeityPattern {
  deity: string;
  patterns: RegExp[];
  keywords: string[];
}

const deityPatterns: DeityPattern[] = [
  {
    deity: "Shiva",
    patterns: [
      /\bshiva\b/i,
      /\eswaram\b/i,
      /\esvaram\b/i,
      /\bshiv\b/i,
      /\beshwar\b/i,
      /\bishwar\b/i,
      /\bnath\b/i,
      /\bmahesh\b/i,
      /\brudra\b/i,
      /\bsomanath\b/i,
      /\bkashi\b.*vishwanath/i,
      /\bvishwanath\b/i,
      /\bkedar\b/i,
      /\bamarnath\b/i,
      /\bbadrinath\b/i,
      /\bgangotri\b/i,
      /\byamunotri\b/i
    ],
    keywords: ["shiva", "shiv", "eshwar", "ishwar", "nath", "mahesh", "rudra", "somanath", "vishwanath", "kedar", "amarnath", "badrinath"]
  },
  {
    deity: "Vishnu",
    patterns: [
      /\bvishnu\b/i,
      /\bnarayan\b/i,
      /\bvenkatesh\b/i,
      /\bbalaji\b/i,
      /\bkrishna\b/i,
      /\brama\b/i,
      /\bperumal\b/i,
      /\bvaradaraja\b/i,
      /\btirupati\b/i,
      /\bgovinda\b/i,
      /\bhari\b/i,
      /\bmadhava\b/i,
      /\bpadmanabha\b/i,
      /\branganath\b/i,
      /\bsrinivasa\b/i
    ],
    keywords: ["vishnu", "narayan", "venkatesh", "balaji", "krishna", "rama", "perumal", "varadaraja", "tirupati", "govinda", "hari", "madhava", "padmanabha", "ranganath", "srinivasa"]
  },
  {
    deity: "Murugan",
    patterns: [
      /\bmurugan\b/i,
      /\bkarthik\b/i,
      /\bsubramani\b/i,
      /\bmuruga\b/i,
      /\bkarthikeyan\b/i,
      /\bskumara\b/i,
      /\bsaravana\b/i,
      /\bvel\b/i,
      /\bdhandayuthapani\b/i,
      /\bpillaiyar\b.*kovil/i,
      /\bpazhamudircholai\b/i,
      /\btiruchendur\b/i,
      /\btirupparankunram\b/i
    ],
    keywords: ["murugan", "karthik", "subramani", "muruga", "karthikeyan", "skumara", "saravana", "vel", "dhandayuthapani"]
  },
  {
    deity: "Ganesh",
    patterns: [
      /\bganesh\b/i,
      /\bganapati\b/i,
      /\bvinayak\b/i,
      /\bvinayaka\b/i,
      /\bvinayaga\b/i,
      /\bgajanan\b/i,
      /\bgajanana\b/i,
      /\belephant.*god/i,
      /\bheramba\b/i,
      /\blambodara\b/i,
      /\bvikata\b/i,
      /\bvignesh\b/i
    ],
    keywords: ["ganesh", "ganapati", "vinayak", "vinayaka", "gajanan", "gajanana", "heramba", "lambodara", "vikata", "vignesh"]
  },
  {
    deity: "Lakshmi",
    patterns: [
      /\blakshmi\b/i,
      /\blaxmi\b/i,
      /\bsri\b.*devi/i,
      /\bmahadevi\b/i,
      /\bpadmavati\b/i,
      /\bvaishnavi\b/i,
      /\bshri\b.*devi/i,
      /\bannapurani\b/i,
      /\bandal\b/i,
      /\bkamakshi\b/i
    ],
    keywords: ["lakshmi", "laxmi", "padmavati", "vaishnavi", "annapurani", "andal", "kamakshi"]
  },
  {
    deity: "Durga",
    patterns: [
      /\bdurga\b/i,
      /\bkali\b/i,
      /\bparvati\b/i,
      /\bambika\b/i,
      /\bchamundi\b/i,
      /\bkamakhy\b/i,
      /\btara\b/i,
      /\btripurasundari\b/i,
      /\bmeenakshi\b/i,
      /\bminakshi\b/i,
      /\bvisalakshi\b/i,
      /\bakilandeswari\b/i,
      /\bbangaru\b.*kamma\b/i,
      /\bmadurai\b.*meenakshi/i
    ],
    keywords: ["durga", "kali", "parvati", "ambika", "chamundi", "kamakhy", "tara", "tripurasundari", "meenakshi", "minakshi", "visalakshi", "akilandeswari"]
  },
  {
    deity: "Hanuman",
    patterns: [
      /\bhanuman\b/i,
      /\banjaneya\b/i,
      /\banjan\b/i,
      /\bmaruti\b/i,
      /\bpavanputra\b/i,
      /\bbajarang\b/i,
      /\bbajaranga\b/i,
      /\bsankat\b.*mochan\b/i,
      /\bram\b.*doot\b/i
    ],
    keywords: ["hanuman", "anjaneya", "anjan", "maruti", "pavanputra", "bajarang", "bajaranga"]
  },
  {
    deity: "Brahma",
    patterns: [
      /\bbrahma\b/i,
      /\bvidhi\b/i,
      /\bhiranyagarbha\b/i,
      /\bchaturmukha\b/i,
      /\bpuskar\b/i
    ],
    keywords: ["brahma", "vidhi", "hiranyagarbha", "chaturmukha", "puskar"]
  },
  {
    deity: "Saraswati",
    patterns: [
      /\bsaraswati\b/i,
      /\bsarawati\b/i,
      /\bvani\b/i,
      /\bsharada\b/i,
      /\bhamsa\b.*vahini\b/i,
      /\bjnanapravaha\b/i,
      /\bvidya\b.*devi\b/i
    ],
    keywords: ["saraswati", "sarawati", "vani", "sharada"]
  },
  {
    deity: "Ayyappan",
    patterns: [
      /\bayyappan\b/i,
      /\bayyappa\b/i,
      /\bayyappa\b.*swami\b/i,
      /\bmanikandan\b/i,
      /\bsabarimala\b/i,
      /\bdharma.*sastha\b/i
    ],
    keywords: ["ayyappan", "ayyappa", "manikandan", "sabarimala"]
  }
];

// Function to infer deity from temple name
function inferDeityFromName(templeName: string): string | null {
  if (!templeName || typeof templeName !== 'string') {
    return null;
  }

  const lowerName = templeName.toLowerCase();

  // Check patterns first (more specific)
  for (const deityPattern of deityPatterns) {
    for (const pattern of deityPattern.patterns) {
      if (pattern.test(templeName)) {
        console.log(`  Pattern match: "${templeName}" -> "${deityPattern.deity}" (pattern: ${pattern.source})`);
        return deityPattern.deity;
      }
    }
  }

  // Check keywords if no pattern match
  for (const deityPattern of deityPatterns) {
    for (const keyword of deityPattern.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        console.log(`  Keyword match: "${templeName}" -> "${deityPattern.deity}" (keyword: ${keyword})`);
        return deityPattern.deity;
      }
    }
  }

  return null;
}

// Main function to analyze and update deities
async function analyzeAndUpdateDeities() {
  console.log('🕉️  Starting Temple Deity Analysis...');

  // MongoDB connection
  const MONGODB_URI = process.env.MONGODB_URI;
  const DATABASE = process.env.MONGODB_DB || process.env.DATABASE;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  if (!DATABASE) {
    throw new Error('DATABASE environment variable is required (check MONGODB_DB in .env)');
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DATABASE);
    console.log(`📊 Using database: ${DATABASE}`);

    // Query temples without deity field or with empty/null deity
    const query = {
      $or: [
        { deity: { $exists: false } },
        { deity: null },
        { deity: "" },
        { deity: { $regex: /^\s*$/ } } // Empty or whitespace-only
      ]
    };

    const templesWithoutDeity = await db.collection("temples").find(query).toArray();

    console.log(`🔍 Found ${templesWithoutDeity.length} temples without deity information`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each temple
    for (const temple of templesWithoutDeity) {
      try {
        const inferredDeity = inferDeityFromName(temple.name || temple.temple_name || '');

        if (inferredDeity) {
          // Update the temple with the inferred deity
          const updateResult = await db.collection("temples").updateOne(
            { _id: temple._id },
            {
              $set: {
                deity: inferredDeity,
                updated_at: new Date()
              }
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(`✅ Updated: ${temple.name || temple.temple_name} -> ${inferredDeity}`);
            updatedCount++;
          } else {
            console.log(`⚠️  No changes made for: ${temple.name || temple.temple_name}`);
          }
        } else {
          console.log(`⏭️  Skipped (no match): ${temple.name || temple.temple_name}`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing temple ${temple._id}:`, error);
        errorCount++;
      }
    }

    // Summary
    console.log('\n📊 Analysis Summary:');
    console.log(`✅ Temples updated with deities: ${updatedCount}`);
    console.log(`⏭️  Temples skipped (no match found): ${skippedCount}`);
    console.log(`❌ Errors encountered: ${errorCount}`);
    console.log(`📈 Total temples processed: ${templesWithoutDeity.length}`);

    // Show deity distribution
    console.log('\n📈 Deity Distribution Analysis:');
    const deityStats = await db.collection("temples").aggregate([
      { $match: { deity: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$deity", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    deityStats.forEach((stat: any) => {
      console.log(`  ${stat._id}: ${stat.count} temples`);
    });

  } catch (error) {
    console.error('❌ Error during deity analysis:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Function to show deity inference examples
function showInferenceExamples() {
  console.log('\n🧪 Deity Inference Examples:');
  console.log('=====================================');

  const examples = [
    "Sri Shiva Temple",
    "Venkateswara Temple",
    "Murugan Kovil",
    "Ganesh Temple",
    "Lakshmi Narayana Temple",
    "Durga Mata Temple",
    "Hanuman Mandir",
    "Brahma Temple",
    "Saraswati Temple",
    "Ayyappa Swami Temple",
    "Kashi Vishwanath Temple",
    "Tirupati Balaji Temple",
    "Palani Murugan Temple",
    "Mumbai Siddhivinayak Temple",
    "Madurai Meenakshi Temple"
  ];

  examples.forEach(example => {
    const inferred = inferDeityFromName(example);
    console.log(`${example.padEnd(30)} -> ${inferred || 'No match'}`);
  });
}

// Run the analysis if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Show examples first
  showInferenceExamples();

  // Then run the analysis
  analyzeAndUpdateDeities()
    .then(() => {
      console.log('\n🎉 Deity analysis completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deity analysis failed:', error);
      process.exit(1);
    });
}

export { inferDeityFromName, analyzeAndUpdateDeities, showInferenceExamples };
