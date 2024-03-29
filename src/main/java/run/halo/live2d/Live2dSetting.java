package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

/**
 * @author LIlGG
 * @since 2022-12-04
 */
public interface Live2dSetting {

    /**
     * 根据组名获取 settings.yaml 内的组数据集合
     *
     * @param groupName 组
     * @return JsonNode
     */
    Mono<JsonNode> getGroup(String groupName);

    /**
     * 根据 Key 获取 settings.yaml 内的值
     *
     * @param groupName 组
     * @param key key
     * @return JsonNode
     */
    Mono<JsonNode> getValue(String groupName, String key);

    /**
     * 获取适用于 Live2d 的配置
     *
     * @return 配置
     */
    Mono<JsonNode> getConfig();
}
