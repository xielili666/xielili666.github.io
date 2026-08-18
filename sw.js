/* 谢丽丽作品集 · Service Worker
 * 作用：首次访问时把 /works/ 下的图片与视频缓存到浏览器本地，
 *       之后每次进页面直接从本地读取，秒开、不再重新下载（解决“每次进来都重新加载”）。
 * 注意：修改了图片/视频内容后，需要把下方 CACHE 版本号 +1（例如 v1 -> v2）让用户拿到新内容。
 */
const CACHE = 'xielili-works-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function isImage(p) {
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(p);
}
function isVideo(p) {
  return /\.(mp4|webm|ogg|mov)$/i.test(p);
}
function isAsset(p) {
  return p.startsWith('/works/') || p.endsWith('/wechat-qr.jpg');
}

// 视频：cache-first + 支持 Range 拖动进度（首次拉全量并缓存，之后从缓存切片返回）
async function handleVideo(req, cache) {
  const cached = await cache.match(req.url);
  if (cached) {
    const range = req.headers.get('Range');
    if (!range) return cached;
    const buf = await cached.arrayBuffer();
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
    const slice = buf.slice(start, end + 1);
    return new Response(slice, {
      status: 206,
      headers: {
        'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(slice.byteLength)
      }
    });
  }
  // 首次：去掉 Range 拉全量文件并缓存
  const fullReq = new Request(req.url, { method: 'GET' });
  let resp;
  try {
    resp = await fetch(fullReq);
  } catch (e) {
    return new Response(null, { status: 504 });
  }
  if (resp && resp.status === 200) {
    cache.put(req.url, resp.clone());
  }
  const range = req.headers.get('Range');
  if (range && resp && resp.status === 200) {
    const buf = await resp.arrayBuffer();
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : buf.byteLength - 1;
    const slice = buf.slice(start, end + 1);
    return new Response(slice, {
      status: 206,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'video/mp4',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(slice.byteLength)
      }
    });
  }
  return resp;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (!isAsset(url.pathname)) return;

  const req = event.request;

  if (isImage(url.pathname)) {
    // stale-while-revalidate：先用缓存秒开，后台静默更新（内容改了也能自动刷新）
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req.url);
      const network = fetch(req.url).then((r) => {
        if (r && r.status === 200) cache.put(req.url, r.clone());
        return r;
      }).catch(() => cached);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return network;
    })());
    return;
  }

  if (isVideo(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return handleVideo(req, cache);
    })());
    return;
  }

  // 其它 works 资源：cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    const resp = await fetch(req);
    if (resp && resp.status === 200) cache.put(req, resp.clone());
    return resp;
  })());
});
