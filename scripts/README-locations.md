# Geographical Data Population Script

This script populates Firebase Firestore with geographical information from the JSON file exported from a SQL database.

## Overview

The script creates a hierarchical structure in Firebase Firestore:

```
locations/
├── main/ (main collection document)
└── countries/
    └── argentina/
        ├── (document with name: "Argentina")
        └── states/
            ├── buenos_aires/
            │   ├── (document with state data and cities array)
            │   └── cities/
            │       ├── 25_de_mayo/
            │       ├── 3_de_febrero/
            │       └── ... (all cities as individual documents)
            ├── cordoba/
            │   ├── (document with state data and cities array)
            │   └── cities/
            │       └── ... (all cities as individual documents)
            └── ... (all other states)
```

## Prerequisites

1. Node.js installed
2. Firebase project configured
3. JSON data file at `scripts/data/states_cities.json`

## Usage

Run the script from the project root:

```bash
node scripts/populate-locations.js
```

## What the Script Does

1. **Loads Data**: Reads the `states_cities.json` file from the `scripts/data/` directory
2. **Creates Collections**: Sets up the main `locations` collection structure
3. **Adds Argentina**: Creates the Argentina country document with proper metadata
4. **Populates States**: Adds all states as documents in the `states` subcollection
5. **Creates Cities**: Creates individual city documents in each state's `cities` subcollection

## Data Structure

### Main Locations Document
```json
{
  "name": "Geographical Data",
  "description": "Collection containing geographical information for the application",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Argentina Country Document
```json
{
  "name": "Argentina",
  "code": "AR",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### State Document
```json
{
  "name": "Buenos Aires",
  "cities": [
    {
      "name": "25 de Mayo",
      "createdAt": "timestamp"
    },
    // ... more cities
  ],
  "cityCount": 150,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### City Document
```json
{
  "name": "25 de Mayo",
  "stateName": "Buenos Aires",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Features

- **Batch Processing**: Uses Firestore batch writes for efficient data insertion
- **Error Handling**: Comprehensive error handling with detailed messages
- **Progress Tracking**: Shows progress during data population
- **Data Validation**: Validates JSON structure before processing
- **Statistics**: Provides summary of imported data

## Expected Output

The script will show:
- Number of states loaded from JSON
- Progress during collection creation
- Progress during state population
- Progress during city subcollection creation
- Final statistics (total states, total cities)
- Collection structure visualization

## Error Handling

The script handles various error scenarios:
- Missing or invalid JSON file
- Firebase connection issues
- Batch write failures
- Invalid data structure

## Notes

- The script uses document IDs based on state/city names (lowercase, underscores for spaces)
- Special characters in names are cleaned for document IDs
- All timestamps are in ISO format
- The script is idempotent - you can run it multiple times safely

## Troubleshooting

If you encounter issues:

1. **Firebase Connection**: Ensure your Firebase project is properly configured
2. **JSON File**: Verify the `states_cities.json` file exists and has valid JSON structure
3. **Permissions**: Ensure your Firebase service account has write permissions
4. **Network**: Check your internet connection for Firebase access

## Security

- The script uses the same Firebase configuration as your application
- No sensitive data is logged during execution
- All operations are performed server-side
