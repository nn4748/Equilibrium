// Inline scripts run before first paint. Kept out of client modules so the
// server layout receives plain strings.

export const THEME_STORAGE_KEY = "eq:theme";
export const LANG_KEY = "eq:lang";

export const bootScript = `(function(){try{var d=document.documentElement;var p=localStorage.getItem("${THEME_STORAGE_KEY}");d.dataset.theme=p==="light"||p==="dark"?p:(p==="system"&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var l=localStorage.getItem("${LANG_KEY}")==="ar"?"ar":"en";d.lang=l;d.dir=l==="ar"?"rtl":"ltr";}catch(e){document.documentElement.dataset.theme="dark";}})();`;
