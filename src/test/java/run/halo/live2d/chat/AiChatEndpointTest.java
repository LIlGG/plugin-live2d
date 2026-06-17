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

    @Test
    void ignoresUiOnlyFieldsAndParsesSplitSettings() throws Exception {
        var config = objectMapper.readValue("""
            {
              "isAiChat": true,
              "aiChatBaseSetting": {
                "accessMode": "anonymous_chat_agent",
                "systemMessage": "system",
                "modelName": "model"
              },
              "aiChatDisplaySetting": {
                "chunkTimeout": 10,
                "showChatMessageTimeout": 10
              },
              "aiChatSecuritySetting": {
                "antiHotlinkEnabled": true,
                "rateLimitRequests": 5,
                "rateLimitWindowSeconds": 30
              }
            }
            """, AiChatEndpoint.AiChatConfig.class);

        assertThat(config.aiChatBaseSetting().resolvedAccessMode())
            .isEqualTo(AgentAccessMode.ANONYMOUS_CHAT_AGENT);
        assertThat(config.securitySetting().normalizedRateLimitRequests())
            .isEqualTo(5);
        assertThat(config.securitySetting().allowMissingOrigin()).isFalse();
    }

    @Test
    void usesSecurityDefaultsWhenSplitSecurityIsMissing() throws Exception {
        var config = objectMapper.readValue("""
            {
              "isAiChat": true,
              "aiChatBaseSetting": {
                "accessMode": "anonymous_chat",
                "systemMessage": "system",
                "modelName": "model"
              }
            }
            """, AiChatEndpoint.AiChatConfig.class);

        assertThat(config.securitySetting().normalizedRateLimitRequests()).isEqualTo(20);
    }
}
