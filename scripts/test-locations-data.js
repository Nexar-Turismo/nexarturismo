#!/usr/bin/env node

/**
 * Test Locations Data Script
 * 
 * This script validates the JSON data structure before running the main population script.
 * It checks the data format and provides statistics about the data to be imported.
 * 
 * Usage:
 * node scripts/test-locations-data.js
 */

const fs = require('fs');
const path = require('path');

// Load and validate geographical data
function validateGeographicalData() {
  try {
    console.log('🔍 MKT Turismo - Test Locations Data\n');
    
    // Load JSON data
    console.log('📖 Loading JSON data...');
    const jsonPath = path.join(__dirname, 'data', 'states_cities.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at: ${jsonPath}`);
    }
    
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const statesData = JSON.parse(jsonData);
    
    console.log('✅ JSON file loaded successfully');
    
    // Validate data structure
    console.log('\n🔍 Validating data structure...');
    
    if (!Array.isArray(statesData)) {
      throw new Error('Root data must be an array');
    }
    
    if (statesData.length === 0) {
      throw new Error('No states found in data');
    }
    
    console.log(`✅ Data structure valid - ${statesData.length} states found`);
    
    // Analyze data
    console.log('\n📊 Data Analysis:');
    
    let totalCities = 0;
    let statesWithCities = 0;
    let statesWithoutCities = 0;
    const stateNames = [];
    const cityNames = [];
    
    statesData.forEach((state, index) => {
      // Validate state structure
      if (!state.name || typeof state.name !== 'string') {
        throw new Error(`State at index ${index} is missing or has invalid name`);
      }
      
      if (!state.cities || !Array.isArray(state.cities)) {
        throw new Error(`State "${state.name}" is missing or has invalid cities array`);
      }
      
      stateNames.push(state.name);
      
      if (state.cities.length > 0) {
        statesWithCities++;
        totalCities += state.cities.length;
        
        // Validate cities structure
        state.cities.forEach((city, cityIndex) => {
          if (!city.name || typeof city.name !== 'string') {
            throw new Error(`City at index ${cityIndex} in state "${state.name}" is missing or has invalid name`);
          }
          cityNames.push(city.name);
        });
      } else {
        statesWithoutCities++;
      }
    });
    
    console.log(`   🏛️  Total States: ${statesData.length}`);
    console.log(`   🏙️  Total Cities: ${totalCities}`);
    console.log(`   ✅ States with cities: ${statesWithCities}`);
    console.log(`   ⚠️  States without cities: ${statesWithoutCities}`);
    console.log(`   📈 Average cities per state: ${(totalCities / statesData.length).toFixed(1)}`);
    
    // Show sample data
    console.log('\n📋 Sample Data:');
    console.log('   First 5 states:');
    statesData.slice(0, 5).forEach((state, index) => {
      console.log(`   ${index + 1}. ${state.name} (${state.cities.length} cities)`);
      if (state.cities.length > 0) {
        console.log(`      Sample cities: ${state.cities.slice(0, 3).map(c => c.name).join(', ')}${state.cities.length > 3 ? '...' : ''}`);
      }
    });
    
    // Check for potential issues
    console.log('\n🔍 Data Quality Checks:');
    
    // Check for duplicate state names
    const duplicateStates = stateNames.filter((name, index) => stateNames.indexOf(name) !== index);
    if (duplicateStates.length > 0) {
      console.log(`   ⚠️  Duplicate state names found: ${duplicateStates.join(', ')}`);
    } else {
      console.log('   ✅ No duplicate state names');
    }
    
    // Check for empty city names
    const emptyCityNames = cityNames.filter(name => !name.trim());
    if (emptyCityNames.length > 0) {
      console.log(`   ⚠️  Empty city names found: ${emptyCityNames.length}`);
    } else {
      console.log('   ✅ No empty city names');
    }
    
    // Check for very long names (potential issues with document IDs)
    const longStateNames = stateNames.filter(name => name.length > 50);
    if (longStateNames.length > 0) {
      console.log(`   ⚠️  Very long state names (>50 chars): ${longStateNames.length}`);
    }
    
    const longCityNames = cityNames.filter(name => name.length > 50);
    if (longCityNames.length > 0) {
      console.log(`   ⚠️  Very long city names (>50 chars): ${longCityNames.length}`);
    }
    
    // Show document ID preview
    console.log('\n📝 Document ID Preview:');
    console.log('   Sample state document IDs:');
    statesData.slice(0, 3).forEach(state => {
      const stateId = state.name.toLowerCase().replace(/\s+/g, '_');
      console.log(`   "${state.name}" → "${stateId}"`);
    });
    
    console.log('\n   Sample city document IDs:');
    if (statesData[0] && statesData[0].cities.length > 0) {
      statesData[0].cities.slice(0, 3).forEach(city => {
        const cityId = city.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        console.log(`   "${city.name}" → "${cityId}"`);
      });
    }
    
    console.log('\n✅ Data validation completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${statesData.length} states ready for import`);
    console.log(`   • ${totalCities} cities ready for import`);
    console.log(`   • Data structure is valid`);
    console.log(`   • Ready to run: node scripts/populate-locations.js`);
    
    return {
      statesCount: statesData.length,
      citiesCount: totalCities,
      statesWithCities,
      statesWithoutCities,
      isValid: true
    };
    
  } catch (error) {
    console.error('\n❌ Data validation failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check if the JSON file exists at scripts/data/states_cities.json');
    console.error('   2. Verify the JSON file is valid JSON format');
    console.error('   3. Ensure the data structure matches expected format');
    console.error('   4. Check file permissions');
    
    return {
      isValid: false,
      error: error.message
    };
  }
}

// Handle script execution
if (require.main === module) {
  const result = validateGeographicalData();
  process.exit(result.isValid ? 0 : 1);
}

module.exports = { validateGeographicalData };
