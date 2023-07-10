export interface ModelReturn {
  /**
   * 根据模型 ID 和材质 ID 加载对应的模型及材质
   *
   * @param modelId 模型 ID
   * @param modelTexturesId 材质 ID
   * @returns void
   */
  loadModel: (modelId: number, modelTexturesId: number) => void;

  /**
   * 随机切换模型材质
   * @returns Promise<string> 返回切换成功后的提示语
   */
  loadModelTexture: () => Promise<string>;

  /**
   * 切换模型
   * @returns Promise<string> 返回切换成功后的提示语
   */
  switchModel: () => Promise<string>;
}
