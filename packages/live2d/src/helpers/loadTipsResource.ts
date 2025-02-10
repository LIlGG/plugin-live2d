import type { TipConfig } from '../context/config-context';

/**
 * 远程加载提示资源
 * 
 * @param url 
 * @returns 
 */
export function loadTipsResource(url?: string) {
  const defaultObj: TipConfig = {
    mouseover: [],
    click: [],
    seasons: [],
    message: {},
  };
  return new Promise<TipConfig
    | undefined>((resolve) => {
      if (!url) {
        resolve(defaultObj);
        return;
      }
      try {
        fetch(url)
          .then((response) => response.json())
          .then((result) => {
            resolve(result);
          })
          .catch(() => {
            resolve(defaultObj);
          });
      } catch (e) {
        // ignore
      }
    });
};