<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Send, Plus, Smile, Image as ImageIcon, BarChart2, Hash, X, FileText } from 'lucide-vue-next'

const message = ref('')
const emit = defineEmits(['send', 'typing', 'stop-typing'])

// -- 이모지 관련 상태 및 데이터 --
const showEmojiPicker = ref(false)
const activeCategory = ref('최근/인기')
const emojiPickerRef = ref<HTMLElement | null>(null)
const emojiButtonRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const emojiCategories = [
  {
    name: '최근/인기',
    emojis: ['😀', '😂', '🥰', '😍', '🤣', '😊', '🙏', '👍', '🔥', '👏', '🎉', '🚀', '❤️', '🤔', '👀', '😭']
  },
  {
    name: '얼굴/감정',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷']
  },
  {
    name: '제스처/사람',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾']
  },
  {
    name: '동물/자연',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑']
  },
  {
    name: '음식/음료',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫓', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🍟', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🏺']
  },
  {
    name: '하트/기호',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '📶', '📳', '📴', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '🚊', '🛑']
  }
]

const currentEmojis = computed(() => {
  const cat = emojiCategories.find(c => c.name === activeCategory.value)
  return cat ? cat.emojis : []
})

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value
}

const closeEmojiPicker = (e: MouseEvent) => {
  if (
    showEmojiPicker.value &&
    emojiPickerRef.value &&
    emojiButtonRef.value &&
    !emojiPickerRef.value.contains(e.target as Node) &&
    !emojiButtonRef.value.contains(e.target as Node)
  ) {
    showEmojiPicker.value = false
  }
}

const insertEmoji = (emoji: string) => {
  const el = textareaRef.value
  if (!el) {
    message.value += emoji
    return
  }

  const startPos = el.selectionStart
  const endPos = el.selectionEnd
  const text = message.value

  message.value = text.substring(0, startPos) + emoji + text.substring(endPos)
  
  nextTick(() => {
    el.focus()
    const newCursorPos = startPos + emoji.length
    el.setSelectionRange(newCursorPos, newCursorPos)
  })
}

onMounted(() => {
  window.addEventListener('click', closeEmojiPicker)
})

onUnmounted(() => {
  window.removeEventListener('click', closeEmojiPicker)
})

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

interface AttachedFile {
  name: string
  url: string
  type: string
  size: number
  fileExtension: string
}
const attachedFile = ref<AttachedFile | null>(null)

let typingTimeout: any = null

const removeAttachedFile = () => {
  attachedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleInput = () => {
  emit('typing')
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    emit('stop-typing')
  }, 2000)
}

const submit = () => {
  const trimmedMessage = message.value.trim()
  
  if (trimmedMessage === '/투표') {
    openPollModal()
    return
  }

  if (trimmedMessage === '/코드') {
    openCodeModal()
    return
  }

  if (trimmedMessage || attachedFile.value) {
    let msgType: 'text' | 'image' | 'file' | 'poll' = 'text'
    let attachmentData = undefined

    if (attachedFile.value) {
      const isImage = ['png', 'jpg', 'jpeg'].includes(attachedFile.value.fileExtension)
      msgType = isImage ? 'image' : 'file'
      attachmentData = {
        name: attachedFile.value.name,
        url: attachedFile.value.url,
        type: attachedFile.value.type,
        size: attachedFile.value.size
      }
    }

    emit('send', trimmedMessage, attachmentData, msgType)
    message.value = ''
    attachedFile.value = null
    emit('stop-typing')
    showEmojiPicker.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    if (e.ctrlKey) {
      e.preventDefault()
      return
    }
    if (e.shiftKey) {
      return
    }
    e.preventDefault()
    submit()
  }
}

const adjustHeight = () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

watch(message, () => {
  nextTick(() => {
    adjustHeight()
  })
})

const triggerFileInput = () => {
  if (isUploading.value) return
  fileInput.value?.click()
}

const onFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('파일 크기는 최대 10MB까지 허용됩니다.')
    target.value = ''
    return
  }

  // Validate extension
  const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg']
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allowedExtensions.includes(fileExtension)) {
    alert('PDF, PNG, JPG/JPEG 파일만 업로드할 수 있습니다.')
    target.value = ''
    return
  }

  try {
    isUploading.value = true
    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await $fetch<any>('/api/upload', {
      method: 'POST',
      body: formData
    })

    // Store in attachedFile state instead of emitting immediately
    attachedFile.value = {
      name: uploadRes.name,
      url: uploadRes.url,
      type: uploadRes.type,
      size: uploadRes.size,
      fileExtension: fileExtension
    }

  } catch (error: any) {
    console.error('File upload failed:', error)
    alert(error.statusMessage || '파일 업로드에 실패했습니다.')
  } finally {
    isUploading.value = false
    target.value = '' // Reset input
  }
}

// -- Poll State & Methods --
const showPollModal = ref(false)
const pollQuestion = ref('')
const pollOptions = ref<string[]>(['', ''])

const openPollModal = () => {
  showPollModal.value = true
  message.value = ''
}

const addPollOption = () => {
  pollOptions.value.push('')
}

