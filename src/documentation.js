import './styles.css';
import { marked } from 'marked';
import documentationContent from '../documentation.md';

document.addEventListener('DOMContentLoaded', () => {
  const contentContainer = document.getElementById('documentation-content');
  if (contentContainer) {
    // Convert markdown to HTML with proper styling
    contentContainer.innerHTML = marked(documentationContent);
    
    // Add section dividers and classes for better visualization
    addSectionStyling(contentContainer);
  }
});

// Function to add section styling and dividers
function addSectionStyling(container) {
  // Get all h2 elements
  const h2Elements = container.querySelectorAll('h2');
  
  h2Elements.forEach(h2 => {
    // Create a section div
    const section = document.createElement('div');
    section.className = 'section';
    
    // Get all elements between this h2 and the next h2
    let currentElement = h2.nextElementSibling;
    const elementsInSection = [];
    
    while (currentElement && currentElement.tagName !== 'H2') {
      elementsInSection.push(currentElement);
      currentElement = currentElement.nextElementSibling;
    }
    
    // Move h2 and all related elements into the section div
    h2.parentNode.insertBefore(section, h2);
    section.appendChild(h2);
    
    elementsInSection.forEach(element => {
      section.appendChild(element);
    });
  });
}