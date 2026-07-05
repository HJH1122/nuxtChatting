<script setup lang="ts">
import { 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  RefreshCw, 
  PlusCircle,
  MessageSquare
} from 'lucide-vue-next'
import type { Message, User, Room } from '~/types/chat'
import AnnouncementBar from '~/components/chat/AnnouncementBar.vue'
import MessageItem from '~/components/chat/MessageItem.vue'
import UserList from '~/components/chat/UserList.vue'
import ChatInput from '~/components/chat/ChatInput.vue'

// -- State --
const isLoggedIn = ref(false)
const inputNickname = ref('')
const isLobby = ref(true)
const isCreatingRoom = ref(false)
const showUserList = ref(true)
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<Message[]>([])
const currentSearchIndex = ref(-1)
const messagesContainer = ref<HTMLElement | null>(null)
const isLoadingMore = ref(false)
const hasMoreMessages = ref(true)
let searchTimeout: any = null

// -- Socket.io Composable --
const { socket } = useSocket()

// -- Chat State --
const currentUser = ref<User>({ id: '', name: '' })
const newRoomTitle = ref('')
const rooms = ref<Room[]>([]);
const activeRoom = ref<Room | null>(null);
const onlineUsers = ref<User[]>([]);
// 메시지는 이제 초기 로드 시 빈 배열로 시작합니다.
const messages = ref<Message[]>([]);
// -- Methods --
const fetchRooms = async () => {
  try {
    const data = await $fetch<Room[]>('/api/rooms')
    rooms.value = data
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
  }
}

const handleLogin = async () => {
  if (!inputNickname.value.trim()) return
  
  try {
    const user = await $fetch<any>('/api/users', {
      method: 'POST',
      body: { name: inputNickname.value.trim() }
    })
    
    currentUser.value = {
      id: user.id,
      name: user.name,
      isHost: false
    }

    onlineUsers.value = []
    
    await fetchRooms()
    isLoggedIn.value = true
  } catch (error) {
    console.error('Login failed:', error)
  }
}

onMounted(async () => {
  await fetchRooms()
})

const fetchMessages = async (roomId: string) => {
  try {
    const data = await $fetch<{ messages: Message[], hasMore: boolean }>('/api/messages', {
      query: { roomId }
    })
    messages.value = data.messages
    hasMoreMessages.value = data.hasMore !== false
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  } catch (error) {
    console.error('Failed to fetch messages:', error)
  }
}

watch(socket, (newSocket) => {
  if (newSocket) {
    newSocket.on('room-created', (room: Room) => {
      if (!rooms.value.some(r => r.id === room.id)) {
        rooms.value.unshift(room)
      }
    })

    newSocket.on('online-users', (users: User[]) => {
      console.log('Received online users:', users)
      onlineUsers.value = users
    })

    newSocket.on('message', (message: Message) => {
      console.log('Received live message:', message)
      messages.value.push(message)
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    })

    newSocket.on('poll-updated', (updatedPoll: any) => {
      console.log('Received poll update:', updatedPoll)
      const msg = messages.value.find(m => m.poll && m.poll.id === updatedPoll.id)
      if (msg) {
        msg.poll = updatedPoll
      }
    })
  }
}, { immediate: true })

const enterRoom = async (room: Room) => {
  activeRoom.value = room
  isLobby.value = false
  isSearching.value = false
  hasMoreMessages.value = true
  
  // 방의 creatorId와 현재 로그인한 유저의 id가 일치하는지 비교하여 방장(isHost) 여부를 판단합니다.
  const isHost = room.creatorId === currentUser.value.id
  currentUser.value.isHost = isHost
  
  // 1. 방에 존재하는 과거 대화 내용 불러오기
  await fetchMessages(room.id)

  // 2. 소켓 조인 요청
  if (socket.value) {
    socket.value.emit('join-room', {
      roomId: room.id,
      user: {
        id: currentUser.value.id,
        name: currentUser.value.name,
        isHost: isHost
      }
    })
  }
}

const leaveRoom = () => {
  if (socket.value && activeRoom.value) {
    socket.value.emit('leave-room', activeRoom.value.id)
  }
  isLobby.value = true
  activeRoom.value = null
  onlineUsers.value = []
  messages.value = [] // 대화방을 나갈 때 메시지 목록을 초기화합니다.
  isSearching.value = false
}

