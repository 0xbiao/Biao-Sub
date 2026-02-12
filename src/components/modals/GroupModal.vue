<template>
  <dialog class="modal" :class="{ 'modal-open': store.groupModal.show }">
    <div class="modal-box glass-panel max-w-4xl w-11/12 p-0 overflow-hidden flex flex-col h-[90vh]">
      <!-- 头部 -->
      <div class="p-4 sm:p-6 pb-0 flex items-center justify-between">
        <h3 class="font-bold text-xl text-adaptive-white flex items-center gap-2">
          <i class="fa-solid fa-layer-group text-accent"></i>
          {{ store.groupModal.isEdit ? '编辑聚合组' : '新建聚合组' }}
        </h3>
        <button class="btn btn-circle btn-ghost btn-sm" @click="store.groupModal.show = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Tab 切换 -->
      <div class="tabs tabs-boxed mx-4 sm:mx-6 mt-4 p-1">
        <a v-if="store.groupForm.clash_config.mode !== 'raw'" class="tab flex-1" :class="{'tab-active': store.groupModal.tab==='base'}" @click="store.groupModal.tab='base'">
          <i class="fa-solid fa-cubes mr-2"></i> 节点配置
        </a>
        <a v-if="store.groupForm.clash_config.mode !== 'raw'" class="tab flex-1" :class="{'tab-active': store.groupModal.tab==='clash'}" @click="store.groupModal.tab='clash'">
          <i class="fa-solid fa-gears mr-2"></i> Clash配置
        </a>
        <a v-if="store.groupForm.clash_config.mode === 'raw'" class="tab flex-1 tab-active">
          <i class="fa-solid fa-cloud-arrow-up mr-2"></i> 托管YAML
        </a>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <!-- 组名 -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-adaptive-muted">聚合组名称</span></label>
          <input v-model="store.groupForm.name" type="text" placeholder="输入聚合组名称"
            class="input input-bordered bg-adaptive-input w-full"
            :class="{'input-error': store.groupNameError}" />
          <label v-if="store.groupNameError" class="label">
            <span class="label-text-alt text-error">请输入名称</span>
          </label>
        </div>

        <!-- Tab: 节点配置 -->
        <div v-show="store.groupModal.tab === 'base' && store.groupForm.clash_config.mode !== 'raw'">
          <div class="mb-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-bold text-sm text-adaptive-white">选择资源</h4>
              <span class="badge badge-sm badge-ghost">{{ store.groupForm.config.length }}个已选</span>
            </div>
            <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              <div v-for="r in store.resources" :key="r.id"
                class="flex items-center gap-3 p-2 rounded-lg bg-adaptive-input hover:bg-primary/10 transition-all cursor-pointer"
                @click="toggleResource(r)">
                <input type="checkbox" class="checkbox checkbox-primary checkbox-sm"
                  :checked="isResourceSelected(r.id)" @click.stop="toggleResource(r)" />
                <span class="flex-1 text-sm text-adaptive-white truncate">{{ r.name }}</span>
                <span class="badge badge-xs" :class="r.type === 'node' ? 'badge-primary' : 'badge-secondary'">
                  {{ r.type === 'node' ? '节点' : '订阅' }}
                </span>
                <span v-if="r.info && r.info.nodeCount" class="text-xs text-adaptive-muted">{{ r.info.nodeCount }}节点</span>
                <!-- 筛选按钮 -->
                <button v-if="isResourceSelected(r.id) && r.info && r.info.nodeCount > 1"
                  @click.stop="openNodeSelector(r)" class="btn btn-xs btn-ghost text-accent">
                  <i class="fa-solid fa-filter"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- 已选资源的筛选信息 -->
          <div v-if="store.groupForm.config.some(c => c.filter)" class="mb-4">
            <h4 class="font-bold text-sm text-adaptive-white mb-2">筛选规则</h4>
            <div v-for="(c, i) in store.groupForm.config" :key="i">
              <div v-if="c.filter" class="badge badge-outline badge-sm mb-1">
                {{ getResourceName(c.subId) }}: {{ c.filter }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: Clash配置 -->
        <div v-show="store.groupModal.tab === 'clash' && store.groupForm.clash_config.mode !== 'raw'">
          <!-- 头部配置 -->
          <div class="collapse collapse-arrow bg-adaptive-input border border-panel-border mb-3">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-bold text-adaptive-white">头部配置 (Header)</div>
            <div class="collapse-content">
              <textarea v-model="store.groupForm.clash_config.header"
                class="code-editor w-full h-48 textarea textarea-bordered bg-adaptive-input text-xs"
                placeholder="YAML Header..."></textarea>
            </div>
          </div>

          <!-- 策略组管理 -->
          <div class="collapse collapse-arrow bg-adaptive-input border border-panel-border mb-3">
            <input type="checkbox" checked />
            <div class="collapse-title text-sm font-bold text-adaptive-white">
              策略组 (Proxy Groups) <span class="badge badge-xs badge-primary ml-2">{{ store.groupForm.clash_config.groups.length }}</span>
            </div>
            <div class="collapse-content">
              <button @click="addProxyGroup" class="btn btn-xs btn-primary mb-3">
                <i class="fa-solid fa-plus mr-1"></i> 添加策略组
              </button>
              <div v-for="(pg, i) in store.groupForm.clash_config.groups" :key="i"
                class="card bg-adaptive-input border border-panel-border mb-2 p-3">
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <input v-model="pg.name" class="input input-bordered input-sm bg-adaptive-input" placeholder="名称" />
                  <select v-model="pg.type" class="select select-bordered select-sm bg-adaptive-input">
                    <option value="select">手动选择</option>
                    <option value="url-test">自动测速</option>
                    <option value="fallback">故障转移</option>
                    <option value="load-balance">负载均衡</option>
                  </select>
                </div>
                <div v-if="pg.type === 'url-test' || pg.type === 'fallback'" class="grid grid-cols-3 gap-2 mb-2">
                  <input v-model="pg.url" class="input input-bordered input-xs bg-adaptive-input" placeholder="测速URL" />
                  <input v-model.number="pg.interval" type="number" class="input input-bordered input-xs bg-adaptive-input" placeholder="间隔(秒)" />
                  <input v-model.number="pg.tolerance" type="number" class="input input-bordered input-xs bg-adaptive-input" placeholder="容差(ms)" />
                </div>
                <div class="flex items-center gap-2">
                  <label class="flex items-center gap-1 text-xs">
                    <input type="checkbox" v-model="pg.useAllProxies" class="checkbox checkbox-xs" /> 使用全部节点
                  </label>
                  <button v-if="!pg.useAllProxies" @click="openClashNodeSelector(i)"
                    class="btn btn-xs btn-ghost text-accent">
                    <i class="fa-solid fa-list-check"></i> 选择节点 ({{ (pg.proxies || []).length }})
                  </button>
                  <div class="flex-1"></div>
                  <button @click="store.groupForm.clash_config.groups.splice(i, 1)"
                    class="btn btn-xs btn-ghost text-error">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 规则配置 -->
          <div class="collapse collapse-arrow bg-adaptive-input border border-panel-border mb-3">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-bold text-adaptive-white">规则 (Rules)</div>
            <div class="collapse-content">
              <textarea v-model="store.groupForm.clash_config.rules"
                class="code-editor w-full h-48 textarea textarea-bordered bg-adaptive-input text-xs"
                placeholder="rules:&#10;  - MATCH,Proxy"></textarea>
            </div>
          </div>

          <!-- Clash Tab 下的资源选择 -->
          <div class="collapse collapse-arrow bg-adaptive-input border border-panel-border mb-3">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-bold text-adaptive-white">输出资源（覆盖节点Tab）</div>
            <div class="collapse-content">
              <p class="text-xs text-adaptive-muted mb-2">如果设置了此处的资源，将覆盖节点配置Tab的选择</p>
              <div v-for="r in store.resources" :key="r.id"
                class="flex items-center gap-2 p-1"
                @click="toggleClashResource(r)">
                <input type="checkbox" class="checkbox checkbox-xs checkbox-accent"
                  :checked="isClashResourceSelected(r.id)" @click.stop="toggleClashResource(r)" />
                <span class="text-sm text-adaptive-white">{{ r.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab: 托管YAML -->
        <div v-show="store.groupModal.tab === 'raw'">
          <!-- 文件上传区 -->
          <div class="mb-4">
            <label class="label"><span class="label-text text-adaptive-muted">上传 YAML 配置文件</span></label>
            <div class="border-2 border-dashed border-panel-border rounded-lg p-6 text-center hover:border-warning/50 transition-colors cursor-pointer"
              @click="$refs.yamlFileInput.click()" @dragover.prevent @drop.prevent="handleFileDrop">
              <i class="fa-solid fa-cloud-arrow-up text-3xl text-warning mb-2"></i>
              <p class="text-sm text-adaptive-muted">点击选择或拖拽 YAML 文件到此处</p>
              <p class="text-xs text-adaptive-muted mt-1">支持 .yaml / .yml 格式</p>
            </div>
            <input ref="yamlFileInput" type="file" accept=".yaml,.yml" class="hidden" @change="handleFileSelect" />
          </div>

          <!-- 文件信息 -->
          <div v-if="uploadedFileName" class="alert alert-info py-2 mb-4">
            <i class="fa-solid fa-file-code"></i>
            <span class="text-sm">已加载: {{ uploadedFileName }}</span>
            <button class="btn btn-xs btn-ghost" @click="clearUploadedFile">清除</button>
          </div>

          <!-- YAML 预览/编辑 -->
          <div class="form-control">
            <label class="label"><span class="label-text text-adaptive-muted">YAML 内容（可直接编辑）</span></label>
            <textarea v-model="store.groupForm.clash_config.raw_yaml"
              class="code-editor w-full h-96 textarea textarea-bordered bg-adaptive-input text-xs font-mono"
              placeholder="上传 YAML 文件或直接粘贴完整的 Clash 配置..."></textarea>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="p-4 sm:p-6 pt-0 flex justify-between items-center">
        <div class="flex gap-2">
          <button v-if="store.groupForm.clash_config.mode !== 'raw'" @click="saveAsTemplate" class="btn btn-xs btn-ghost text-accent">
            <i class="fa-solid fa-bookmark mr-1"></i> 保存为模板
          </button>
          <button v-if="store.groupModal.isEdit" @click="refreshToken" class="btn btn-xs btn-ghost text-warning">
            <i class="fa-solid fa-rotate mr-1"></i> 刷新Token
          </button>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost" @click="store.groupModal.show = false">取消</button>
          <button class="btn btn-accent" @click="saveGroup" :disabled="store.submitting">
            <span v-if="store.submitting" class="loading loading-spinner loading-sm"></span>
            {{ store.groupModal.isEdit ? '保存修改' : '创建' }}
          </button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.groupModal.show = false"></form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadGroups, loadTemplates } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()
const uploadedFileName = ref('')

const emit = defineEmits(['openNodeSelector', 'openClashNodeSelector'])

// === 文件上传 ===
function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) readYamlFile(file)
}

function handleFileDrop(e) {
  const file = e.dataTransfer.files[0]
  if (file && (file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
    readYamlFile(file)
  } else {
    showToast('请上传 .yaml 或 .yml 文件', 'error')
  }
}

function readYamlFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    store.groupForm.clash_config.raw_yaml = e.target.result
    uploadedFileName.value = file.name
    // 自动用文件名（去扩展名）设置组名
    if (!store.groupForm.name) {
      store.groupForm.name = file.name.replace(/\.(yaml|yml)$/i, '')
    }
    showToast(`已加载: ${file.name}`)
  }
  reader.readAsText(file)
}

