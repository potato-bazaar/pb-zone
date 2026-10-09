"use client";

/**
 * Copies a stored PB Zone session onto `window` before hydration.
 * `text/javascript` on the server so the browser runs it while parsing HTML;
 * `text/plain` on the client so React does not try to execute a <script> during render.
 */
const BOOTSTRAP = `(function(){try{var keys=["pbZoneSession","pb-zone-session"];for(var i=0;i<keys.length;i++){var r=sessionStorage.getItem(keys[i])||localStorage.getItem(keys[i]);if(r){var p=JSON.parse(r);window.__PB_ZONE_SESSION__=p;if(p.token){sessionStorage.setItem("pbZoneToken",p.token);}if(p.userName){sessionStorage.setItem("pbZoneUserName",p.userName);}break;}}var t=sessionStorage.getItem("pbZoneToken");var n=sessionStorage.getItem("pbZoneUserName");if(t||n){window.__PB_ZONE_SESSION__=window.__PB_ZONE_SESSION__||{};if(t)window.__PB_ZONE_SESSION__.token=t;if(n)window.__PB_ZONE_SESSION__.userName=n;}}catch(e){}})();`;

export function SessionBootstrap() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: BOOTSTRAP }}
    />
  );
}
