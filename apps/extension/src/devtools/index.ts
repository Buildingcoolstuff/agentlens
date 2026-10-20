/**
 * AgentLens Chrome DevTools Panel Initializer
 */

chrome.devtools.panels.create(
  'AgentLens',
  'icons/icon32.png',
  'panel.html',
  (_panel) => {
    console.log('AgentLens DevTools panel mounted.');
  }
);
