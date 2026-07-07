<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { User } from '~/types/chat'
import { Crown, MoreHorizontal, UserMinus, ShieldAlert } from 'lucide-vue-next'

defineProps<{
  users: User[]
  isHost: boolean
}>()

const emit = defineEmits(['kick', 'transfer'])

const activeDropdownUserId = ref<string | null>(null)

const toggleDropdown = (userId: string, event: Event) => {
  event.stopPropagation()
  if (activeDropdownUserId.value === userId) {
    activeDropdownUserId.value = null
  } else {
    activeDropdownUserId.value = userId
  }
}

const closeDropdown = () => {
  activeDropdownUserId.value = null
}

onMounted(() => {
  window.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <div class="w-64 border-l bg-gray-50 flex flex-col">
    <div class="p-4 border-b bg-white flex items-center justify-between">
      <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">
        접속자 목록
        <span class="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{{ users.length }}</span>
      </h3>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div 
        v-for="(user, index) in users" 
        :key="user.id + '-' + index"
        class="group flex items-center justify-between p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-default"
      >
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
              {{ user.name.charAt(0) }}
            </div>
            <div 
              class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-50 bg-green-500"
              :class="user.isTyping ? 'animate-pulse' : ''"
            ></div>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-1">
              <span class="text-sm font-medium text-gray-800">{{ user.name }}</span>
              <Crown v-if="user.isHost" class="w-3.5 h-3.5 text-yellow-500" />
            </div>
            <span v-if="user.isTyping" class="text-[10px] text-blue-500 italic">입력 중...</span>
          </div>
        </div>

        <!-- Host Actions -->
        <div v-if="isHost && !user.isHost" class="relative">
          <div class="opacity-0 group-hover:opacity-100 transition-opacity" :class="{ 'opacity-100': activeDropdownUserId === user.id }">
            <button 
              @click="toggleDropdown(user.id, $event)"
              class="p-1 hover:bg-gray-100 rounded text-gray-400" 
              title="관리"
            >
              <MoreHorizontal class="w-4 h-4" />
            </button>
          </div>

          <!-- Dropdown Menu -->
          <div 
            v-if="activeDropdownUserId === user.id" 
            class="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
            @click.stop
          >
            <button 
              @click="emit('kick', user.id); activeDropdownUserId = null"
              class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 font-medium transition-colors"
            >
              <UserMinus class="w-3.5 h-3.5" />
              강제 퇴장
            </button>
            <button 
              @click="emit('transfer', user.id); activeDropdownUserId = null"
              class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Crown class="w-3.5 h-3.5 text-yellow-500" />
              방장 위임
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Info -->
    <div class="p-4 border-t bg-white">
      <div class="flex items-center gap-2 text-[10px] text-gray-400">
        <ShieldAlert class="w-3 h-3" />
        <span>부적절한 발언은 자제해 주세요.</span>
      </div>
    </div>
  </div>
</template>
