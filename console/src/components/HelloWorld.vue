<script lang="ts">
import {defineComponent, ref} from "vue";

export default defineComponent({
  name: "HelloWorld",
  setup() {
    const msg = ref("Hello World");
    return {
      msg,
    };
  },
});
</script>
<template>
  <div>{{ msg }}</div>
</template>