function clearUploadedFile() {
  store.groupForm.clash_config.raw_yaml = ''
  uploadedFileName.value = ''
}

function isResourceSelected(id) {
  return store.groupForm.config.some(c => c.subId === id)
}

function toggleResource(r) {
  const idx = store.groupForm.config.findIndex(c => c.subId === r.id)
  if (idx === -1) {
    store.groupForm.config.push({ subId: r.id, name: r.name })
  } else {
    store.groupForm.config.splice(idx, 1)
  }
}

function isClashResourceSelected(id) {
  return (store.groupForm.clash_config.resources || []).some(r => r.subId === id)
}

function toggleClashResource(r) {
  if (!store.groupForm.clash_config.resources) store.groupForm.clash_config.resources = []
  const idx = store.groupForm.clash_config.resources.findIndex(c => c.subId === r.id)
  if (idx === -1) {
    store.groupForm.clash_config.resources.push({ subId: r.id, name: r.name })
  } else {
    store.groupForm.clash_config.resources.splice(idx, 1)
  }
}

function getResourceName(subId) {
  const r = store.resources.find(r => r.id === subId)
  return r ? r.name : '未知'
}

function addProxyGroup() {
  store.groupForm.clash_config.groups.push({
    name: '',
    type: 'select',
    proxies: [],
    useAllProxies: true
  })
}

