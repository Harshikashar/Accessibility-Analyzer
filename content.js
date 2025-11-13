// --- START: NAYA content.js (Highlight + AutoFix + VISIBLE Text Change) ---
// PICHHLA POORA CODE DELETE KARKE YEH PASTE KAREIN

console.log("Accessibility Analyzer: Content script loaded and listening.");

// Helper function: Element ko highlight karne ke liye
function highlightElement(targetElement, color = 'red') {
  const originalStyle = targetElement.getAttribute('style') || "";
  
  let outlineColor = color === 'red' ? '4px solid red' : '4px solid green';
  let boxShadow = color === 'red' ? '0 0 10px 5px rgba(255, 0, 0, 0.7)' : '0 0 10px 5px rgba(0, 255, 0, 0.7)';

  targetElement.style.setProperty('outline', outlineColor, 'important');
  targetElement.style.setProperty('box-shadow', boxShadow, 'important');
  targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    targetElement.setAttribute('style', originalStyle);
  }, 5000); // 5 second baad style hata do
}

// Helper function: XPath se element dhoondhne ke liye
function findElementByXPath(xpath) {
  try {
    const xpathResult = document.evaluate(
      xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    );
    return xpathResult.singleNodeValue;
  } catch (e) {
    console.warn('XPath evaluation failed:', e);
    return null;
  }
}

// Main Listener: popup.js se messages receive karega
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // --- ACTION 1: HIGHLIGHT ELEMENT (Red Border) ---
  if (message.action === "highlightElement") {
    // ... (Ye code same hai, highlight karne ke liye) ...
    console.log("Highlight request received:", message.issue);
    const targetElement = findElementByXPath(message.issue.xpath);
    if (targetElement) {
      highlightElement(targetElement, 'red'); // Red highlight
      sendResponse({ status: "highlighted" });
    } else {
      sendResponse({ status: "error", message: "Element not found" });
    }
    return true; // Async response
  }

  // --- ACTION 2: AUTO-FIX ELEMENT (Visible Change Yahan Hai) ---
  else if (message.action === "autoFixElement") {
    console.log("Auto-fix request received:", message);
    
    try {
      // 1. XPath se element dhoondho
      const targetElement = findElementByXPath(message.xpath);

      if (targetElement) {
        // 2. FixType ke hisaab se element ko modify karo
        switch(message.fixType) {
          
          case 'alt':
          case 'alt-text':
            // Alt text hamesha invisible rahega
            targetElement.alt = message.suggestion;
            console.log("Set INVISIBLE alt text to:", message.suggestion);
            break;
            
          case 'label':
             // Label bhi invisible (aria-label) set kar rahe hain
             targetElement.setAttribute('aria-label', message.suggestion);
            break;
            
          case 'link':
            // === YAHAN HAI AAPKA VISIBLE CHANGE ===
            // Humne .setAttribute('aria-label', ...) ko isse badal diya hai:
            targetElement.textContent = message.suggestion;
            console.log("Set VISIBLE link text to:", message.suggestion);
            break;
            
          // --- YEH NAYA CODE HAI (Color Contrast Fix) ---
          case 'contrast':
            // Suggestion format hai "#FFFFFF (White)"
            // Hum sirf hex code (#FFFFFF) nikal rahe hain
            const newColor = message.suggestion.split(' ')[0];
            
            // Element ka text color change kar rahe hain
            targetElement.style.setProperty('color', newColor, 'important');
            console.log("Set VISIBLE color to:", newColor);
            break;
          // --- END NAYA CODE ---
            
          default:
            throw new Error(`Unknown fixType: ${message.fixType}`);
        }

        // 3. Fix hone par green highlight dikhao
        highlightElement(targetElement, 'green'); 

        // 4. Success response wapas bhejo
        sendResponse({ status: "fixed" });
      } else {
        console.warn('Autofix: Element not found via XPath for:', message.xpath);
        sendResponse({ status: "error", message: "Element not found" });
      }
    } catch (e) {
      console.error("Auto-fix error:", e);
      sendResponse({ status: "error", message: e.message });
    }
    
    return true; // Async response
  }
  else if (message.action === "highlightAll") {
    console.log("Highlight All request received:", message.xpaths.length, "elements");
    
    // Har XPath ko highlight karo
    message.xpaths.forEach(xpath => {
      const el = findElementByXPath(xpath);
      if (el) {
        // Aapke existing helper function ka istemaal
        highlightElement(el, 'red'); 
      }
    });
    
    sendResponse({ status: "all_highlighted" });
    return true;
  }
  // --- END ADD ---
  
});
// --- END: NAYA content.js ---