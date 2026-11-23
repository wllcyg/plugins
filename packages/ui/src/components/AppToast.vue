<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 2500
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const visible = ref(true);

onMounted(() => {
  if (props.duration > 0) {
    setTimeout(() => {
      visible.value = false;
      emit('close');
    }, props.duration);
  }
});
</script>

<template>
  <Transition name="toast-fade">
    <div v-if="visible" :class="['toast-wrapper', `toast-${type}`]">
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  pointer-events: auto;
}

.toast-success {
  background-color: #10b981;
}
.toast-info {
  background-color: #3b82f6;
}
.toast-warning {
  background-color: #f59e0b;
}
.toast-error {
  background-color: #ef4444;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease-out;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

