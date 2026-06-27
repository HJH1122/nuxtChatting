import { io, type Socket } from 'socket.io-client'
import { ref, onMounted, onUnmounted } from 'vue'

export const useSocket = () => {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)

  onMounted(() => {
    // 개발 환경에서는 3001 포트를 바라보게 하고, 상용 배포 시에는 기본 Origin을 타도록 합니다.
    const socketUrl = import.meta.dev ? 'http://localhost:3001' : ''
    socket.value = io(socketUrl)

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

