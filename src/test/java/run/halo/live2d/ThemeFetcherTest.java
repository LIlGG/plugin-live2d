package run.halo.live2d;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import run.halo.app.extension.ConfigMap;
import run.halo.app.extension.ReactiveExtensionClient;
import run.halo.app.infra.SystemSetting;

class ThemeFetcherTest {

    private final ReactiveExtensionClient extensionClient = mock(ReactiveExtensionClient.class);

    @Test
    void shouldReturnEmptyWhenThemeConfigIsMissing() {
        var configMap = new ConfigMap();
        configMap.setData(Map.of());
        when(extensionClient.fetch(ConfigMap.class, SystemSetting.SYSTEM_CONFIG))
            .thenReturn(Mono.just(configMap));

        var themeFetcher = new ThemeFetcher(extensionClient);

        assertThat(themeFetcher.getActiveThemeName().blockOptional()).isEmpty();
    }

    @Test
    void shouldReturnEmptyWhenThemeConfigDataIsNull() {
        var configMap = new ConfigMap();
        when(extensionClient.fetch(ConfigMap.class, SystemSetting.SYSTEM_CONFIG))
            .thenReturn(Mono.just(configMap));

        var themeFetcher = new ThemeFetcher(extensionClient);

        assertThat(themeFetcher.getActiveThemeName().blockOptional()).isEmpty();
    }

    @Test
    void shouldReturnActiveThemeName() {
        var configMap = new ConfigMap();
        configMap.setData(Map.of("theme", "{\"active\":\"default\"}"));
        when(extensionClient.fetch(ConfigMap.class, SystemSetting.SYSTEM_CONFIG))
            .thenReturn(Mono.just(configMap));

        var themeFetcher = new ThemeFetcher(extensionClient);

        assertThat(themeFetcher.getActiveThemeName().blockOptional()).contains("default");
    }
}
