// --- START: FULL MERGED POPUP.JS CODE (20 GUIDELINES + AI FIX PREVIEW) ---
// Is code mein 20 guidelines shamil hain, PDF download,
// TEEENON (Alt, Link, Contrast) ke liye AI Buttons, aur "Fix Preview" logic hai.

// --- Global Variables ---
let currentTab = null;
let currentTabUrl = ""; // URL store karne ke liye
window.analysisResults = []; // Results ko globally store karein (Expand button ke liye zoorie)

// ✅ WCAG Links Map (20 guidelines ke liye updated)
const wcagLinks = {
  "1.1.1": "non-text-content",
  "1.3.1": "info-and-relationships",
  "1.4.2": "audio-control",
  "1.4.3": "contrast-minimum",
  "1.4.4": "resize-text",
  "1.4.5": "images-of-text",
  "1.4.10": "reflow",
  "1.4.11": "non-text-contrast",
  "2.1.1": "keyboard",
  "2.1.2": "no-keyboard-trap",
  "2.4.1": "bypass-blocks",
  "2.4.3": "focus-order",
  "2.4.4": "link-purpose-in-context",
  "2.4.7": "focus-visible",
  "3.1.1": "language-of-page",
  "3.1.2": "language-of-parts",
  "3.3.1": "error-identification",
  "3.3.2": "labels-or-instructions",
  "4.1.1": "parsing",
  "4.1.2": "name-role-value"
};

// ✅ Helper Function (HTML escaping ke liye)
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function(match) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match];
  });
}

