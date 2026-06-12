<template>
  <transition
    enter-active-class="transition-all duration-300 ease-[var(--ease-in-cubic)]"
    leave-active-class="transition-all duration-300 ease-[var(--ease-in-cubic)]"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      ref="controlBarRef"
      :class="styles.controlBar.main"
    >
      <div :class="styles.controlBar.bg" />
      <!-- 视频控制栏 -->
      <div
        :ref="controls.mainRef"
        :class="[styles.controlBar.mainContent]"
      >
        <div :class="styles.controlBar.subBar">
          <div :class="styles.controlBar.subBarLeft" />
          <div :class="styles.controlBar.subBarRight" />
        </div>
        <div
          :class="[styles.controlBar.mainBar]"
        >
          <div :class="styles.controlBar.mainBarLeft">
            <ControlBox>
              <!-- 上一集按钮 -->
              <EpisodeButton
                type="playPrevious"
                :disabled="!rootProps.hasPrevious"
                :on-click="handlePlayPrevious"
              />
              <!-- 播放按钮 -->
              <PlayButton />
              <!-- 下一集按钮 -->
              <EpisodeButton
                type="playNext"
                :disabled="!rootProps.hasNext"
                :on-click="handlePlayNext"
              />
              <button 
                class="btn btn-ghost btn-sm ml-1 p-1 h-9 w-9 min-h-0 rounded-full inline-flex items-center justify-center transition-colors"
                :class="isPbfLoaded ? 'text-[#ffd232] hover:text-[#ffc107]' : 'text-base-content/80 hover:text-base-content'"
                :title="isPbfLoaded ? '已挂载目录书签，点击清空' : '一键挂载同目录 PBF 书签'"
                @click="handleLoadPbf"
              >
                <svg v-if="isPbfLoading" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="isPbfLoaded ? 'filter: drop-shadow(0 0 4px rgba(255, 210, 50, .3));' : ''">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  <line x1="12" y1="8" x2="12" y2="14"></line>
                  <line x1="9" y1="11" x2="15" y2="11"></line>
                </svg>
              </button>
            </ControlBox>
            <ControlBox>
              <!-- 音量控制 -->
              <VolumeControl />
            </ControlBox>
            <ControlBox class="hidden lg:flex">
              <TimeDisplay />
            </ControlBox>
          </div>
          <div :class="styles.controlBar.mainBarCenter">
            <!-- 进度条 -->
            <ProgressBar />
          </div>
          <div :class="styles.controlBar.mainBarRight">
            <ControlBox>
              <ControlButtonGroup>
                <template #expanded>
                  <!-- 画面变换 -->
                  <TransformButton />
                  <!-- 视频色彩 -->
                  <VideoEnhanceSettings />
                  <!-- 音频轨道 -->
                  <AudioTrackButton />
                </template>
                <!-- 字幕按钮 -->
                <SubtitleButton />
              </ControlButtonGroup>
            </ControlBox>

            <ControlBox>
              <!-- 倍速控制 -->
              <PlaybackRateButton />
            </ControlBox>

            <ControlBox>
              <!-- 画质控制 -->
              <QualityButton />
            </ControlBox>

            <ControlBox>
              <!-- 画中画 -->
              <PipButton />
              <!-- 全屏控制 -->
              <FullscreenButton />
            </ControlBox>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref } from 'vue'
import { useControlsMouseDetection } from '@/components/XPlayer/hooks/useControlsMouseDetection'
import { usePlayerContext } from '@/components/XPlayer/hooks/usePlayerProvide'
import { clsx } from '@/utils/clsx'
import AudioTrackButton from './AudioTrackButton.vue'
import ControlBox from './ControlBox.vue'
import ControlButtonGroup from './ControlButtonGroup.vue'
import EpisodeButton from './EpisodeButton.vue'
import FullscreenButton from './FullscreenButton.vue'
import PipButton from './PipButton.vue'
import PlaybackRateButton from './PlaybackRateButton.vue'
import PlayButton from './PlayButton.vue'
import ProgressBar from './ProgressBar.vue'
import QualityButton from './QualityButton.vue'
import SubtitleButton from './SubtitleButton.vue'
import TimeDisplay from './TimeDisplay.vue'
import TransformButton from './TransformButton.vue'
import VideoEnhanceSettings from './VideoEnhanceSettings.vue'
import VolumeControl from './VolumeControl.vue'
// ================= PBF 章节热点核心逻辑开始 =================
const isPbfLoading = ref(false)
const isPbfLoaded = ref(false)

function getGmXhr() {
  if (typeof window !== 'undefined' && typeof window['GM_xmlhttpRequest'] !== 'undefined') {
    return window['GM_xmlhttpRequest'];
  }
  // @ts-ignore
  if (typeof GM_xmlhttpRequest !== 'undefined') return GM_xmlhttpRequest;
  return null;
}

function requestJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = getGmXhr();
    if (!xhr) return reject(new Error('未找到 GM_xmlhttpRequest'));
    xhr({
      method: 'GET', url, responseType: 'json',
      onload: (res: any) => {
        let data = res.response;
        if (!data && res.responseText) { try { data = JSON.parse(res.responseText) } catch(e){} }
        resolve(data);
      },
      onerror: () => reject(new Error('网络请求失败'))
    });
  });
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = getGmXhr();
    if (!xhr) return reject(new Error('未找到 GM_xmlhttpRequest'));
    xhr({
      method: 'GET', url, responseType: 'blob',
      onload: (res: any) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsText(res.response);
      },
      onerror: () => reject(new Error('下载书签文件失败'))
    });
  });
}

async function handleLoadPbf() {
  if (isPbfLoading.value) return;
  if (isPbfLoaded.value) {
    // 触发全局事件：清除热点
    window.dispatchEvent(new CustomEvent('pbf-cleared'));
    isPbfLoaded.value = false;
    return;
  }

  isPbfLoading.value = true;
  try {
    const m1 = location.href.match(/[?&]pick_code=([^&]+)/i);
    const m2 = location.href.match(/[?&]pickcode=([^&]+)/i);
    const pickCode = m1 ? m1[1] : (m2 ? m2[1] : null);
    if (!pickCode) throw new Error('未获取到当前视频的 pick_code');

    const videoInfo = await requestJson(`https://webapi.115.com/files/video?pick_code=${pickCode}`);
    const infoData = videoInfo?.data || videoInfo;
    const cid = infoData?.parent_id || infoData?.cid;
    const videoName = infoData?.file_name || '';
    if (!cid) throw new Error('视频信息里缺失目录 cid');

    const baseName = videoName.replace(/\.[^.]+$/, '');
    const dirInfo = await requestJson(`https://webapi.115.com/files?aid=1&cid=${cid}&o=file_name&asc=1&offset=0&limit=1000`);
    const files = dirInfo?.data || [];
    const pbfFiles = files.filter((f: any) => f.n && f.n.toLowerCase().endsWith('.pbf'));
    if (pbfFiles.length === 0) throw new Error('当前目录下未找到任何 .pbf 文件');

    let targetPbf = pbfFiles.find((f: any) => f.n.includes(baseName)) || pbfFiles[0];

    const downInfo = await requestJson(`https://webapi.115.com/files/download?pickcode=${targetPbf.pc}`);
    const fileUrl = downInfo?.data?.file_url || downInfo?.file_url;
    if (!fileUrl) throw new Error('书签直链获取为空');

    const text = await fetchText(fileUrl);
    const marks: any[] = [];
    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      let match = line.match(/^\d+=(\d+)\*(.*?)\*/) || line.match(/^(\d+)[\=\*](.*)/);
      if (match) {
        marks.push({ time: parseInt(match[1], 10) / 1000, title: match[2].trim() || '书签' });
      }
    }
    if (marks.length === 0) throw new Error('解析结果为空');

    // 触发全局事件：发送解析好的热点数据给进度条
    window.dispatchEvent(new CustomEvent('pbf-loaded', { detail: marks.sort((a, b) => a.time - b.time) }));
    isPbfLoaded.value = true;
  } catch (err: any) {
    alert('【PBF 热点解析失败】\n' + err.message);
  } finally {
    isPbfLoading.value = false;
  }
}
// ================= PBF 章节热点核心逻辑结束 =================
/** 样式抽象 */
const styles = clsx({
  controlBar: {
    main: [
      'pointer-events-auto relative',
      'transform-gpu',
    ],
    bg: [
      'absolute inset-0 top-[-200%]',
      'bg-[linear-gradient(to_top,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.32)_22%,rgba(0,0,0,0.26)_32%,rgba(0,0,0,0.20)_42%,rgba(0,0,0,0.14)_52%,rgba(0,0,0,0.08)_62%,rgba(0,0,0,0.03)_72%,rgba(0,0,0,0)_100%)]',
      'pointer-events-none',
    ],
    mainContent: 'relative flex flex-col gap-y-2 px-6 pb-6',
    mainBar: 'flex items-center gap-2',
    mainBarLeft: 'flex items-center gap-2',
    mainBarCenter: 'flex-1 px-6',
    mainBarRight: 'flex items-center gap-2',
    subBar: 'flex items-center justify-between',
    subBarLeft: 'flex items-center gap-2',
    subBarRight: 'flex items-center gap-2',
  },
})

/** 视频播放器上下文 */
const ctx = usePlayerContext()

const { controls, rootProps, rootEmit } = ctx

/** 控制栏引用 */
const controlBarRef = shallowRef<HTMLDivElement | null>(null)

useControlsMouseDetection(controlBarRef)

/** 显示/隐藏控制栏 */
const show = computed(() => {
  return controls.visible.value
})

/** 播放上一集 */
function handlePlayPrevious() {
  rootEmit('playPrevious', ctx)
}

/** 播放下一集 */
function handlePlayNext() {
  rootEmit('playNext', ctx)
}
</script>
