<script setup lang="ts">
import { Send, Plus, Smile, Image as ImageIcon, BarChart2, Hash } from 'lucide-vue-next'

const message = ref('')
const emit = defineEmits(['send', 'typing', 'stop-typing'])

let typingTimeout: any = null

const handleInput = () => {
  emit('typing')
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    emit('stop-typing')
  }, 2000)
}

const submit = () => {
  if (message.value.trim()) {
    emit('send', message.value)
    message.value = ''
    emit('stop-typing')
  }
}
</script>

<template>
  <div class="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
    <div class="max-w-4xl mx-auto space-y-3">
      <!-- Toolbar -->
      <div class="flex items-center gap-1">
        <button class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="파일 첨부">
          <Plus class="w-5 h-5" />
        </button>
        <button class="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="이미지">
          <ImageIcon class="w-5 h-5" />
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
          :disabled="!message.trim()"
          class="mb-1 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          <Send class="w-5 h-5" />
        </button>
      </form>
    </div>
  </div>
</template>
