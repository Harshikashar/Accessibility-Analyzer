let allResults = [];
let pieChart = null;

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

function cleanText(text) {
  if (!text) return "";
  return text
    // Normalize to NFKD form to break composed characters (important!)
    .normalize("NFKD")
    // Remove ALL known quote-like marks and punctuation variants
    .replace(/['"`´‘’‚‛“”„‟‹›«»]/g, "")
    // Remove bullets, middle dots, or random leading punctuation
    .replace(/^[\s\p{P}\p{S}]+/gu, "")
    // Remove hidden or directional Unicode characters
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    // Replace multiple spaces with one
    .replace(/\s+/g, " ")
    // Normalize known phrases
    .replace(/\bno issues found\b/gi, "No issues found")
    .replace(/\bno fix needed\b/gi, "No fix needed")
    .replace(/\bpassed\b/gi, "PASSED")
    .replace(/\bfailed\b/gi, "FAILED")
    .trim();
}


// ✅ SINGLE DOMContentLoaded — clean version
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["analysisResults", "targetUrl"], (data) => {
    allResults = data.analysisResults || [];

    document.getElementById("targetUrl").textContent =
      data.targetUrl || "URL not available";

    updateDisplay();
    createPieChart();
  });

  // Filters
  document.getElementById("impactFilter").addEventListener("change", updateDisplay);
  document.getElementById("standardsFilter").addEventListener("change", updateDisplay);

  // === ✅ WORKING PDF DOWNLOAD ===
  const btn = document.getElementById("downloadPdfBtn");
  if (btn) {
    btn.addEventListener("click", () => generatePdfReport());
  }
});

