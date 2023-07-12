<script setup lang="ts" name="Live2dToggle">

const emit = defineEmits(["click"]);

</script>
<template>
  <div class="live2d-toggle" @click="emit('click')">
    <span>看板娘</span>
  </div>
</template>

<style scoped>
.live2d-toggle {
  width: 60px;
  background-color: #fa0;
  border-radius: 5px;
  cursor: pointer;
  padding: 5px 2px 5px 5px;
  writing-mode: vertical-rl;
  margin-left: -60px;
  transition: margin-left 1s;
}

.live2d-toggle:hover {
  margin-left: -40px;
}

.live2d-toggle span {
  font-size: 12px;
  color: #fff;
}
</style>
