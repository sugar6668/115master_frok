<template>
  <div
    :class="styles.progressBar.root"
    :data-long-press="isLongPressDragging"
    :data-dragging="isDragging"
    :data-canplay="canplay"
  >
    <!-- 进度条外容器 -->
    <div
      ref="progressBarWrapperRef"
      :class="styles.progressBar.wrapper"
      @mousedown="handleBarWrapperMouseDown"
      @mouseenter="handleBarWrapperMouseEnter"
      @mousemove="handleBarWrapperMouseMoveWithThrottle"
      @mouseleave="handleBarWrapperMouseLeave"
    >
      <!-- 进度条内容器 -->
      <div :class="[styles.progressBar.track]">
        <!-- 原始播放进度（拖拽时保持显示） -->
        <div
          :class="styles.thumb.current"
          :style="{
            transform: `scaleX(${progressValue / 100})`,
            opacity: isDragging ? 0 : 1,
          }"
        />

        <!-- 拖拽时的实时进度 -->
        <div
          v-if="isDragging"
          :class="[styles.thumb.current, styles.thumb.dragging]"
          :style="{ transform: `scaleX(${dragProgress / 100})` }"
        />

        <!-- 预览进度 -->
        <div
          v-show="isPreviewVisible && !isDragging"
          :class="styles.thumb.hover"
          :style="{ transform: `scaleX(${previewProgress / 100})` }"
        />
        <div v-if="pbfBookmarks.length > 0" class="absolute top-0 left-0 w-full h-full pointer-events-none z-[6]">
          <div
            v-for="(bm, idx) in pbfBookmarks"
            :key="idx"
            class="absolute top-1/2 w-[10px] h-[10px] bg-white/95 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer shadow-[0_0_0_2px_rgba(255,210,50,0.3)] transition-all duration-150 hover:scale-[1.3] hover:bg-[#ffd232] hover:shadow-[0_0_0_3px_rgba(255,210,50,0.4),_0_3px_10px_rgba(0,0,0,0.3)]"
            :style="{ left: `${(bm.time / (playerCore?.duration || 1)) * 100}%` }"
            :title="bm.title"
            @click.stop="playerCore && (playerCore.currentTime = bm.time)"
          ></div>
        </div>
      </div>
    </div>
    <!-- 缩略图预览 -->
    <Thumbnail
      ref="thumbnailRef"
      :visible="isPreviewVisible || isDragging"
      :position="isDragging ? dragProgress : previewProgress"
      :time="previewTime"
      :progress-bar-width="progressBarWidth"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Thumbnail from '@/components/XPlayer/components/Thumbnail/index.vue'
import { usePlayerContext } from '@/components/XPlayer/hooks/usePlayerProvide'
import { clsx } from '@/utils/clsx'
import { pbfBookmarks } from '../../../../utils/pbfStore'

/** 样式抽象 */
const styles = clsx({
  progressBar: {
    root: [
      'relative',
      'group',
      'hidden',
      'data-[canplay=true]:block',
    ],
    wrapper: 'relative cursor-pointer py-4',
    track:
      [
        'h-2',
        'relative',
        'transition-[height]',
        'duration-100',
        'ease-linear',
        'rounded-full',
        'overflow-hidden',
        'bg-base-content/25',
        'shadow-[0_0_1px_rgba(0,0,0,0.1),0_0_32px_rgba(0,0,0,0.1)]',
      ],
  },
  thumb: {
    current:
      'bg-base-content/95 linear absolute h-full w-full origin-left transition-transform duration-100',
    dragging: 'transition-none',
    hover: 'bg-base-content/15 pointer-events-none absolute h-full w-full origin-left',
  },
})

const { progressBar, playerCore } = usePlayerContext()

/** 缩略图组件引用 */
const thumbnailRef = ref<any>(null)

/** 是否可以播放 */
const canplay = computed(() => {
  return playerCore.value?.canplay ?? false
})

/** 从 hook 中解构所有需要的状态和方法 */
const {
  progressBarWrapperRef,
  progressBarWidth,
  progressValue,
  isDragging,
  dragProgress,
  previewTime,
  previewProgress,
  isPreviewVisible,
  isLongPressDragging,
  handleBarWrapperMouseDown,
  handleBarWrapperMouseEnter,
  handleBarWrapperMouseMoveWithThrottle,
  handleBarWrapperMouseLeave,
  setThumbnailRef,
} = progressBar

/** 将 thumbnailRef 传递给 hook */
watch(thumbnailRef, (newRef) => {
  setThumbnailRef(newRef)
}, { immediate: true })
</script>
