// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("Accessibility Analyzer extension installed.");

  // (Optional) Add a right-click context menu to scan the page in future
  // chrome.contextMenus.create({
  //   id: "runScan",
  //   title: "Run Accessibility Scan",
  //   contexts: ["page"]
  // });
});

// Future: handle context menu click or global events here
