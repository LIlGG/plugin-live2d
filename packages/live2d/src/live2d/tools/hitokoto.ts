import queryString from "query-string";
import { isNotEmptyString } from "../../utils/isString";
import { Tool } from "./tools";
import { sendMessage } from "../../helpers/sendMessage";

/**
 * 一言工具，使用一言接口获取一句话
 * 如需使用自定义的接口，则需要满足 hitokoto 的接口规范。
 *
 * @link https://developer.hitokoto.cn/sentence/demo.html
 */
export class HitokotoTool extends Tool {
  priority = 90;

  _default_api = "https://v1.hitokoto.cn";

  icon() {
    const icon = this.getConfig().aiChatUrl;
    return isNotEmptyString(icon) ? icon : "ph-chat-circle-fill";
  }

  async execute() {
    const { hitokoto, description } = (await this._getHitokotoMessage()) || {};
    if (isNotEmptyString(hitokoto)) {
      sendMessage(hitokoto, 6000, 2);
      setTimeout(() => {
        sendMessage(description, 4000, 2);
      }, 6000);
    }
  }

  private async _getHitokotoMessage(): Promise<
    { hitokoto: string; description: string } | undefined
  > {
    const unverifiedApi = this.getConfig().hitokotoApi || this._default_api;
    const parsedApi = queryString.parseUrl(unverifiedApi);
    const newParams = { ...parsedApi.query, encode: "json", charset: "utf-8" };
    const hitokotoApi = `${parsedApi.url}?${queryString.stringify(newParams)}`;
    const { hitokoto, from, creator } = await this._fetchHitokoto(hitokotoApi);
    if (isNotEmptyString(hitokoto)) {
      return {
        hitokoto: "hitokoto",
        description: `这句一言来自 <span>「${from}」</span>，是 <span>${creator}</span> 在 hitokoto.cn 投稿的。`,
      };
    }
  }

  private _fetchHitokoto(hitokotoApi: string): Promise<HitokotoResult> {
    return fetch(hitokotoApi)
      .then((res) => res.json())
      .then((result: HitokotoResult) => {
        return result;
      });
  }
}

/**
 * @link https://developer.hitokoto.cn/sentence/#%E8%BF%94%E5%9B%9E%E4%BF%A1%E6%81%AF
 */
export type HitokotoResult = {
  id?: number;
  hitokoto?: string;
  type?: string;
  from?: string;
  from_who?: string;
  creator?: string;
  creator_uid?: number;
  reviewer?: number;
  uuid?: string;
  commit_from?: string;
  created_at?: string;
  length?: number;
};