const goToCreateRoom = () => {
  isCreatingRoom.value = true
  isLobby.value = false
}

const cancelCreateRoom = () => {
  isCreatingRoom.value = false
  isLobby.value = true
  newRoomTitle.value = ''
}

const handleCreateRoom = async () => {
  if (!newRoomTitle.value.trim()) return

  try {
    const room = await $fetch<Room>('/api/rooms', {
      method: 'POST',
      body: {
        name: newRoomTitle.value.trim(),
        creatorId: currentUser.value.id
      }
    })

    if (socket.value) {
      socket.value.emit('room-created', room)
    }

    newRoomTitle.value = ''
    isCreatingRoom.value = false
    isLobby.value = true
    
    await fetchRooms()
  } catch (error) {
    console.error('Failed to create room:', error)
  }
}

const handleSendMessage = (content: string, attachment?: any, type: 'text' | 'image' | 'file' | 'poll' = 'text', pollData?: any) => {
  if ((!content.trim() && !attachment && !pollData) || !activeRoom.value || !socket.value) return

  const trimmedContent = content.trim()

  // 챗봇 명령어 처리 (로컬 도우미 메시지)
  if (trimmedContent === '/도움말') {
    messages.value.push({
      id: `msg-help-${Date.now()}`,
      senderId: 'bot',
      senderName: 'Assistant',
      content: `🤖 [사용 가능한 명령어 안내]
• /도움말 : 사용 가능한 명령어 목록 안내
• /방장 : 현재 채팅방의 방장 정보 확인
• /투표 : 설문조사 생성 폼 호출
• /코드 : 마크다운 코드 블록 삽입`,
      type: 'system',
      createdAt: new Date().toISOString()
    })
    return
  }

  if (trimmedContent === '/방장') {
    const hostUser = onlineUsers.value.find(u => u.isHost)
    const hostName = hostUser ? hostUser.name : '지정된 방장이 없거나 오프라인'
    messages.value.push({
      id: `msg-host-${Date.now()}`,
      senderId: 'bot',
      senderName: 'Assistant',
      content: `👑 현재 채팅방의 방장은 '${hostName}'입니다.`,
      type: 'system',
      createdAt: new Date().toISOString()
    })
    return
  }

  // 1. 소켓을 통해 메시지를 전송합니다 (서버 단에서 DB에 저장한 후 방의 모든 인원에게 브로드캐스트함).
  socket.value.emit('message', {
    roomId: activeRoom.value.id,
    content: trimmedContent,
    attachment,
    type,
    poll: pollData
  })
  
  // Fake bot response for search demonstration
  if (content && content.includes('검색')) {
    setTimeout(() => {
      messages.value.push({
        id: `msg-bot-${Date.now()}`,
        senderId: 'bot',
        senderName: 'Assistant',
        content: '상단 돋보기 아이콘을 클릭하여 과거 메시지를 검색할 수 있습니다.',
        type: 'system',
        createdAt: new Date().toISOString()
      })
    }, 500)
  }
}

const handleVote = (pollId: string, optionId: string) => {
  if (!socket.value || !activeRoom.value || !currentUser.value.id) return
  
  socket.value.emit('vote', {
    roomId: activeRoom.value.id,
    pollId,
    optionId,
    userId: currentUser.value.id
  })
}

const handleRefresh = async () => {
  await fetchRooms()
}

const handleLogout = () => {
  if (socket.value && activeRoom.value) {
    socket.value.emit('leave-room', activeRoom.value.id)
  }
  isLoggedIn.value = false
  currentUser.value = { id: '', name: '' }
  inputNickname.value = ''
  isLobby.value = true
  isCreatingRoom.value = false
  activeRoom.value = null
  onlineUsers.value = []
  messages.value = []
}

const formatDateSeparator = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const date = d.getDate()
  const dayOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][d.getDay()]
  return `${year}년 ${month}월 ${date}일 ${dayOfWeek}`
}

