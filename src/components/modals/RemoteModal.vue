<template>
  <dialog class="modal" :class="{ 'modal-open': store.remoteModal.show }">
    <div class="modal-box glass-panel max-w-2xl">
      <h3 class="font-bold text-xl text-adaptive-white mb-6 flex items-center gap-2">
        <i class="fa-solid fa-globe text-success"></i> 远程订阅
      </h3>

      <!-- 模式切换 -->
      <div class="tabs tabs-boxed mb-4 p-1">
        <a class="tab tab-sm flex-1" :class="{ 'tab-active': store.remoteModal.mode === 'auto' }"
          @click="store.remoteModal.mode = 'auto'">
          <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> 自动获取
        </a>
        <a class="tab tab-sm flex-1" :class="{ 'tab-active': store.remoteModal.mode === 'manual' }"
          @click="store.remoteModal.mode = 'manual'">
          <i class="fa-solid fa-paste mr-1"></i> 手动粘贴
        </a>
      </div>

      <!-- 自动模式 -->
      <div v-if="store.remoteModal.mode === 'auto'">
        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-adaptive-muted">订阅链接</span></label>
          <input v-model="store.remoteModal.url" type="text" placeholder="https://..."
            class="input input-bordered bg-adaptive-input w-full" />
        </div>
        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-adaptive-muted">名称（可选）</span></label>
          <input v-model="store.remoteModal.name" type="text" placeholder="自动识别"
            class="input input-bordered bg-adaptive-input w-full" />
        </div>
      </div>

      <!-- 手动模式 -->
      <div v-if="store.remoteModal.mode === 'manual'">
        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-adaptive-muted">名称</span></label>
          <input v-model="store.remoteModal.name" type="text" placeholder="订阅名称"
            class="input input-bordered bg-adaptive-input w-full" />
        </div>
        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-adaptive-muted">节点内容</span></label>
          <textarea v-model="store.remoteModal.content" rows="6"
            placeholder="粘贴 Base64 编码内容或节点链接"
            class="textarea textarea-bordered bg-adaptive-input w-full font-mono text-xs"></textarea>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.remoteModal.show = false">取消</button>
        <button class="btn btn-success" @click="submitRemote" :disabled="store.remoteModal.loading">
          <span v-if="store.remoteModal.loading" class="loading loading-spinner loading-sm"></span>
          {{ store.remoteModal.loading ? '获取中...' : '导入' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.remoteModal.show = false"></form>
  </dialog>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()

async function submitRemote() {
  if (store.remoteModal.mode === 'auto') {
    if (!store.remoteModal.url) { showToast('请输入订阅链接', 'error'); return }
    store.remoteModal.loading = true
    try {
      const res = await authFetch(`${API}/remote`, {
        method: 'POST',
        body: { url: store.remoteModal.url, name: store.remoteModal.name }
      })
      if (res.success) {
        showToast(`导入成功：${res.data.nodeCount}个节点`)
        store.remoteModal.show = false
        store.remoteModal.url = ''
        store.remoteModal.name = ''
        loadResources()
      } else {
        showToast(res.error || '导入失败', 'error')
      }
    } catch (e) { showToast('导入失败', 'error') }
    store.remoteModal.loading = false
  } else {
    // 手动模式
    if (!store.remoteModal.content && !store.remoteModal.name) { showToast('请输入内容', 'error'); return }
    store.remoteModal.loading = true
    try {
      const res = await authFetch(`${API}/subs`, {
        method: 'POST',
        body: { name: store.remoteModal.name || '手动导入', url: store.remoteModal.content, type: 'sub' }
      })
      if (res.success) {
        showToast('导入成功')
        store.remoteModal.show = false
        store.remoteModal.content = ''
        store.remoteModal.name = ''
        loadResources()
      }
    } catch (e) { showToast('导入失败', 'error') }
    store.remoteModal.loading = false
  }
}
</script>
