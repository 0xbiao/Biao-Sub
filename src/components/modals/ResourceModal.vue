<template>
  <dialog class="modal" :class="{ 'modal-open': store.resourceModal.show }">
    <div class="modal-box glass-panel max-w-2xl">
      <h3 class="font-bold text-xl text-adaptive-white mb-6 flex items-center gap-2">
        <i class="fa-solid fa-database text-primary"></i>
        {{ store.resourceModal.isEdit ? '编辑资源' : '添加资源' }}
      </h3>

      <div class="form-control mb-4">
        <label class="label"><span class="label-text text-adaptive-muted">名称</span></label>
        <input v-model="store.resourceForm.name" type="text" placeholder="资源名称（可选，留空自动识别）"
          class="input input-bordered bg-adaptive-input w-full" />
      </div>

      <div class="form-control mb-4">
        <label class="label"><span class="label-text text-adaptive-muted">类型</span></label>
        <select v-model="store.resourceForm.type" class="select select-bordered bg-adaptive-input w-full">
          <option value="node">自建节点</option>
          <option value="group">节点组</option>
        </select>
      </div>

      <div class="form-control mb-6">
        <label class="label"><span class="label-text text-adaptive-muted">内容</span></label>
        <textarea v-model="store.resourceForm.url" rows="5"
          placeholder="粘贴节点链接或订阅URL&#10;支持vmess://, vless://, ss://, trojan://, hysteria2://, tuic://"
          class="textarea textarea-bordered bg-adaptive-input w-full font-mono text-xs"></textarea>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.resourceModal.show = false">取消</button>
        <button class="btn btn-primary" @click="saveResource" :disabled="store.submitting">
          <span v-if="store.submitting" class="loading loading-spinner loading-sm"></span>
          {{ store.resourceModal.isEdit ? '保存修改' : '添加' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.resourceModal.show = false"></form>
  </dialog>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()

async function saveResource() {
  if (!store.resourceForm.url) { showToast('请输入内容', 'error'); return }
  store.submitting = true
  try {
    if (store.resourceModal.isEdit) {
      await authFetch(`${API}/subs/${store.resourceForm.id}`, { method: 'PUT', body: store.resourceForm })
    } else {
      await authFetch(`${API}/subs`, { method: 'POST', body: store.resourceForm })
    }
    showToast(store.resourceModal.isEdit ? '修改成功' : '添加成功')
    store.resourceModal.show = false
    loadResources()
  } catch (e) { showToast('操作失败', 'error') }
  store.submitting = false
}
</script>
