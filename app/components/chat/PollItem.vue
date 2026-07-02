<script setup lang="ts">
import type { Poll } from '~/types/chat'
import { Check } from 'lucide-vue-next'

const props = defineProps<{
  poll: Poll
  currentUserId: string
}>()

const emit = defineEmits<{
  (e: 'vote', optionId: string): void
}>()

const selectedOption = computed(() => {
  const option = props.poll.options.find(opt => opt.voters?.includes(props.currentUserId))
  return option ? option.id : null
})

const handleVote = (optionId: string) => {
  emit('vote', optionId)
}

const getPercentage = (votes: number) => {
  if (props.poll.totalVotes === 0) return 0
  return Math.round((votes / props.poll.totalVotes) * 100)
}
</script>

<template>
  <div class="bg-white border rounded-xl p-4 shadow-sm space-y-4 max-w-sm">
    <div class="space-y-1">
      <h4 class="font-bold text-gray-900">{{ poll.question }}</h4>
      <p class="text-xs text-gray-500">{{ poll.totalVotes }} votes</p>
    </div>

    <div class="space-y-2">
      <button
        v-for="option in poll.options"
        :key="option.id"
        class="w-full relative h-10 rounded-lg border text-left px-3 overflow-hidden transition-all hover:border-blue-300"
        :class="selectedOption === option.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'"
        @click="handleVote(option.id)"
      >
        <!-- Progress Background -->
        <div 
          class="absolute left-0 top-0 h-full bg-blue-50 transition-all duration-500 ease-out"
          :style="{ width: `${getPercentage(option.votes)}%` }"
        ></div>

        <!-- Content -->
        <div class="relative z-10 flex justify-between items-center h-full">
          <span class="text-sm font-medium" :class="selectedOption === option.id ? 'text-blue-700' : 'text-gray-700'">
            {{ option.text }}
          </span>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-500">{{ getPercentage(option.votes) }}%</span>
            <Check v-if="selectedOption === option.id" class="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
