package run.halo.live2d.agent;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class AgentToolNormalizerTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AgentToolNormalizer normalizer = new AgentToolNormalizer();

    @Test
    void mapsLegacyAccessModeToChatOnlyModes() {
        assertThat(AgentAccessMode.from(null, true)).isEqualTo(AgentAccessMode.ANONYMOUS_CHAT);
        assertThat(AgentAccessMode.from(null, false)).isEqualTo(
            AgentAccessMode.AUTHENTICATED_CHAT);
    }

    @Test
    void mapsFormValuesToAgentEnums() throws Exception {
        var settings = objectMapper.readValue(
            """
                {
                  "builtIn": {
                    "commentCapability": "assist"
                  },
                  "aiTools": [{
                    "name": "open_contact_form",
                    "enabled": true,
                    "description": "打开留言面板",
                    "approval": "always",
                    "requiredAuth": "authenticated",
                    "action": {
                      "type": "registered"
                    }
                  }]
                }
                """,
            AgentSettings.class);

        assertThat(settings.builtIn().commentCapability()).isEqualTo(AgentCommentCapability.ASSIST);
        assertThat(settings.normalizedAiTools()).hasSize(1);
        assertThat(settings.normalizedAiTools().getFirst().approval())
            .isEqualTo(AgentToolApproval.ALWAYS);
        assertThat(settings.normalizedAiTools().getFirst().requiredAuth())
            .isEqualTo(AgentToolAuth.AUTHENTICATED);
        assertThat(objectMapper.writeValueAsString(settings.builtIn()))
            .contains("\"commentCapability\":\"assist\"");
    }

    @Test
    void mapsNullPrimitiveAgentSettingsToDefaults() throws Exception {
        var settings = objectMapper.readValue(
            """
                {
                  "builtIn": {
                    "pageContext": null,
                    "haloNavigation": null,
                    "haloContentSearch": null,
                    "networkAccess": null,
                    "commentCapability": null
                  },
                  "toolSecurity": {
                    "allowNewTab": null
                  },
                  "haloSearch": {
                    "defaultLimit": null
                  },
                  "haloResourceDetail": {
                    "maxContentChars": null
                  },
                  "networkAccess": {
                    "maxResponseChars": null,
                    "timeoutSeconds": null
                  },
                  "aiTools": [{
                    "name": "open_contact_form",
                    "enabled": null,
                    "description": "打开留言面板",
                    "action": {
                      "type": "registered"
                    }
                  }]
                }
                """,
            AgentSettings.class);

        assertThat(settings.builtIn().pageContext()).isTrue();
        assertThat(settings.builtIn().haloNavigation()).isTrue();
        assertThat(settings.builtIn().haloContentSearch()).isTrue();
        assertThat(settings.builtIn().networkAccess()).isFalse();
        assertThat(settings.builtIn().commentCapability()).isEqualTo(AgentCommentCapability.ASSIST);
        assertThat(settings.toolSecurity().allowNewTab()).isFalse();
        assertThat(settings.haloSearch().normalizedDefaultLimit()).isEqualTo(5);
        assertThat(settings.haloResourceDetail().maxContentChars()).isEqualTo(3000);
        assertThat(settings.networkAccess().normalizedMaxResponseChars()).isEqualTo(4000);
        assertThat(settings.networkAccess().normalizedTimeoutSeconds()).isEqualTo(5);
        assertThat(settings.normalizedAiTools().getFirst().enabled()).isFalse();
    }

    @Test
    void normalizesValidCustomTool() throws Exception {
        var settings = new AgentSettings(
            null,
            """
                [{
                  "name": "open_contact_form",
                  "enabled": true,
                  "description": "打开留言面板",
                  "inputSchema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string",
                        "description": "留言草稿"
                      }
                    },
                    "required": ["message"]
                  },
                  "action": {
                    "type": "dispatch-event",
                    "event": "site:open-contact-form"
                  }
                }]
                """,
            null,
            null,
            null,
            null
        );

        var tools = normalizer.normalizeCustomTools(settings);

        assertThat(tools).hasSize(1);
        assertThat(tools.getFirst().name()).isEqualTo("open_contact_form");
        assertThat(tools.getFirst().actionType()).isEqualTo("dispatch-event");
        assertThat(tools.getFirst().inputSchema()).containsEntry("type", "object");
    }

    @Test
    void rejectsUnsupportedSchemaAndReservedNames() throws Exception {
        var tools = List.of(
            new AgentSettings.AgentToolConfig(
                "perform_live2d_action",
                true,
                "reserved",
                objectMapper.readTree("{\"type\":\"object\",\"properties\":{}}"),
                AgentToolApproval.DEFAULT,
                AgentToolAuth.NONE,
                objectMapper.readTree("{\"type\":\"registered\"}"),
                null
            ),
            new AgentSettings.AgentToolConfig(
                "open_bad_tool",
                true,
                "bad schema",
                objectMapper.readTree(
                    "{\"type\":\"object\",\"properties\":{\"items\":{\"type\":\"array\"}}}"),
                AgentToolApproval.DEFAULT,
                AgentToolAuth.NONE,
                objectMapper.readTree("{\"type\":\"registered\"}"),
                null
            ),
            new AgentSettings.AgentToolConfig(
                "old_live2d_action",
                true,
                "unsupported action",
                objectMapper.readTree("{\"type\":\"object\",\"properties\":{}}"),
                AgentToolApproval.DEFAULT,
                AgentToolAuth.NONE,
                objectMapper.readTree("{\"type\":\"perform-live2d-action\"}"),
                null
            )
        );
        var settings = new AgentSettings(null, tools, null, null, null, null);

        assertThat(normalizer.normalizeCustomTools(settings)).isEmpty();
    }
}