// -----------------------------------------------------------------
// --- [CHANGE 1]: PYTHON LOGIC KO JAVASCRIPT MEIN ADD KIYA GAYA ---
// -----------------------------------------------------------------
const AILogic = {
  // --- Logic for Alt Text (from main.py) ---
  getAltTextSuggestion(context) {
    if (context.ariaLabel) return context.ariaLabel;
    if (context.title) return context.title;
    try {
      const filename = context.src.split('/').pop();
      const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
      let readableName = nameWithoutExt.replace(/[-_]/g, ' ');

      if (['logo', 'icon', 'image', 'banner'].includes(readableName.toLowerCase())) {
        return "A descriptive text for the image";
      }
      
      // Python ke .title() ka JavaScript replacement
      return readableName.replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
      return "A descriptive text for the image";
    }
  },

  // --- Helper functions for color (from main.py) ---
  parseColor(colorStr) {
    if (!colorStr) return null;
    // 'rgb(255, 100, 0)' se [255, 100, 0] nikalta hai
    const parts = colorStr.match(/(\d+)/g);
    return (parts && parts.length >= 3) ? parts.slice(0, 3).map(Number) : null;
  },

  getLuminance(rgb) {
    if (!rgb) return 0;
    const sRGB = rgb.map(val => {
      val /= 255.0;
      return (val <= 0.03928) ? val / 12.92 : Math.pow(((val + 0.055) / 1.055), 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  },

  // --- Logic for Contrast (from main.py) ---
  getContrastSuggestion(info) {
    const bg_rgb = this.parseColor(info.bgColor);
    if (!bg_rgb) return null; // Suggestion nahi de sakte
    
    const bg_luminance = this.getLuminance(bg_rgb);
    
    // Agar background dark hai (luminance < 0.5), toh white text suggest karo
    if (bg_luminance < 0.5) {
      return "#FFFFFF (White)";
    } 
    // Agar background light hai, toh black text suggest karo
    else {
      return "#000000 (Black)";
    }
  }
};
// --- [CHANGE 1] END ---
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// --- START: ADVANCED CHECKING LOGIC (20 GUIDELINES) ---
// -----------------------------------------------------------------
function runAllChecksOnPage() {
    
    // ✅ Poora WCAGChecker object (Ab 20 checks ke saath)
    const WCAGChecker = {
        // --- Utility Functions ---
        getXPath(element) {
          if (element.id) return `//*[@id="${element.id}"]`;
          if (element === document.body) return '/html/body';
          let ix = 0;
          const siblings = element.parentNode.childNodes;
          for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
              return this.getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
          }
        },
        getLuminance(rgb) {
          if (!rgb) return 0;
          const sRGB = rgb.map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
        },
        getContrastRatio(color1, color2) {
          const lum1 = this.getLuminance(this.parseColor(color1));
          const lum2 = this.getLuminance(this.parseColor(color2));
          return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
        },
        parseColor(colorStr) {
          if (!colorStr) return null;
          if (colorStr.startsWith('rgb')) {
            const match = colorStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
            return match ? match.slice(1, 4).map(Number) : null;
          }
          if (colorStr.startsWith('#')) {
            const hex = colorStr.slice(1);
            if (hex.length === 3) return [parseInt(hex[0]+hex[0], 16), parseInt(hex[1]+hex[1], 16), parseInt(hex[2]+hex[2], 16)];
            if (hex.length === 6) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
          }
          // Handle 'transparent' or other invalid values
          if (colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return null; 
          return null; 
        },
        getEffectiveStyle(element, prop) {
          return window.getComputedStyle(element)[prop];
        },

        // --- Check Functions ---
        checkAltText() {
          const issues = [];
          document.querySelectorAll('img').forEach(img => {
            if (!img.hasAttribute('alt')) {
              issues.push({
                type: 'alt-text',
                description: `Image missing alt attribute.`,
                element: img.outerHTML,
                xpath: this.getXPath(img),
                severity: 'High',
                src: img.src // AI suggestion ke liye
              });
            } else if (img.alt.trim() === '') {
              const parent = img.parentElement;
              const isDecorative = parent && (parent.tagName === 'FIGURE' || img.hasAttribute('role') && img.getAttribute('role') === 'presentation');
              if (!isDecorative) {
                issues.push({
                  type: 'alt-text',
                  description: `Image has empty alt text but may not be decorative.`,
                  element: img.outerHTML,
                  xpath: this.getXPath(img),
                  severity: 'Medium',
                  src: img.src // AI suggestion ke liye
                });
              }
            }
          });
          return issues;
        },
        checkFormLabels() {
          const issues = [];
          document.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type === 'hidden' || el.type === 'submit' || el.type === 'reset' || el.type === 'button') return;
            const id = el.id;
            const hasLabelFor = id && document.querySelector(`label[for="${id}"]`);
            const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
            const parentLabel = el.closest('label');
            if (!hasLabelFor && !hasAriaLabel && !parentLabel) {
              issues.push({
                type: 'form-labels',
                description: `Form control missing associated label.`,
                element: el.outerHTML,
                xpath: this.getXPath(el),
                severity: 'High'
              });
            }
          });
          return issues;
        },
        checkColorContrast() {
          const issues = [];
          const checkedElements = new Set();
          document.querySelectorAll('body *:not(script):not(style):not(svg):not(path)').forEach(el => {
            if (checkedElements.has(el) || el.children.length > 0) return; // Sirf text nodes waale elements
            const style = window.getComputedStyle(el);
            const text = el.textContent.trim();
            if (text.length > 0 && style.visibility !== 'hidden' && style.opacity !== '0' && style.display !== 'none') {
              const fgColor = style.color;
              let bgColor = style.backgroundColor;
              let current = el;
              let effectiveBgColor = bgColor;
              
              // Find the first non-transparent background
              while (this.parseColor(effectiveBgColor) === null) {
                current = current.parentElement;
                if (!current || current === document.body) {
                    effectiveBgColor = 'rgb(255, 255, 255)'; // Default white
                    break;
                }
                effectiveBgColor = window.getComputedStyle(current).backgroundColor;
              }
              
              const ratio = this.getContrastRatio(fgColor, effectiveBgColor);
              const fontSize = parseFloat(style.fontSize);
              const isBold = parseInt(style.fontWeight) >= 700;
              const isLarge = (fontSize >= 24) || (fontSize >= 18.66 && isBold);
              
              if (isLarge && ratio < 3) {
                issues.push({
                  type: 'color-contrast',
                  description: `Poor contrast (${ratio.toFixed(2)}:1) for large text.`,
                  element: el.outerHTML,
                  xpath: this.getXPath(el),
                  severity: 'High',
                  fg: fgColor, // ✅ AI FIX: Added color info
                  bg: effectiveBgColor // ✅ AI FIX: Added color info
                });
              } else if (!isLarge && ratio < 4.5) {
                issues.push({
                  type: 'color-contrast',
                  description: `Poor contrast (${ratio.toFixed(2)}:1) for normal text.`,
                  element: el.outerHTML,
                  xpath: this.getXPath(el),
                  severity: 'High',
                  fg: fgColor, // ✅ AI FIX: Added color info
                  bg: effectiveBgColor // ✅ AI FIX: Added color info
                });
              }
              checkedElements.add(el);
            }
          });
          return issues;
        },
        checkLinkPurpose() {
          const issues = [];
          document.querySelectorAll('a').forEach(a => {
            const text = a.textContent.trim();
            const ariaLabel = a.getAttribute('aria-label') || a.getAttribute('aria-labelledby');
            const accessibleName = text || ariaLabel;
            if (!accessibleName) {
              issues.push({
                type: 'link-purpose',
                description: `Link has no accessible name.`,
                element: a.outerHTML,
                xpath: this.getXPath(a),
                severity: 'High',
                text: '', // AI ke liye
                heading: (a.closest('h1, h2, h3, h4, h5, h6') || {}).textContent || ''
              });
            } else if (['click here', 'read more', 'learn more', 'more', 'link'].includes(text.toLowerCase())) {
              issues.push({
                type: 'link-purpose',
                description: `Link uses generic text ("${text}").`,
                element: a.outerHTML,
                xpath: this.getXPath(a),
                severity: 'Medium',
                text: text, // AI ke liye
                heading: (a.closest('h1, h2, h3, h4, h5, h6') || {}).textContent || ''
              });
            }
          });
          return issues;
        },
        checkHeadingOrder() {
          const issues = [];
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          let lastLevel = 0;
          headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            if (level > lastLevel + 1) {
              issues.push({
                type: 'heading-order',
                description: `Heading level skip: H${lastLevel} to H${level}.`,
                element: h.outerHTML,
                xpath: this.getXPath(h),
                severity: 'Medium'
              });
            }
            lastLevel = level;
          });
          return issues;
        },
        checkPageLanguage() {
          const issues = [];
          const lang = document.documentElement.getAttribute('lang');
          if (!lang || lang.trim() === '') {
            issues.push({
              type: 'page-language',
              description: `<html> tag missing 'lang' attribute.`,
              element: document.documentElement.outerHTML.split('>')[0] + '...</html>',
              xpath: '/html',
              severity: 'Medium'
            });
          }
          return issues;
        },
        checkKeyboardAccess() {
            const issues = [];
            document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]').forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || el.disabled) {
                  return;
                }
                
                if (el.getAttribute('tabindex') === '-1') {
                    issues.push({
                        type: 'keyboard-access',
                        description: `Element with tabindex="-1" is not keyboard focusable.`,
                        element: el.outerHTML,
                        xpath: this.getXPath(el),
                        severity: 'Low'
                    });
                }
            });
            return issues;
        },
        checkFocusVisible() {
            const issues = [];
            try {
                for (let i = 0; i < document.styleSheets.length; i++) {
                    const sheet = document.styleSheets[i];
                    if (!sheet.cssRules) continue;
                    for (let j = 0; j < sheet.cssRules.length; j++) {
                        const rule = sheet.cssRules[j];
                        if (rule.selectorText && rule.selectorText.includes(':focus') && (rule.style.outline === 'none' || rule.style.outline === '0')) {
                            issues.push({
                                type: 'focus-visible',
                                description: `CSS rule found that removes focus outline: ${rule.selectorText}`,
                                element: 'CSS Rule',
                                xpath: null,
                                severity: 'High'
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn("Could not check stylesheets for focus outlines:", e);
            }
            return issues;
        },

        // --- START: NEW 11 CHECKS ---
        
        checkAudioControl() {
          const issues = [];
          document.querySelectorAll('audio[autoplay], video[autoplay]').forEach(el => {
            if (el.duration > 3 && !el.hasAttribute('controls') && !el.muted) {
              issues.push({
                type: 'audio-control',
                description: `Audio/Video autoplays for more than 3s without controls.`,
                element: el.outerHTML,
                xpath: this.getXPath(el),
                severity: 'High'
              });
            }
          });
          return issues;
        },
        checkResizeText() {
          return [{
            type: 'resize-text',
            description: `Manually check if text can be resized to 200% without loss of content.`,
            element: 'Page',
            xpath: '/html',
            severity: 'Medium'
          }];
        },
        checkImagesOfText() {
          return [{
            type: 'images-of-text',
            description: `Manually check if images contain text. Use text instead of images.`,
            element: 'Page',
            xpath: '/html',
            severity: 'Medium'
          }];
        },
        checkReflow() {
          return [{
            type: 'reflow',
            description: `Manually check if page reflows to a single column at 320px width.`,
            element: 'Page',
            xpath: '/html',
            severity: 'Medium'
          }];
        },
        checkNonTextContrast() {
          const issues = [];
          document.querySelectorAll('input, button, select, [role="button"], [role="checkbox"], [role="radio"]').forEach(el => {
            const style = window.getComputedStyle(el);
            const bgColor = style.backgroundColor;
            const borderColor = style.borderColor;
            if (bgColor && borderColor && this.parseColor(borderColor) !== null) {
              const ratio = this.getContrastRatio(bgColor, borderColor);
              if (ratio < 3) {
                issues.push({
                  type: 'non-text-contrast',
                  description: `Element border contrast ratio (${ratio.toFixed(2)}:1) is below 3:1.`,
                  element: el.outerHTML,
                  xpath: this.getXPath(el),
                  severity: 'Medium'
                });
              }
            }
          });
          return issues;
        },
        checkNoKeyboardTrap() {
          return [{
            type: 'no-keyboard-trap',
            description: `Manually check if keyboard focus gets trapped in any element.`,
            element: 'Page',
            xpath: '/html',
            severity: 'High'
          }];
        },
        checkBypassBlocks() {
          const issues = [];
          const skipLink = document.querySelector('a[href^="#"]');
          const mainContent = document.querySelector('main, [role="main"]');
          
          if (!skipLink || !mainContent || (skipLink && !document.getElementById(skipLink.href.split('#')[1]))) {
            issues.push({
              type: 'bypass-blocks',
              description: `A 'skip to main content' link is missing or does not work.`,
              element: 'Page',
              xpath: '/html/body',
              severity: 'Medium'
            });
          }
          return issues;
        },
        checkFocusOrder() {
          const issues = [];
          const elements = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
          let lastTabIndex = 0;
          let outOfOrder = false;
          elements.forEach(el => {
            const tabIndex = el.getAttribute('tabindex') ? parseInt(el.getAttribute('tabindex')) : 0;
            if (tabIndex < lastTabIndex && tabIndex > 0) {
              outOfOrder = true;
            }
            if (tabIndex > 0) {
              lastTabIndex = tabIndex;
            }
          });
          if (outOfOrder) {
            issues.push({
              type: 'focus-order',
              description: `Focus order may be illogical due to positive tabindex values.`,
              element: 'Page',
              xpath: '/html/body',
              severity: 'Medium'
            });
          }
          return issues;
        },
        checkLanguageOfParts() {
           return [{
            type: 'language-of-parts',
            description: `Manually check if changes in language are marked with a 'lang' attribute.`,
            element: 'Page',
            xpath: '/html',
            severity: 'Low'
          }];
        },
        checkErrorIdentification() {
          const issues = [];
          document.querySelectorAll('input[aria-invalid="true"], .error').forEach(el => {
            const id = el.id;
            const errorDesc = document.querySelector(`[aria-live="polite"], .error-message`);
            const hasAriaDescribedBy = el.getAttribute('aria-describedby');
            
            if (!errorDesc && !hasAriaDescribedBy) {
               issues.push({
                type: 'error-identification',
                description: `An input error is present, but no descriptive error message is provided.`,
                element: el.outerHTML,
                xpath: this.getXPath(el),
                severity: 'High'
              });
            }
          });
          return issues;
        },
        checkParsing() {
          const issues = [];
          const ids = {};
          document.querySelectorAll('[id]').forEach(el => {
              if (el.id.trim() === '') return;
              if (ids[el.id]) {
                  issues.push({
                      type: 'parsing',
                      description: `Duplicate ID #${el.id}. (Parsing error)`,
                      element: el.outerHTML,
                      xpath: this.getXPath(el),
                      severity: 'High'
                  });
              } else {
                  ids[el.id] = true;
              }
          });
          if (document.querySelectorAll('font, center, bgsound').length > 0) {
             issues.push({
                type: 'parsing',
                description: `Obsolete HTML elements (like <font>) found. (Parsing error)`,
                element: 'Page',
                xpath: '/html',
                severity: 'Low'
              });
          }
          return issues;
        },
        checkNameRoleValue() {
          const issues = [];
          document.querySelectorAll('[role]').forEach(el => {
            const role = el.getAttribute('role');
            if (['button', 'link', 'checkbox', 'radio', 'menuitem'].includes(role)) {
              const accessibleName = el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
              if (!accessibleName) {
                 issues.push({
                    type: 'name-role-value',
                    description: `Element with role="${role}" has no accessible name.`,
                    element: el.outerHTML,
                    xpath: this.getXPath(el),
                    severity: 'High'
                  });
              }
            }
          });
           return issues;
        },
        
        // --- END: NEW 11 CHECKS ---


        // --- Unified Runner (UPDATED FOR 20 CHECKS) ---
        runAllChecks() {
            const allIssues = {
                // Existing 9
                'alt-text': this.checkAltText(),
                'form-labels': this.checkFormLabels(),
                'color-contrast': this.checkColorContrast(),
                'link-purpose': this.checkLinkPurpose(),
                'heading-order': this.checkHeadingOrder(),
                'page-language': this.checkPageLanguage(),
                'keyboard-access': this.checkKeyboardAccess(),
                'focus-visible': this.checkFocusVisible(),
                
                // New 11
                'audio-control': this.checkAudioControl(),
                'resize-text': this.checkResizeText(),
                'images-of-text': this.checkImagesOfText(),
                'reflow': this.checkReflow(),
                'non-text-contrast': this.checkNonTextContrast(),
                'no-keyboard-trap': this.checkNoKeyboardTrap(),
                'bypass-blocks': this.checkBypassBlocks(),
                'focus-order': this.checkFocusOrder(),
                'language-of-parts': this.checkLanguageOfParts(),
                'error-identification': this.checkErrorIdentification(),
                'parsing': this.checkParsing(),
                'name-role-value': this.checkNameRoleValue(),
            };
            
            // Guidelines ko map karein (UPDATED FOR 20)
            const guidelinesMap = {
              'alt-text': { id: 'alt-text', name: 'Alt Text for Images', code: '1.1.1', priority: 'High', solution: { title: "Add Alt Text", steps: ["Add meaningful alt attribute", "Use empty alt=\"\" for decorative images"] } },
              'audio-control': { id: 'audio-control', name: 'Audio Control', code: '1.4.2', priority: 'High', solution: { title: "Provide Audio Controls", steps: ["Ensure autoplaying audio > 3s has pause/stop controls", "Avoid autoplay wherever possible"] } },
              'color-contrast': { id: 'color-contrast', name: 'Contrast (Minimum)', code: '1.4.3', priority: 'High', solution: { title: "Improve Contrast", steps: ["Maintain at least 4.5:1 ratio", "Adjust foreground or background colors"] } },
              'resize-text': { id: 'resize-text', name: 'Resize Text', code: '1.4.4', priority: 'Medium', solution: { title: "Test Text Resize", steps: ["Use browser zoom to 200%", "Ensure no content is lost or overlaps"] } },
              'images-of-text': { id: 'images-of-text', name: 'Images of Text', code: '1.4.5', priority: 'Medium', solution: { title: "Avoid Images of Text", steps: ["Use CSS for styling text", "Use text instead of images"] } },
              'reflow': { id: 'reflow', name: 'Reflow', code: '1.4.10', priority: 'Medium', solution: { title: "Test Reflow", steps: ["Resize window to 320px width", "Ensure no horizontal scrolling is required"] } },
              'non-text-contrast': { id: 'non-text-contrast', name: 'Non-text Contrast', code: '1.4.11', priority: 'Medium', solution: { title: "Check UI Contrast", steps: ["Ensure UI controls/icons have a 3:1 contrast ratio"] } },
              'keyboard-access': { id: 'keyboard-access', name: 'Keyboard Access', code: '2.1.1', priority: 'High', solution: { title: "Ensure Keyboard Access", steps: ["All interactive elements must be focusable", "Avoid negative tabindex"] } },
              'no-keyboard-trap': { id: 'no-keyboard-trap', name: 'No Keyboard Trap', code: '2.1.2', priority: 'High', solution: { title: "Test for Traps", steps: ["Tab through all elements", "Ensure you can tab away from all widgets"] } },
              'bypass-blocks': { id: 'bypass-blocks', name: 'Bypass Blocks', code: '2.4.1', priority: 'Medium', solution: { title: "Add Skip Link", steps: ["Add a 'Skip to Main Content' link at the top of the page"] } },
              'focus-order': { id: 'focus-order', name: 'Focus Order', code: '2.4.3', priority: 'Medium', solution: { title: "Fix Focus Order", steps: ["Ensure tabbing follows logical visual order", "Avoid positive tabindex values"] } },
              'link-purpose': { id: 'link-purpose', name: 'Link Purpose', code: '2.4.4', priority: 'Medium', solution: { title: "Improve Link Text", steps: ["Use descriptive link text (avoid 'click here')", "Add aria-label for context"] } },
              'focus-visible': { id: 'focus-visible', name: 'Focus Visible', code: '2.4.7', priority: 'High', solution: { title: "Ensure Focus Visibility", steps: ["Do not remove focus outlines in CSS", "Use clear :focus styles"] } },
              'heading-order': { id: 'heading-order', name: 'Heading Order', code: '1.3.1', priority: 'Medium', solution: { title: "Fix Heading Structure", steps: ["Use headings sequentially (H1, H2, H3...)", "Don’t skip heading levels"] } },
              'page-language': { id: 'page-language', name: 'Language of Page', code: '3.1.1', priority: 'Medium', solution: { title: "Add Language Attribute", steps: ["Add lang attribute to <html> tag (e.g., lang=\"en\")"] } },
              'language-of-parts': { id: 'language-of-parts', name: 'Language of Parts', code: '3.1.2', priority: 'Low', solution: { title: "Mark Language Changes", steps: ["Add 'lang' attribute to elements with different languages"] } },
              'error-identification': { id: 'error-identification', name: 'Error Identification', code: '3.3.1', priority: 'High', solution: { title: "Identify Errors", steps: ["Clearly describe form errors in text", "Use aria-describedby to link errors to inputs"] } },
              'form-labels': { id: 'form-labels', name: 'Labels or Instructions', code: '3.3.2', priority: 'High', solution: { title: "Add Labels", steps: ["Use <label> with for attribute", "Use aria-label if no visible label"] } },
              'parsing': { id: 'parsing', name: 'Parsing', code: '4.1.1', priority: 'High', solution: { title: "Fix Parsing Errors", steps: ["Ensure all IDs are unique", "Avoid obsolete elements", "Check for malformed HTML"] } },
              'name-role-value': { id: 'name-role-value', name: 'Name, Role, Value', code: '4.1.2', priority: 'High', solution: { title: "Define Roles & Names", steps: ["Ensure custom controls have a role", "Ensure all controls have an accessible name"] } }
            };

            const results = Object.keys(guidelinesMap).map(id => {
                const guideline = guidelinesMap[id];
                const issues = allIssues[id] || [];
                let status = issues.length === 0 ? 'passed' : 'failed';

                // Manual checks ko 'info' set karein
                //if (['resize-text', 'images-of-text', 'reflow', 'no-keyboard-trap', 'language-of-parts'].includes(id)) {
                  // if (issues.length === 1 && issues[0].description.startsWith("Manually check")) {
                    //   status = 'info'; 
                   //}
                //}

                return {
                    ...guideline,
                    status: status,
                    issues: issues
                };
            });

            return results;
        }
    };

    // Run the checks
    return WCAGChecker.runAllChecks();
}
// -----------------------------------------------------------------
// --- END: ADVANCED CHECKING LOGIC ---
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// --- START: HELPER FUNCTIONS (Scoring, Display, etc.) ---
// -----------------------------------------------------------------

// ✅ Scoring logic (Manual checks ko ignore karta hai)
function calculateAccessibilityScore(results) {
  const scorableResults = results.filter(r => r.status !== 'info');
  const totalChecks = scorableResults.length;
  
  if (totalChecks === 0) return { score: 100, passed: 0, failed: 0, total: results.length };
  
  let passedCount = 0;
  let failedCount = 0;
  let weightedScore = 0;
  let totalWeight = 0;

  scorableResults.forEach(r => {
    let weight = 1; // Low
    if (r.priority === 'Medium') weight = 2;
    if (r.priority === 'High') weight = 3;
    
    totalWeight += weight;
    
    if (r.status === 'passed') {
      passedCount++;
      weightedScore += weight;
    } else {
      failedCount++;
    }
  });
  
  const totalGuidelines = results.length;
  const finalPassed = passedCount + (results.length - scorableResults.length); // Passed + Info checks
  const score = totalWeight === 0 ? 100 : Math.round((weightedScore / totalWeight) * 100);
  
  return { score, passed: finalPassed, failed: failedCount, total: totalGuidelines };
}

// ✅ Score display logic
function displayScore(score) {
  const scoreText = document.getElementById('score-text');
  if (scoreText) scoreText.textContent = `${score}`;
  
  const scoreContainer = document.querySelector('.score-container');
  
  if (scoreContainer) {
    let color = '#27ae60'; // Green
    if (score < 50) {
        color = '#e74c3c'; // Red
    } else if (score < 90) {
        color = '#f39c12'; // Yellow
    }
    
    scoreContainer.style.background = `conic-gradient(
        ${color} 0% ${score}%, 
        #e0e0e0 ${score}% 100%
    )`;
  }
}


// ✅ Highlight logic (content.js ko message bhejta hai)
function highlightElement(xpath) {
  if (!currentTab || !xpath) return;
  chrome.tabs.sendMessage(
    currentTab.id,
    { action: "highlightElement", issue: { xpath: xpath } },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Highlight failed:", chrome.runtime.lastError.message);
      }
    }
  );
}

// ✅✅✅ --- START: NAYA "HANDLE AUTO FIX" FUNCTION --- ✅✅✅
// (Ye 'Fixed Preview' logic ke saath updated hai)
function handleAutoFix(xpath, fixType, suggestion, button) {
  if (!currentTab || !xpath) return;
  
  // Check karo ki button hai ya nahi (Fix All ke case mein nahi hoga)
  if (button) {
    button.textContent = "Fixing...";
    button.disabled = true;
  }

  // Step 1: Hum abhi bhi content.js ko message bhejenge taaki
  // website par green border dikh sake
  chrome.tabs.sendMessage(
    currentTab.id,
    {
      action: "autoFixElement", // Action ka naam same rahega
      xpath: xpath,
      fixType: fixType,
      suggestion: suggestion
    },
    (response) => {
      if (button) { 
        if (chrome.runtime.lastError || !response || response.status !== "fixed") {
          console.error("Autofix message failed:", chrome.runtime.lastError?.message || response?.message);
          button.textContent = "Fix Failed ❌";
          button.disabled = false;
          return;
        }
      

      // === YAHAN HAI AAPKA NAYA "BEFORE/AFTER" POPUP CODE ===
      // Jab content.js se "fixed" ka response aa jaaye

      // 1. Button ko "Fixed" state mein daalo
      button.textContent = "Fixed! ✅";
      button.style.backgroundColor = "#229954";
      button.disabled = true; // Fix ho gaya, ab disable kar do

      // 2. Button group dhoondho aur AI button ko hide kar do
      const buttonGroup = button.closest('.action-btn-group');
      if (buttonGroup) {
        const aiButton = buttonGroup.querySelector('.ai-suggest');
        if (aiButton) aiButton.style.display = 'none';
      }
    }

      // 3. Ek naya "Fixed Preview" div banao
      const previewDiv = document.createElement('div');
      previewDiv.style.background = "#f0f9f4"; // Halka green background
      previewDiv.style.border = "1px solid #27ae60"; // Green border
      previewDiv.style.padding = "8px";
      previewDiv.style.marginTop = "10px";
      previewDiv.style.borderRadius = "4px";
      previewDiv.style.fontFamily = "'Courier New', monospace";
      previewDiv.style.fontSize = "0.8rem";
      previewDiv.innerHTML = `<strong>FIX APPLIED (Preview):</strong><br>"${escapeHtml(suggestion)}"`;
      
      // 4. Preview div ko buttons ke oopar daal do
      if (buttonGroup) {
        buttonGroup.prepend(previewDiv);
      }
      
      // 5. (BONUS) Poori row ka status "PASSED" kar do
      const tableRow = button.closest('tr');
      if (tableRow) {
        // Status cell (Column 2) ko update karo
        const statusCell = tableRow.querySelector('td:nth-child(2)');
        if (statusCell) {
          statusCell.innerHTML = `
            <span class="status-pass">
              <span class="status-icon">✅</span>
              PASSED (Fixed)
            </span>`;
        }
        
        // "How to Fix" cell (Column 4) ko update karo
        const fixCell = tableRow.querySelector('td:nth-child(4) .solution');
        if (fixCell) {
          fixCell.style.background = '#d4edda'; // Green background
          fixCell.style.borderColor = '#c3e6cb';
          fixCell.innerHTML = '✓ Fixed with AI suggestion';
        }
      }
    }
  );
}
// ✅✅✅ --- END: NAYA "HANDLE AUTO FIX" FUNCTION --- ✅✅✅

// -----------------------------------------------------------------
// --- END: HELPER FUNCTIONS ---
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// --- START: ANALYSIS & DISPLAY LOGIC (UPDATED) ---
// -----------------------------------------------------------------

// ✅ Analysis function
async function runAnalysis() {
  try {
    console.log('Starting analysis...');
    
    if (!currentTab || !currentTab.id) {
        // Try to get tab again if it's missing (e.g., devtools)
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        if (!currentTab) {
           throw new Error("Active tab not found. Please refresh the page and retry.");
        }
    }

    document.getElementById('loadingDiv').style.display = 'block';
    document.getElementById('resultsTable').style.display = 'none';

    // Ensure content script is injected if not already
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ['content.js']
    }).catch(err => console.log("Content script might be already injected."));


    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: runAllChecksOnPage // 20-guideline checker
    });

    console.log('Script executed, results:', results);
    
    if (!results || !results[0] || !results[0].result) {
        throw new Error("No results returned from script. The page might be restricted (e.g., chrome:// pages) or empty.");
    }
    
    const analysisData = results[0].result;
    window.analysisResults = analysisData; // Globally save karein

    // --- Scoring ---
    const { score, passed, failed, total } = calculateAccessibilityScore(analysisData);
    if (currentTabUrl) {
      chrome.storage.local.set({ [currentTabUrl]: score }, () => {
        console.log(`Score ${score} saved for ${currentTabUrl}`);
      });
    }
    displayScore(score);

    // Update counts
    document.getElementById('passedCount').textContent = passed;
    document.getElementById('failedCount').textContent = failed;
    document.getElementById('totalCount').textContent = total;

    // Display
    displayResults(analysisData); // YAHAN FUNCTION KA NAAM 'displayResults' HAI
    // --- YAHAN ADD KAREIN (Button 2) ---
    // Scan ke baad "Fix All" button dikhao
    const fixAllButton = document.getElementById('fixAllBtn');
    if (fixAllButton && failed > 0) {
      fixAllButton.style.display = 'block';
    }

  } catch (error) {
    console.error('Analysis failed:', error);
    showError(error.message || "An unknown error occurred during analysis.");
  }
}

