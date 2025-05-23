import './styles.css';
import { data } from './enum.js';
import { formatDate, formatTime } from './utils.js';

// Constants and Configuration
let FIELD_MAPPINGS = {};
let FIELD_TYPES = {};
let CURRENT_FILE_NAME = '';

// Load saved mappings from localStorage
const loadSavedMappings = (fileName) => {
  const savedMappings = localStorage.getItem(`rdlcFieldMappings_${fileName}`);
  if (savedMappings) {
    FIELD_MAPPINGS = JSON.parse(savedMappings);
    console.log(`Loaded saved RDLC field mappings for ${fileName}:`, FIELD_MAPPINGS);
  } else {
    FIELD_MAPPINGS = {};
    console.log(`No saved mappings found for ${fileName}`);
  }
};

// Save mappings to localStorage
const saveMappings = () => {
  if (CURRENT_FILE_NAME) {
    localStorage.setItem(`rdlcFieldMappings_${CURRENT_FILE_NAME}`, JSON.stringify(FIELD_MAPPINGS));
    console.log(`Saved RDLC field mappings for ${CURRENT_FILE_NAME}:`, FIELD_MAPPINGS);
  }
};

// State management
let rdlcTemplate = null;
let isDataLoaded = false;

var rdlcDoc = null;

// DOM Elements
const elements = {
  uploadBtn: document.getElementById('upload-btn'),
  clearBtn: document.getElementById('clear-btn'),
  loadDataBtn: document.getElementById('load-data-btn'),
  rdlcFile: document.getElementById('rdlc-file'),
  fileInfo: document.getElementById('file-info'),
  rdlcStatus: document.getElementById('rdlc-status'),
  reportContainer: document.getElementById('report-container'),
  fieldMappingForm: document.getElementById('field-mapping-form'),
  toggleMappingBtn: document.getElementById('toggle-mapping-btn'),
  fieldMappingSection: document.getElementById('field-mapping-section')
};

// Utility Functions
const utils = {
  formatNumber: (value) => value.toFixed(2),
  
  convertWidthToPixels: (width) => {
    const widthValue = width.replace(/in$/, '').replace(/cm$/, '');
    if (width.includes('in')) {
      return parseFloat(widthValue) * 96; // inches to pixels
    }
    if (width.includes('cm')) {
      return parseFloat(widthValue) * 37.8; // cm to pixels
    }
    return parseFloat(widthValue);
  },

  updateStatus: (element, message, className) => {
    element.className = className;
    element.textContent = message;
  },

  // Helper function to find matching field in data
  findMatchingField: (fieldName, item) => {
    // Direct match
    if (item[fieldName] !== undefined) {
      return fieldName;
    }

    // Case-insensitive match
    const lowerFieldName = fieldName.toLowerCase();
    const matchingKey = Object.keys(item).find(key => 
      key.toLowerCase() === lowerFieldName || 
      key.toLowerCase().includes(lowerFieldName)
    );

    return matchingKey || null;
  },

  // Convert snake_case to camelCase
  snakeToCamel: (str) => {
    return str.toLowerCase().replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
  },

  // Convert camelCase to snake_case
  camelToSnake: (str) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },

  // Find matching data field for RDLC field
  findMatchingDataField: (rdlcField) => {
    const dataFields = Object.keys(data[0] || {});
    
    // Try direct match
    if (dataFields.includes(rdlcField)) {
      return rdlcField;
    }

    // Try camelCase match
    const camelCase = utils.snakeToCamel(rdlcField);
    if (dataFields.includes(camelCase)) {
      return camelCase;
    }

    // Try snake_case match
    const snakeCase = utils.camelToSnake(rdlcField);
    if (dataFields.includes(snakeCase)) {
      return snakeCase;
    }

    // Try case-insensitive match
    const lowerRdlcField = rdlcField.toLowerCase();
    const matchingField = dataFields.find(field => 
      field.toLowerCase() === lowerRdlcField ||
      field.toLowerCase().includes(lowerRdlcField) ||
      lowerRdlcField.includes(field.toLowerCase())
    );

    return matchingField || null;
  }
};

