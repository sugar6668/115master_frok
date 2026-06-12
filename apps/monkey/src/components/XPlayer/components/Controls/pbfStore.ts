// @ts-nocheck
import { ref } from 'vue'

// 定义热点数据结构
export interface PbfBookmark {
  time: number;
  title: string;
}

// 响应式状态：供 UI 组件绑定
export const pbfBookmarks = ref<PbfBookmark[]>([])
export const isPbfLoading = ref(false)
export const isPbfLoaded = ref(false)

// 安全获取油猴 API，彻底绕过编译器的语法检查和未定义报错
function getGmXhr() {
  if (typeof window !== 'undefined' && typeof window['GM_xmlhttpRequest'] !== 'undefined') {
    return window['GM_xmlhttpRequest'];
  }
  if (typeof GM_xmlhttpRequest !== 'undefined') {
    return GM_xmlhttpRequest;
  }
  return null;
}

function requestJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = getGmXhr();
    if (!xhr) return reject(new Error('未找到 GM_xmlhttpRequest，请确保在油猴环境下运行'));
    xhr({
      method: 'GET',
      url,
      responseType: 'json',
      onload: (res: any) => {
        let data = res.response
        if (!data && res.responseText) {
          try { data = JSON.parse(res.responseText) } catch (e) {}
        }
        resolve(data)
      },
      onerror: () => reject(new Error('网络请求失败'))
    })
  })
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = getGmXhr();
    if (!xhr) return reject(new Error('未找到 GM_xmlhttpRequest，请确保在油猴环境下运行'));
    xhr({
      method: 'GET',
      url,
      responseType: 'blob',
      onload: (res: any) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target?.result as string)
        reader.readAsText(res.response)
      },
      onerror: () => reject(new Error('下载书签文件失败'))
    })
  })
}

// 核心执行函数：点击按钮触发
export async function handleLoadPbf() {
  if (isPbfLoading.value) return
  
  if (isPbfLoaded.value) {
    pbfBookmarks.value = []
    isPbfLoaded.value = false
    return
  }

  isPbfLoading.value = true
  try {
    const m1 = location.href.match(/[?&]pick_code=([^&]+)/i)
    const m2 = location.href.match(/[?&]pickcode=([^&]+)/i)
    const pickCode = m1 ? m1[1] : (m2 ? m2[1] : null)
    if (!pickCode) throw new Error('未获取到当前视频的 pick_code')

    const videoInfo = await requestJson(`https://webapi.115.com/files/video?pick_code=${pickCode}`)
    const infoData = videoInfo?.data || videoInfo
    const cid = infoData?.parent_id || infoData?.cid
    const videoName = infoData?.file_name || ''
    if (!cid) throw new Error('视频信息里缺失目录 cid')

    const baseName = videoName.replace(/\.[^.]+$/, '')
    const dirInfo = await requestJson(`https://webapi.115.com/files?aid=1&cid=${cid}&o=file_name&asc=1&offset=0&limit=1000`)
    const files = dirInfo?.data || []
    const pbfFiles = files.filter((f: any) => f.n && f.n.toLowerCase().endsWith('.pbf'))
    if (pbfFiles.length === 0) throw new Error('当前目录下未找到任何 .pbf 文件')

    let targetPbf = pbfFiles.find((f: any) => f.n.includes(baseName)) || pbfFiles[0]

    const downInfo = await requestJson(`https://webapi.115.com/files/download?pickcode=${targetPbf.pc}`)
    const fileUrl = downInfo?.data?.file_url || downInfo?.file_url
    if (!fileUrl) throw new Error('书签直链获取为空')

    const text = await fetchText(fileUrl)
    
    const marks: PbfBookmark[] = []
    for (let line of text.split(/\r?\n/)) {
      line = line.trim()
      let match = line.match(/^\d+=(\d+)\*(.*?)\*/) || line.match(/^(\d+)[\=\*](.*)/)
      if (match) {
        marks.push({ time: parseInt(match[1], 10) / 1000, title: match[2].trim() || '书签' })
      }
    }

    if (marks.length === 0) throw new Error('解析结果为空')

    pbfBookmarks.value = marks.sort((a, b) => a.time - b.time)
    isPbfLoaded.value = true
    
  } catch (err: any) {
    alert('【PBF 热点解析失败】\n' + err.message)
  } finally {
    isPbfLoading.value = false
  }
}