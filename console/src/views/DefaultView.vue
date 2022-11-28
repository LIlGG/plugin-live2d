<script lang="ts">
import {defineComponent} from "vue";
import logo from "../assets/logo.svg";

export default defineComponent({
  name: "DefaultView",
  setup() {
    return {
      logo,
    };
  },
});
</script>
<template>
  <div class="title">Hello World</div>
  <img v-permission="['plugin:apples:view']" :src="logo" alt="logo"/>
</template>
<style scoped>
.title {
  color: red;
}
</style>
