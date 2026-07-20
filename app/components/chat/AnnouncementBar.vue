<script setup lang="ts">
import { ref, watch } from 'vue'
import { Megaphone, X, Edit2, Check, Plus } from 'lucide-vue-next'

const props = defineProps<{
  announcement?: string | null
  isHost?: boolean
}>()

const emit = defineEmits(['update', 'delete'])

const isEditing = ref(false)
const editText = ref('')

watch(() => props.announcement, (newVal) => {
  editText.value = newVal || ''
}, { immediate: true })

const startEdit = () => {
  editText.value = props.announcement || ''
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editText.value = props.announcement || ''
}

const saveEdit = () => {
  if (editText.value.trim() !== props.announcement) {
    emit('update', editText.value.trim())
  }
  isEditing.value = false
}
</script>

<template>
  <div 
    v-if="announcement || isHost" 
    class="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top duration-300"
  >
    <div class="bg-blue-500 p-2 rounded-xl text-white shrink-0 shadow-sm shadow-blue-200 mt-0.5">
      <Megaphone class="w-4 h-4" />
    </div>

    <!-- 1. Edit Mode -->
    <div v-if="isEditing" class="flex-1 flex items-start gap-2">
      <textarea 
        v-model="editText"
        placeholder="공지사항을 입력하세요... (Ctrl+Enter로 저장)" 
        rows="2"
        class="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-sm font-medium text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-300 resize-y min-h-[40px] font-sans"
        @keydown.enter.ctrl="saveEdit"
        @keydown.enter.meta="saveEdit"
        @keyup.esc="cancelEdit"
        autofocus
      />
      <div class="flex items-center gap-1 shrink-0 mt-1">
        <button 
          @click="saveEdit" 
          class="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          title="저장 (Ctrl+Enter)"
        >
          <Check class="w-4 h-4" />
        </button>
        <button 
          @click="cancelEdit" 
          class="p-1.5 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"
          title="취소 (Esc)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 2. Read Mode - Announcement Exists -->
    <div v-else-if="announcement" class="flex-1 flex items-start justify-between gap-4 overflow-hidden">
      <div class="flex-1 overflow-hidden min-w-0">
        <p class="text-sm font-semibold text-blue-900 whitespace-pre-wrap break-words leading-relaxed pt-1">
          {{ announcement }}
        </p>
      </div>
      <div v-if="isHost" class="flex items-center gap-2 shrink-0 mt-0.5">
        <button 
          @click="startEdit" 
          class="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
          title="공지사항 수정"
        >
          <Edit2 class="w-4 h-4" />
        </button>
        <button 
          @click="emit('delete')" 
          class="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
          title="공지사항 삭제"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 3. Read Mode - No Announcement (Host view to suggest creation) -->
    <div v-else-if="isHost" class="flex-1 flex items-center justify-between gap-4 pt-1">
      <p class="text-sm font-medium text-blue-400">
        등록된 공지사항이 없습니다. 공지를 등록하여 모든 멤버에게 고정해 보세요.
      </p>
      <button 
        @click="startEdit" 
        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1 shrink-0"
      >
        <Plus class="w-3.5 h-3.5" />
        공지 등록
      </button>
    </div>
  </div>
</template>
