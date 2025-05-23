import './styles.css';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// State management
let pdfDocument = null;
let extractedData = null;

// DOM Elements
const elements = {
  uploadBtn: document.getElementById('upload-btn'),
  pdfFile: document.getElementById('pdf-file'),
  fileInfo: document.getElementById('file-info'),
  pdfStatus: document.getElementById('pdf-status'),
  reportContainer: document.getElementById('report-container'),
  clearBtn: document.getElementById('clear-btn')
};

// Utility Functions
const utils = {
  formatNumber: (value) => value.toFixed(2),
  
  updateStatus: (element, message, className) => {
    element.className = className;
    element.textContent = message;
  },

  // Helper function to detect if text is a number
  isNumeric: (str) => {
    if (typeof str !== 'string') return false;
    return !isNaN(str) && !isNaN(parseFloat(str));
  },

  // Helper function to clean text
  cleanText: (text) => {
    return text.trim().replace(/\s+/g, ' ');
  }
};

// PDF Processing Functions
const pdfProcessor = {
  async loadPDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return true;
    } catch (error) {
      console.error('Error loading PDF:', error);
      return false;
    }
  },

  async extractTextFromPage(pageNumber) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items.map(item => item.str).join(' ');
  },

  detectTableStructure(textContent) {
    // Split text into lines and clean them
    const lines = textContent.split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    console.log('Processing lines:', lines);
    
    // Try to detect headers by looking for consistent patterns
    const potentialHeaders = this.findPotentialHeaders(lines);
    console.log('Detected headers:', potentialHeaders);
    
    if (potentialHeaders.length === 0) {
      console.warn('No headers detected, trying alternative detection method');
      // Try to detect headers by looking for lines with consistent spacing
      const firstLine = lines[0];
      const columns = firstLine.split(/\s{2,}|\t+/).filter(col => col.trim());
      if (columns.length > 1) {
        potentialHeaders.push(...columns.map(col => utils.cleanText(col)));
      }
    }
    
    // Extract data rows based on the detected structure
    const data = this.extractDataRows(lines, potentialHeaders);
    console.log('Extracted data rows:', data);
    
    return {
      headers: potentialHeaders,
      data: data
    };
  },

  findPotentialHeaders(lines) {
    // Look for lines that might be headers (usually first few non-empty lines)
    const potentialHeaders = [];
    const headerCandidates = lines.slice(0, 5); // Check first 5 lines

    for (const line of headerCandidates) {
      // Split line by multiple spaces or tabs
      const columns = line.split(/\s{2,}|\t+/).filter(col => col.trim());
      
      if (columns.length > 1) {
        // This line has multiple columns, likely a header
        const cleanedColumns = columns.map(col => utils.cleanText(col));
        // Only add if we don't already have these headers
        if (!potentialHeaders.length || 
            cleanedColumns.length === potentialHeaders.length) {
          potentialHeaders.push(...cleanedColumns);
          break; // Stop after finding the first good header row
        }
      }
    }

    return potentialHeaders;
  },

  extractDataRows(lines, headers) {
    const data = [];
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Skip if we're supposed to skip this line
      if (skipNext) {
        skipNext = false;
        continue;
      }

      // Split line by multiple spaces or tabs
      const columns = line.split(/\s{2,}|\t+/).filter(col => col.trim());
      
      if (columns.length > 1) {
        // This line has multiple columns, likely a data row
        const row = {};
        let isValidRow = true;

        columns.forEach((col, index) => {
          if (index < headers.length) {
            const value = utils.cleanText(col);
            // Check if this looks like a header row (all non-numeric)
            if (i < 5 && !utils.isNumeric(value)) {
              isValidRow = false;
            }
            row[headers[index]] = utils.isNumeric(value) ? parseFloat(value) : value;
          }
        });

        // Only add the row if it looks like data (not a header)
        if (isValidRow && Object.keys(row).length > 0) {
          data.push(row);
        }
      }
    }

    return data;
  },

  async processPDF() {
    if (!pdfDocument) return null;

    let allText = '';
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      allText += await this.extractTextFromPage(i) + '\n';
    }

    return this.detectTableStructure(allText);
  }
};

// Table Management Functions
const tableManager = {
  createTableStructure: () => {
    const placeholder = document.getElementById('report-placeholder');
    if (placeholder) placeholder.remove();

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
    
    table.appendChild(thead);
    table.appendChild(tbody);
    
    return { table, thead, tbody };
  },

  createHeaderRow: (headers) => {
    const headerRow = document.createElement('tr');
    // Skip the first header if it's "Raw Reader Data" and create a title instead
    const titleText = headers[0] === 'Raw Reader Data' ? headers[0] : null;
    const displayHeaders = titleText ? headers.slice(1) : headers;

    if (titleText) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'report-title';
      titleDiv.textContent = titleText;
      elements.reportContainer.insertBefore(titleDiv, elements.reportContainer.firstChild);
    }

    displayHeaders.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    return headerRow;
  },

  createDataRows: (data, headers) => {
    return data.map(item => {
      const cells = headers.map(header => {
        const value = item[header];
        return `<td>${typeof value === 'number' ? utils.formatNumber(value) : value}</td>`;
      }).join('');
      
      return `<tr>${cells}</tr>`;
    }).join('');
  }
};

// Event Handlers
const handlers = {
  handleFileUpload: async (e) => {
    const file = e.target.files[0];
    if (!file) {
      utils.updateStatus(elements.fileInfo, 'No file selected', '');
      utils.updateStatus(elements.pdfStatus, '', '');
      return;
    }

    elements.fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    utils.updateStatus(elements.pdfStatus, 'Processing PDF file...', 'loading');

    try {
      const success = await pdfProcessor.loadPDF(file);
      if (success) {
        utils.updateStatus(elements.pdfStatus, 'Extracting grid data...', 'loading');
        
        const result = await pdfProcessor.processPDF();
        if (!result || !result.headers || !result.data) {
          throw new Error('Failed to extract grid data from PDF');
        }

        const { thead, tbody } = tableManager.createTableStructure();
        thead.appendChild(tableManager.createHeaderRow(result.headers));
        tbody.innerHTML = tableManager.createDataRows(result.data, result.headers);

        utils.updateStatus(elements.pdfStatus, 'Grid data extracted successfully.', 'success-message');
      } else {
        throw new Error('Failed to load PDF file');
      }
    } catch (error) {
      console.error('Error processing PDF file:', error);
      utils.updateStatus(elements.pdfStatus, 'Error processing PDF file. Please check the console for details.', 'error-message');
    }
  },

  clearAll: () => {
    // Clear the PDF document
    pdfDocument = null;
    extractedData = null;

    // Clear the file input
    elements.pdfFile.value = '';

    // Clear the file info and status
    elements.fileInfo.textContent = '';
    elements.pdfStatus.textContent = '';
    elements.pdfStatus.className = '';

    // Clear the report container
    elements.reportContainer.innerHTML = `
      <div id="report-placeholder" class="report-placeholder">
        No PDF file loaded. Please upload a PDF file to extract grid data.
      </div>
    `;
  }
};

// Initialize application
document?.addEventListener('DOMContentLoaded', () => {
  elements.uploadBtn?.addEventListener('click', () => elements.pdfFile?.click());
  elements.pdfFile?.addEventListener('change', handlers.handleFileUpload);
  elements.clearBtn?.addEventListener('click', handlers.clearAll);
}); 