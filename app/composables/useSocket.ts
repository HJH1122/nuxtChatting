import { io, type Socket } from 'socket.io-client'
import { ref, onMounted, onUnmounted } from 'vue'

export const useSocket = () => {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  onMounted(() => {
    socket.value = io()

    socket.value.on('connect', () => {
      isConnected.value = true
      console.log('Connected to socket')
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      console.log('Disconnected from socket')
    })
  })

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect()
    }
  })

  return {
    socket,
    isConnected
  }
}