const shouldShowDateSeparator = (msg: Message, index: number) => {
  if (!msg.createdAt) return false
  if (index === 0) return true
  const prevMsg = messages.value[index - 1]
  if (!prevMsg || !prevMsg.createdAt) return true
  
  const currDate = new Date(msg.createdAt).toDateString()
  const prevDate = new Date(prevMsg.createdAt).toDateString()
  
  if (currDate === 'Invalid Date' || prevDate === 'Invalid Date') {
    return false
  }
  
  return currDate !== prevDate
}

const searchMessages = async () => {
  if (!activeRoom.value || !searchQuery.value.trim()) {
    searchResults.value = []
    currentSearchIndex.value = -1
    return
  }
  
  try {
    const data = await $fetch<{ messages: Message[], count: number }>('/api/messages/search', {
      query: {
        roomId: activeRoom.value.id,
        q: searchQuery.value.trim()
      }
    })
    searchResults.value = data.messages
    if (data.messages.length > 0) {
      currentSearchIndex.value = data.messages.length - 1
      await scrollToMessage(data.messages[currentSearchIndex.value].id)
    } else {
      currentSearchIndex.value = -1
    }
  } catch (error) {
    console.error('Failed to search messages:', error)
  }
}

const scrollToMessage = async (messageId: string) => {
  let attempts = 0
  const maxAttempts = 10
  
  while (!messages.value.some(m => m.id === messageId) && attempts < maxAttempts) {
    attempts++
    if (messages.value.length === 0) break
    const oldestMessageId = messages.value[0].id
    
    try {
      const data = await $fetch<{ messages: Message[], count: number, hasMore: boolean }>('/api/messages', {
        query: { 
          roomId: activeRoom.value?.id, 
          afterMessageId: oldestMessageId,
          limit: 20
        }
      })
      
      if (data.messages && data.messages.length > 0) {
        messages.value = [...data.messages, ...messages.value]
      } else {
        break
      }
    } catch (error) {
      console.error('Failed to load older messages for search target:', error)
      break
    }
  }

  nextTick(() => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      console.warn(`Message element with id ${messageId} not found.`)
    }
  })
}

const goToPrevSearchResult = () => {
  if (searchResults.value.length === 0) return
  if (currentSearchIndex.value > 0) {
    currentSearchIndex.value--
  } else {
    currentSearchIndex.value = searchResults.value.length - 1
  }
  scrollToMessage(searchResults.value[currentSearchIndex.value].id)
}

const goToNextSearchResult = () => {
  if (searchResults.value.length === 0) return
  if (currentSearchIndex.value < searchResults.value.length - 1) {
    currentSearchIndex.value++
  } else {
    currentSearchIndex.value = 0
  }
  scrollToMessage(searchResults.value[currentSearchIndex.value].id)
}

const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchMessages()
  }, 300)
}

const loadOlderMessages = async () => {
  if (isLoadingMore.value || !hasMoreMessages.value || !activeRoom.value || messages.value.length === 0) return
  isLoadingMore.value = true
  
  const oldestMessageId = messages.value[0].id
  
  try {
    const data = await $fetch<{ messages: Message[], count: number, hasMore: boolean }>('/api/messages', {
      query: { 
        roomId: activeRoom.value.id, 
        afterMessageId: oldestMessageId,
        limit: 20
      }
    })
    
    if (data.messages && data.messages.length > 0) {
      const container = messagesContainer.value
      const previousScrollHeight = container ? container.scrollHeight : 0
      
      messages.value = [...data.messages, ...messages.value]
      hasMoreMessages.value = data.hasMore
      
      nextTick(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight
        }
      })
    } else {
      hasMoreMessages.value = false
    }
  } catch (error) {
    console.error('Failed to load older messages:', error)
  } finally {
    isLoadingMore.value = false
  }
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.scrollTop <= 10) {
    loadOlderMessages()
  }
}

