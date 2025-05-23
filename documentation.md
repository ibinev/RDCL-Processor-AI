# AIReader Project Documentation

## Overview
AIReader is a web application designed to process and display RDLC (Report Definition Language Client) files with dynamic data mapping capabilities. The application allows users to upload RDLC templates, map fields to data sources, and visualize the data in a structured table format.

## Project Structure

### Core Files
- `src/index.js` - Main application logic
- `src/styles.css` - Application styling
- `src/utils.js` - Utility functions
- `src/enum.js` - Data enumeration and constants

### Key Components

#### 1. RDLC Processing
The application processes RDLC files through several key functions:

- **Field Mapping Extraction**
  - Extracts field mappings from RDLC dataset definitions
  - Processes textbox names and their corresponding data fields
  - Handles column spans and styling information

- **Header Processing**
  - Processes main header rows
  - Handles TableGroup headers
  - Manages column spans and styling

#### 2. Data Display
The table generation system includes:

- **Header Generation**
  - Creates main header rows
  - Processes group headers
  - Applies styling and column spans

- **Data Row Generation**
  - Maps data fields to table cells
  - Handles formatting for different data types
  - Manages column spans and data spreading

#### 3. Field Mapping Interface
The field mapping system provides:

- **Mapping Form**
  - Visibility controls for fields
  - Custom header text input
  - Data field selection
  - Spread over column selection

- **Mapping Storage**
  - Saves mappings to localStorage
  - Loads saved mappings per file
  - Maintains mapping state

## Key Features

### 1. RDLC Template Processing
- Parses RDLC XML structure
- Extracts field definitions and types
- Processes header hierarchies
- Handles column spans and styling

### 2. Dynamic Field Mapping
- Map RDLC fields to data source fields
- Control field visibility
- Customize header text
- Spread data across multiple columns

### 3. Data Visualization
- Structured table display
- Hierarchical headers
- Group headers with distinct styling
- Formatted data cells

### 4. Styling and Layout
- Responsive table design
- Distinct header styling
- Group header differentiation
- Consistent cell formatting

## Usage Guide

### 1. Loading RDLC Files
1. Click the upload button to select an RDLC file
2. The application processes the file and extracts field mappings
3. The field mapping interface appears for configuration

### 2. Field Mapping
1. Use the field mapping form to:
   - Toggle field visibility
   - Set custom header text
   - Select data source fields
   - Configure spread over columns
2. Click "Apply Field Mapping" to update the display

### 3. Data Display
- The table updates automatically with mapped data
- Headers reflect the RDLC structure
- Group headers appear below main headers
- Data cells show formatted values

## Technical Details

### Data Structure
```javascript
FIELD_MAPPINGS = {
  fieldName: {
    visible: boolean,
    header: string,
    field: string,
    colSpan: number,
    spreadOver: string[],
    type: string
  }
}
```

### Header Structure
```javascript
header = {
  name: string,
  label: string,
  field: string,
  type: string,
  colSpan: number,
  rowIndex: number,
  style: object,
  isGroupHeader: boolean,
  groupIndex: number
}
```

### Styling
- Main Headers:
  - Font size: 10pt
  - Background: #f5f5f5
  - Bold text
  - Centered alignment

- Group Headers:
  - Font size: 9pt
  - Background: #e6f3ff
  - Italic text
  - Centered alignment

## Browser Support
- Modern browsers with ES6 support
- LocalStorage for mapping persistence
- XML parsing capabilities

## Future Enhancements
1. Additional data format support
2. Enhanced styling options
3. Export functionality
4. Advanced grouping features
5. Custom formatting rules

## Dependencies
- No external dependencies required
- Uses native browser APIs
- LocalStorage for data persistence

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License
Free