<script setup lang="ts">
import { Megaphone, X } from 'lucide-vue-next'

defineProps<{
  announcement?: string
  isHost?: boolean
}>()

const emit = defineEmits(['delete'])
const isVisible = ref(true)
</script>

<template>
  <div v-if="announcement && isVisible" class="bg-blue-50 border-b border-blue-100 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
    <div class="bg-blue-500 p-2 rounded-full text-white">
      <Megaphone class="w-4 h-4" />
    </div>
    <div class="flex-1 overflow-hidden">
      <p class="text-sm font-medium text-blue-900 truncate">
        {{ announcement }}
      </p>
    </div>
    <button 
      v-if="isHost"
      @click="emit('delete')" 
      class="text-blue-400 hover:text-blue-600 transition-colors"
      title="공지사항 삭제"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
