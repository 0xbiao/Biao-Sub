// BiaoSUB 远程订阅获取模块
// 负责从远程 URL 获取订阅内容并解析节点

import { generateNodeLink } from './generator.js';

/**
 * 获取远程订阅内容
 * @param {string} url 远程订阅 URL
 * @returns {Promise<{content: string, subInfo: object}>}
 */
export const fetchSubscription = async (url) => {
    // 自动添加 flag=clash 参数（如果 URL 中没有的话）
    const fetchUrl = new URL(url);
    if (!fetchUrl.searchParams.has('flag')) {
        fetchUrl.searchParams.set('flag', 'clash');
    }

    // 多个 UA 备选，依次尝试
    const userAgents = [
        'clash-verge/v1.7.7',
        'ClashX Pro/1.72.0.4',
        'clash.meta',
        'ClashForAndroid/2.5.12'
    ];

    let lastError = null;

    for (const ua of userAgents) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(fetchUrl.toString(), {
                signal: controller.signal,
                headers: {
                    'User-Agent': ua,
                    'Accept': '*/*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache'
                },
                redirect: 'follow'
            });

            clearTimeout(timeout);

            if (res.status === 403 || res.status === 401) {
                lastError = new Error(`HTTP ${res.status}: ${res.statusText} (UA: ${ua})`);
                continue; // 尝试下一个 UA
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const content = await res.text();

            // 解析 Subscription-Userinfo 响应头（流量/到期信息）
            const subInfo = {};
            const userinfo = res.headers.get('Subscription-Userinfo');
            if (userinfo) {
                const parts = userinfo.split(';').map(s => s.trim());
                for (const part of parts) {
                    const [key, val] = part.split('=').map(s => s.trim());
                    if (key && val) subInfo[key] = parseInt(val) || val;
                }
            }

            // 读取订阅名称
            const disposition = res.headers.get('Content-Disposition');
            if (disposition) {
                const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
                if (match) {
                    try {
                        subInfo.fileName = decodeURIComponent(match[1].replace(/\.yaml$/i, ''));
                    } catch (e) {
                        subInfo.fileName = match[1];
                    }
                }
            }

            return { content, subInfo };
        } catch (e) {
            clearTimeout(timeout);
            if (e.name === 'AbortError') {
                throw new Error('请求超时（15秒）');
            }
            lastError = e;
            continue; // 尝试下一个 UA
        }
    }

    // 所有 UA 都失败了
    throw lastError || new Error('所有请求方式均失败');
};

/**
 * 获取远程订阅并解析节点
 * @param {string} url 远程订阅 URL
 * @param {Function} parseNodesCommon 节点解析函数
 * @returns {Promise<{nodes: Array, nodeLinks: string, subInfo: object}>}
 */
export const processRemoteSubscription = async (url, parseNodesCommon) => {
    const { content, subInfo } = await fetchSubscription(url);

    if (!content || content.trim().length === 0) {
        throw new Error('远程订阅返回内容为空');
    }

    // 解析节点
    const nodes = parseNodesCommon(content);

    if (nodes.length === 0) {
        throw new Error('未从远程订阅中解析到任何节点');
    }

    // 生成本地存储格式（标准节点链接，换行分隔）
    const nodeLinks = nodes.map(n => n.link || generateNodeLink(n)).join('\n');

    // 记录节点数量到 subInfo
    subInfo.nodeCount = nodes.length;

    return { nodes, nodeLinks, subInfo };
};
