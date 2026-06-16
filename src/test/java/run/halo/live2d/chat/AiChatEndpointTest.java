package run.halo.live2d.chat;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import run.halo.live2d.agent.AgentAccessMode;

class AiChatEndpointTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsNullLegacyAnonymousSettingToAuthenticatedChat() throws Exception {
        var config = objectMapper.readValue("""
            {
              "isAiChat": true,
              "aiChatBaseSetting": {
                "isAnonymous": null,
                "systemMessage": "system",
                "modelName": "model"
              }
            }
            """, AiChatEndpoint.AiChatConfig.class);

        assertThat(config.aiChatBaseSetting().resolvedAccessMode())
            .isEqualTo(AgentAccessMode.AUTHENTICATED_CHAT);
    }

    @Test
    void accessModeTakesPrecedenceOverNullLegacyAnonymousSetting() throws Exception {
        var config = objectMapper.readValue("""
            {
              "isAiChat": true,
              "aiChatBaseSetting": {
                "isAnonymous": null,
                "accessMode": "anonymous_chat",
                "systemMessage": "system",
                "modelName": "model"
              }
            }
            """, AiChatEndpoint.AiChatConfig.class);

        assertThat(config.aiChatBaseSetting().resolvedAccessMode())
            .isEqualTo(AgentAccessMode.ANONYMOUS_CHAT);
    }
}