// ✅✅✅ --- START: NAYA "displayResults" FUNCTION --- ✅✅✅
// (Ye 'AI Button' logic ke saath updated hai)
function displayResults(results) {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  document.getElementById('loadingDiv').style.display = 'none';
  document.getElementById('resultsTable').style.display = 'table'; 

  if (!results || results.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No accessibility checks found or page is not analyzable.</td></tr>';
      return;
  }

  results.forEach(result => {
    const row = document.createElement('tr');
    
    let statusIcon, statusClass, statusText;
    
    if (result.status === 'passed') {
        statusIcon = '✅';
        statusClass = 'status-pass';
        statusText = 'PASSED';
    } else if (result.status === 'failed') {
        statusIcon = '❌';
        statusClass = 'status-fail';
        statusText = 'FAILED';
    } else { // 'info' status for manual checks
        statusIcon = 'ℹ️';
        statusClass = 'status-info';
        statusText = 'INFO';
    }

    let issuesHtml = '';
    if (result.status === 'passed') {
      issuesHtml = '<div class="element-info no-issues">✓ No issues found</div>';
    } else if (result.status === 'info') {
      // Manual check descriptions
      issuesHtml = `<div class="element-info info-check" style="background: #e3f2fd; border-left-color: #3498db;">${result.issues[0].description}</div>`;
    } else {
      // Failed checks
      issuesHtml = result.issues.map((issue, index) => {
        let buttonsHtml = '';
        
        if (issue.xpath) {
            buttonsHtml += `<button class="highlight-btn" data-xpath="${escapeHtml(issue.xpath)}" title="Highlight issue on page">Show</button>`;
        }

        // -----------------------------------------------------------------
        // --- [CHANGE 2]: Link Purpose AI ko disable rakha gaya hai ---
        // -----------------------------------------------------------------
        let fixType = null;
        if (issue.type === 'alt-text') fixType = 'alt';
        // else if (issue.type === 'link-purpose') fixType = 'link'; // <-- YEH LINE DISABLED HAI
        else if (issue.type === 'color-contrast') fixType = 'contrast';
        
        if (fixType) {
            // Data attributes ko save karein taaki AI suggest button use kar sake
            buttonsHtml += `<button class="ai-suggest" 
                                data-fix-type="${fixType}" 
                                data-xpath="${escapeHtml(issue.xpath)}" 
                                data-src="${escapeHtml(issue.src || '')}"
                                data-text="${escapeHtml(issue.text || '')}"
                                data-heading="${escapeHtml(issue.heading || '')}"
                                data-fg-color="${escapeHtml(issue.fg || '')}"
                                data-bg-color="${escapeHtml(issue.bg || '')}"
                                title="Get AI Suggestion">🤖 AI Suggest</button>`;
                                
            buttonsHtml += `<button class="autofix-btn" 
                                data-fix-type="${fixType}" 
                                data-xpath="${escapeHtml(issue.xpath)}" 
                                data-suggestion="Default fix"
                                title="Apply fix to page"
                                style="display: none;">⚡ Fix with AI</button>`;
        }
        // --- END AI BUTTON LOGIC ---
        
        return `<div class="element-info">
             <strong>Issue ${index + 1}:</strong> ${escapeHtml(issue.description)}
             <div class="action-btn-group" style="margin-top: 5px;">${buttonsHtml}</div>
           </div>`; 
      }).join('');
    }

    row.innerHTML = `
      <td>
        <strong>${escapeHtml(result.name)}</strong>
        <span class="guideline-code" style="background: #ecf0f1; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; color: #7f8c8d; margin-left: 6px;">
          WCAG ${escapeHtml(result.code)}
        </span>
        <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">
          Priority: ${escapeHtml(result.priority)}
        </div>
      </td>
      <td>
        <span class="${statusClass}" ${result.status === 'info' ? 'style="color: #005fcc; font-weight: bold;"' : ''}>
          <span class="status-icon">${statusIcon}</span>
          ${statusText}
        </span>
      </td>
      <td>${issuesHtml}</td>
      <td>
        ${result.status === 'failed' ? `
          <div class="solution">
            <h4>${escapeHtml(result.solution.title)}</h4>
            <ul>
              ${result.solution.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
            </ul>
          </div>
        ` : (result.status === 'info' ? `
          <div class="solution info-solution" style="background: #e3f2fd; border-color: #bbdefb;">
            <h4>${escapeHtml(result.solution.title)}</h4>
             <ul>
              ${result.solution.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
            </ul>
          </div>
        ` : '<div class="solution" style="background: #d4edda; border-color: #c3e6cb;">✓ No fix needed</div>')}
      </td>
      <td>
        ${wcagLinks[result.code] ? `
          <a href="https://www.w3.org/WAI/WCAG21/Understanding/${wcagLinks[result.code]}.html" 
             target="_blank" title="View official WCAG 2.1 Understanding document">
            WCAG ${escapeHtml(result.code)}
          </a>` 
        : `WCAG ${escapeHtml(result.code)}`}
      </td>
    `;
    
    tbody.appendChild(row);
  });
}
// ✅✅✅ --- END: NAYA "displayResults" FUNCTION --- ✅✅✅

// ✅ Error function
function showError(message) {
  const loadingDiv = document.getElementById('loadingDiv');
  if (loadingDiv) {
    loadingDiv.innerHTML = `
      <div style="color: #e74c3c; padding: 20px; text-align: center;">
        <h3>⚠️ Analysis Error</h3>
        <p>${escapeHtml(message)}</p>
        <button id="retryBtn" style="margin-top: 10px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">Retry</button>
      </div>
    `;
  }
  document.getElementById('resultsTable').style.display = 'none'; // Table ko hide karein
  
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Retrying analysis...</p>';
        runAnalysis();
    });
  }
}

