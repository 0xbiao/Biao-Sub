// BiaoSUB 节点预览模块
import { API } from '../config.js'
import { previewModal, resources } from '../store.js'
import { authFetch } from '../api.js'
import { showToast, copyText } from '../utils.js'

// 进入排序模式
export const enterSortMode = () => {
    previewModal.sortMode = true
    previewModal.originalNodes = [...previewModal.nodes]
}

// 取消排序模式
export const cancelSortMode = () => {
    previewModal.sortMode = false
    previewModal.nodes = [...previewModal.originalNodes]
}

// 保存节点排序
export const saveNodeOrder = async () => {
    if (!previewModal.resourceId) return
    try {
        const nodeOrder = previewModal.nodes.map(n => n.link)
        const res = resources.value.find(r => r.id === previewModal.resourceId)
        if (res) {
            const newInfo = { ...(res.info || {}), nodeOrder }
            await authFetch(`${API}/subs/${previewModal.resourceId}`, {
                method: 'PUT',
                body: JSON.stringify({ info: newInfo })
            })
            res.info = newInfo
            showToast('节点排序已保存')
        }
        previewModal.sortMode = false
    } catch (e) {
        showToast('保存失败: ' + e.message, 'error')
    }
}

// 关闭预览弹窗
export const closePreviewModal = () => {
    if (previewModal.sortMode) {
        if (!confirm('排序尚未保存，确定关闭？')) return
    }
    previewModal.show = false
    previewModal.sortMode = false
}

// 复制全部节点链接
export const copyAllPreviewNodes = () => {
    const links = previewModal.nodes.map(n => n.link).join('\n')
    navigator.clipboard.writeText(links).then(() => showToast('已复制全部链接'))
}
