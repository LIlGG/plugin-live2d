package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import run.halo.app.extension.ConfigMap;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.app.infra.SystemSetting;
import run.halo.app.infra.utils.JsonUtils;

/**
 * @author LIlGG
 * @since 2022-12-12
 */
@Component
public class ThemeFetcher {

    private final ReactiveExtensionClient extensionClient;

    public ThemeFetcher(ReactiveExtensionClient extensionClient) {
        this.extensionClient = extensionClient;
    }

    public Mono<String> getActiveThemeName() {
        return this.extensionClient.fetch(ConfigMap.class,
                SystemSetting.SYSTEM_CONFIG
            )
            .map(ConfigMap::getData)
            .map(data -> JsonUtils.jsonToObject(
                data.get("theme"), JsonNode.class).get("active").asText()
            );
    }
}