// ✅ Filter function
function applyFilter(filter) {
  let filteredResults;
  
  if (filter === 'all') {
    filteredResults = window.analysisResults;
  } else {
    // 'info' status ko bhi handle karein
    filteredResults = window.analysisResults.filter(r => r.status === filter);
  }

  displayResults(filteredResults);
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    }
  });
}

// -----------------------------------------------------------------
// --- END: ANALYSIS & DISPLAY LOGIC ---
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// --- START: MERGED DOMContentLoaded EVENT LISTENER ---
// -----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    
    // Step 1: Tab ki info lein
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        currentTabUrl = tab.url; // URL ko save karein
        // --- YAHAN ADD KAREIN (History GET) ---
        const historyDisplay = document.getElementById('history');
        const lastScoreDisplay = document.getElementById('lastScore');

        // Check karo ki is URL ke liye koi score saved hai
        if (currentTabUrl) {
          chrome.storage.local.get([currentTabUrl], (result) => {
            if (result[currentTabUrl]) {
              lastScoreDisplay.textContent = result[currentTabUrl];
              historyDisplay.style.display = 'inline-block'; // Show karo
            }
          });
        }
        // --- END ADD ---
    } catch (e) {
        console.error("Tab query failed:", e);
        showError("Could not get active tab info. Please try again.");
        return;
    }

    // Step 2: Event Listeners (Filters, Expand)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          applyFilter(btn.dataset.filter);
        });
    });

    const expandBtn = document.getElementById('expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', async () => {
        console.log("Expand button clicked ✅");
        if (!window.analysisResults || window.analysisResults.length === 0) {
          alert("No analysis results. Please run the analyzer before expanding.");
          return;
        }
        await chrome.storage.local.set({ 
            analysisResults: window.analysisResults, 
            targetUrl: currentTabUrl || "URL not found" 
        });
        chrome.tabs.create({ url: chrome.runtime.getURL("expand.html") });
      });
    }
    // --- YAHAN ADD KAREIN (Button 3) ---
    const fixAllButton = document.getElementById('fixAllBtn');
    if (fixAllButton) {
      fixAllButton.addEventListener('click', () => {
        console.log("Fix All button clicked!");
        fixAllButton.textContent = "Fixing...";
        fixAllButton.disabled = true;
        
        let fixableIssues = 0;
        
        // 1. Saare failed issues ko dhoondho
        const allFailedIssues = window.analysisResults
          .filter(r => r.status === 'failed')
          .flatMap(r => r.issues);

        allFailedIssues.forEach(issue => {
          let suggestion = null;
          let fixType = null;
          
          // 2. Sirf 'alt' aur 'contrast' waale issues ke liye suggestion generate karo
          if (issue.type === 'alt-text') {
            fixType = 'alt';
            suggestion = AILogic.getAltTextSuggestion({ 
              src: issue.src || '', title: '', ariaLabel: '' 
            });
          } else if (issue.type === 'color-contrast') {
            fixType = 'contrast';
            suggestion = AILogic.getContrastSuggestion({ 
              fgColor: issue.fg || '', 
              bgColor: issue.bg || 'rgb(255, 255, 255)' 
            });
          }

          // 3. Agar suggestion mila, toh use fix karo
          if (fixType && suggestion && issue.xpath) {
            fixableIssues++;
            // Button ko 'null' pass kar rahe hain taaki har fix alag se update na kare
            handleAutoFix(issue.xpath, fixType, suggestion, null);
          }
        });
        
        if (fixableIssues > 0) {
          fixAllButton.textContent = `Fixed ${fixableIssues} Issues! ✅`;
          fixAllButton.style.backgroundColor = "#229954";
          // Page ko refresh karne ki zaroorat nahi hai, 
          // but hum results ko refresh kar sakte hain
          setTimeout(() => runAnalysis(), 2000); // 2 sec baad table refresh karo
        } else {
          fixAllButton.textContent = "No Fixable Issues Found";
        }
      });
    }
    // ... "Fix All" listener ke baad ...

    // --- YAHAN ADD KAREIN (Heatmap Button) ---
    const showAllBtn = document.getElementById('showAllErrorsBtn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        
        // 1. Saare failed XPaths ka array banao
        const allXPaths = window.analysisResults
          .filter(r => r.status === 'failed')
          .flatMap(r => r.issues)       // Saare issues ko ek array mein daalo
          .map(issue => issue.xpath)    // Sirf xpath select karo
          .filter(xpath => xpath);      // Jinka xpath hai (null/undefined hatao)
          
        if (allXPaths.length === 0) {
          alert("No errors found to highlight.");
          return;
        }

        // 2. content.js ko naya message bhejo
        chrome.tabs.sendMessage(currentTab.id, {
          action: "highlightAll",
          xpaths: allXPaths
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Highlight All failed:", chrome.runtime.lastError.message);
          }
        });
        
        // 3. Popup band kar do taaki user page dekh sake
        setTimeout(() => window.close(), 100);
      });
    }
    // --- END ADD ---

    // -----------------------------------------------------------------
    // --- [CHANGE 3]: AI BUTTON CLICK LISTENER KO BADAL DIYA GAYA HAI ---
    // -----------------------------------------------------------------
    document.getElementById('resultsBody').addEventListener('click', (event) => {
        
        // Highlight
        const highlightButton = event.target.closest('.highlight-btn');
        if (highlightButton) {
            const xpath = highlightButton.dataset.xpath;
            if (xpath) {
                highlightElement(xpath); 
                setTimeout(() => window.close(), 100); 
            }
        }
        
        // Autofix
        const autoFixButton = event.target.closest('.autofix-btn');
        if (autoFixButton) {
            const { xpath, fixType, suggestion } = autoFixButton.dataset;
            if (xpath && fixType && suggestion) {
                handleAutoFix(xpath, fixType, suggestion, autoFixButton);
            }
        }

        // --- AI Suggestion Logic (SERVER-FREE) ---
        const aiSuggestButton = event.target.closest('.ai-suggest');
        if (aiSuggestButton) {
            event.stopPropagation(); 
            const { xpath, fixType, src, text, heading, fgColor, bgColor } = aiSuggestButton.dataset;
            
            let suggestion = null;

            if (fixType === 'alt') {
                suggestion = AILogic.getAltTextSuggestion({ 
                  src: src, 
                  title: '', 
                  ariaLabel: '' 
                });
            } else if (fixType === 'contrast') {
                suggestion = AILogic.getContrastSuggestion({ 
                  fgColor: fgColor, 
                  bgColor: bgColor || 'rgb(255, 255, 255)' 
                });
            }
            // 'link-purpose' ke liye 'else if' block nahi hai, isliye woh skip ho jaayega

            if (suggestion) {
              // Suggestion mil gaya, ab "Fix with AI" button dikhao
              const fixButton = aiSuggestButton.nextElementSibling;
              if (fixButton && fixButton.classList.contains('autofix-btn')) {
                  fixButton.dataset.suggestion = suggestion; // Suggestion ko Fix button mein save karein
                  fixButton.style.display = 'inline-block'; // Fix button dikhayein
              }
              aiSuggestButton.textContent = "Suggestion Ready!";
              aiSuggestButton.disabled = true;
            } else {
              // Suggestion nahi mila (ya fixType match nahi hua)
              console.warn("AI Suggest: Could not generate suggestion for", aiSuggestButton.dataset);
              aiSuggestButton.textContent = "Data Error";
              aiSuggestButton.disabled = true;
            }
        }
    });
    // --- [CHANGE 3] END ---

    // Step 4: Analysis shuru karein
    setTimeout(() => {
        runAnalysis();
    }, 500); // Thoda delay taaki page poori tarah load ho
});
// --- END: MERGED DOMContentLoaded ---