watch(isSearching, (val) => {
  if (!val) {
    searchQuery.value = ''
    searchResults.value = []
    currentSearchIndex.value = -1
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-700">
    <!-- Login View -->
    <div v-if="!isLoggedIn" class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-white">
      <div class="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <div class="text-center mb-10 space-y-3">
          <div class="inline-flex bg-blue-600 p-4 rounded-[2rem] shadow-2xl shadow-blue-200 mb-4">
            <MessageSquare class="w-10 h-10 text-white" />
          </div>
          <h1 class="text-4xl font-black tracking-tight text-gray-900">Nuxt Chat</h1>
          <p class="text-gray-500 font-medium">실시간 채팅 서비스에 참여하기 위해<br/>닉네임을 입력해주세요.</p>
        </div>

        <div class="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-blue-100/50 border border-white space-y-6">
          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Nickname</label>
            <input 
              v-model="inputNickname"
              type="text" 
              placeholder="멋진 이름을 정해주세요" 
              class="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-lg font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
              @keyup.enter="handleLogin"
            />
          </div>
          <button 
            @click="handleLogin"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] group"
          >
            채팅 시작하기
            <span class="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
        
        <p class="text-center mt-8 text-xs font-bold text-gray-300 uppercase tracking-widest">
          Build with Nuxt 4 & Socket.io
        </p>
      </div>
    </div>

    <!-- Lobby View -->
    <div v-else-if="isLobby" class="max-w-5xl mx-auto py-12 px-6 animate-in fade-in zoom-in-95 duration-500">
      <header class="flex justify-between items-end mb-12">
        <div class="space-y-2">
          <h1 class="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <div class="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-200">
              <MessageSquare class="w-8 h-8 text-white" />
            </div>
            Nuxt Chat
          </h1>
          <p class="text-gray-500 font-medium">실시간으로 소통하고 아이디어를 공유하세요.</p>
        </div>
        <div class="flex items-center gap-4">
          <button @click="handleLogout" class="flex items-center gap-2 text-gray-400 hover:text-red-500 font-bold transition-colors group">
            <LogOut class="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            로그아웃
          </button>
          <button @click="goToCreateRoom" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-blue-100 transition-all flex items-center gap-2 active:scale-95">
            <PlusCircle class="w-5 h-5" />
            방 만들기
          </button>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Room Cards -->
        <div 
          v-for="room in rooms" 
          :key="room.id"
          class="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-50 hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between h-48"
          @click="enterRoom(room)"
        >
          <div>
            <div class="flex justify-between items-start mb-4">
              <div class="bg-gray-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users class="w-6 h-6" />
              </div>
            </div>
            <h3 class="text-lg font-bold text-gray-800">{{ room.name }}</h3>
          </div>
          <div class="flex items-center justify-between mt-4">
            <div class="flex -space-x-2">
              <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-white bg-gray-200"></div>
              <div class="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">+12</div>
            </div>
            <span class="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">입장하기 →</span>
          </div>
        </div>

        <!-- Refresh Card -->
        <button @click="handleRefresh" class="bg-white/50 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 p-6 text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
          <RefreshCw class="w-8 h-8" />
          <span class="font-bold text-sm">목록 새로고침</span>
        </button>
        <div class="text-center mt-4 flex items-center gap-2">
            <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2l2-2m" /></svg>

        </div>
      </div>
    </div>

    <!-- Create Room View -->
    <div v-else-if="isCreatingRoom" class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-white animate-in fade-in zoom-in-95 duration-500">
      <div class="w-full max-w-md">
        <div class="text-center mb-10 space-y-3">
          <div class="inline-flex bg-blue-600 p-4 rounded-[2rem] shadow-2xl shadow-blue-200 mb-4">
            <PlusCircle class="w-10 h-10 text-white" />
          </div>
          <h1 class="text-4xl font-black tracking-tight text-gray-900">새 채팅방 만들기</h1>
          <p class="text-gray-500 font-medium">함께 대화할 새로운 공간의<br/>이름을 정해주세요.</p>
        </div>

        <div class="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-blue-100/50 border border-white space-y-6">
          <div class="space-y-2">
            <label class="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Room Title</label>
            <input 
              v-model="newRoomTitle"
              type="text" 
              placeholder="예: 맛집 탐방, 개발 공부 등" 
              class="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-lg font-bold placeholder:text-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
              @keyup.enter="handleCreateRoom"
            />
          </div>
          
          <div class="flex flex-col gap-3">
            <button 
              @click="handleCreateRoom"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              방 만들기
            </button>
            <button 
              @click="cancelCreateRoom"
              class="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Room View -->
    <div v-else class="h-screen flex flex-col bg-white overflow-hidden animate-in slide-in-from-right duration-500">
      <!-- Header -->
      <header class="h-16 border-b flex items-center justify-between px-6 shrink-0 z-10 bg-white/80 backdrop-blur-md">
        <div class="flex items-center gap-4">
          <button @click="leaveRoom" class="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
            <LogOut class="w-5 h-5 -scale-x-100" />
          </button>
          <div class="w-px h-6 bg-gray-200"></div>
          <div>
            <h2 class="text-lg font-black text-gray-900 flex items-center gap-2">
              {{ activeRoom?.name }}
            </h2>
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div v-if="isSearching" class="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
            <div class="relative flex items-center">
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="메시지 검색..." 
                class="bg-gray-100 border-none rounded-xl pl-4 pr-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 w-64"
                @input="onSearchInput"
                @keyup.enter="goToNextSearchResult"
                @keyup.esc="isSearching = false"
              />
              <button @click="isSearching = false" class="absolute right-3 text-gray-400 hover:text-gray-600">
                <PlusCircle class="w-4 h-4 rotate-45" />
              </button>
            </div>
            
            <!-- Search Navigation Controls -->
            <div v-if="searchResults.length > 0" class="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1 text-xs text-gray-500">
              <span class="font-bold text-gray-700">{{ currentSearchIndex + 1 }}</span>
              <span class="text-gray-300">/</span>
              <span>{{ searchResults.length }}</span>
              <div class="w-px h-3.5 bg-gray-200 mx-1"></div>
              <button @click="goToPrevSearchResult" class="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors" title="이전 결과 (위로)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button @click="goToNextSearchResult" class="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors" title="다음 결과 (아래로)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
            <div v-else-if="searchQuery.trim()" class="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
              검색 결과 없음
            </div>
          </div>
          <button 
            v-else
            @click="isSearching = true" 
            class="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
          >
            <Search class="w-5 h-5" />
          </button>
          

          
          <button 
            @click="showUserList = !showUserList"
            class="p-2.5 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors md:hidden"
          >
            <Users class="w-5 h-5" />
          </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden relative">
        <!-- Main Chat Area -->
        <div class="flex-1 flex flex-col overflow-hidden bg-[#FBFBFC]">
          <!-- Announcement Bar -->
          <AnnouncementBar 
            :announcement="activeRoom?.announcement" 
            :isHost="currentUser.isHost" 
          />

          <!-- Messages -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 space-y-2" @scroll="handleScroll">
            <!-- Messages List with Dynamic Date Separators -->
            <template v-for="(msg, index) in messages" :key="msg.id">
              <div v-if="shouldShowDateSeparator(msg, index)" class="text-center py-4 select-none">
                <span class="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.15em] bg-gray-100/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gray-200/30 shadow-sm">
                  {{ formatDateSeparator(msg.createdAt) }}
                </span>
              </div>

              <MessageItem
                  :message="msg"
                  :isOwn="msg.senderId === currentUser.id"
                  :currentUserId="currentUser.id"
                  :isHighlighted="searchResults.length > 0 && currentSearchIndex >= 0 && searchResults[currentSearchIndex].id === msg.id"
                  :data-message-id="msg.id"
                  @vote="handleVote"
              />
            </template>

            <!-- Typing Indicators -->
            <div class="px-6 h-6 flex items-center gap-2">
              <div v-if="onlineUsers.some(u => u.isTyping && u.id !== currentUser.id)" class="flex items-center gap-2">
                <div class="flex gap-1">
                  <span class="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
                  <span class="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span class="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">누군가 입력 중...</span>
              </div>
            </div>
          </div>
          <!-- Input Area -->
          <ChatInput @send="handleSendMessage" />
        </div>

        <!-- Right Sidebar (Users) -->
        <UserList 
          v-if="showUserList" 
          :users="onlineUsers" 
          :isHost="currentUser.isHost"
          class="absolute right-0 top-0 bottom-0 z-20 md:static md:flex"
        />
      </div>
    </div>
  </div>

</template>

<style>
/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.1);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
