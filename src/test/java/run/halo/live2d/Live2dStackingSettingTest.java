package run.halo.live2d;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.live2d.agent.AgentToolNormalizer;
import run.halo.live2d.ai.HaloAiFoundationAvailability;

class Live2dStackingSettingTest {

    @ParameterizedTest
    @ValueSource(ints = {0, 25, 9998})
    void includesSavedStackingLayerInPublicConfiguration(int zIndex) {
        var settingFetcher = mock(ReactiveSettingFetcher.class);
        var availability = mock(HaloAiFoundationAvailability.class);
        var advanced = JsonNodeFactory.instance.objectNode().put("zIndex", zIndex);
        when(settingFetcher.getValues()).thenReturn(Mono.just(Map.of("advanced", advanced)));
        when(availability.isEnabled()).thenReturn(Mono.just(false));
        var settings = new Live2dSettingProcess(settingFetcher,
            mock(AgentToolNormalizer.class), availability);

        var config = settings.getPublicConfig(null).block();

        assertThat(config).isNotNull();
        assertThat(config.get("zIndex").intValue()).isEqualTo(zIndex);
        assertThat(config.has("advanced")).isFalse();
    }
}
