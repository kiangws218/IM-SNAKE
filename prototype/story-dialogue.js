"use strict";

(function(root){
  function splitPages(value){
    if(Array.isArray(value))return value.map(page=>String(page||"").trim()).filter(Boolean);
    return String(value||"")
      .replace(/\r\n?/g,"\n")
      .split(/\n[ \t]*\n+/)
      .map(page=>page.trim())
      .filter(Boolean);
  }

  function normalize(dialogue){
    const source=dialogue||{};
    const pages=splitPages(source.pages||source.text||"");
    return Object.assign({},source,{pages:pages.length?pages:[""]});
  }

  root.IMS_STORY_DIALOGUE={splitPages,normalize};
})(typeof window!=="undefined"?window:globalThis);
