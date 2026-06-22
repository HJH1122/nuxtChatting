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
const lastRefreshed = ref('')
const inputNickname = ref('')
const isLobby = ref(true)
const isCreatingRoom = ref(false)
const showUserList = ref(true)
const searchQuery = ref('')
const isSearching = ref(false)

// -- Socket.io Composable --
const { socket } = useSocket()

// -- Chat State --
const currentUser = ref<User>({ id: '', name: '' })
const newRoomTitle = ref('')
const rooms = ref<Room[]>([])
const activeRoom = ref<Room | null>(null)
const onlineUsers = ref<User[]>([])

const messages = ref<Message[]>([
  { 
    id: 'msg-1', 
    senderId: 'bot', 
    senderName: 'Assistant', 
    content: '안녕하세요! 자유 게시판에 입장하셨습니다.', 
    type: 'system', 
    createdAt: new Date(Date.now() - 100000).toISOString() 
  },
  { 
    id: 'msg-2', 
    senderId: 'user-2', 
    senderName: '김철수', 
    content: '반갑습니다 여러분!', 
    createdAt: new Date(Date.now() - 90000).toISOString() 
  },
  { 
    id: 'msg-3', 
    senderId: 'user-1', 
    senderName: '나 (본인)', 
    content: '네 안녕하세요! 이번 업데이트 내용 보셨나요?', 
    createdAt: new Date(Date.now() - 80000).toISOString() 
  },
  { 
    id: 'msg-4', 
    senderId: 'user-3', 
    senderName: '이영희', 
    content: 'https://nuxt.com/docs/getting-started/introduction 여기 링크 참고해보세요!', 
    createdAt: new Date(Date.now() - 70000).toISOString(),
    linkPreview: {
      url: 'https://nuxt.com/docs/getting-started/introduction',
      title: 'Nuxt: The Intuitive Vue Framework',
      description: 'Nuxt is an open source framework that makes web development intuitive and powerful.',
      image: 'https://nuxt.com/social-card.png',
      siteName: 'Nuxt'
    }
  },
  { 
    id: 'msg-5', 
    senderId: 'user-1', 
    senderName: '나 (본인)', 
    content: '점심 메뉴 골라주세요!', 
    type: 'poll',
    createdAt: new Date(Date.now() - 60000).toISOString(),
    poll: {
      id: 'poll-1',
      question: '오늘 점심 메뉴는?',
      options: [
        { id: 'opt-1', text: '김치찌개', votes: 12 },
        { id: 'opt-2', text: '돈까스', votes: 15 },
        { id: 'opt-3', text: '마라탕', votes: 8 }
      ],
      totalVotes: 35
    }
  },
  { 
    id: 'msg-6', 
    senderId: 'user-2', 
    senderName: '김철수', 
    content: '오 돈까스 좋네요!', 
    createdAt: new Date(Date.now() - 50000).toISOString() 
  }
])

// -- Methods --
const fetchRooms = async () => {
  try {
    const data = await $fetch<Room[]>('/api/rooms')
    rooms.value = data
  } catch (error) {
    console.error('Failed to fetch rooms:', error)
  }
}
const handleRefresh = async () => {
  await fetchRooms()
  lastRefreshed.value = new Date().toLocaleString()
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
      isHost: true
    }
    
    // Update online users to include the new user
    onlineUsers.value = [
      currentUser.value,
      { id: 'user-2', name: '김철수', isTyping: true },
      { id: 'user-3', name: '이영희' },
      { id: 'user-4', name: '박지민' }
    ]
    
    await fetchRooms()
    isLoggedIn.value = true
  } catch (error) {
    console.error('Login failed:', error)
  }
}

onMounted(async () => {
  await fetchRooms()
  
  if (socket.value) {
    socket.value.on('room-created', (room: Room) => {
      if (!rooms.value.some(r => r.id === room.id)) {
        rooms.value.unshift(room)
      }
    })
  }
})

const enterRoom = (room: Room) => {
  activeRoom.value = room
  isLobby.value = false
}

const leaveRoom = () => {
  isLobby.value = true
  activeRoom.value = null
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

const handleSendMessage = (content: string) => {
  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    senderId: currentUser.value.id,
    senderName: currentUser.value.name,
    content,
    createdAt: new Date().toISOString()
  }
  messages.value.push(newMessage)
  
  // Fake bot response for search demonstration
  if (content.includes('검색')) {
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

const handleLogout = () => {
  isLoggedIn.value = false
  currentUser.value = { id: '', name: '' }
  inputNickname.value = ''
  isLobby.value = true
  isCreatingRoom.value = false
  activeRoom.value = null
  onlineUsers.value = []
}
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
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{{ onlineUsers.length }} Users Online</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div v-if="isSearching" class="relative animate-in slide-in-from-right-4 duration-300">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="메시지 검색..." 
              class="bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 w-64"
              @keyup.esc="isSearching = false"
            />
            <button @click="isSearching = false" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <PlusCircle class="w-4 h-4 rotate-45" />
            </button>
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
          <div class="flex-1 overflow-y-auto p-6 space-y-2">
            <div class="text-center py-8">
              <span class="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] bg-gray-50 px-3 py-1 rounded-full">2026년 6월 14일 일요일</span>
            </div>
            
            <MessageItem 
              v-for="msg in messages" 
              :key="msg.id" 
              :message="msg" 
              :isOwn="msg.senderId === currentUser.id" 
            />
          </div>

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

          <!-- Input Area -->
          <ChatInput @send="handleSendMessage" />
        </div>

        <!-- Right Sidebar (Users) -->
        <UserList 
          v-if="showUserList" 
          :users="onlineUsers" 
          :isHost="currentUser.isHost"
          class="hidden md:flex"
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
