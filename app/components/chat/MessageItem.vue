<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import type { Message } from '~/types/chat'
import { MoreVertical, Edit2, Trash2, FileText, Download, ExternalLink, Copy, Check } from 'lucide-vue-next'
import PollItem from './PollItem.vue'

const props = defineProps<{
  message: Message
  isOwn: boolean
  currentUserId: string
  isHighlighted?: boolean
  isHost?: boolean
}>()

const emit = defineEmits<{
  (e: 'vote', pollId: string, optionId: string): void
  (e: 'edit', messageId: string, content: string): void
  (e: 'delete', messageId: string): void
}>()

const showMenu = ref(false)
const isEditing = ref(false)
const editContent = ref(props.message.content)

const closeMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.message-menu-container')) {
    showMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

const startEdit = () => {
  editContent.value = props.message.content
  isEditing.value = true
  showMenu.value = false
}

const cancelEdit = () => {
  isEditing.value = false
}

const submitEdit = () => {
  const trimmed = editContent.value.trim()
  if (!trimmed) return
  emit('edit', props.message.id, trimmed)
  isEditing.value = false
}

const handleDelete = () => {
  showMenu.value = false
  if (confirm('정말 이 메시지를 삭제하시겠습니까?')) {
    emit('delete', props.message.id)
  }
}

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

// --- Code Block Support ---
interface ContentPart {
  type: 'text' | 'code'
  content: string
  lang?: string
}

const parseMessageContent = (content: string): ContentPart[] => {
  if (!content) return []
  
  const regex = /```(\w*)\n([\s\S]*?)```/g
  const parts: ContentPart[] = []
  let lastIndex = 0
  let match
  
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      })
    }
    
    parts.push({
      type: 'code',
      lang: match[1] || 'plaintext',
      content: match[2]
    })
    
    lastIndex = regex.lastIndex
  }
  
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    })
  }
  
  return parts
}

const highlightCode = (code: string, lang: string | undefined) => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value
    } catch (e) {
      console.error(e)
    }
  }
  return hljs.highlightAuto(code).value
}

const copiedIndex = ref<number | null>(null)

const handleCopyCode = (code: string, index: number) => {
  navigator.clipboard.writeText(code.trim()).then(() => {
    copiedIndex.value = index
    setTimeout(() => {
      if (copiedIndex.value === index) {
        copiedIndex.value = null
      }
    }, 2000)
  }).catch(err => {
    console.error('Failed to copy: ', err)
  })
}
</script>

<template>
  <div 
    class="group flex flex-col mb-4"
    :class="[
      message.type === 'system' 
        ? 'mx-auto items-center w-full max-w-full' 
        : (isOwn ? 'ml-auto items-end max-w-[85%]' : 'mr-auto items-start max-w-[85%]')
    ]"
  >
    <!-- Sender Name & Time -->
    <div v-if="message.type !== 'system'" class="flex items-center gap-2 mb-1 px-1">
      <span v-if="!isOwn" class="text-xs font-bold text-gray-700">{{ formatSender(message.senderName, message.senderId) }}</span>
      <span class="text-[10px] text-gray-400">{{ formatTime(message.createdAt) }}</span>
      <span v-if="message.isEdited" class="text-[10px] text-gray-300 italic">(수정됨)</span>
    </div>

    <div class="flex items-start gap-2 max-w-full relative">
      <!-- Own Message Menu (Left of bubble) -->
      <div v-if="isOwn" class="relative message-menu-container opacity-0 group-hover:opacity-100 transition-opacity self-center">
        <button @click="showMenu = !showMenu" class="p-1 hover:bg-gray-100 rounded text-gray-400" aria-label="메뉴">
          <MoreVertical class="w-4 h-4" />
        </button>
        
        <!-- Dropdown Menu -->
        <div v-if="showMenu" class="absolute bottom-full right-0 mb-1 w-24 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30">
          <button @click="startEdit" class="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
            <Edit2 class="w-3.5 h-3.5" />
            수정
          </button>
          <button @click="handleDelete" class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
            <Trash2 class="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      </div>

      <!-- Content Bubble -->
      <div 
        class="relative px-4 py-2.5 rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
        :class="[
          isOwn ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none',
          message.type === 'system' ? 'bg-gray-100 text-gray-500 italic text-center mx-auto border-none shadow-none rounded-lg text-xs' : '',
          isHighlighted ? 'ring-4 ring-yellow-400 animate-pulse' : ''
        ]"
      >
        <!-- Text Content -->
        <div v-if="message.content && message.type !== 'system'" class="text-sm leading-relaxed space-y-2">
          <!-- Edit Form -->
          <div v-if="isEditing" class="flex flex-col gap-2 min-w-[200px] py-1">
            <textarea 
              v-model="editContent" 
              class="w-full bg-white text-gray-900 border border-transparent rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none font-sans"
              rows="2"
              @keydown.enter.prevent="submitEdit"
              @keydown.esc="cancelEdit"
            ></textarea>
            <div class="flex justify-end gap-1.5">
              <button @click="cancelEdit" class="px-2.5 py-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">취소</button>
              <button @click="submitEdit" class="px-2.5 py-1 text-[11px] font-bold bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">확인</button>
            </div>
          </div>
          
          <!-- Normal Content -->
          <div v-else v-for="(part, i) in parseMessageContent(message.content)" :key="i">
            <p v-if="part.type === 'text'" class="whitespace-pre-wrap break-words">{{ part.content }}</p>
            <div v-else-if="part.type === 'code'" class="my-3 rounded-xl overflow-hidden border border-gray-700/20 bg-slate-950 text-slate-100 font-mono text-xs shadow-md max-w-full">
              <div class="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 select-none">
                <span class="uppercase tracking-wider font-extrabold text-[10px] text-blue-400">{{ part.lang }}</span>
                <button 
                  type="button"
                  @click="handleCopyCode(part.content, i)" 
                  class="hover:text-white transition-colors flex items-center gap-1 font-bold active:scale-95 duration-100"
                >
                  <Check v-if="copiedIndex === i" class="w-3.5 h-3.5 text-green-400" />
                  <Copy v-else class="w-3.5 h-3.5" />
                  <span>{{ copiedIndex === i ? '복사됨!' : '복사' }}</span>
                </button>
              </div>
              <pre class="p-4 overflow-x-auto custom-scrollbar text-[12px] leading-normal font-mono bg-slate-950 text-left"><code :class="'language-' + part.lang" v-html="highlightCode(part.content, part.lang)"></code></pre>
            </div>
          </div>
        </div>

        <!-- System Message -->
        <p v-if="message.type === 'system'" class="px-2 whitespace-pre-wrap">
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
          <PollItem 
            :poll="message.poll" 
            :currentUserId="currentUserId" 
            @vote="(optionId) => emit('vote', message.poll!.id, optionId)"
          />
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
      <div v-if="!isOwn && isHost" class="relative message-menu-container opacity-0 group-hover:opacity-100 transition-opacity self-center">
        <button @click="showMenu = !showMenu" class="p-1 hover:bg-gray-100 rounded text-gray-400" aria-label="메뉴">
          <MoreVertical class="w-4 h-4" />
        </button>
        
        <!-- Dropdown Menu (Only delete for host) -->
        <div v-if="showMenu" class="absolute bottom-full left-0 mb-1 w-24 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30">
          <button @click="handleDelete" class="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
            <Trash2 class="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
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

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
