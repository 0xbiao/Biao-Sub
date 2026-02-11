<template>
  <dialog class="modal" :class="{ 'modal-open': store.clashNodeSelector.show }">
    <div class="modal-box glass-panel max-w-2xl">
      <h3 class="font-bold text-xl text-adaptive-white mb-4 flex items-center gap-2">
        <i class="fa-solid fa-list-check text-primary"></i> 策略组节点选择
      </h3>

      <div class="mb-4">
        <p class="text-sm text-adaptive-muted mb-2">选择要加入策略组的代理</p>
        <div class="tabs tabs-boxed p-1 mb-3">
          <a class="tab tab-sm" :class="{'tab-active': selTab === 'nodes'}" @click="selTab = 'nodes'">节点名</a>
          <a class="tab tab-sm" :class="{'tab-active': selTab === 'groups'}" @click="selTab = 'groups'">策略组</a>
          <a class="tab tab-sm" :class="{'tab-active': selTab === 'builtin'}" @click="selTab = 'builtin'">内置</a>
        </div>

        <!-- 节点名 -->
        <div v-if="selTab === 'nodes'" class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          <div v-for="name in store.clashNodeSelector.allNodeNames" :key="name"
            class="flex items-center gap-2 p-2 rounded-lg bg-adaptive-input hover:bg-primary/10 cursor-pointer"
            @click="toggleProxy(name)">
            <input type="checkbox" class="checkbox checkbox-primary checkbox-xs"
              :checked="store.clashNodeSelector.tempSelected.includes(name)" @click.stop="toggleProxy(name)" />
            <span class="text-sm text-adaptive-white truncate">{{ name }}</span>
          </div>
        </div>

        <!-- 策略组 -->
        <div v-if="selTab === 'groups'" class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          <div v-for="name in store.clashNodeSelector.allGroupNames" :key="name"
            class="flex items-center gap-2 p-2 rounded-lg bg-adaptive-input hover:bg-accent/10 cursor-pointer"
            @click="toggleProxy(name)">
            <input type="checkbox" class="checkbox checkbox-accent checkbox-xs"
              :checked="store.clashNodeSelector.tempSelected.includes(name)" @click.stop="toggleProxy(name)" />
            <span class="text-sm text-adaptive-white truncate">{{ name }}</span>
          </div>
        </div>

        <!-- 内置代理 -->
        <div v-if="selTab === 'builtin'" class="space-y-1">
          <div v-for="name in ['DIRECT', 'REJECT']" :key="name"
            class="flex items-center gap-2 p-2 rounded-lg bg-adaptive-input hover:bg-warning/10 cursor-pointer"
            @click="toggleProxy(name)">
            <input type="checkbox" class="checkbox checkbox-warning checkbox-xs"
              :checked="store.clashNodeSelector.tempSelected.includes(name)" @click.stop="toggleProxy(name)" />
            <span class="text-sm text-adaptive-white">{{ name }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 text-sm text-adaptive-muted mb-4">
        <span>已选: {{ store.clashNodeSelector.tempSelected.length }}</span>
        <button class="btn btn-xs btn-ghost" @click="store.clashNodeSelector.tempSelected = []">清空</button>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.clashNodeSelector.show = false">取消</button>
        <button class="btn btn-primary" @click="confirmSelection">确认</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.clashNodeSelector.show = false"></form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { showToast } from '../../utils/helpers.js'

const store = useMainStore()
const selTab = ref('nodes')

function toggleProxy(name) {
  const idx = store.clashNodeSelector.tempSelected.indexOf(name)
  if (idx === -1) store.clashNodeSelector.tempSelected.push(name)
  else store.clashNodeSelector.tempSelected.splice(idx, 1)
}

function confirmSelection() {
  const groupIdx = store.clashNodeSelector.currentGroup
  if (groupIdx !== null && store.groupForm.clash_config.groups[groupIdx]) {
    store.groupForm.clash_config.groups[groupIdx].proxies = [...store.clashNodeSelector.tempSelected]
  }
  store.clashNodeSelector.show = false
  showToast('节点选择已保存')
}
</script>