// RDLC Processing Functions
const rdlcProcessor = {
  extractFieldMappings: (rdlcDoc) => {
    const mappings = {};
    const fieldTypes = {}; // Store field types
    const dataSet = rdlcDoc.querySelector('DataSet[Name="ReportDataSet_report_data"]');
    
    if (dataSet) {
      const fields = dataSet.querySelectorAll('Field');
      fields.forEach(field => {
        const fieldName = field.getAttribute('Name');
        const dataField = field.querySelector('DataField')?.textContent;
        const typeName = field.querySelector('TypeName')?.textContent;
        if (fieldName && dataField) {
          mappings[fieldName] = dataField;
          if (typeName) {
            // Extract the type after "System."
            const type = typeName.split('.').pop();
            // Map System types to our format
            switch (type) {
              case 'Int32':
                fieldTypes[fieldName] = 'Number';
                break;
              case 'String':
                fieldTypes[fieldName] = 'String';
                break;
              case 'Guid':
                fieldTypes[fieldName] = 'Guid';
                break;
              default:
                fieldTypes[fieldName] = type;
            }
          }
        }
      });
    }

    // Also extract mappings from textbox names in the table
    const textboxes = rdlcDoc.querySelectorAll('Textbox');
    textboxes.forEach(textbox => {
      const name = textbox.getAttribute('Name');
      const valueElement = textbox.querySelector('Value');
      if (valueElement) {
        const valueText = valueElement.textContent;
        if (valueText.startsWith('=Fields!') && valueText.endsWith('.Value')) {
          const fieldMatch = valueText.match(/=Fields!([^.]+)\.Value/);
          if (fieldMatch && fieldMatch[1]) {
            const fieldName = fieldMatch[1];
            mappings[fieldName] = fieldName;
            // If we have type information for this field, include it
            if (fieldTypes[fieldName]) {
              mappings[`${fieldName}_type`] = fieldTypes[fieldName];
            }
          }
        }
      }
    });

    console.log('Extracted field mappings:', mappings);
    console.log('Field types:', fieldTypes);
    return { mappings, fieldTypes };
  },

  extractFieldName: (valueText) => {
    if (valueText.startsWith('=Fields!') && valueText.endsWith('.Value')) {
      const fieldMatch = valueText.match(/=Fields!([^.]+)\.Value/);
      return fieldMatch ? fieldMatch[1] : valueText;
    }
    if (valueText.startsWith('="') && valueText.endsWith('"')) {
      return valueText.substring(2, valueText.length - 1);
    }
    return valueText;
  },

  mapFieldName: (name) => {
    // First try to match the exact field name from the RDLC dataset
    const rdlcField = name.replace(/^(t|textbox)/, '');
    if (FIELD_MAPPINGS[rdlcField]) {
      return FIELD_MAPPINGS[rdlcField];
    }

    // Try case-insensitive match
    const lowerFieldName = rdlcField.toLowerCase();
    for (const [key, value] of Object.entries(FIELD_MAPPINGS)) {
      if (key.toLowerCase() === lowerFieldName) {
        return value;
      }
    }

    // Try partial match
    for (const [key, value] of Object.entries(FIELD_MAPPINGS)) {
      if (lowerFieldName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerFieldName)) {
        return value;
      }
    }

    // If no match found, return the original field name
    return rdlcField;
  },

  extractAggregations: (rdlcDoc) => {
    const aggregations = {};
    const textboxes = rdlcDoc.querySelectorAll('Textbox');
    
    textboxes.forEach(textbox => {
      const name = textbox.getAttribute('Name');
      const valueElement = textbox.querySelector('Value');
      if (valueElement) {
        const valueText = valueElement.textContent;
        if (valueText.startsWith('=Sum(') || valueText.startsWith('=Count(')) {
          const fieldMatch = valueText.match(/=Sum\(Fields!([^.]+)\.Value\)/) || 
                           valueText.match(/=Count\(Fields!([^.]+)\.Value\)/);
          if (fieldMatch && fieldMatch[1]) {
            aggregations[name] = {
              field: fieldMatch[1],
              type: valueText.startsWith('=Sum(') ? 'sum' : 'count'
            };
          }
        }
      }
    });
    
    return aggregations;
  },

  createFieldMappingForm: (rdlcDoc) => {
    const form = document.createElement('form');
    form.id = 'field-mapping-form';
    form.className = 'field-mapping-form';

    // Add header row
    const headerRow = document.createElement('div');
    headerRow.className = 'field-mapping-header-row';
    
    const visibilityLabel = document.createElement('label');
    visibilityLabel.textContent = 'Visible';
    visibilityLabel.className = 'field-mapping-header-label';
    
    const reportItemsLabel = document.createElement('label');
    reportItemsLabel.textContent = 'Report Items';
    reportItemsLabel.className = 'field-mapping-header-label';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    nameLabel.className = 'field-mapping-header-label';
    
    const fieldLabel = document.createElement('label');
    fieldLabel.textContent = 'Data Sets';
    fieldLabel.className = 'field-mapping-header-label';
    
    headerRow.appendChild(visibilityLabel);
    headerRow.appendChild(reportItemsLabel);
    headerRow.appendChild(nameLabel);
    headerRow.appendChild(fieldLabel);
    form.appendChild(headerRow);

    // Get the table structure first
    const table = rdlcDoc.querySelector('Table[Name="ReportTable"]');
    if (!table) return null;

    // Get column headers from the Header section that's directly under Table
    const headers = [];
    const headerSection = table.querySelector(':scope > Header');
    if (headerSection) {
      const headerRows = headerSection.querySelectorAll('TableRow');
      headerRows.forEach(row => {
        const cells = row.querySelectorAll('TableCell');
        cells.forEach(cell => {
          const reportItems = cell.querySelector('ReportItems');
          if (reportItems) {
            const textbox = reportItems.querySelector('Textbox');
            if (textbox) {
              const name = textbox.getAttribute('Name');
              const valueElement = textbox.querySelector('Value');
              const colSpan = cell.getAttribute('ColSpan');
              
              let label = '';
              let fieldName = '';
              if (valueElement) {
                const valueText = valueElement.textContent;
                if (valueText.startsWith('=Fields!') && valueText.endsWith('.Value')) {
                  const fieldMatch = valueText.match(/=Fields!([^.]+)\.Value/);
                  if (fieldMatch && fieldMatch[1]) {
                    fieldName = fieldMatch[1];
                    label = fieldName;
                  }
                } else if (valueText.startsWith('="') && valueText.endsWith('"')) {
                  label = valueText.substring(2, valueText.length - 1);
                } else {
                  label = valueText;
                }
              }

              headers.push({
                name,
                label,
                fieldName,
                colSpan: colSpan ? parseInt(colSpan) : 1
              });
            }
          }
        });
      });
    }

    // Get saved mappings
    const savedMappings = localStorage.getItem(`rdlcFieldMappings_${CURRENT_FILE_NAME}`);
    const mappings = savedMappings ? JSON.parse(savedMappings) : {};

    // Create mapping rows for each header
    headers.forEach(header => {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'field-mapping-row';

      // Add visibility checkbox
      const visibilityCheckbox = document.createElement('input');
      visibilityCheckbox.type = 'checkbox';
      visibilityCheckbox.name = `${header.name}_visible`;
      visibilityCheckbox.className = 'field-mapping-checkbox';
      // Set initial state from saved mappings - default to unchecked if not found
      visibilityCheckbox.checked = mappings[header.name]?.visible === true;

      const label = document.createElement('label');
      // Show the actual field name from the RDLC file
      label.textContent = header.fieldName || header.name;
      label.title = `RDLC Field: ${header.name}`;

      const headerInput = document.createElement('input');
      headerInput.type = 'text';
      headerInput.name = `${header.name}_header`;
      headerInput.className = 'field-mapping-header';
      headerInput.placeholder = 'Custom Header';
      headerInput.value = mappings[header.name]?.header ?? header.label;

      // Add RDLC field type select
      const rdlcFieldSelect = document.createElement('select');
      rdlcFieldSelect.name = `${header.name}_rdlc_field`;
      rdlcFieldSelect.className = 'field-mapping-select';
      
      // Add empty option
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Select Data Field --';
      rdlcFieldSelect.appendChild(emptyOption);

      // Add hidden input for data field
      const dataFieldInput = document.createElement('input');
      dataFieldInput.type = 'hidden';
      dataFieldInput.name = header.name;
      dataFieldInput.value = mappings[header.name]?.field || '';

      // Check if data is loaded
      if (isDataLoaded && data && data.length > 0) {
        // Add RDLC field options only if data is loaded
        Object.entries(FIELD_MAPPINGS)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([fieldName, fieldValue]) => {
            const option = document.createElement('option');
            option.value = fieldName;
            const fieldType = FIELD_TYPES[fieldName];
            option.textContent = `${fieldName} (${fieldType || 'Unknown'})`;
            if (fieldName === mappings[header.name]?.rdlcField || fieldName === header.fieldName) {
              option.selected = true;
              // Set the initial data field value when RDLC field is selected
              const matchingField = utils.findMatchingDataField(fieldName);
              if (matchingField) {
                dataFieldInput.value = matchingField;
              }
            }
            rdlcFieldSelect.appendChild(option);
          });
      } else {
        // If data is not loaded, only show saved value if it exists
        const savedField = mappings[header.name]?.rdlcField;
        if (savedField) {
          const option = document.createElement('option');
          option.value = savedField;
          option.textContent = savedField;
          option.selected = true;
          rdlcFieldSelect.appendChild(option);
        }
      }

      // Add change event listener to update data field when RDLC field changes
      rdlcFieldSelect.addEventListener('change', (e) => {
        const selectedField = e.target.value;
        if (selectedField) {
          const matchingField = utils.findMatchingDataField(selectedField);
          if (matchingField) {
            dataFieldInput.value = matchingField;
          }
        } else {
          dataFieldInput.value = '';
        }
      });

      fieldContainer.appendChild(visibilityCheckbox);
      fieldContainer.appendChild(label);
      fieldContainer.appendChild(headerInput);
      fieldContainer.appendChild(rdlcFieldSelect);
      fieldContainer.appendChild(dataFieldInput);
      form.appendChild(fieldContainer);
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Apply Field Mapping';
    submitButton.className = 'action-btn';
    form.appendChild(submitButton);

    return form;
  },

  processRdlcTemplate: (rdlcDoc) => {
    // Extract field mappings from the RDLC file
    const { mappings, fieldTypes } = rdlcProcessor.extractFieldMappings(rdlcDoc);
    FIELD_MAPPINGS = mappings;
    FIELD_TYPES = fieldTypes;

    // Create the field mapping form
    const form = rdlcProcessor.createFieldMappingForm(rdlcDoc);
    if (form) {
      const existingForm = document.getElementById('field-mapping-form');
      if (existingForm) {
        existingForm.remove();
      }
      elements.fieldMappingSection.appendChild(form);
    }

    elements.toggleMappingBtn.style.display = 'block';

    const table = rdlcDoc.querySelector('Table[Name="ReportTable"]');
    if (!table) {
      throw new Error('No Table element found in RDLC file');
    }

    const columns = [];
    const tableColumns = table.querySelectorAll('TableColumn');
    tableColumns.forEach(col => {
      const width = col.querySelector('Width')?.textContent;
      columns.push({ width });
    });

    const headers = [];
    // First, get the main header rows
    const headerSection = table.querySelector(':scope > Header');
    if (headerSection) {
      const headerRows = headerSection.querySelectorAll('TableRow');
      headerRows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('TableCell');
        cells.forEach(cell => {
          const textbox = cell.querySelector('ReportItems Textbox');
          if (textbox) {
            const name = textbox.getAttribute('Name');
            const valueElement = textbox.querySelector('Value');
            const colSpan = cell.querySelector('ColSpan')?.textContent;
            
            // Get all style properties
            const style = {
              backgroundColor: textbox.querySelector('Style BackgroundColor')?.textContent,
              fontFamily: textbox.querySelector('Style FontFamily')?.textContent,
              fontSize: textbox.querySelector('Style FontSize')?.textContent,
              fontWeight: textbox.querySelector('Style FontWeight')?.textContent,
              textAlign: textbox.querySelector('Style TextAlign')?.textContent,
              borderStyle: textbox.querySelector('Style BorderStyle')?.textContent,
              borderWidth: textbox.querySelector('Style BorderWidth Default')?.textContent
            };

            // Create header object
            const header = {
              name,
              label: '',
              field: null,
              type: 'String',
              colSpan: colSpan ? parseInt(colSpan) : 1,
              rowIndex: rowIndex,
              style: style,
              isGroupHeader: false
            };

            if (valueElement) {
              const valueText = valueElement.textContent;
              if (valueText.startsWith('=Fields!') && valueText.endsWith('.Value')) {
                const fieldMatch = valueText.match(/=Fields!([^.]+)\.Value/);
                if (fieldMatch && fieldMatch[1]) {
                  const fieldName = fieldMatch[1];
                  header.label = fieldName;
                  header.field = fieldName;
                  header.type = FIELD_TYPES[fieldName] || 'Unknown';
                }
              } else if (valueText) {
                // Handle static text in headers
                header.label = valueText.replace(/^="|"$/g, '');
              }
            }

            headers.push(header);
          }
        });
      });
    }

    // Now get the TableGroup headers
    const tableGroups = table.querySelectorAll('TableGroup');
    tableGroups.forEach((group, groupIndex) => {
      const groupHeader = group.querySelector('Header');
      if (groupHeader) {
        const groupRows = groupHeader.querySelectorAll('TableRow');
        groupRows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('TableCell');
          cells.forEach(cell => {
            const textbox = cell.querySelector('ReportItems Textbox');
            if (textbox) {
              const name = textbox.getAttribute('Name');
              const valueElement = textbox.querySelector('Value');
              const colSpan = cell.querySelector('ColSpan')?.textContent;
              
              // Get all style properties
              const style = {
                backgroundColor: textbox.querySelector('Style BackgroundColor')?.textContent,
                fontFamily: textbox.querySelector('Style FontFamily')?.textContent,
                fontSize: textbox.querySelector('Style FontSize')?.textContent,
                fontWeight: textbox.querySelector('Style FontWeight')?.textContent,
                textAlign: textbox.querySelector('Style TextAlign')?.textContent,
                borderStyle: textbox.querySelector('Style BorderStyle')?.textContent,
                borderWidth: textbox.querySelector('Style BorderWidth Default')?.textContent
              };

              // Create header object for group header
              const header = {
                name,
                label: '',
                field: null,
                type: 'String',
                colSpan: colSpan ? parseInt(colSpan) : 1,
                rowIndex: rowIndex + 2, // Add 2 to account for main header rows
                style: style,
                isGroupHeader: true,
                groupIndex: groupIndex
              };

              if (valueElement) {
                const valueText = valueElement.textContent;
                if (valueText.startsWith('=Fields!') && valueText.endsWith('.Value')) {
                  const fieldMatch = valueText.match(/=Fields!([^.]+)\.Value/);
                  if (fieldMatch && fieldMatch[1]) {
                    const fieldName = fieldMatch[1];
                    header.label = fieldName;
                    header.field = fieldName;
                    header.type = FIELD_TYPES[fieldName] || 'Unknown';
                  }
                } else if (valueText) {
                  // Handle static text in headers
                  header.label = valueText.replace(/^="|"$/g, '');
                }
              }

              headers.push(header);
            }
          });
        });
      }
    });

    if (headers.length === 0) {
      throw new Error('No valid column definitions found in RDLC');
    }

    return { columns, headers };
  }
};

