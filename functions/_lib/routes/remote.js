import { parseNodesCommon } from '../parser.js';
import { processRemoteSubscription } from '../fetcher.js';
import { refreshGroupCacheByResourceIds } from './subscription.js';

export function registerRemoteRoutes(app) {
    // 导入远程订阅
    app.post('/remote', async (c) => {
        const b = await c.req.json();
        const sourceUrl = b.url;
        const name = b.name || '';

        if (!sourceUrl) return c.json({ success: false, error: '请输入订阅链接' }, 400);

        try {
            const { nodes, nodeLinks, subInfo } = await processRemoteSubscription(sourceUrl, parseNodesCommon);
            const finalName = name || subInfo.fileName || `远程订阅 (${nodes.length}个节点)`;

            await c.env.DB.prepare(
                "INSERT INTO subscriptions (name, url, source_url, type, params, info, sort_order, status) VALUES (?,?,?,?,?,?,9999,1)"
            ).bind(
                finalName, nodeLinks, sourceUrl, 'remote',
                JSON.stringify({}), JSON.stringify(subInfo)
            ).run();

            return c.json({ success: true, data: { name: finalName, nodeCount: nodes.length, subInfo } });
        } catch (e) {
            return c.json({ success: false, error: e.message }, 500);
        }
    })

    // 刷新远程订阅
    app.post('/remote/refresh/:id', async (c) => {
        const id = c.req.param('id');

        try {
            const sub = await c.env.DB.prepare("SELECT * FROM subscriptions WHERE id = ? AND type = 'remote'").bind(id).first();
            if (!sub) return c.json({ success: false, error: '资源不存在或不是远程订阅类型' }, 404);

            const { nodes, nodeLinks, subInfo } = await processRemoteSubscription(sub.source_url, parseNodesCommon);

            await c.env.DB.prepare(
                "UPDATE subscriptions SET url = ?, info = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            ).bind(nodeLinks, JSON.stringify(subInfo), id).run();

            await refreshGroupCacheByResourceIds(c.env.DB, [id]);

            return c.json({ success: true, data: { nodeCount: nodes.length, subInfo } });
        } catch (e) {
            return c.json({ success: false, error: e.message }, 500);
        }
    })
}
