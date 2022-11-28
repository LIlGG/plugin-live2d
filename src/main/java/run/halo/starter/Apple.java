package run.halo.starter;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;
import run.halo.app.extension.AbstractExtension;
import run.halo.app.extension.GVK;

/**
 * @author guqing
 * @since 2.0.0
 */
@GVK(group = "run.halo.starter", kind = "Apple",
        version = "v1alpha1", singular = "apple", plural = "apples")
@Data
@EqualsAndHashCode(callSuper = true)
public class Apple extends AbstractExtension {

    private AppleSpec spec;

    @Data
    public static class AppleSpec {

        @Schema(required = true, minLength = 1)
        private String varieties;

        private String color;

        private String size;

        private String producingArea;
    }
}

