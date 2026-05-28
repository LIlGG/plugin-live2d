package run.halo.live2d.chat;

import java.util.List;
import java.util.Locale;
import lombok.Data;
import org.apache.commons.lang3.StringUtils;
import run.halo.aifoundation.message.ModelMessage;

/**
 * @author LIlGG
 */
@Data
public class ChatRequest {
    private List<ChatMessagePayload> message;

    @Data
    public static class ChatMessagePayload {
        private String role;
        private String content;

        public ModelMessage toFoundationMessage() {
            if (StringUtils.isBlank(content)) {
                throw new IllegalArgumentException("chat message content must not be blank");
            }
            String normalizedRole = StringUtils.defaultString(role)
                .trim()
                .toLowerCase(Locale.ROOT);
            return switch (normalizedRole) {
                case "assistant" -> ModelMessage.assistant(content);
                case "system" -> ModelMessage.system(content);
                case "user", "" -> ModelMessage.user(content);
                default -> throw new IllegalArgumentException(
                    "unsupported chat message role: " + role);
            };
        }
    }
}
