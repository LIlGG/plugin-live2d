import type { TipConfig } from "../context/config-context";
import { distinctArray } from "../utils/distinctArray";

/**
 * 合并各个渠道的 tips，根据获取位置不同，合并时优先级也不同。优先级按高到低的顺序为
 *
 * <ul>
 *   <ol>后台插件配置文件中获得的 tips。（该配置文件只支持 mouseover 与 click 两种类型的 tips 属性，另外包括单独配置的 message）</ol>
 *   <ol>主题文件中设置的 tips （该配置文件只支持 mouseover 与 click 两种类型的 tips 属性）</ol>
 *   <ol>配置/默认的 tips 文件（该配置文件支持所有的 tips 属性，但其属性会被优先级高的覆盖）</ol>
 * </ul>
 *
 * 请注意，此项返回值为修改后的 defaultTips，任何修改 defaultTips 的情况都将导致返回值同步修改。
 *
 * @param pluginTips 后台配置文件中设置的 tips
 * @param themeTips 主题提供的 tips
 * @param defaultTips 配置/默认的 tips
 */
export const mergeTips = ({ pluginTips, themeTips, fullOrDefaultTips }: {
  pluginTips: TipConfig;
  themeTips: TipConfig;
  fullOrDefaultTips: TipConfig;
}) => {
  const defaultTips = { ...fullOrDefaultTips };
  const duplicateClick = [...pluginTips.click, ...themeTips.click, ...fullOrDefaultTips.click];
  const duplicateMouseover = [...pluginTips.mouseover, ...themeTips.mouseover, ...fullOrDefaultTips.mouseover];
  defaultTips.click = distinctArray(duplicateClick, "selector");
  defaultTips.mouseover = distinctArray(duplicateMouseover, "selector");
  defaultTips.message = { ...defaultTips.message, ...pluginTips.message };
  return defaultTips;
};