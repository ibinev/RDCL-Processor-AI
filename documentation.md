# AIReader Project Documentation

## Overview
AIReader is a web application designed to process and display RDLC (Report Definition Language Client) files with dynamic data mapping capabilities. The application allows users to upload RDLC templates, map fields to data sources, and visualize the data in a structured table format.

### Understanding RDLC Files
RDLC (Report Definition Language Client-side) is Microsoft's XML-based report definition format used primarily with SQL Server Reporting Services (SSRS) and ReportViewer controls. RDLC files:

- Define the structure, layout, and formatting of reports
- Contain XML schemas that describe data sources, datasets, and report elements
- Include detailed definitions for tables, matrices, charts, and other visualizations
- Support complex expressions, parameters, and calculations
- Can be rendered in various formats (PDF, Excel, HTML, etc.)

RDLC files are typically created in Visual Studio using the Report Designer and are popular in .NET applications for generating business reports and data visualizations. Unlike server-side RDL files, RDLC files are processed client-side, making them suitable for standalone applications.

### Comparison with Crystal Reports
Crystal Reports is another popular reporting solution, often compared with RDLC:

| Feature | RDLC | Crystal Reports |
|---------|------|----------------|
| Format | XML-based | Proprietary format (.rpt) |
| Creation | Visual Studio Report Designer | Crystal Reports Designer |
| Processing | Client-side | Can be both server and client-side |
| Integration | Tight integration with .NET | Works across various platforms |
| Learning Curve | Moderate | Steeper learning curve |
| Flexibility | Good for .NET applications | More features for complex reports |
| Licensing | Included with Visual Studio | Separate commercial license |

While Crystal Reports offers more sophisticated reporting capabilities and has been an industry standard for longer, RDLC files provide a more lightweight and integrated solution for .NET developers. The AIReader application focuses specifically on RDLC files to provide a web-based viewer with enhanced field mapping capabilities.

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

## Sample RDLC File Content

RDLC files are XML-based report definition files that contain structured information about report layout, data connections, and formatting. Below is a simplified excerpt from a sample RDLC file showing its structure:

```xml
<Report>
  <!-- Report Parameters -->
  <ReportParameters>
    <ReportParameter Name="DateSeparator">
      <DataType>String</DataType>
      <DefaultValue>
        <Values>
          <Value>dd/MM/yyyy</Value>
        </Values>
      </DefaultValue>
    </ReportParameter>
    <ReportParameter Name="TimeSeparator">
      <DataType>String</DataType>
      <DefaultValue>
        <Values>
          <Value>:</Value>
        </Values>
      </DefaultValue>
    </ReportParameter>
  </ReportParameters>
  
  <!-- Data Sources and DataSets -->
  <DataSets>
    <DataSet Name="ReportDataSet_report_data">
      <Fields>
        <Field Name="entry_date">
          <DataField>entry_date</DataField>
          <TypeName>System.DateTime</TypeName>
        </Field>
        <Field Name="clock_dept_name">
          <DataField>clock_dept_name</DataField>
          <TypeName>System.String</TypeName>
        </Field>
        <Field Name="time_in">
          <DataField>time_in</DataField>
          <TypeName>System.String</TypeName>
        </Field>
        <Field Name="time_out">
          <DataField>time_out</DataField>
          <TypeName>System.String</TypeName>
        </Field>
        <Field Name="total_time">
          <DataField>total_time</DataField>
          <TypeName>System.Decimal</TypeName>
        </Field>
      </Fields>
    </DataSet>
  </DataSets>
  
  <!-- Report Body with Table Layout -->
  <Body>
    <ReportItems>
      <Table Name="ReportTable">
        <DataSetName>ReportDataSet_report_data</DataSetName>
        
        <!-- Table Groups for Organizing Data -->
        <TableGroups>
          <TableGroup>
            <Grouping Name="sortField">
              <GroupExpressions>
                <GroupExpression>=Fields!sortField.Value</GroupExpression>
              </GroupExpressions>
            </Grouping>
            <Header>
              <!-- Group Header Definition -->
              <TableRows>
                <TableRow>
                  <TableCells>
                    <TableCell>
                      <ReportItems>
                        <Textbox Name="textbox33">
                          <Value>=Fields!register_id.Value</Value>
                        </Textbox>
                      </ReportItems>
                    </TableCell>
                  </TableCells>
                </TableRow>
              </TableRows>
            </Header>
          </TableGroup>
        </TableGroups>
        
        <!-- Table Header with Column Names -->
        <Header>
          <TableRows>
            <TableRow>
              <TableCells>
                <TableCell>
                  <ReportItems>
                    <Textbox Name="tdate">
                      <Style>
                        <FontFamily>Verdana</FontFamily>
                        <FontSize>7.5pt</FontSize>
                        <FontWeight>700</FontWeight>
                      </Style>
                      <Value />
                    </Textbox>
                  </ReportItems>
                </TableCell>
                <TableCell>
                  <ReportItems>
                    <Textbox Name="tdepartment_clock">
                      <Style>
                        <FontFamily>Verdana</FontFamily>
                        <FontWeight>700</FontWeight>
                      </Style>
                      <Value />
                    </Textbox>
                  </ReportItems>
                </TableCell>
              </TableCells>
            </TableRow>
          </TableRows>
        </Header>
        
        <!-- Table Detail Rows -->
        <Details>
          <TableRows>
            <TableRow>
              <TableCells>
                <TableCell>
                  <ReportItems>
                    <Textbox Name="textbox5">
                      <Value>=Format(DateAdd("d",Fields!entry_date.Value,CDate("1-1-1900")),Parameters!DateSeparator.Value)</Value>
                    </Textbox>
                  </ReportItems>
                </TableCell>
                <TableCell>
                  <ReportItems>
                    <Textbox Name="textbox4">
                      <Value>=Fields!clock_dept_name.Value</Value>
                    </Textbox>
                  </ReportItems>
                </TableCell>
              </TableCells>
            </TableRow>
          </TableRows>
        </Details>
        
        <!-- Column Definitions -->
        <TableColumns>
          <TableColumn>
            <Width>0.70399in</Width>
          </TableColumn>
          <TableColumn>
            <Width>1.15196in</Width>
          </TableColumn>
        </TableColumns>
      </Table>
    </ReportItems>
  </Body>
</Report>
```

This simplified example shows the key structural elements of an RDLC file:

1. **Report Parameters** - Define customizable settings for the report
2. **DataSets and Fields** - Define the data structure and field types
3. **Table Structure** - Contains groupings, headers, and detail rows
4. **Textboxes** - Contain expressions that display data values
5. **Styling Information** - Define fonts, colors, borders, etc.

The AIReader application parses this XML structure to extract field definitions, understand relationships between data elements, and recreate the report layout in a web-based format.

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