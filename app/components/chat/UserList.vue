<script setup lang="ts">
import type { User } from '~/types/chat'
import { Crown, MoreHorizontal, UserMinus, ShieldAlert } from 'lucide-vue-next'

defineProps<{
  users: User[]
  isHost: boolean
}>()

const emit = defineEmits(['kick', 'transfer'])
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
        <div v-if="isHost && !user.isHost" class="opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="p-1 hover:bg-gray-100 rounded text-gray-400" title="관리">
            <MoreHorizontal class="w-4 h-4" />
          </button>
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