// Table Management Functions
const tableManager = {
  createTableStructure: () => {
    const placeholder = document.getElementById('report-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    let table = document.getElementById('report-table');
    if (table) {
      table.innerHTML = '';
    } else {
      table = document.createElement('table');
      table.id = 'report-table';
      table.className = 'report-table';
      elements.reportContainer.appendChild(table);
    }

    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const tfoot = document.createElement('tfoot');
    
    table.appendChild(thead);
    table.appendChild(tbody);
    table.appendChild(tfoot);
    
    return { table, thead, tbody, tfoot };
  },

  createHeaderRow: (headerDefinitions) => {
    // Group headers by their row index
    const headerRows = {};
    // Filter visible headers BEFORE grouping by row index
    const visibleHeaders = headerDefinitions.filter(header => {
        const mapping = FIELD_MAPPINGS[header.name] || {};
        return mapping.visible !== false; // Only include visible fields
    });

    visibleHeaders.forEach(header => {
        if (!headerRows[header.rowIndex]) {
          headerRows[header.rowIndex] = [];
        }
        headerRows[header.rowIndex].push(header);
    });

    // Create header rows in order
    const rows = [];
    Object.keys(headerRows).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rowIndex => {
      const row = document.createElement('tr');
      // Headers within the same row need to be sorted by their original position
      const sortedRowHeaders = headerRows[rowIndex].sort((a, b) => {
          const originalIndexA = headerDefinitions.findIndex(h => h === a);
          const originalIndexB = headerDefinitions.findIndex(h => h === b);
          return originalIndexA - originalIndexB;
      });

      sortedRowHeaders.forEach(header => {
        const th = document.createElement('th');
        // Use custom header if available, otherwise use the original label
        const mapping = FIELD_MAPPINGS[header.name] || {};
        th.textContent = mapping.header ?? header.label; // Use custom header or original label/field name

        // Set data-field attribute for mapping (using original RDLC header name)
        if (header.name) {
          th.setAttribute('data-field', header.name);
        }

        // Handle colspan from the parsed header definition
        if (header.colSpan > 1) {
          th.setAttribute('colspan', header.colSpan);
        } else {
          // Ensure colspan is 1 if not specified or is 1
          th.setAttribute('colspan', 1);
        }

        // Apply styles
        if (header.style) {
          Object.entries(header.style).forEach(([key, value]) => {
            if (value) {
              th.style[key] = value;
            } else {
              // Clear style if value is null or empty
              th.style[key] = '';
            }
          });
        }

        // Add additional header styling
        th.style.fontSize = '10pt'; // Make text bigger
        th.style.textAlign = 'center'; // Center the text
        th.style.padding = '8px'; // Add some padding
        th.style.fontWeight = 'bold'; // Make text bold
        th.style.border = '1px solid #ddd'; // Add border

        // Apply different styling for group headers
        if (header.isGroupHeader) {
          th.style.backgroundColor = '#e6f3ff'; // Light blue background for group headers
          th.style.fontSize = '9pt'; // Slightly smaller font for group headers
          th.style.fontStyle = 'italic'; // Italicize group headers
        } else {
          th.style.backgroundColor = '#f5f5f5'; // Light gray background for main headers
        }

        row.appendChild(th);
      });

      rows.push(row);
    });

    return rows;
  },

  createDataRows: (data, headerDefinitions) => {
    // Filter visible headers that belong to the second header row (rowIndex 1) and sort them
    // by their original appearance in the headerDefinitions array to preserve visual order.
    const secondRowVisibleHeaders = headerDefinitions
      .filter(header => {
        const mapping = FIELD_MAPPINGS[header.name] || {};
        // Assuming the second header row is at rowIndex 1 (0-indexed)
        return header.rowIndex === 1 && mapping.visible !== false;
      })
      .sort((a, b) => { // Sort by their position in the original headerDefinitions array
          const originalIndexA = headerDefinitions.findIndex(h => h === a);
          const originalIndexB = headerDefinitions.findIndex(h => h === b);
          return originalIndexA - originalIndexB;
      });

    return data.map(item => {
      const cells = [];

      // Iterate through the visible headers of the second row and create a data cell for each
      secondRowVisibleHeaders.forEach(header => {
        const mapping = FIELD_MAPPINGS[header.name] || {};
        const colSpan = header.colSpan || 1; // Get the colspan from the header definition

        let formattedValue = '';
        // Only add content if there is a data field mapping for this header
        if (mapping.field) {
          const value = item[mapping.field];

          if (value !== null && value !== undefined) {
            if (typeof value === 'number') {
              if (mapping.field.toLowerCase().includes('date')) {
                formattedValue = formatDate(value);
              } else if (mapping.field.toLowerCase().includes('time')) {
                formattedValue = formatTime(value);
              } else {
                formattedValue = utils.formatNumber(value);
              }
            } else {
              formattedValue = value;
            }
          }
        }

        // Create the table cell with the determined content and the header's colspan
        cells.push(`<td colspan="${colSpan}">${formattedValue}</td>`);
      });

      return `<tr>${cells.join('')}</tr>`;
    }).join('');
  },

  createFooterRow: (headerDefinitions, data) => {
    const totalField = headerDefinitions.find(h => FIELD_MAPPINGS[h.name] === 'total_time')?.name;
    if (!totalField) return '';

    const mappedTotalField = FIELD_MAPPINGS[totalField];
    const total = data.reduce((sum, item) => sum + (parseFloat(item[mappedTotalField]) || 0), 0);
    const totalFieldIndex = headerDefinitions.findIndex(h => h.name === totalField);

    return `<tr>${headerDefinitions.map((header, index) => {
      if (index === totalFieldIndex) {
        return `<td class="total-value">${utils.formatNumber(total)}</td>`;
      }
      if (index === totalFieldIndex - 1) {
        return '<td class="total-label">Total:</td>';
      }
      return '<td></td>';
    }).join('')}</tr>`;
  }
};

