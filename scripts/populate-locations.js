#!/usr/bin/env node

/**
 * Populate Locations Script
 * 
 * This script populates Firebase Firestore with geographical information from the JSON file.
 * It creates a "locations" collection with subcollections for countries and states.
 * 
 * Usage:
 * node scripts/populate-locations.js
 * 
 * The script will:
 * 1. Create a "locations" collection
 * 2. Add "argentina" subcollection with name property
 * 3. Add "states" subcollection under argentina with all states and cities from JSON
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  writeBatch
} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw",
  authDomain: "marketplace-turismo.firebaseapp.com",
  projectId: "marketplace-turismo",
  storageBucket: "marketplace-turismo.firebasestorage.app",
  messagingSenderId: "2810288247",
  appId: "1:2810288247:web:82aa82158154691b080e72"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load geographical data from JSON file
function loadGeographicalData() {
  try {
    const jsonPath = path.join(__dirname, 'data', 'states_cities.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('❌ Error loading JSON file:', error.message);
    throw error;
  }
}

// Create locations collection structure
async function createLocationsCollection() {
  try {
    console.log('📁 Creating locations collection...');
    
    // Create the main locations collection document
    const locationsRef = doc(db, 'locations', 'main');
    await setDoc(locationsRef, {
      name: 'Geographical Data',
      description: 'Collection containing geographical information for the application',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Locations collection created');
  } catch (error) {
    console.error('❌ Error creating locations collection:', error.message);
    throw error;
  }
}

// Create Argentina subcollection
async function createArgentinaSubcollection() {
  try {
    console.log('🇦🇷 Creating Argentina subcollection...');
    
    // Create Argentina document
    const argentinaRef = doc(db, 'locations', 'main', 'countries', 'argentina');
    await setDoc(argentinaRef, {
      name: 'Argentina',
      code: 'AR',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Argentina subcollection created');
  } catch (error) {
    console.error('❌ Error creating Argentina subcollection:', error.message);
    throw error;
  }
}

// Populate states data
async function populateStatesData(statesData) {
  try {
    console.log('🏛️  Populating states data...');
    
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (let i = 0; i < statesData.length; i++) {
      const state = statesData[i];
      
      // Create state document
      const stateRef = doc(db, 'locations', 'main', 'countries', 'argentina', 'states', state.name.toLowerCase().replace(/\s+/g, '_'));
      
      const stateData = {
        name: state.name,
        cities: state.cities.map(city => ({
          name: city.name,
          createdAt: new Date()
        })),
        cityCount: state.cities.length,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      batch.set(stateRef, stateData);
      batchCount++;
      
      // Commit batch when it reaches the limit or at the end
      if (batchCount >= BATCH_SIZE || i === statesData.length - 1) {
        await batch.commit();
        console.log(`   📝 Processed ${i + 1}/${statesData.length} states`);
        batchCount = 0;
      }
    }
    
    console.log('✅ States data populated successfully');
  } catch (error) {
    console.error('❌ Error populating states data:', error.message);
    throw error;
  }
}

// Create cities subcollections for each state
async function createCitiesSubcollections(statesData) {
  try {
    console.log('🏙️  Creating cities subcollections...');
    
    for (let i = 0; i < statesData.length; i++) {
      const state = statesData[i];
      const stateId = state.name.toLowerCase().replace(/\s+/g, '_');
      
      console.log(`   📍 Processing ${state.name} (${i + 1}/${statesData.length})`);
      
      const batch = writeBatch(db);
      let batchCount = 0;
      const BATCH_SIZE = 500;
      
      for (let j = 0; j < state.cities.length; j++) {
        const city = state.cities[j];
        const cityId = city.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        // Create city document in the state's cities subcollection
        const cityRef = doc(db, 'locations', 'main', 'countries', 'argentina', 'states', stateId, 'cities', cityId);
        
        const cityData = {
          name: city.name,
          stateName: state.name,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        batch.set(cityRef, cityData);
        batchCount++;
        
        // Commit batch when it reaches the limit or at the end
        if (batchCount >= BATCH_SIZE || j === state.cities.length - 1) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      console.log(`   ✅ ${state.name}: ${state.cities.length} cities processed`);
    }
    
    console.log('✅ Cities subcollections created successfully');
  } catch (error) {
    console.error('❌ Error creating cities subcollections:', error.message);
    throw error;
  }
}

// Main function to populate all geographical data
async function populateGeographicalData() {
  try {
    console.log('\n🚀 MKT Turismo - Populate Geographical Data\n');
    console.log('This script will populate Firebase with geographical information from the JSON file.\n');
    
    // Load data from JSON
    console.log('📖 Loading geographical data from JSON file...');
    const statesData = loadGeographicalData();
    console.log(`✅ Loaded ${statesData.length} states with cities`);
    
    // Create collections structure
    await createLocationsCollection();
    await createArgentinaSubcollection();
    
    // Populate data
    await populateStatesData(statesData);
    await createCitiesSubcollections(statesData);
    
    // Calculate total statistics
    const totalStates = statesData.length;
    const totalCities = statesData.reduce((sum, state) => sum + state.cities.length, 0);
    
    console.log('\n📊 Import Summary:');
    console.log(`   📁 Collections created: locations, locations/countries/argentina, locations/countries/argentina/states`);
    console.log(`   🏛️  States imported: ${totalStates}`);
    console.log(`   🏙️  Cities imported: ${totalCities}`);
    console.log(`   🌍 Country: Argentina`);
    
    console.log('\n✅ Geographical data populated successfully!');
    console.log('\n📋 Collection Structure:');
    console.log('   locations/');
    console.log('   ├── main/');
    console.log('   └── countries/');
    console.log('       └── argentina/');
    console.log('           ├── (document with name: "Argentina")');
    console.log('           └── states/');
    console.log('               ├── buenos_aires/');
    console.log('               │   ├── (document with state data)');
    console.log('               │   └── cities/');
    console.log('               │       ├── 25_de_mayo/');
    console.log('               │       ├── 3_de_febrero/');
    console.log('               │       └── ...');
    console.log('               ├── cordoba/');
    console.log('               └── ...');
    
    console.log('\n🎉 Setup complete! Your geographical data is now available in Firebase.');
    
  } catch (error) {
    console.error('\n❌ Error populating geographical data:');
    console.error('   Technical error:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  populateGeographicalData().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { populateGeographicalData };
