package run.halo.live2d.agent;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class AgentToolServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AgentToolNormalizer normalizer = new AgentToolNormalizer();

    @Test
    void doesNotExposeToolsWhenAgentDisabled() {
        var service = new AgentToolService(normalizer, null);

        var tools = service.buildTools(AgentSettings.defaults(), AgentAccessMode.ANONYMOUS_CHAT,
            false);

        assertThat(tools.agentEnabled()).isFalse();
        assertThat(tools.tools()).isEmpty();
    }

    @Test
    void filtersAuthenticatedCustomToolsForAnonymousVisitors() throws Exception {
        var service = new AgentToolService(normalizer, null);
        var settings = new AgentSettings(
            new AgentSettings.AgentBuiltInCapabilities(false, false, false, false,
                AgentCommentCapability.OFF),
            List.of(new AgentSettings.AgentToolConfig(
                "secure_action",
                true,
                "登录后可用能力",
                objectMapper.readTree("{\"type\":\"object\",\"properties\":{}}"),
                AgentToolApproval.DEFAULT,
                AgentToolAuth.AUTHENTICATED,
                objectMapper.readTree("{\"type\":\"registered\"}"),
                null
            )),
            null,
            null,
            null,
            null
        );

        assertThat(service.buildTools(settings, AgentAccessMode.ANONYMOUS_CHAT_AGENT, false)
            .tools()).isEmpty();
        assertThat(service.buildTools(settings, AgentAccessMode.ANONYMOUS_CHAT_AGENT, true)
            .tools()).extracting("name").containsExactly("secure_action");
    }

    @Test
    void assistCommentCapabilityExposesDraftButNotSubmitTool() {
        var service = new AgentToolService(normalizer, null);
        var settings = new AgentSettings(
            new AgentSettings.AgentBuiltInCapabilities(false, false, false, false,
                AgentCommentCapability.ASSIST),
            List.of(),
            null,
            null,
            null,
            null
        );

        var tools = service.buildTools(settings, AgentAccessMode.ANONYMOUS_CHAT_AGENT, false)
            .tools();

        assertThat(tools).extracting("name")
            .contains("open_comment_area", "draft_comment")
            .doesNotContain("submit_comment");
        assertThat(tools.stream().filter(tool -> "draft_comment".equals(tool.getName()))
            .findFirst().orElseThrow().getExecutor()).isNull();
    }

    @Test
    void submitCommentCapabilityExposesApprovedBrowserSubmitTool() {
        var service = new AgentToolService(normalizer, null);
        var settings = new AgentSettings(
            new AgentSettings.AgentBuiltInCapabilities(false, false, false, false,
                AgentCommentCapability.SUBMIT),
            List.of(),
            null,
            null,
            null,
            null
        );

        var submitTool = service.buildTools(settings, AgentAccessMode.ANONYMOUS_CHAT_AGENT, false)
            .tools()
            .stream()
            .filter(tool -> "submit_comment".equals(tool.getName()))
            .findFirst()
            .orElseThrow();

        assertThat(submitTool.getExecutor()).isNull();
        assertThat(submitTool.getApprovalPolicy()).isNotNull();
    }

    @Test
    void networkAccessToolIsExposedOnlyWhenEnabled() {
        var service = new AgentToolService(normalizer, null);
        var disabled = AgentSettings.defaults();
        var enabled = new AgentSettings(
            new AgentSettings.AgentBuiltInCapabilities(false, false, false, true,
                AgentCommentCapability.OFF),
            List.of(),
            null,
            null,
            null,
            new AgentSettings.AgentNetworkAccessSettings(
                List.of("https://api.example.com"), 4000, 5)
        );

        assertThat(service.buildTools(disabled, AgentAccessMode.ANONYMOUS_CHAT_AGENT, false)
            .tools()).extracting("name").doesNotContain("fetch_allowed_url");
        assertThat(service.buildTools(enabled, AgentAccessMode.ANONYMOUS_CHAT_AGENT, false)
            .tools()).extracting("name").contains("fetch_allowed_url");
    }
}
