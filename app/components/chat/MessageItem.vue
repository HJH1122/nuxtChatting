<script setup lang="ts">
import type { Message } from '~/types/chat'
import { MoreVertical, Edit2, Trash2, FileText, Download, ExternalLink } from 'lucide-vue-next'
import PollItem from './PollItem.vue'

const props = defineProps<{
  message: Message
  isOwn: boolean
}>()

const showMenu = ref(false)

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const isImage = (url: string) => {
  return /\.(jpg|jpeg|png|webp|gif|svg)$/.test(url.toLowerCase())
}

const formatSender = (name: string | undefined, id: string | undefined) => {
  const displayName = name || '알 수 없음'
  if (!id) return displayName
  const truncatedId = id.length > 8 ? `${id.substring(0, 6)}...` : id
  return `${displayName}(${truncatedId})`
}
</script>

<template>
  <div 
    class="group flex flex-col mb-4 max-w-[85%]"
    :class="isOwn ? 'ml-auto items-end' : 'mr-auto items-start'"
  >
    <!-- Sender Name & Time -->
    <div class="flex items-center gap-2 mb-1 px-1">
      <span v-if="!isOwn" class="text-xs font-bold text-gray-700">{{ formatSender(message.senderName, message.senderId) }}</span>
      <span class="text-[10px] text-gray-400">{{ formatTime(message.createdAt) }}</span>
      <span v-if="message.isEdited" class="text-[10px] text-gray-300 italic">(수정됨)</span>
    </div>

    <div class="flex items-start gap-2 max-w-full">
      <!-- Own Message Menu (Left of bubble) -->
      <div v-if="isOwn" class="opacity-0 group-hover:opacity-100 transition-opacity self-center">
        <button class="p-1 hover:bg-gray-100 rounded text-gray-400">
          <MoreVertical class="w-4 h-4" />
        </button>
      </div>

      <!-- Content Bubble -->
      <div 
        class="relative px-4 py-2.5 rounded-2xl shadow-sm overflow-hidden"
        :class="[
          isOwn ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none',
          message.type === 'system' ? 'bg-gray-100 text-gray-500 italic text-center mx-auto border-none shadow-none rounded-lg text-xs' : ''
        ]"
      >
        <!-- Text Content -->
        <p v-if="message.content && message.type !== 'system'" class="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {{ message.content }}
        </p>

        <!-- System Message -->
        <p v-if="message.type === 'system'" class="px-2">
          {{ message.content }}
        </p>

        <!-- Image Attachment -->
        <div v-if="message.type === 'image' && message.attachment" class="mt-2 rounded-lg overflow-hidden border border-black/5 cursor-pointer">
          <a :href="message.attachment.url" target="_blank" class="block">
            <img :src="message.attachment.url" :alt="message.attachment.name" class="max-w-full h-auto block hover:opacity-90 transition-opacity" />
          </a>
        </div>

        <!-- File Attachment -->
        <div v-if="message.type === 'file' && message.attachment" class="mt-2 flex items-center gap-3 p-2 rounded-lg bg-black/5">
          <div class="bg-white/20 p-2 rounded">
            <FileText class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium truncate">{{ message.attachment.name }}</p>
            <p class="text-[10px] opacity-70">{{ ((message.attachment.size || 0) / 1024).toFixed(1) }} KB</p>
          </div>
          <a :href="message.attachment.url" :download="message.attachment.name" class="p-1.5 hover:bg-white/20 rounded-full transition-colors text-inherit">
            <Download class="w-4 h-4" />
          </a>
        </div>

        <!-- Poll -->
        <div v-if="message.type === 'poll' && message.poll" class="mt-2">
          <PollItem :poll="message.poll" />
        </div>

        <!-- Link Preview -->
        <div v-if="message.linkPreview" class="mt-2 bg-black/5 rounded-lg overflow-hidden border border-black/5">
          <img v-if="message.linkPreview.image" :src="message.linkPreview.image" class="w-full h-32 object-cover" />
          <div class="p-2 space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-wider opacity-60">{{ message.linkPreview.siteName }}</p>
            <h5 class="text-xs font-bold truncate">{{ message.linkPreview.title }}</h5>
            <p class="text-[10px] line-clamp-2 opacity-80">{{ message.linkPreview.description }}</p>
            <a :href="message.linkPreview.url" target="_blank" class="flex items-center gap-1 text-[10px] text-blue-300 hover:underline mt-1">
              {{ message.linkPreview.url }}
              <ExternalLink class="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      <!-- Other Message Menu (Right of bubble) -->
      <div v-if="!isOwn" class="opacity-0 group-hover:opacity-100 transition-opacity self-center">
        <button class="p-1 hover:bg-gray-100 rounded text-gray-400">
          <MoreVertical class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
