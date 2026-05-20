import { extractLocationFromText } from './services/locationExtractor.js';

async function runTests() {
  console.log("=== Testing Location & Patient Count Extraction ===");

  const testCases = [
    "DHA Suffa pe 2 log behosh pare hain",
    "Extreme heatwave warning at Gulshan Chowrangi, three people collapsed",
    "Gulshan-e-Iqbal block 3 mein ek banda behosh ho gaya hai",
    "Dangerous conditions in Karachi right now"
  ];

  for (const text of testCases) {
    console.log(`\nInput: "${text}"`);
    try {
      const res = await extractLocationFromText(text);
      console.log("Result:", JSON.stringify(res, null, 2));
    } catch (err) {
      console.error("Error processing:", err.message);
    }
  }
}

runTests();
