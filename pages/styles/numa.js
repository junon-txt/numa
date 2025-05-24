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
const showPreview = (content, link) => {
  const container = getPreviewContainer();
  container.textContent = content;
  container.style.display = 'block';
  
  // Position near the mouse
  const rect = link.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  container.style.left = `${rect.right + scrollLeft + 10}px`;
  container.style.top = `${rect.top + scrollTop}px`;
};

// Function to fetch and cache preview content
const fetchPreviewContent = async (href) => {
  console.log('Fetching preview content for:', href);
  
  if (previewCache.has(href)) {
    console.log('Using cached content for:', href);
    return previewCache.get(href);
  }

  try {
    console.log('Making network request for:', href);
    const response = await fetch(href, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('Received content length:', text.length, 'bytes');
    
    const temp = document.createElement('div');
    temp.innerHTML = text;
    
    const targetId = href.split('#')[1];
    console.log('Looking for section with ID:', targetId);
    
    let targetSection = temp.querySelector(`#${targetId}`);
    if (!targetSection) {
      console.log('Not found with # selector, trying [id] selector');
      targetSection = temp.querySelector(`[id="${targetId}"]`);
    }
    if (!targetSection) {
      console.log('Not found with ID selectors, searching headings');
      const headings = temp.querySelectorAll('h1, h2, h3, h4, h5, h6');
      console.log('Found', headings.length, 'headings');
      targetSection = Array.from(headings).find(h => 
        h.textContent.trim().toLowerCase().includes(targetId.toLowerCase())
      );
    }
    
    if (!targetSection) {
      console.log('Target section not found. Available IDs:', 
        Array.from(temp.querySelectorAll('[id]')).map(el => el.id)
      );
      return null;
    }
    
    console.log('Found target section:', targetSection.textContent.trim());
    
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
      console.log('Extracted preview content:', content);
      previewCache.set(href, content);
      return content;
    } else {
      console.log('No content found after header');
    }
  } catch (error) {
    console.error('Error fetching preview:', error);
  }
  return null;
};

// Function to setup preview links
const setupPreviewLinks = () => {
  const links = document.querySelectorAll('a[data-preview]');
  console.log('Found', links.length, 'preview links');
  
  links.forEach((link, index) => {
    console.log(`Link ${index + 1}:`, {
      href: link.href,
      text: link.textContent.trim(),
      dataPreview: link.getAttribute('data-preview')
    });
    
    // Remove existing listeners
    link.removeEventListener('mouseenter', link._previewEnter);
    link.removeEventListener('mouseleave', link._previewLeave);
    
    // Create new listeners
    link._previewEnter = async () => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      console.log('Mouse entered link:', href);
      const content = await fetchPreviewContent(href);
      if (content) {
        showPreview(content, link);
      }
    };
    
    link._previewLeave = () => {
      console.log('Mouse left link:', link.href);
      hidePreview();
    };
    
    // Add listeners
    link.addEventListener('mouseenter', link._previewEnter);
    link.addEventListener('mouseleave', link._previewLeave);
  });
};

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  console.log('Setting up preview functionality');
  setupPreviewLinks();
  
  // Hide preview on click
  document.addEventListener('click', () => {
    console.log('Click detected, hiding preview');
    hidePreview();
  });
  
  // Setup refresh interval
  setInterval(() => {
    console.log('Refreshing preview links');
    setupPreviewLinks();
  }, 5000);
});

// Handle Material for MkDocs navigation
document.addEventListener('navigation', () => {
  console.log('Navigation detected');
  hidePreview();
  setupPreviewLinks();
});

document.addEventListener('navigation.instant', () => {
  console.log('Instant navigation detected');
  hidePreview();
  setupPreviewLinks();
}); 