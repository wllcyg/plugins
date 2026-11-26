<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ExtensionStorage } from '@100free/core';
import { AppButton, AppFooterLink } from '@100free/ui';

const count = ref(0);
const STORAGE_KEY = 'demo_counter';

onMounted(async () => {
  const saved = await ExtensionStorage.get<number>(STORAGE_KEY, 0);
  count.value = saved ?? 0;
});

const handleIncrement = async () => {
  count.value++;
  await ExtensionStorage.set(STORAGE_KEY, count.value);
};

const handleReset = async () => {
  count.value = 0;
  await ExtensionStorage.set(STORAGE_KEY, 0);
};
</script>

<template>
  <div class="popup-container">
    <header class="header">
      <span class="badge">100-Free</span>
      <h2 class="title">生产力插件矩阵</h2>
    </header>

    <main class="content">
      <p class="desc">本地存储响应式计数器示例：</p>
      <div class="counter-display">{{ count }}</div>

      <div class="actions">
        <AppButton variant="primary" @click="handleIncrement">
          点击 +1
        </AppButton>
        <AppButton variant="secondary" @click="handleReset">
          重置
        </AppButton>
      </div>
    </main>

    <footer class="footer">
      <span>打破昂贵订阅 · 让生产力重归自由</span>
    </footer>
    <AppFooterLink />
  </div>
</template>

<style scoped>
.popup-container {
  width: 300px;
  padding: 16px;
  box-sizing: border-box;
  background-color: #ffffff;
  color: #1e293b;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
}

.badge {
  background-color: #2563eb;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.content {
  padding: 16px 0;
  text-align: center;
}

.desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: #64748b;
}

.counter-display {
  font-size: 32px;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.footer {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
}
</style>

