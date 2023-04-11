package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;

/**
 * Live2d 配置处理器
 *
 * @author LIlGG
 * @since 2022-12-04
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class Live2dSettingProcess extends JsonNodeFactory implements Live2dSetting {
    private final ReactiveSettingFetcher settingFetcher;

    @Override
    public Mono<JsonNode> getGroup(String groupName) {
        return this.settingFetcher.get(groupName);
    }

    @Override
    public Mono<JsonNode> getValue(String groupName, String key) {
        return getGroup(groupName).map(group -> group.get(key));
    }

    @Override
    public Mono<JsonNode> getConfig() {
        return settingFetcher.getValues().map(data -> {
            ObjectNode objectNode = JsonNodeFactory.instance.objectNode();
            data.values().forEach(v -> {
                v.fieldNames().forEachRemaining(otherK -> {
                    objectNode.set(otherK, v.get(otherK));
                });
            });
            return objectNode;
        });
    }
}
