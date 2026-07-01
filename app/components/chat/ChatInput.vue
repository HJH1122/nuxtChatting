<script setup lang="ts">
import { Send, Plus, Smile, Image as ImageIcon, BarChart2, Hash, X, FileText } from 'lucide-vue-next'

const message = ref('')
const emit = defineEmits(['send', 'typing', 'stop-typing'])

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
  if (trimmedMessage || attachedFile.value) {
    let msgType: 'text' | 'image' | 'file' = 'text'
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
  }
}

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
        <button class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="투표 생성">
          <BarChart2 class="w-5 h-5" />
        </button>
        <button class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="이모지">
          <Smile class="w-5 h-5" />
        </button>
        <div class="w-px h-4 bg-gray-200 mx-2"></div>
        <button class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex items-center gap-1 text-xs font-bold" title="코드 블록">
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
            v-model="message"
            @input="handleInput"
            @keydown.enter.prevent="submit"
            placeholder="메시지를 입력하세요... (명령어: /도움말)"
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none min-h-[48px] max-h-32"
            rows="1"
          ></textarea>
          
          <!-- Bot Command Suggestions (Overlay - Mock) -->
          <div v-if="message.startsWith('/')" class="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div class="p-2 border-b bg-gray-50 text-[10px] font-bold text-gray-400 tracking-wider">사용 가능한 명령어</div>
            <div class="max-h-48 overflow-y-auto">
              <button class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
                <span class="font-bold text-blue-600">/도움말</span>
                <span class="text-gray-500 text-xs">명령어 목록 보기</span>
              </button>
              <button class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
                <span class="font-bold text-blue-600">/투표</span>
                <span class="text-gray-500 text-xs">설문조사 생성</span>
              </button>
              <button class="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 transition-colors">
                <span class="font-bold text-blue-600">/방장</span>
                <span class="text-gray-500 text-xs">현재 방장 정보 확인</span>
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
</template>
