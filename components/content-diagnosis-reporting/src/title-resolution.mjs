export function decodeHtml(value="") {
  return String(value)
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
}

export function titleFromHtml(html="") {
  const source=String(html);
  const meta=source.match(/<meta[^>]+property=["']og:title["'][^>]*>/i)?.[0]
    || source.match(/<meta[^>]+content=(?:"[^"]*"|'[^']*')[^>]+property=["']og:title["'][^>]*>/i)?.[0] || "";
  const content=meta.match(/content="([^"]*)"/i)?.[1] ?? meta.match(/content='([^']*)'/i)?.[1];
  const raw=content || source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const clean=decodeHtml(raw).replace(/\s+-\s+小红书\s*$/u,"").trim();
  return /^(小红书|登录|安全验证|Sorry,)/i.test(clean) ? "" : clean;
}

export async function fetchOriginalTitle(url) {
  const response=await fetch(url,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0"}});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return titleFromHtml(await response.text());
}
