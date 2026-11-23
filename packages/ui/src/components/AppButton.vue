<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();
</script>

<template>
  <button
    :class="['btn-base', `btn-${variant}`, `btn-${size}`]"
    :disabled="disabled"
    @click="(e) => !disabled && emit('click', e)"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  user-select: none;
  line-height: 1;
}

.btn-base:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 尺寸 */
.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}
.btn-md {
  padding: 8px 14px;
  font-size: 13px;
}
.btn-lg {
  padding: 10px 18px;
  font-size: 14px;
}

/* 风格变体 */
.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}
.btn-primary:not(:disabled):hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #f1f5f9;
  color: #0f172a;
  border-color: #e2e8f0;
}
.btn-secondary:not(:disabled):hover {
  background-color: #e2e8f0;
}

.btn-ghost {
  background-color: transparent;
  color: #475569;
}
.btn-ghost:not(:disabled):hover {
  background-color: #f1f5f9;
}

.btn-danger {
  background-color: #ef4444;
  color: #ffffff;
}
.btn-danger:not(:disabled):hover {
  background-color: #dc2626;
}
</style>

