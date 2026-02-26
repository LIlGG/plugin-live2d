import { isNotEmptyString } from '../../utils/isString';
import { Tool } from './tools';

/**
 * 前往站点工具
 */
export class InfoTool extends Tool {
  priority = 40;

  name(): string {
    return "info";
  }

  icon() {
    const icon = this.getConfig().infoIcon;
    return isNotEmptyString(icon) ? icon : 'ph-info-fill';
  }

  execute() {
    const siteUrl =
      this.getConfig().infoSite || 'https://github.com/LIlGG/plugin-live2d';
    window.open(siteUrl);
  }
}