async function generatePdfReport() {
  try {
    console.log("🧩 Starting PDF generation...");
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) throw new Error("jsPDF not loaded. Check script include.");


    // ✅ Create PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // --- HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Accessibility Analyzer Report", 40, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);

 

    // Optional logo
    try {
      const img = new Image();
      img.src = chrome.runtime.getURL("icons/icon.png");
      await new Promise(r => (img.onload = r));
      doc.addImage(img, "PNG", 460, 20, 40, 40);
    } catch {
      console.warn("⚠️ Logo not found — skipping.");
    }

    // --- Prepare data (same as popup) ---
    const rows = Array.from(document.querySelectorAll(".result-row")).map((row) => {
      const guideline =
        `${row.querySelector("h4")?.innerText || "N/A"} ` +
        `${row.querySelector(".wcag-code")?.innerText || ""} ` +
        `${row.querySelector(".priority")?.innerText || ""}`;
      const status = cleanText(row.querySelector(".status-badge")?.innerText || "N/A");
const issue = cleanText(row.querySelector(".issues-list")?.innerText || "✓ No issues found");
const fix = cleanText(row.querySelector(".fix-container")?.innerText || "No fix needed");


      return { guideline, status, issue, fix };
    });

    if (!rows.length) {
      alert("No results to export!");
      return;
    }

    const columns = [
      { header: "Guideline", dataKey: "guideline" },
      { header: "Status", dataKey: "status" },
      { header: "Issues Found", dataKey: "issue" },
      { header: "How to Fix", dataKey: "fix" },
    ];

    rows.forEach(r => {
  r.guideline = cleanText(r.guideline);
  r.status = cleanText(r.status);
  r.issue = cleanText(r.issue);
  r.fix = cleanText(r.fix);
});


    // --- BEAUTIFUL TABLE (same as popup.js) ---
    doc.autoTable({
      columns,
      body: rows,
      startY: 100,
      theme: "grid",
      tableWidth: "auto",
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontSize: 11,
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        cellPadding: { top: 10, bottom: 10, left: 6, right: 6 },
      },
      styles: {
        fontSize: 9,
        textColor: [20, 20, 20],
        lineColor: [200, 200, 200],
        lineWidth: 0.3,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
        lineHeight: 1.6,
        overflow: "linebreak",
        valign: "middle",
        whiteSpace: "pre-line",
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 100, left: 40, right: 40 },
      columnStyles: {
        guideline: { cellWidth: 90 },
        status: { cellWidth: 65, halign: "center", fontSize: 10, fontStyle: "bold" },
        issue: { cellWidth: 190, fontSize: 9 },
        fix: { cellWidth: 170, fontSize: 9 },
      },

      // ✅ Match popup.js color coding
      didParseCell: function (data) {
        if (data.section === "body") {
          const text = (data.cell.raw || "").toString().toLowerCase();

          if (text.includes("high")) data.cell.styles.fillColor = [255, 220, 220];
          else if (text.includes("medium")) data.cell.styles.fillColor = [255, 240, 200];
          else if (text.includes("low")) data.cell.styles.fillColor = [220, 255, 220];

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

    // ✅ Save PDF
    doc.save("Accessibility_Report.pdf");
    console.log("✅ PDF generated successfully");
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    alert("Error generating PDF. Check console for details.");
  }
}



// === Existing Display + Chart logic (unchanged) ===
function updateDisplay() {
  const impactFilter = document.getElementById("impactFilter").value;
  const standardsFilter = document.getElementById("standardsFilter").value;

  let filtered = allResults.filter((r) => {
    const impactMatch = impactFilter === "all" || r.status === impactFilter;
    const standardMatch = standardsFilter === "all";
    return impactMatch && standardMatch;
  });

  const passed = allResults.filter((r) => r.status === "passed").length;
  const failed = allResults.filter((r) => r.status === "failed").length;

  document.getElementById("passedCount").textContent = passed;
  document.getElementById("failedCount").textContent = failed;
  document.getElementById("totalCount").textContent = allResults.length;
  document.getElementById("totalViolations").textContent = failed;

  const resultsBody = document.getElementById("resultsBody");
  resultsBody.innerHTML = "";

  if (!filtered.length) {
    resultsBody.innerHTML = '<div class="no-results">⚠️ No results found</div>';
    return;
  }

  filtered.forEach((result) => {
    const row = document.createElement("div");
    row.className = "result-row";
    const statusClass = result.status === "passed" ? "passed" : "failed";
    const statusIcon = result.status === "passed" ? "✓" : "✗";
    const statusText = result.status === "passed" ? "PASSED" : "FAILED";

    let issuesHtml = "";
    if (!result.issues?.length) {
      issuesHtml = '<div class="issues-container"><div class="no-issues">✓ No issues</div></div>';
    } else {
      issuesHtml = '<div class="issues-container has-issues"><div class="issues-list">';
      result.issues.forEach((issue, i) => {
        issuesHtml += `<div><strong>Issue ${i + 1}:</strong> ${issue.description || ""}</div>`;
      });
      issuesHtml += "</div></div>";
    }

    const fixHtml =
      result.status === "failed" && result.solution
        ? `<div class="fix-container"><strong>${result.solution.title}</strong><ul>${result.solution.steps
            .map((s) => `<li>${s}</li>`)
            .join("")}</ul></div>`
        : '<div class="fix-container no-fix">✓ No fix needed</div>';

    row.innerHTML = `
      <div class="guideline-info">
        <h4>${result.name}</h4>
        <span class="wcag-code">WCAG ${result.code}</span>
        <div class="priority">Priority: ${result.priority}</div>
      </div>
      <div><span class="status-badge ${statusClass}">${statusIcon} ${statusText}</span></div>
      <div>${issuesHtml}</div>
      <div>${fixHtml}</div>
      <div class="guideline-link">
        <a href="https://www.w3.org/WAI/WCAG21/Understanding/${wcagLinks[result.code] || ""}.html" target="_blank">
          WCAG ${result.code}
        </a>
      </div>`;
    resultsBody.appendChild(row);
  });
}

function createPieChart() {
  const canvas = document.getElementById("statusChart");
  if (!canvas) return;
  const passed = allResults.filter((r) => r.status === "passed").length;
  const failed = allResults.filter((r) => r.status === "failed").length;
  const total = passed + failed;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!total) return ctx.fillText("No data", 150, 150);

  const startAngle = -Math.PI / 2;
  const passedAngle = (passed / total) * Math.PI * 2;
  ctx.beginPath();
  ctx.moveTo(150, 150);
  ctx.arc(150, 150, 120, startAngle, startAngle + passedAngle);
  ctx.fillStyle = "#27ae60";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(150, 150);
  ctx.arc(150, 150, 120, startAngle + passedAngle, startAngle + Math.PI * 2);
  ctx.fillStyle = "#e74c3c";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(150, 150, 70, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round((passed / total) * 100)}%`, 150, 155);
}
