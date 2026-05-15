package run.halo.live2d;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.Theme;
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
    private static final Path THEME_TIPS_FILE = Path.of("assets", "live2d", "tips.json");

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

    public Mono<String> getActiveThemeLive2dTipsPath(String pathTemplate) {
        return getActiveThemeName()
            .flatMap(themeName -> extensionClient.fetch(Theme.class, themeName)
                .filter(theme -> {
                if (theme.getStatus() == null || theme.getStatus().getLocation() == null) {
                    return false;
                }

                String location = theme.getStatus().getLocation();
                if (location.isBlank()) {
                    return false;
                }

                try {
                    return Files.isRegularFile(Path.of(location).resolve(THEME_TIPS_FILE));
                } catch (InvalidPathException ignored) {
                    return false;
                }
                })
                .map(theme -> String.format(pathTemplate, themeName)))
            .defaultIfEmpty("");
    }
}