// -----------------------------------------------------------------
// --- START: WORKING PDF DOWNLOAD LISTENER (Ye alag se run hoga) ---
// -----------------------------------------------------------------
// === GENERATE PDF REPORT (Manifest V3 SAFE) ===
document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("downloadPdf");
  if (!btn) return;

  btn.addEventListener("click", async () => {
  try {
    console.log("🧩 Loading jsPDF module...");

    // Dynamically load jsPDF
    const jsPDFModuleUrl = chrome.runtime.getURL("utils/jspdf.umd.min.js");
    await import(jsPDFModuleUrl);
    await new Promise(r => setTimeout(r, 100)); // wait for global attach

    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      console.error("❌ jsPDF not found on window.jspdf:", window.jspdf);
      throw new Error("jsPDF failed to initialize");
    }
    console.log("✅ jsPDF loaded successfully via window.jspdf");

    // Load AutoTable plugin
    console.log("🧩 Loading AutoTable plugin...");
    const autoTableScript = document.createElement("script");
    autoTableScript.src = chrome.runtime.getURL("utils/jspdf.plugin.autotable.min.js");
    await new Promise((resolve, reject) => {
      autoTableScript.onload = resolve;
      autoTableScript.onerror = reject;
      document.head.appendChild(autoTableScript);
    });
    console.log("✅ AutoTable plugin loaded successfully");

    // ✅ Get table and current analyzed URL
    const table = document.querySelector("table");
    if (!table) return alert("No table found to export!");

    const currentUrl = document.querySelector(".current-url")?.textContent || 
                       (await new Promise(resolve => {
                         chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                           resolve(tabs[0]?.url || "Unknown URL");
                         });
                       }));

    // Super-clean text function (removes stray 'L, quotes, weird chars)