const removePollOption = (index: number) => {
  if (pollOptions.value.length > 2) {
    pollOptions.value.splice(index, 1)
  }
}

const createPoll = () => {
  const q = pollQuestion.value.trim()
  const opts = pollOptions.value.map(o => o.trim()).filter(o => o !== '')

  if (!q) {
    alert('투표 질문을 입력해주세요.')
    return
  }
  if (opts.length < 2) {
    alert('최소 2개 이상의 선택 항목을 입력해주세요.')
    return
  }

  // send emit: content, attachment, type, pollData
  emit('send', '', undefined, 'poll', {
    question: q,
    options: opts
  })

  // Reset
  pollQuestion.value = ''
  pollOptions.value = ['', '']
  showPollModal.value = false
}

// -- Code Modal State & Methods --
const showCodeModal = ref(false)
const codeLanguage = ref('javascript')
const codeContent = ref('')

const openCodeModal = () => {
  showCodeModal.value = true
  codeContent.value = ''
  if (message.value.trim() === '/코드') {
    message.value = ''
  }
}

const insertCodeBlock = () => {
  const lang = codeLanguage.value
  const code = codeContent.value.trim()
  
  if (!code) {
    alert('코드를 입력해주세요.')
    return
  }

  const block = `\`\`\`${lang}\n${code}\n\`\`\``
  const el = textareaRef.value

  if (!el) {
    message.value = (message.value ? message.value + '\n' : '') + block
  } else {
    const startPos = el.selectionStart
    const endPos = el.selectionEnd
    const text = message.value
    
    const beforeText = text.substring(0, startPos)
    const afterText = text.substring(endPos)
    
    const prefix = beforeText && !beforeText.endsWith('\n') ? '\n' : ''
    const suffix = afterText && !afterText.startsWith('\n') ? '\n' : ''
    
    message.value = beforeText + prefix + block + suffix + afterText
    
    nextTick(() => {
      el.focus()
      const newCursorPos = startPos + prefix.length + block.length + suffix.length
      el.setSelectionRange(newCursorPos, newCursorPos)
    })
  }

  codeContent.value = ''
  showCodeModal.value = false
}
</script>