// Event Handlers
const handlers = {
  clearAll: () => {
    // Clear the file input
    elements.rdlcFile.value = '';
    
    // Clear file info and status
    elements.fileInfo.textContent = '';
    utils.updateStatus(elements.rdlcStatus, '', '');
    
    // Hide field mapping section and toggle button
    elements.fieldMappingSection.style.display = 'none';
    elements.toggleMappingBtn.style.display = 'none';
    
    // Remove the field mapping form if it exists
    const existingForm = document.getElementById('field-mapping-form');
    if (existingForm) {
      existingForm.remove();
    }
    
    // Clear the report table
    const table = document.getElementById('report-table');
    if (table) {
      table.remove();
    }
    
    // Reset global variables
    rdlcTemplate = null;
    CURRENT_FILE_NAME = '';
    FIELD_MAPPINGS = {};
    FIELD_TYPES = {};
    
    // Show the placeholder
    const placeholder = document.getElementById('report-placeholder');
    if (placeholder) {
      placeholder.style.display = 'block';
    }

    // Disable Load Data button
    elements.loadDataBtn.disabled = true;
  },

  handleFileUpload: async (e) => {
    const file = e.target.files[0];
    if (!file) {
      utils.updateStatus(elements.fileInfo, 'No file selected', '');
      utils.updateStatus(elements.rdlcStatus, '', '');
      elements.toggleMappingBtn.style.display = 'none';
      elements.fieldMappingSection.style.display = 'none';
      CURRENT_FILE_NAME = '';
      elements.loadDataBtn.disabled = true;
      return;
    }

    CURRENT_FILE_NAME = file.name;
    elements.fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    elements.rdlcStatus.className = 'status-message loading';
    elements.rdlcStatus.textContent = 'Processing RDLC file...';

    try {
      const contents = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      rdlcDoc = new DOMParser().parseFromString(contents, "application/xml");
      rdlcTemplate = rdlcProcessor.processRdlcTemplate(rdlcDoc);

      // Load saved mappings for this file
      loadSavedMappings(CURRENT_FILE_NAME);

      // Create table structure immediately
      const { thead, tbody, tfoot } = tableManager.createTableStructure();
      
      if (!rdlcTemplate.headers?.length) {
        utils.updateStatus(elements.rdlcStatus, 'No valid column definitions found in RDLC.', 'error-message');
        return;
      }

      // Get the saved mappings for the current file
      const savedMappings = localStorage.getItem(`rdlcFieldMappings_${CURRENT_FILE_NAME}`);
      let visibleHeaders = [];
      if (savedMappings) {
        FIELD_MAPPINGS = JSON.parse(savedMappings);
        console.log('Loaded saved mappings:', FIELD_MAPPINGS);
        // Only include headers that are present in saved mappings and visible
        visibleHeaders = rdlcTemplate.headers.filter(header => {
          const mapping = FIELD_MAPPINGS[header.name];
          return mapping && mapping.visible === true;
        });
      } else {
        // If no saved mappings, show all headers by default
        visibleHeaders = rdlcTemplate.headers;
      }

      // Create all header rows
      const headerRows = tableManager.createHeaderRow(visibleHeaders);
      headerRows.forEach(row => thead.appendChild(row));

      tbody.innerHTML = ''; // Empty tbody for now
      tfoot.innerHTML = ''; // Empty tfoot for now

      elements.rdlcStatus.className = 'status-message success-message';
      elements.rdlcStatus.textContent = 'RDLC file processed successfully. Click "Load Data" to display the data.';

      // Enable Load Data button
      elements.loadDataBtn.disabled = false;
    } catch (error) {
      console.error('Error processing RDLC file:', error);
      elements.rdlcStatus.className = 'status-message error-message';
      elements.rdlcStatus.textContent = 'Error processing RDLC file. Please check the console for details.';
      elements.loadDataBtn.disabled = true;
    }
  },

  loadData: () => {
    if (!rdlcTemplate) {
      alert('No valid RDLC template loaded.');
      return;
    }

    try {
      const { thead, tbody, tfoot } = tableManager.createTableStructure();
      
      if (!rdlcTemplate.headers?.length) {
        utils.updateStatus(elements.rdlcStatus, 'No valid column definitions found in RDLC.', 'error-message');
        return;
      }

      // Get the saved mappings for the current file
      const savedMappings = localStorage.getItem(`rdlcFieldMappings_${CURRENT_FILE_NAME}`);
      let visibleHeaders = [];
      if (savedMappings) {
        FIELD_MAPPINGS = JSON.parse(savedMappings);
        console.log('Loaded saved mappings:', FIELD_MAPPINGS);
        // Only include headers that are present in saved mappings and visible
        visibleHeaders = rdlcTemplate.headers.filter(header => {
          const mapping = FIELD_MAPPINGS[header.name];
          return mapping && mapping.visible === true;
        });
      } else {
        // If no saved mappings, show nothing (or you could show all by default)
        visibleHeaders = [];
      }

      // Create all header rows
      const headerRows = tableManager.createHeaderRow(visibleHeaders);
      headerRows.forEach(row => thead.appendChild(row));

      tbody.innerHTML = tableManager.createDataRows(data, visibleHeaders);
      tfoot.innerHTML = tableManager.createFooterRow(visibleHeaders, data);

      utils.updateStatus(elements.rdlcStatus, 'Data loaded successfully.', 'success-message');

      isDataLoaded = true;

      // Recreate the field mapping form with updated data fields
      rdlcProcessor.processRdlcTemplate(rdlcDoc);
      const form = rdlcProcessor.createFieldMappingForm(rdlcDoc);
      if (form) {
        const existingForm = document.getElementById('field-mapping-form');
        if (existingForm) {
          existingForm.remove();
        }
        elements.fieldMappingSection.appendChild(form);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      utils.updateStatus(elements.rdlcStatus, 'Error loading data. Please check the console for details.', 'error-message');
    }
  },

  handleFieldMappingSubmit: (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // Clear existing mappings
    FIELD_MAPPINGS = {};
    
    // First, collect all visible fields
    const visibleFields = new Set();
    for (const [key, value] of formData.entries()) {
      if (key.endsWith('_visible') && value === 'on') {
        const fieldName = key.replace('_visible', '');
        visibleFields.add(fieldName);
      }
    }
    
    // Update field mappings based on form selections
    for (const [key, value] of formData.entries()) {
      if (key.endsWith('_header')) {
        // This is a header input
        const fieldName = key.replace('_header', '');
        if (visibleFields.has(fieldName)) {
          if (!FIELD_MAPPINGS[fieldName]) {
            FIELD_MAPPINGS[fieldName] = {};
          }
          FIELD_MAPPINGS[fieldName].header = value;
        }
      } else if (key.endsWith('_rdlc_field')) {
        // This is an RDLC field selection
        const fieldName = key.replace('_rdlc_field', '');
        if (visibleFields.has(fieldName)) {
          if (!FIELD_MAPPINGS[fieldName]) {
            FIELD_MAPPINGS[fieldName] = {};
          }
          FIELD_MAPPINGS[fieldName].rdlcField = value;
          // Find and set the matching data field
          if (value) {
            FIELD_MAPPINGS[fieldName].field = utils.findMatchingDataField(value);
          }
        }
      } else if (key.endsWith('_visible')) {
        // This is a visibility checkbox
        const fieldName = key.replace('_visible', '');
        if (value === 'on') {
          if (!FIELD_MAPPINGS[fieldName]) {
            FIELD_MAPPINGS[fieldName] = {};
          }
          FIELD_MAPPINGS[fieldName].visible = true;
          console.log(`Setting visibility for ${fieldName} to true`);
        } else {
          // If field is not visible, remove it from mappings
          delete FIELD_MAPPINGS[fieldName];
          console.log(`Removing ${fieldName} from mappings`);
        }
      } else if (!key.endsWith('_visible') && !key.endsWith('_header') && !key.endsWith('_rdlc_field')) {
        // This is a data field value
        const fieldName = key;
        if (visibleFields.has(fieldName) && value) {
          if (!FIELD_MAPPINGS[fieldName]) {
            FIELD_MAPPINGS[fieldName] = {};
          }
          FIELD_MAPPINGS[fieldName].field = value;
        }
      }
    }

    console.log('Updated RDLC field mappings:', FIELD_MAPPINGS);
    saveMappings(); // Save mappings after update

    // Apply the template with new mappings
    handlers.applyTemplateButtonHandler();
  },

  applyTemplateButtonHandler: () => {
    if (!rdlcTemplate) {
      alert('No valid RDLC template loaded.');
      return;
    }

    try {
      const { thead, tbody, tfoot } = tableManager.createTableStructure();
      
      if (!rdlcTemplate.headers?.length) {
        utils.updateStatus(elements.rdlcStatus, 'No valid column definitions found in RDLC.', 'error-message');
        return;
      }

      // Get the saved mappings for the current file
      const savedMappings = localStorage.getItem(`rdlcFieldMappings_${CURRENT_FILE_NAME}`);
      let visibleHeaders = [];
      if (savedMappings) {
        FIELD_MAPPINGS = JSON.parse(savedMappings);
        console.log('Loaded saved mappings:', FIELD_MAPPINGS);
        // Only include headers that are present in saved mappings and visible
        visibleHeaders = rdlcTemplate.headers.filter(header => {
          const mapping = FIELD_MAPPINGS[header.name];
          return mapping && mapping.visible === true;
        });
      } else {
        // If no saved mappings, show nothing (or you could show all by default)
        visibleHeaders = [];
      }

      // Create all header rows
      const headerRows = tableManager.createHeaderRow(visibleHeaders);
      headerRows.forEach(row => thead.appendChild(row));

      tbody.innerHTML = tableManager.createDataRows(data, visibleHeaders);
      tfoot.innerHTML = tableManager.createFooterRow(visibleHeaders, data);

      utils.updateStatus(elements.rdlcStatus, 'RDLC template applied successfully with new field mappings.', 'success-message');
    } catch (error) {
      console.error('Error applying RDLC template:', error);
      utils.updateStatus(elements.rdlcStatus, 'Error applying template. Please check the console for details.', 'error-message');
    }
  }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  loadSavedMappings(); // Load saved mappings when page loads
  
  elements.uploadBtn.addEventListener('click', () => elements.rdlcFile.click());
  elements.clearBtn.addEventListener('click', handlers.clearAll);
  elements.loadDataBtn.addEventListener('click', handlers.loadData);
  elements.loadDataBtn.disabled = true; // Initially disable the Load Data button
  
  elements.rdlcFile.addEventListener('change', handlers.handleFileUpload);
  
  // Add event listener for field mapping form submission
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'field-mapping-form') {
      handlers.handleFieldMappingSubmit(e);
    }
  });

  // Add event listener for toggle mapping button
  elements.toggleMappingBtn.addEventListener('click', () => {
    const isVisible = elements.fieldMappingSection.style.display === 'block';
    elements.fieldMappingSection.style.display = isVisible ? 'none' : 'block';
    elements.toggleMappingBtn.textContent = isVisible ? 'Show Field Mapping' : 'Hide Field Mapping';
  });
});