/**
 * 请求资源
 *
 * @param url 资源链接
 * @returns {Promise<unknown>}
 */
export const loadTipsResource = (url: string) => {
  let defaultObj = {};
  return new Promise((resolve) => {
    if (!url) {
      resolve(defaultObj);
    }
    fetch(url)
      .then((response) => response.json())
      .then((result) => {
        resolve(result);
      })
      .catch(() => {
        resolve(defaultObj);
      });
  });
};

/**
 * 去重对象数组
 * @param dupArray 需要去重的数组
 * @param key 对象数组 key
 */
export const distinctArray = <T>(dupArray: T[], key: keyof T): T[] => {
  const obj: { [key: string]: boolean } = {};

  return dupArray.reduce((curr, next) => {
    if (!obj[String(next[key])]) {
      obj[String(next[key])] = true;
      curr.push(next);
    }
    return curr;
  }, [] as T[]);
};

/**
 * 从数组中获取任意一个数据。当给定数据不是数组时，将返回原数据。
 *
 * @param obj 需要获取随机数的数组
 * @returns {Object} 数组内的任意一个数据或原数据
 */
export const randomSelection = (obj: string[]) => {
  return Array.isArray(obj) ? obj[Math.floor(Math.random() * obj.length)] : obj;
};
