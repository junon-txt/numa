// Preview content cache
const previewCache = new Map();

// Preview container
let previewContainer = null;

// Function to create and get preview container
const getPreviewContainer = () => {
  if (!previewContainer) {
    previewContainer = document.createElement('div');
    previewContainer.id = 'custom-preview';
    previewContainer.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 1rem;
      max-width: 400px;
      max-height: 300px;
      overflow-y: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(previewContainer);
  }
  return previewContainer;
};

// Function to hide preview
const hidePreview = () => {
  const container = getPreviewContainer();
  container.style.display = 'none';
};

// Function to show preview
const showPreview = (content, link, event) => {
  const container = getPreviewContainer();
  container.textContent = content;
  container.style.display = 'block';
  
  // Position near the mouse cursor
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  
  // Add a small offset to prevent the preview from covering the cursor
  const offsetX = 15;
  const offsetY = 15;
  
  container.style.left = `${mouseX + offsetX}px`;
  container.style.top = `${mouseY + offsetY}px`;
  
  // Ensure the preview stays within the viewport
  const previewRect = container.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // If preview would go off the right edge, position it to the left of the cursor
  if (previewRect.right > viewportWidth) {
    container.style.left = `${mouseX - previewRect.width - offsetX}px`;
  }
  
  // If preview would go off the bottom, position it above the cursor
  if (previewRect.bottom > viewportHeight) {
    container.style.top = `${mouseY - previewRect.height - offsetY}px`;
  }
};

// Function to fetch and cache preview content
const fetchPreviewContent = async (href) => {
  console.log('Fetching preview for:', href);
  console.log('Full URL:', new URL(href, window.location.href).href);
  
  if (previewCache.has(href)) {
    console.log('Found in cache:', href);
    return previewCache.get(href);
  }

  try {
    const response = await fetch(href, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('Fetched content length:', text.length);
    console.log('First 100 chars of content:', text.substring(0, 100));
    
    const temp = document.createElement('div');
    temp.innerHTML = text;
    
    const targetId = href.split('#')[1];
    console.log('Looking for target ID:', targetId);
    
    let targetSection = temp.querySelector(`#${targetId}`);
    console.log('Direct ID match:', targetSection ? 'found' : 'not found');
    if (targetSection) {
      console.log('Found section HTML:', targetSection.outerHTML);
    }
    
    if (!targetSection) {
      targetSection = temp.querySelector(`[id="${targetId}"]`);
      console.log('Attribute ID match:', targetSection ? 'found' : 'not found');
      if (targetSection) {
        console.log('Found section HTML:', targetSection.outerHTML);
      }
    }
    if (!targetSection) {
      const headings = temp.querySelectorAll('h1, h2, h3, h4, h5, h6');
      console.log('Found headings:', headings.length);
      console.log('All headings:', Array.from(headings).map(h => h.outerHTML));
      targetSection = Array.from(headings).find(h => 
        h.textContent.trim().toLowerCase().includes(targetId.toLowerCase())
      );
      console.log('Text content match:', targetSection ? 'found' : 'not found');
      if (targetSection) {
        console.log('Found section HTML:', targetSection.outerHTML);
      }
    }
    
    if (!targetSection) {
      console.log('No matching section found');
      return null;
    }
    
    // Get content after the header
    let content = '';
    let currentNode = targetSection.nextSibling;
    while (currentNode && 
           !(currentNode.nodeType === 1 && 
             currentNode.tagName && 
             currentNode.tagName.match(/^H[1-6]$/))) {
      if (currentNode.nodeType === 3) {
        content += currentNode.textContent;
      } else if (currentNode.nodeType === 1) {
        content += currentNode.textContent;
      }
      currentNode = currentNode.nextSibling;
    }
    
    content = content.trim();
    if (content) {
      console.log('Found content length:', content.length);
      console.log('Content preview:', content.substring(0, 100));
      previewCache.set(href, content);
      return content;
    }
  } catch (error) {
    console.error('Error fetching preview:', error);
  }
  return null;
};

// Function to setup preview links
const setupPreviewLinks = (isInitialSetup = false) => {
  const links = document.querySelectorAll('a[data-preview]');
  
  if (isInitialSetup) {
    console.log('Initial setup: Found', links.length, 'preview links');
    links.forEach((link, index) => {
      console.log(`Link ${index + 1}:`, {
        href: link.href,
        text: link.textContent.trim()
      });
    });
  }
  
  links.forEach(link => {
    // Remove existing listeners
    link.removeEventListener('mouseenter', link._previewEnter);
    link.removeEventListener('mouseleave', link._previewLeave);
    
    // Create new listeners
    link._previewEnter = async (event) => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      const content = await fetchPreviewContent(href);
      if (content) {
        showPreview(content, link, event);
      }
    };
    
    link._previewLeave = hidePreview;
    
    // Add listeners
    link.addEventListener('mouseenter', link._previewEnter);
    link.addEventListener('mouseleave', link._previewLeave);
  });
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  setupPreviewLinks(true);
  
  // Hide preview on click
  document.addEventListener('click', hidePreview);
  
  // Setup refresh interval - only updates event listeners
  setInterval(() => setupPreviewLinks(false), 5000);
});

// Handle Material for MkDocs navigation
document.addEventListener('navigation', () => {
  hidePreview();
  setupPreviewLinks(false);
});

document.addEventListener('navigation.instant', () => {
  hidePreview();
  setupPreviewLinks(false);
}); 