function openNodeSelector(r) {
  emit('openNodeSelector', r)
}

function openClashNodeSelector(groupIndex) {
  emit('openClashNodeSelector', groupIndex)
}

async function saveGroup() {
  if (!store.groupForm.name) {
    store.groupNameError = true
    return
  }
  store.groupNameError = false
  store.submitting = true

  try {
    const body = {
      name: store.groupForm.name,
      config: store.groupForm.config,
      clash_config: store.groupForm.clash_config
    }

    if (store.groupModal.isEdit) {
      await authFetch(`${API}/groups/${store.groupForm.id}`, { method: 'PUT', body })
    } else {
      await authFetch(`${API}/groups`, { method: 'POST', body })
    }

    showToast(store.groupModal.isEdit ? '修改成功' : '创建成功')
    store.groupModal.show = false
    loadGroups()
  } catch (e) { showToast('操作失败', 'error') }
  store.submitting = false
}

async function refreshToken() {
  if (!confirm('刷新Token后，旧的订阅链接将失效！确定？')) return
  try {
    await authFetch(`${API}/groups/${store.groupForm.id}`, {
      method: 'PUT',
      body: { refresh_token: true }
    })
    showToast('Token已刷新')
    loadGroups()
  } catch (e) { showToast('刷新失败', 'error') }
}

async function saveAsTemplate() {
  const name = prompt('请输入模板名称')
  if (!name) return
  try {
    await authFetch(`${API}/templates`, {
      method: 'POST',
      body: {
        name,
        header: store.groupForm.clash_config.header,
        groups: store.groupForm.clash_config.groups,
        rules: store.groupForm.clash_config.rules
      }
    })
    showToast('模板已保存')
    loadTemplates()
  } catch (e) { showToast('保存失败', 'error') }
}
</script>
