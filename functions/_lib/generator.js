import { safeBase64Encode, safeBase64Decode } from './utils.js';

// --- 核心：生成链接 ---
export const generateNodeLink = (node) => {
    const safeName = encodeURIComponent(node.name || 'Node');
    if (node.origLink) {
        try {
            if (node.origLink.startsWith('vmess://')) {
                const base64Part = node.origLink.substring(8);
                const jsonStr = safeBase64Decode(base64Part);
                const vmessObj = JSON.parse(jsonStr);
                vmessObj.ps = node.name;
                return 'vmess://' + safeBase64Encode(JSON.stringify(vmessObj));
            }
            const hashIndex = node.origLink.lastIndexOf('#');
            if (hashIndex !== -1) return node.origLink.substring(0, hashIndex) + '#' + safeName;
            return node.origLink + '#' + safeName;
        } catch (e) { return node.origLink; }
    }
    try {
        if (node.type === 'vmess') {
            const vmessObj = {
                v: "2", ps: node.name, add: node.server, port: node.port, id: node.uuid,
                aid: 0, scy: node.cipher || "auto", net: node.network || "tcp", type: "none", tls: node.tls ? "tls" : ""
            };
            if (node['ws-opts']) {
                vmessObj.net = "ws"; vmessObj.path = node['ws-opts'].path;
                if (node['ws-opts'].headers && node['ws-opts'].headers.Host) vmessObj.host = node['ws-opts'].headers.Host;
            }
            return 'vmess://' + safeBase64Encode(JSON.stringify(vmessObj));
        }
        if (node.type === 'vless' || node.type === 'trojan') {
            const params = new URLSearchParams();
            params.set('security', node.tls ? (node.reality ? 'reality' : 'tls') : 'none');
            if (node.network) params.set('type', node.network); if (node.flow) params.set('flow', node.flow);
            if (node.sni || node.servername) params.set('sni', node.sni || node.servername);
            if (node['client-fingerprint']) params.set('fp', node['client-fingerprint']);
            if (node.network === 'ws' && node['ws-opts']) {
                if (node['ws-opts'].path) params.set('path', node['ws-opts'].path);
                if (node['ws-opts'].headers && node['ws-opts'].headers.Host) params.set('host', node['ws-opts'].headers.Host);
            }
            if (node.reality && node.reality.publicKey) {
                params.set('pbk', node.reality.publicKey); if (node.reality.shortId) params.set('sid', node.reality.shortId);
            }
            const userInfo = (node.type === 'vless') ? node.uuid : (node.password || node.uuid);
            return `${node.type}://${userInfo}@${node.server}:${node.port}?${params.toString()}#${safeName}`;
        }
        if (node.type === 'hysteria2') {
            const params = new URLSearchParams();
            if (node.sni) params.set('sni', node.sni);
            if (node['skip-cert-verify']) params.set('insecure', '1');
            if (node.obfs) { params.set('obfs', node.obfs); if (node['obfs-password']) params.set('obfs-password', node['obfs-password']); }
            return `hysteria2://${node.password}@${node.server}:${node.port}?${params.toString()}#${safeName}`;
        }
        if (node.type === 'ss') {
            const userPart = safeBase64Encode(`${node.cipher}:${node.password}`);
            return `ss://${userPart}@${node.server}:${node.port}#${safeName}`;
        }
    } catch (e) { }
    return '';
}

// --- 核心：Clash Meta 转换器 ---
export const toClashProxy = (node) => {
    try {
        if (!node.name || !node.server || !node.port) return null;
        const common = `  - name: ${node.name}
    server: ${node.server}
    port: ${node.port}`;

        if (node.type === 'ss') {
            if (!node.cipher || !node.password) return null;
            return `${common}
    type: ss
    cipher: ${node.cipher}
    password: ${node.password}`;
        }
        if (node.type === 'trojan') {
            if (!node.password) return null;
            let res = `${common}
    type: trojan
    password: ${node.password}
    skip-cert-verify: ${node['skip-cert-verify'] || false}`;
            if (node.sni || node.servername) res += `\n    sni: ${node.sni || node.servername}`;
            if (node.network === 'ws') {
                res += `\n    network: ws\n    ws-opts:\n      path: ${node['ws-opts']?.path || '/'}`;
                if (node['ws-opts']?.headers?.Host) res += `\n      headers:\n        Host: ${node['ws-opts'].headers.Host}`;
            }
            if (node.udp) res += `\n    udp: true`;
            return res;
        }
        if (node.type === 'vmess') {
            if (!node.uuid) return null;
            let res = `${common}
    type: vmess
    uuid: ${node.uuid}
    alterId: 0
    cipher: ${node.cipher || 'auto'}
    tls: ${node.tls ? true : false}
    skip-cert-verify: ${node['skip-cert-verify'] || false}`;
            if (node.network === 'ws') {
                res += `
    network: ws
    ws-opts:
      path: ${node['ws-opts']?.path || '/'}
      headers:
        Host: ${node['ws-opts']?.headers?.Host || ''}`;
            }
            return res;
        }
        if (node.type === 'vless') {
            if (!node.uuid) return null;
            let res = `${common}
    type: vless
    uuid: ${node.uuid}
    tls: ${node.tls ? true : false}
    skip-cert-verify: ${node['skip-cert-verify'] || false}
    network: ${node.network || 'tcp'}`;
            if (node.flow) res += `\n    flow: ${node.flow}`;
            if (node.sni || node.servername) res += `\n    servername: ${node.sni || node.servername}`;
            if (node['client-fingerprint']) res += `\n    client-fingerprint: ${node['client-fingerprint']}`;
            if (node.reality && node.reality.publicKey) {
                res += `\n    reality-opts:
      public-key: ${node.reality.publicKey}
      short-id: ${node.reality.shortId || ''}`;
            }
            if (node.network === 'ws') {
                res += `
    ws-opts:
      path: ${node['ws-opts']?.path || '/'}
      headers:
        Host: ${node['ws-opts']?.headers?.Host || ''}`;
            }
            return res;
        }
        if (node.type === 'hysteria2') {
            let res = `${common}
    type: hysteria2
    skip-cert-verify: ${node['skip-cert-verify'] || false}`;
            if (node.password) res += `\n    password: ${node.password}`;
            if (node.sni) res += `\n    sni: ${node.sni}`;
            if (node.obfs) {
                res += `\n    obfs: ${node.obfs}`;
                if (node['obfs-password']) res += `\n    obfs-password: ${node['obfs-password']}`;
            }
            return res;
        }
        return null;
    } catch (e) { return null; }
}
