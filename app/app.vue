<script setup lang="ts">
import { Crown, Send } from 'lucide-vue'
import type { Message } from '~/types/chat'

const { socket, isConnected } = useSocket()
const roomId = ref('general')
const messageInput = ref('')
const messages = ref<Message[]>([])
const isHost = ref(true) // Mocking host status for now

const joinRoom = () => {
  if (socket.value && roomId.value) {
    socket.value.emit('join-room', roomId.value)
    messages.value = [] 
    // Simple Bot Welcome
    messages.value.push({
      id: 'bot-welcome',
      content: `Welcome to room: ${roomId.value}!`,
      senderId: 'bot',
      createdAt: new Date().toISOString()
    })
  }
}

const sendMessage = () => {
  if (socket.value && messageInput.value.trim()) {
    socket.value.emit('message', {
      roomId: roomId.value,
      content: messageInput.value
    })
    messageInput.value = ''
  }
}

onMounted(() => {
  // Listen for messages
  const checkSocket = setInterval(() => {
    if (socket.value) {
      socket.value.on('message', (msg: Message) => {
        messages.value.push(msg)
      })
      clearInterval(checkSocket)
    }
  }, 100)
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4 font-sans">
    <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-[80vh]">
      <!-- Header -->
      <div class="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold">Nuxt Chat</h1>
          <Crown v-if="isHost" class="w-5 h-5 text-yellow-400" />
        </div>
        <div class="flex items-center gap-2">
          <span :class="isConnected ? 'bg-green-400' : 'bg-red-400'" class="w-3 h-3 rounded-full"></span>
          <span class="text-sm">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
      </div>

      <!-- Room Selection -->
      <div class="p-4 bg-gray-50 border-b flex gap-2">
        <input 
          v-model="roomId" 
          type="text" 
          placeholder="Room ID" 
          class="flex-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        <button 
          @click="joinRoom" 
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition flex items-center gap-2"
        >
          Join Room
        </button>
      </div>

      <!-- Message List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="messages.length === 0" class="text-center text-gray-400 mt-10">
          No messages yet. Start chatting!
        </div>
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          class="flex flex-col"
          :class="msg.senderId === socket?.id ? 'items-end' : 'items-start'"
        >
          <div class="flex items-center gap-1 mb-1">
            <span class="text-xs text-gray-500">{{ msg.senderId === 'bot' ? 'Assistant' : (msg.senderId === socket?.id ? 'You' : 'User') }}</span>
          </div>
          <div 
            class="max-w-[80%] p-3 rounded-lg shadow-sm"
            :class="[
              msg.senderId === socket?.id ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-gray-200 text-gray-800 rounded-tl-none',
              msg.senderId === 'bot' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : ''
            ]"
          >
            <p>{{ msg.content }}</p>
            <span class="text-[10px] opacity-70 mt-1 block">
              {{ new Date(msg.createdAt).toLocaleTimeString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="p-4 border-t bg-gray-50">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <input 
            v-model="messageInput" 
            type="text" 
            placeholder="Type a message..." 
            class="flex-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button 
            type="submit" 
            class="bg-blue-500 text-white px-6 py-2 rounded font-bold hover:bg-blue-600 transition flex items-center gap-2"
            :disabled="!isConnected"
          >
            <Send class="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