// Utility to sanitize and format issues/fixes
const cleanText = txt => {
  return (txt || "")
    .replace(/['"‘’`´]/g, "")                 // remove quotes
    .replace(/^[^A-Za-z0-9]+/, "")            // remove stray symbols
    .replace(/^[Ll]\s*(?=(PASS|FAIL))/i, "")  // fix 'L FAILED'
    .replace(/[\u200B-\u200D\uFEFF]/g, "")    // remove hidden chars
    .replace(/\s+/g, " ")                     // normalize spaces
    .trim();
};

// Add structured line breaks for better readability
const formatIssues = txt =>
  (cleanText(txt)
    .replace(/\s*Issue\s*(?=\d+:)/gi, "\nIssue ") // put each Issue on new line
    .trim());

const formatFixes = txt =>
  (cleanText(txt)
    .replace(/(?<=[.])\s+/g, "\n") // break after each sentence
    .trim());

const rows = Array.from(table.querySelectorAll("tbody tr")).map(tr => {
  const cells = tr.querySelectorAll("td");
  const guideline = cleanText(cells[0]?.innerText);
  const status = cleanText(cells[1]?.innerText);
  const issue = formatIssues(cells[2]?.innerText);
  const fix = formatFixes(cells[3]?.innerText);

  return {
    guideline,
    status,
    issue,
    fix,
    severity:
      (issue.includes("High") && "High") ||
      (issue.includes("Medium") && "Medium") ||
      (issue.includes("Low") && "Low") ||
      "",
  };
});



   // ✅ Create PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // --- HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Accessibility Analyzer Report", 40, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);

    // ✅ Add the tested URL
    doc.setTextColor(0, 0, 180);
    doc.textWithLink(`Tested URL: ${currentUrl}`, 40, 75, { url: currentUrl });
    doc.setTextColor(0, 0, 0); // reset color

    // Optional logo
    try {
      const img = new Image();
      img.src = chrome.runtime.getURL("icons/icon.png");
      await new Promise(r => (img.onload = r));
      doc.addImage(img, "PNG", 460, 20, 40, 40);
    } catch (e) {
      console.warn("⚠️ Icon not found, skipping logo.");
    }

    // --- TABLE ---
    const columns = [
      { header: "Guideline", dataKey: "guideline" },
      { header: "Status", dataKey: "status" },
      { header: "Issues Found", dataKey: "issue" },
      { header: "How to Fix", dataKey: "fix" },
    ];

    // === BEAUTIFULLY SPACIOUS & CLEAN TABLE ===
doc.autoTable({
  columns,
  body: rows,
  startY: 100,
  theme: "grid",
  tableWidth: "auto",
  headStyles: {
    fillColor: [44, 62, 80],
    textColor: [255, 255, 255],
    fontSize: 11,          // 🔹 Header font size (was 8)
    halign: "center",
    valign: "middle",
    fontStyle: "bold",
    cellPadding: { top: 10, bottom: 10, left: 6, right: 6 },
  },
  styles: {
    fontSize: 9,           // 🔹 Body font size (was 6)
    textColor: [20, 20, 20],
    lineColor: [200, 200, 200],
    lineWidth: 0.3,
    cellPadding: { top: 8, bottom: 8, left: 8, right: 8 }, // 🔹 More padding = more spacious
    lineHeight: 1.6,  
    overflow: "linebreak",
    valign: "middle",
    whiteSpace: "pre-line",
  },
  bodyStyles: {
    textColor: [30, 30, 30],
  },
  alternateRowStyles: {
    fillColor: [250, 250, 250],
  },
  margin: { top: 100, left: 40, right: 40 },

  // ✅ Equal widths and custom styles per column
  columnStyles: {
    guideline: { cellWidth: 90 },
    status: { cellWidth: 65, halign: "center", fontSize: 10, fontStyle: "bold" },
    issue: { cellWidth: 190, fontSize: 9 },
    fix: { cellWidth: 170, fontSize: 9 },
  },

  didParseCell: function (data) {
    if (data.section === "body") {
      const text = (data.cell.raw || "").toString().toLowerCase();

      // ✅ Severity color coding
      if (text.includes("high")) {
        data.cell.styles.fillColor = [255, 220, 220];
      } else if (text.includes("medium")) {
        data.cell.styles.fillColor = [255, 240, 200];
      } else if (text.includes("low")) {
        data.cell.styles.fillColor = [220, 255, 220];
      }

      // ✅ Status color and format
      if (data.column.dataKey === "status") {
        if (text.includes("pass")) {
          data.cell.styles.fillColor = [210, 255, 210];
          data.cell.styles.textColor = [0, 120, 0];
          data.cell.styles.fontStyle = "bold";
        } else if (text.includes("fail")) {
          data.cell.styles.fillColor = [255, 210, 210];
          data.cell.styles.textColor = [180, 0, 0];
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  },
});



    // --- FOOTER ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Accessibility Analyzer Pro © 2025", 40, pageHeight - 20);

    // ✅ Save file
    doc.save("Accessibility_Report.pdf");
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    alert("Error generating PDF. Check console for details.");
  }
})});