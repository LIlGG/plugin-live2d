export const hasWebsiteHome = location.hostname === "/";

export const documentTitle = document.title.split(" - ")[0];

export const isReferrer = document.referrer === "";

export const getReferrer = () => {
  if (isReferrer) {
    return;
  }
  return new URL(document.referrer);
}

export const getReferrerDomain = () => {
  const Domains: Record<string, string> = {
    baidu: "百度",
    so: "360搜索",
    google: "谷歌搜索",
    bing: "必应",
    yahoo: "雅虎",
    sogou: "搜狗",
    haosou: "好搜",
  }
  const referrer = getReferrer();
  if (!referrer) {
    return;
  }
  const { hostname } = referrer;
  if (location.hostname === hostname) {
    return;
  }
  const domain = hostname.split(".")[1];
  if (Domains[domain]) {
    return Domains[domain];
  }
  return hostname;
}