<template>
  <div class="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
    <div class="max-w-4xl mx-auto space-y-3">
      <!-- Toolbar -->
      <div class="flex items-center gap-1">
        <input 
          type="file" 
          ref="fileInput" 
          class="hidden" 
          accept=".pdf,.png,.jpg,.jpeg" 
          @change="onFileChange" 
        />
        <button 
          type="button"
          @click="triggerFileInput"
          :disabled="isUploading"
          class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50" 
          title="파일 첨부"
        >
          <Plus v-if="!isUploading" class="w-5 h-5" />
          <svg v-else class="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
        <button 
          type="button"
          @click="openPollModal"
          class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" 
          title="투표 생성"
        >
          <BarChart2 class="w-5 h-5" />
        </button>
        <div class="relative inline-block">
          <button 
            ref="emojiButtonRef"
            type="button"
            @click="toggleEmojiPicker"
            class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" 
            :class="{ 'bg-blue-50 text-blue-600': showEmojiPicker }"
            title="이모지"
          >
            <Smile class="w-5 h-5" />
          </button>
          
          <!-- 이모지 선택 피커 (Emoji Picker) -->
          <div 
            v-if="showEmojiPicker"
            ref="emojiPickerRef"
            class="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <!-- 카테고리 탭 -->
            <div class="flex border-b border-gray-100 bg-gray-50 p-1 overflow-x-auto shrink-0 select-none scrollbar-none">
              <button 
                v-for="category in emojiCategories" 
                :key="category.name"
                type="button"
                @click="activeCategory = category.name"
                class="px-2.5 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                :class="activeCategory === category.name ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
              >
                {{ category.name }}
              </button>
            </div>
            
            <!-- 이모지 그리드 -->
            <div class="flex-grow overflow-y-auto p-3 max-h-48 grid grid-cols-7 gap-1.5 custom-scrollbar bg-white">
              <button
                v-for="emoji in currentEmojis"
                :key="emoji"
                type="button"
                @click="insertEmoji(emoji)"
                class="w-7 h-7 flex items-center justify-center text-lg rounded-md hover:bg-gray-100 active:bg-gray-200 transition-all duration-100 hover:scale-125"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
        <div class="w-px h-4 bg-gray-200 mx-2"></div>
        <button 
          type="button"
          @click="openCodeModal"
          class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex items-center gap-1 text-xs font-bold" 
          title="코드 블록"
        >
          <Hash class="w-4 h-4" />
          CODE
        </button>
      </div>

      <!-- Attached File Preview -->
      <div v-if="attachedFile" class="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl animate-in fade-in slide-in-from-bottom-2">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 bg-white rounded-lg border border-gray-200 text-blue-600 flex-shrink-0">
            <ImageIcon v-if="['png', 'jpg', 'jpeg'].includes(attachedFile.fileExtension)" class="w-5 h-5" />
            <FileText v-else class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-gray-700 truncate">{{ attachedFile.name }}</p>
            <p class="text-[10px] font-medium text-gray-400">{{ (attachedFile.size / 1024).toFixed(1) }} KB</p>
          </div>
        </div>
        <button 
          type="button" 
          @click="removeAttachedFile"
          class="p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-colors"
          title="첨부 파일 삭제"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Input Area -->
      <form @submit.prevent="submit" class="relative flex items-end gap-2">
        <div class="flex-1 relative">
          <textarea
            ref="textareaRef"
            v-model="message"
            @input="handleInput"
            @keydown="handleKeyDown"
            placeholder="메시지를 입력하세요... (명령어: /도움말)"
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none min-h-[48px] max-h-32"
            rows="1"
          ></textarea>
          
          <!-- Bot Command Suggestions (Overlay - Mock) -->
          <div v-if="message.startsWith('/')" class="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div class="p-2 border-b bg-gray-50 text-[10px] font-bold text-gray-400 tracking-wider">사용 가능한 명령어</div>
            <div class="max-h-48 overflow-y-auto">
              <button 
                type="button"
                @click="message = '/도움말'; submit()"
                class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors"
              >
                <span class="font-bold text-blue-600">/도움말</span>
                <span class="text-gray-500 text-xs">명령어 목록 보기</span>
              </button>
              <button 
                type="button"
                @click="openPollModal"
                class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors"
              >
                <span class="font-bold text-blue-600">/투표</span>
                <span class="text-gray-500 text-xs">설문조사 생성</span>
              </button>
              <button 
                type="button"
                @click="message = '/방장'; submit()"
                class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors"
              >
                <span class="font-bold text-blue-600">/방장</span>
                <span class="text-gray-500 text-xs">현재 방장 정보 확인</span>
              </button>
              <button 
                type="button"
                @click="openCodeModal"
                class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors"
              >
                <span class="font-bold text-blue-600">/코드</span>
                <span class="text-gray-500 text-xs">마크다운 코드 블록 삽입</span>
              </button>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          :disabled="!message.trim() && !attachedFile"
          class="mb-1 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          <Send class="w-5 h-5" />
        </button>
      </form>
    </div>
  </div>

  <!-- Poll Creation Modal -->
  <div v-if="showPollModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="bg-white rounded-[2rem] w-full max-w-md p-8 border border-gray-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-black text-gray-900 flex items-center gap-2">
            <BarChart2 class="w-5 h-5 text-blue-600" />
            새 투표 만들기
          </h3>
          <p class="text-xs text-gray-400 font-medium mt-1">질문과 선택항목을 입력하여 투표를 생성하세요.</p>
        </div>
        <button type="button" @click="showPollModal = false" class="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <div class="space-y-4">
        <!-- Question Input -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">질문</label>
          <input 
            v-model="pollQuestion"
            type="text" 
            placeholder="무엇에 대해 투표할까요?" 
            class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        <!-- Options Input -->
        <div class="space-y-2">
          <div class="flex justify-between items-center ml-1">
            <label class="text-xs font-bold text-gray-400 uppercase tracking-widest">선택 항목</label>
            <button 
              type="button" 
              @click="addPollOption" 
              class="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              + 항목 추가
            </button>
          </div>
          
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div 
              v-for="(option, index) in pollOptions" 
              :key="index"
              class="flex items-center gap-2"
            >
              <input 
                v-model="pollOptions[index]"
                type="text" 
                :placeholder="`옵션 ${index + 1}`" 
                class="flex-grow bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button 
                v-if="pollOptions.length > 2"
                type="button" 
                @click="removePollOption(index)"
                class="p-3 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-2xl transition-colors"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex flex-col gap-2 pt-2">
        <button 
          type="button"
          @click="createPoll"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
        >
          투표 올리기
        </button>
        <button 
          type="button"
          @click="showPollModal = false"
          class="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98]"
        >
          취소
        </button>
      </div>
    </div>
  </div>

  <!-- Code Block Insertion Modal -->
  <div v-if="showCodeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="bg-white rounded-[2rem] w-full max-w-lg p-8 border border-gray-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-xl font-black text-gray-900 flex items-center gap-2">
            <Hash class="w-5 h-5 text-blue-600" />
            코드 블록 삽입
          </h3>
          <p class="text-xs text-gray-400 font-medium mt-1">프로그래밍 언어를 선택하고 코드를 입력하세요.</p>
        </div>
        <button type="button" @click="showCodeModal = false" class="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Language Selection -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">언어 선택</label>
          <select 
            v-model="codeLanguage"
            class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
            <option value="sql">SQL</option>
            <option value="plaintext">Plain Text</option>
          </select>
        </div>

        <!-- Code Input -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">코드 내용</label>
          <textarea
            v-model="codeContent"
            rows="8"
            placeholder="여기에 코드를 입력하거나 붙여넣으세요..."
            class="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-mono placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          ></textarea>
        </div>
      </div>

      <div class="flex flex-col gap-2 pt-2">
        <button 
          type="button"
          @click="insertCodeBlock"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
        >
          코드 삽입하기
        </button>
        <button 
          type="button"
          @click="showCodeModal = false"
          class="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98]"
        >
          취소
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 가로 스크롤바 감추기 */
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* 세로 스크롤바 커스텀 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
