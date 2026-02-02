// BiaoSUB 工具函数模块
import { toast } from './store.js'

// 显示提示消息
export const showToast = (msg, type = 'success') => {
    toast.message = msg
    toast.type = type
    toast.show = true
    setTimeout(() => toast.show = false, 3000)
}

// 复制文本
export const copyText = (txt) => {
    navigator.clipboard.writeText(txt).then(() => showToast('已复制'))
}

// 获取进度条样式类
export const getProgressClass = (p) => {
    return p > 90 ? 'progress-error' : (p > 75 ? 'progress-warning' : 'progress-primary')
}

// 判断是否过期
export const isExpired = (ts) => {
    return ts ? Date.now() > ts * 1000 : false
}

// 格式化文件大小
export const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

// 下载文件
export const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
