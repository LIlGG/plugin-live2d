package run.halo.live2d.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.Plugin;
import run.halo.app.extension.ReactiveExtensionClient;

class HaloAiFoundationAvailabilityTest {

    @Test
    void returnsFalseWhenAiFoundationClassIsNotVisible() {
        var isolatedClassLoader = new ClassLoader(null) {
        };

        assertThat(HaloAiFoundationAvailability.isClassPresent(isolatedClassLoader)).isFalse();
    }

    @Test
    void returnsTrueWhenAiFoundationClassIsVisible() {
        assertThat(HaloAiFoundationAvailability.isClassPresent(getClass().getClassLoader()))
            .isTrue();
    }

    @Test
    void returnsTrueOnlyWhenPluginIsEnabledAndStarted() {
        var client = mock(ReactiveExtensionClient.class);
        var availability = new HaloAiFoundationAvailability(client);
        var plugin = plugin(true, Plugin.Phase.STARTED);
        when(client.fetch(Plugin.class, "ai-foundation")).thenReturn(Mono.just(plugin));

        assertThat(availability.isEnabled().block()).isTrue();
    }

    @Test
    void returnsFalseWhenPluginIsDisabled() {
        var client = mock(ReactiveExtensionClient.class);
        var availability = new HaloAiFoundationAvailability(client);
        var plugin = plugin(false, Plugin.Phase.STARTED);
        when(client.fetch(Plugin.class, "ai-foundation")).thenReturn(Mono.just(plugin));

        assertThat(availability.isEnabled().block()).isFalse();
    }

    @Test
    void returnsFalseWhenPluginIsNotStarted() {
        var client = mock(ReactiveExtensionClient.class);
        var availability = new HaloAiFoundationAvailability(client);
        var plugin = plugin(true, Plugin.Phase.DISABLED);
        when(client.fetch(Plugin.class, "ai-foundation")).thenReturn(Mono.just(plugin));

        assertThat(availability.isEnabled().block()).isFalse();
    }

    private Plugin plugin(boolean enabled, Plugin.Phase phase) {
        var plugin = new Plugin();
        var spec = new Plugin.PluginSpec();
        spec.setEnabled(enabled);
        plugin.setSpec(spec);
        var status = new Plugin.PluginStatus();
        status.setPhase(phase);
        plugin.setStatus(status);
        return plugin;
    }
}
