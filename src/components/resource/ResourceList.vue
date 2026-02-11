<template>
  <div>
    <!-- 操作栏 -->
    <div class="flex flex-wrap gap-2 mb-4 sm:mb-6 items-center">
      <button class="btn btn-primary btn-sm sm:btn-md gap-2 shadow-lg" @click="openAddResource">
        <i class="fa-solid fa-plus"></i> 添加资源
      </button>
      <button class="btn btn-secondary btn-sm sm:btn-md gap-2 shadow-lg" @click="$emit('openRemote')">
        <i class="fa-solid fa-globe"></i> 远程订阅
      </button>
      <button class="btn btn-sm sm:btn-md gap-2" :class="store.batchMode ? 'btn-warning' : 'btn-ghost'" @click="toggleBatch">
        <i class="fa-solid fa-check-double"></i> {{ store.batchMode ? '退出批量' : '批量操作' }}
      </button>
      <button v-if="store.batchMode && store.selectedResources.length > 0"
        class="btn btn-error btn-sm sm:btn-md gap-2" @click="batchDelete">
        <i class="fa-solid fa-trash"></i> 删除 ({{ store.selectedResources.length }})
      </button>
      <div v-if="store.batchMode" class="flex gap-2">
        <button class="btn btn-xs btn-ghost" @click="selectAll">全选</button>
        <button class="btn btn-xs btn-ghost" @click="store.selectedResources = []">取消</button>
      </div>
    </div>

    <!-- 资源列表 -->
    <div ref="resourceListRef" class="grid gap-3 sm:gap-4">
      <div v-for="r in store.resources" :key="r.id"
        class="card glass-panel hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-primary/30"
        :data-id="r.id">
        <div class="card-body p-3 sm:p-4">
          <div class="flex items-start gap-2 sm:gap-3">
            <!-- 批量选择 -->
            <div v-if="store.batchMode" class="pt-1">
              <input type="checkbox" class="checkbox checkbox-primary checkbox-sm"
                :checked="store.selectedResources.includes(r.id)"
                @change="toggleSelect(r.id)" />
            </div>
            <!-- 拖拽手柄 -->
            <div v-if="!store.batchMode" class="drag-handle pt-1 opacity-30 group-hover:opacity-100 transition-opacity">
              <i class="fa-solid fa-grip-vertical text-adaptive-muted"></i>
            </div>
            <!-- 图标 -->
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              :class="r.type === 'node' ? 'bg-primary/20 text-primary' : r.type === 'remote' ? 'bg-success/20 text-success' : 'bg-secondary/20 text-secondary'">
              <i :class="r.type === 'node' ? 'fa-solid fa-server' : r.type === 'remote' ? 'fa-solid fa-cloud-arrow-down' : 'fa-solid fa-plane'" class="text-sm sm:text-base"></i>
            </div>
            <!-- 信息 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-adaptive-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{{ r.name }}</h3>
                <span class="badge badge-sm"
                  :class="r.type === 'node' ? 'badge-primary' : r.type === 'remote' ? 'badge-success' : 'badge-secondary'">
                  {{ r.type === 'node' ? '节点' : r.type === 'remote' ? '远程' : '订阅' }}
                </span>
                <span v-if="r.info && r.info.nodeCount" class="badge badge-ghost badge-sm">
                  <i class="fa-solid fa-diagram-project mr-1"></i> {{ r.info.nodeCount }}个节点
                </span>
              </div>
              <p class="text-xs text-adaptive-muted mt-1 truncate">{{ r.url ? r.url.substring(0, 80) + (r.url.length > 80 ? '...' : '') : '无内容' }}</p>
            </div>
            <!-- 操作按钮 -->
            <div class="flex gap-1 sm:gap-1 flex-shrink-0">
              <button v-if="r.type === 'remote'" @click="$emit('refreshRemote', r)" class="btn btn-circle btn-ghost btn-xs sm:btn-sm tooltip" data-tip="刷新">
                <i class="fa-solid fa-rotate"></i>
              </button>
              <button @click="$emit('preview', r)" class="btn btn-circle btn-ghost btn-xs sm:btn-sm tooltip" data-tip="查看节点">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button @click="openEditResource(r)" class="btn btn-circle btn-ghost btn-xs sm:btn-sm tooltip" data-tip="编辑">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button @click="deleteResource(r.id)" class="btn btn-circle btn-ghost btn-xs sm:btn-sm text-error tooltip" data-tip="删除">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="store.resources.length === 0" class="text-center py-16">
      <i class="fa-solid fa-box-open text-6xl text-adaptive-muted opacity-30 mb-4"></i>
      <p class="text-adaptive-muted text-lg">资源池为空，添加你的第一个资源</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()
const resourceListRef = ref(null)

const emit = defineEmits(['preview', 'openRemote', 'refreshRemote'])

function openAddResource() {
  store.resourceForm = { name: '', url: '', type: 'node' }
  store.resourceModal.isEdit = false
  store.resourceModal.show = true
}

function openEditResource(r) {
  store.resourceForm = { id: r.id, name: r.name, url: r.url, type: r.type }
  store.resourceModal.isEdit = true
  store.resourceModal.show = true
}

function toggleBatch() {
  store.batchMode = !store.batchMode
  if (!store.batchMode) store.selectedResources = []
}

function toggleSelect(id) {
  const idx = store.selectedResources.indexOf(id)
  if (idx === -1) store.selectedResources.push(id)
  else store.selectedResources.splice(idx, 1)
}

function selectAll() {
  store.selectedResources = store.resources.map(r => r.id)
}

async function deleteResource(id) {
  if (!confirm('确定删除？')) return
  try {
    await authFetch(`${API}/subs/${id}`, { method: 'DELETE' })
    showToast('已删除')
    loadResources()
  } catch (e) { showToast('删除失败', 'error') }
}

async function batchDelete() {
  if (!confirm(`确定删除选中的 ${store.selectedResources.length} 个资源？`)) return
  try {
    await authFetch(`${API}/subs/delete`, { method: 'POST', body: { ids: store.selectedResources } })
    showToast('批量删除成功')
    store.selectedResources = []
    store.batchMode = false
    loadResources()
  } catch (e) { showToast('删除失败', 'error') }
}

// Sortable
let sortableInstance = null
async function initSortable() {
  if (!resourceListRef.value) return
  try {
    const Sortable = (await import('https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/+esm')).default
    if (sortableInstance) sortableInstance.destroy()
    sortableInstance = new Sortable(resourceListRef.value, {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async () => {
        const order = Array.from(resourceListRef.value.children).map(el => parseInt(el.dataset.id))
        try { await authFetch(`${API}/subs/reorder`, { method: 'POST', body: { order } }) }
        catch (e) { console.error(e) }
      }
    })
  } catch (e) { console.error('Sortable init failed:', e) }
}

onMounted(() => { nextTick(initSortable) })
watch(() => store.resources.length, () => { nextTick(initSortable) })
</script>
