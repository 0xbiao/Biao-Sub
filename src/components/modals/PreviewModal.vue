<template>
  <dialog class="modal" :class="{ 'modal-open': store.previewModal.show }">
    <div class="modal-box glass-panel max-w-3xl w-11/12 p-0 overflow-hidden flex flex-col h-[85vh]">
      <!-- 头部 -->
      <div class="p-4 sm:p-6 pb-0 flex items-center justify-between">
        <h3 class="font-bold text-xl text-adaptive-white flex items-center gap-2">
          <i class="fa-solid fa-eye text-primary"></i>
          节点预览 <span class="badge badge-sm badge-ghost ml-2">{{ store.previewModal.nodes.length }}个</span>
        </h3>
        <div class="flex gap-2">
          <button @click="toggleSortMode" class="btn btn-xs gap-1"
            :class="store.previewModal.sortMode ? 'btn-warning' : 'btn-ghost'">
            <i class="fa-solid fa-arrow-up-down"></i> {{ store.previewModal.sortMode ? '退出排序' : '排序' }}
          </button>
          <button @click="toggleEditMode" class="btn btn-xs gap-1"
            :class="store.previewModal.editMode ? 'btn-accent' : 'btn-ghost'">
            <i class="fa-solid fa-pen"></i> {{ store.previewModal.editMode ? '退出编辑' : '编辑名称' }}
          </button>
          <button class="btn btn-circle btn-ghost btn-sm" @click="closePreview">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- 节点列表 -->
      <div ref="previewListRef" class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-2">
        <div v-for="(node, i) in store.previewModal.nodes" :key="node.link || i"
          class="flex items-center gap-3 p-3 rounded-lg bg-adaptive-input border border-panel-border hover:border-primary/30 transition-all"
          :data-index="i">
          <!-- 拖拽手柄 -->
          <div v-if="store.previewModal.sortMode" class="drag-handle flex-shrink-0">
            <i class="fa-solid fa-grip-vertical text-adaptive-muted"></i>
          </div>
          <!-- 序号 -->

          <!-- 协议图标 -->
          <span class="badge badge-sm flex-shrink-0"
            :class="getProtocolClass(getProtocol(node))">{{ getProtocol(node) }}</span>
          <!-- 名称 -->
          <span v-if="!store.previewModal.editMode"
            class="text-sm text-adaptive-white truncate flex-1">{{ node.name || '未命名' }}</span>
          <input v-else v-model="node.name"
            class="input input-bordered input-sm bg-adaptive-input flex-1 text-sm" />
          <!-- 复制按钮 -->
          <button @click="copyNode(node)" class="btn btn-ghost btn-xs tooltip flex-shrink-0" data-tip="复制链接">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>
      </div>

      <!-- 底部 -->
      <div class="p-4 sm:p-6 pt-3 flex justify-between items-center border-t border-panel-border">
        <button @click="copyAllNodes" class="btn btn-sm btn-ghost gap-1">
          <i class="fa-solid fa-copy"></i> 复制全部
        </button>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" @click="closePreview">关闭</button>
          <button v-if="store.previewModal.editMode || store.previewModal.sortMode"
            class="btn btn-primary btn-sm" @click="saveChanges">
            <i class="fa-solid fa-check mr-1"></i> 保存修改
          </button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closePreview"></form>
  </dialog>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast, copyText, updateLinkName } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()
const previewListRef = ref(null)
let sortableInstance = null

function getProtocol(node) {
  if (node.protocol) return node.protocol
  if (node.link) {
    const m = node.link.match(/^(\w+):\/\//)
    if (m) return m[1].replace('hysteria2', 'hy2')
  }
  return '?'
}

function getProtocolClass(protocol) {
  const map = { vmess: 'badge-primary', vless: 'badge-secondary', trojan: 'badge-warning', ss: 'badge-info', hy2: 'badge-accent', hysteria2: 'badge-accent', tuic: 'badge-success' }
  return map[protocol] || 'badge-ghost'
}

async function toggleSortMode() {
  store.previewModal.sortMode = !store.previewModal.sortMode
  if (store.previewModal.sortMode) {
    store.previewModal.editMode = false
    // 初始化 SortableJS
    await nextTick()
    if (previewListRef.value) {
      try {
        const { default: Sortable } = await import('sortablejs')
        if (sortableInstance) sortableInstance.destroy()
        sortableInstance = new Sortable(previewListRef.value, {
          handle: '.drag-handle',
          animation: 150,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
        })
      } catch (e) { console.error('Sortable init failed:', e) }
    }
  } else {
    // 退出排序模式，销毁实例
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
  }
}

function toggleEditMode() {
  store.previewModal.editMode = !store.previewModal.editMode
  if (store.previewModal.editMode) {
    store.previewModal.sortMode = false
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
  }
}

function copyNode(node) {
  copyText(node.link || '')
}

function copyAllNodes() {
  const links = store.previewModal.nodes.map(n => n.link).filter(Boolean).join('\n')
  copyText(links)
}

function closePreview() {
  store.previewModal.show = false
  store.previewModal.sortMode = false
  store.previewModal.editMode = false
  if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
}

async function saveChanges() {
  if (!store.previewModal.resourceId) return

  try {
    // 从 DOM 顺序重建节点数组
    let orderedNodes = store.previewModal.nodes
    if (store.previewModal.sortMode && previewListRef.value) {
      const domOrder = Array.from(previewListRef.value.children).map(el => parseInt(el.dataset.index))
      orderedNodes = domOrder.map(idx => store.previewModal.nodes[idx])
    }

    // 重建节点链接（按当前顺序）
    const newLinks = orderedNodes.map(n => {
      return n.link
    }).filter(Boolean).join('\n')

    await authFetch(`${API}/subs/${store.previewModal.resourceId}`, {
      method: 'PUT',
      body: { url: newLinks }
    })

    showToast('修改已保存')
    loadResources()
    closePreview()
  } catch (e) { showToast('保存失败', 'error') }
}
</script>
