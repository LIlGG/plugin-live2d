import mitt from "mitt";
import type { Ref } from "vue";

export type Events = {
  /**
   * 显示消息至消息栏
   *
   * @param text 需要显示的消息
   * @param timeout 消息展示时间（最大）
   * @param priority 消息优先级，数字越大，优先级越大
   */
  showMessage: {
    text: string | string[];
    timeout: number;
    priority: number;
  };

  /**
   * 创建一个流式效果的消息框。
   * 此消息框的优先级将大于所有其他消息框优先级，且不会被其他消息覆盖。
   *
   * @param timeout 等待消息流的最大时间，超过此时间将自动关闭流消息框
   * @param showTimeout 消息全部接受完之后，展示时长
   * @param sendMessage 发送消息的方法
   * @param stop 停止消息流
   */
  createStreamMessageTunnel: {
    timeout: number;
    showTimeout: number;
    sendMessage: Ref<string>;
    stop: Ref<boolean>;
  };

  /**
   * 显示一言
   *
   * @param api 需要获取的一言接口
   * @param callback 获取到的一言返回结果特殊化处理（用于不同接口的差异性）。
   *                 其处理返回值为数组或字符串，数组第一位为一言（不可为空），数组第二位为作者，网站等信息（可为空）
   */
  showHitokoto: {
    api: string;
    callback: Function;
  };

  /**
   * 切换其他模型
   */
  loadOtherModel: void;

  /**
   * 切换纹路
   */
  loadModelTexture: void;
};

export default mitt<Events>();
