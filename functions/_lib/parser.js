import { deepBase64Decode, safeBase64Decode } from './utils.js';
import { generateNodeLink } from './generator.js';

// --- 核心：万能解析器 ---
export const parseNodesCommon = (text) => {
    const nodes = [];
    const rawSet = new Set();
    const addNode = (n) => {
        if (!n.name) n.name = 'Node';
        // 确保关键字段存在，否则 Clash 转换器会丢弃
        if (!n.link) n.link = generateNodeLink(n);
        if (n.link && n.link.length > 15 && !rawSet.has(n.link)) {
            rawSet.add(n.link); nodes.push(n);
        }
    }
    let decoded = deepBase64Decode(text);
    if (!decoded || decoded.length < 5 || /[\x00-\x08]/.test(decoded)) decoded = text;

    // 1. 处理以换行分隔的 URI Scheme
    const linkRegex = /(vmess|vless|ss|ssr|trojan|hysteria|hysteria2|tuic|juicity|naive):\/\/[^\s\n"']+/gi;
    const matches = decoded.match(linkRegex);
    if (matches) {
        for (const match of matches) {
            const trimLine = match.trim();
            try {
                let node = { origLink: trimLine, type: 'raw' };
                if (trimLine.startsWith('vmess://')) {
                    const b64 = trimLine.substring(8);
                    const c = JSON.parse(safeBase64Decode(b64));
                    node.name = c.ps; node.type = 'vmess';
                    // 关键修复：从 JSON 完整解析 vmess 字段，供 Clash 使用
                    node.server = c.add; node.port = c.port; node.uuid = c.id;
                    node.cipher = c.scy || "auto"; node.tls = c.tls === "tls";
                    node.network = c.net;
                    if (c.net === 'ws') {
                        node['ws-opts'] = { path: c.path || '/', headers: { Host: c.host || '' } };
                    }
                } else {
                    const url = new URL(trimLine);
                    node.name = decodeURIComponent(url.hash.substring(1));
                    node.type = url.protocol.replace(':', '');
                    // 处理用户信息 (user:pass 或 user)
                    if (url.username) {
                        if (node.type === 'vmess' || node.type === 'vless') node.uuid = url.username;
                        else if (node.type === 'ss') {
                            // ss://base64@...
                            if (!url.password && url.username.includes(':')) {
                                // 极少数未编码情况
                                const p = url.username.split(':'); node.cipher = p[0]; node.password = p[1];
                            } else {
                                // 尝试解码
                                try {
                                    const userPart = safeBase64Decode(url.username);
                                    if (userPart.includes(':')) {
                                        const p = userPart.split(':'); node.cipher = p[0]; node.password = p[1];
                                    }
                                } catch (e) { node.password = url.username; }
                            }
                        }
                        else node.password = url.username;
                    }
                    node.server = url.hostname; node.port = url.port;

                    // 解析参数
                    const params = url.searchParams;
                    if (params.has('sni')) node.sni = params.get('sni');
                    if (params.has('peer')) node.sni = params.get('peer');
                    if (params.has('security')) node.tls = params.get('security') === 'tls';
                    if (params.has('type')) node.network = params.get('type');
                    if (params.has('flow')) node.flow = params.get('flow');
                    if (params.has('fp')) node['client-fingerprint'] = params.get('fp');
                    if (params.has('path')) {
                        if (!node['ws-opts']) node['ws-opts'] = {};
                        node['ws-opts'].path = params.get('path');
                    }
                    if (params.has('host')) {
                        if (!node['ws-opts']) node['ws-opts'] = {};
                        if (!node['ws-opts'].headers) node['ws-opts'].headers = {};
                        node['ws-opts'].headers.Host = params.get('host');
                    }
                }
                addNode(node);
            } catch (e) { }
        }
    }

    // 2. 处理 Clash YAML 格式
    if (nodes.length < 1 && (decoded.includes('proxies:') || decoded.includes('name:'))) {
        try {
            const lines = decoded.split(/\r?\n/);
            let inProxyBlock = false; let currentBlock = [];
            const processYamlBlock = (block) => {
                const getVal = (k) => {
                    const reg = new RegExp(`${k}:\\s*(?:['"](.*?)['"]|(.*?))(?:$|#|,|})`, 'i');
                    const line = block.find(l => reg.test(l));
                    if (!line) return undefined;
                    const m = line.match(reg); return (m[1] || m[2]).trim();
                };
                let type = getVal('type');
                if (!type || ['url-test', 'selector', 'fallback', 'direct', 'reject', 'load-balance'].includes(type)) return;
                const node = {
                    name: getVal('name'), type, server: getVal('server'), port: getVal('port'),
                    uuid: getVal('uuid'), cipher: getVal('cipher'), password: getVal('password'),
                    udp: getVal('udp') === 'true', tls: getVal('tls') === 'true',
                    "skip-cert-verify": getVal('skip-cert-verify') === 'true',
                    servername: getVal('servername') || getVal('sni'), sni: getVal('sni'),
                    network: getVal('network'), flow: getVal('flow'),
                    "client-fingerprint": getVal('client-fingerprint')
                };
                const findInBlock = (key) => {
                    const line = block.find(l => l.includes(key)); if (!line) return undefined;
                    const m = line.match(new RegExp(`${key}:\\s*(?:['"](.*?)['"]|([^\\s{]+))`));
                    return m ? (m[1] || m[2]).trim() : undefined;
                }
                if (node.network === 'ws' || block.some(l => l.includes('ws-opts'))) {
                    node.network = 'ws';
                    node['ws-opts'] = { path: findInBlock('path') || '/', headers: { Host: findInBlock('Host') || '' } };
                }
                if (block.some(l => l.includes('public-key'))) {
                    node.tls = true;
                    node.reality = { publicKey: findInBlock('public-key'), shortId: findInBlock('short-id') };
                }
                if (node.server && node.port) addNode(node);
            }
            for (const line of lines) {
                if (!line.trim() || line.trim().startsWith('#')) continue;
                if (line.includes('proxies:')) { inProxyBlock = true; continue; }
                if (inProxyBlock) {
                    if (line.trim().startsWith('-') && line.includes('name:')) {
                        if (currentBlock.length > 0) processYamlBlock(currentBlock);
                        currentBlock = [line];
                    } else if (currentBlock.length > 0) currentBlock.push(line);
                    if (!line.startsWith(' ') && !line.startsWith('-') && !line.includes('proxies:')) {
                        inProxyBlock = false;
                        if (currentBlock.length > 0) processYamlBlock(currentBlock);
                        currentBlock = [];
                    }
                }
            }
            if (currentBlock.length > 0) processYamlBlock(currentBlock);
        } catch (e) { }
    }
    return nodes;
}
