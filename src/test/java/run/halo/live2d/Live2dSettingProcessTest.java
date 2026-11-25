package run.halo.live2d;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.BooleanNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.live2d.agent.AgentToolNormalizer;
import run.halo.live2d.ai.HaloAiFoundationAvailability;

class Live2dSettingProcessTest {

    private final ReactiveSettingFetcher settingFetcher = mock(ReactiveSettingFetcher.class);
    private final HaloAiFoundationAvailability aiFoundationAvailability =
        mock(HaloAiFoundationAvailability.class);

    @Test
    void shouldIncludeShowOnMobileWhenDisabled() {
        var base = JsonNodeFactory.instance.objectNode();
        base.put("showOnMobile", false);

        var config = publicConfig(base);

        assertThat(config.get("showOnMobile")).isEqualTo(BooleanNode.FALSE);
    }

    @Test
    void shouldIncludeShowOnMobileWhenEnabled() {
        var base = JsonNodeFactory.instance.objectNode();
        base.put("showOnMobile", true);

        var config = publicConfig(base);

        assertThat(config.get("showOnMobile")).isEqualTo(BooleanNode.TRUE);
    }

    @Test
    void shouldKeepOlderConfigurationWithoutShowOnMobileCompatible() {
        var base = JsonNodeFactory.instance.objectNode();
        base.put("modelId", 3);

        var config = publicConfig(base);

        assertThat(config.has("showOnMobile")).isFalse();
        assertThat(config.get("modelId").intValue()).isEqualTo(3);
    }

    private JsonNode publicConfig(ObjectNode base) {
        when(settingFetcher.getValues()).thenReturn(Mono.just(Map.of("base", base)));
        when(aiFoundationAvailability.isEnabled()).thenReturn(Mono.just(false));
        var settingProcess = new Live2dSettingProcess(settingFetcher,
            mock(AgentToolNormalizer.class), aiFoundationAvailability);

        return settingProcess.getPublicConfig(null).block();
    }
}
